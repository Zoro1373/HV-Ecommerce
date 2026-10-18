import { prisma } from "../config/db.js";
import { formatOrder } from "../utils/orderSerializer.js";

/**
 * Generates a human-friendly unique order number: VTX-YYYYMMDD-XXXXX
 */
function generateOrderNumber() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = Math.floor(10000 + Math.random() * 90000);
  return `VTX-${dateStr}-${randomSuffix}`;
}

/**
 * Creates an order from the user's current persistent cart.
 * Enforces:
 * - Cart non-empty verification.
 * - Address ownership validation.
 * - Server-side price recalculation (never trust client prices).
 * - Concurrency-safe atomic transaction for stock validation and decrement.
 * - Automatic rollback on failure.
 * - Safe idempotency deduplication.
 * - Clearing the cart only upon successful order creation.
 * - Safe payment boundary (orderStatus and paymentStatus remain PENDING).
 */
export async function createOrder(userId, {
  addressId,
  shippingAddress,
  paymentMethod = "COD",
  notes,
  idempotencyKey,
}) {
  // 1. Idempotency Check: if request was already processed, return existing order immediately
  if (idempotencyKey) {
    const existingOrder = await prisma.order.findFirst({
      where: {
        userId,
        notes: {
          contains: `[idempotency:${idempotencyKey}]`,
        },
      },
      include: {
        items: true,
      },
    });

    if (existingOrder) {
      return formatOrder(existingOrder);
    }
  }

  // 2. Fetch user's cart
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: true,
    },
  });

  if (!cart || !cart.items || cart.items.length === 0) {
    const error = new Error("Your cart is empty. Add products to your cart before proceeding to checkout.");
    error.code = "EMPTY_CART";
    error.status = 400;
    throw error;
  }

  // 3. Validate and resolve shipping address
  let resolvedAddress = null;
  if (addressId) {
    const savedAddress = await prisma.address.findUnique({
      where: { id: addressId },
    });

    if (!savedAddress) {
      const error = new Error("Selected delivery address not found.");
      error.code = "ADDRESS_NOT_FOUND";
      error.status = 404;
      throw error;
    }

    if (savedAddress.userId !== userId) {
      const error = new Error("You do not have permission to use this address.");
      error.code = "FORBIDDEN";
      error.status = 403;
      throw error;
    }

    resolvedAddress = {
      recipientName: savedAddress.recipientName,
      phone: savedAddress.phone,
      line1: savedAddress.line1,
      line2: savedAddress.line2 || null,
      city: savedAddress.city,
      state: savedAddress.state,
      postalCode: savedAddress.postalCode,
      country: savedAddress.country || "India",
    };
  } else if (shippingAddress) {
    resolvedAddress = {
      recipientName: shippingAddress.recipientName,
      phone: shippingAddress.phone,
      line1: shippingAddress.line1,
      line2: shippingAddress.line2 || null,
      city: shippingAddress.city,
      state: shippingAddress.state,
      postalCode: shippingAddress.postalCode,
      country: shippingAddress.country || "India",
    };
  } else {
    const error = new Error("A delivery address must be provided.");
    error.code = "ADDRESS_REQUIRED";
    error.status = 400;
    throw error;
  }

  // 4. Atomic transaction: stock check, price derivation, stock decrement, order creation, cart clear
  const createdOrder = await prisma.$transaction(
    async (tx) => {
      // a. Batch fetch all variants and their products in a single database roundtrip
      const variantIds = cart.items.map((it) => it.variantId);
      const variants = await tx.productVariant.findMany({
        where: { id: { in: variantIds } },
        include: { product: true },
      });
      const variantMap = new Map(variants.map((v) => [v.id, v]));

      let subtotal = 0;
      let taxAmount = 0;
      const orderItemsData = [];

      for (const item of cart.items) {
        const variant = variantMap.get(item.variantId);

        if (!variant) {
          const error = new Error(`Product variant ${item.variantId} not found.`);
          error.code = "VARIANT_NOT_FOUND";
          error.status = 404;
          throw error;
        }

        if (!variant.isActive || !variant.product.isActive) {
          const error = new Error(
            `Product "${variant.product?.name || "Product"}" (${variant.sku}) is no longer available.`
          );
          error.code = "INACTIVE_PRODUCT_OR_VARIANT";
          error.status = 400;
          throw error;
        }

        if (variant.stockQuantity < item.quantity) {
          const error = new Error(
            `Insufficient stock for "${variant.product?.name || "Product"}" (${variant.sku}). Available: ${variant.stockQuantity}, Requested: ${item.quantity}.`
          );
          error.code = "INSUFFICIENT_STOCK";
          error.status = 400;
          throw error;
        }

        // Calculate server-authoritative line total and tax
        const unitPrice = Number(variant.price);
        const lineSubtotal = Number((unitPrice * item.quantity).toFixed(2));
        const gstRate = Number(variant.product.gstRate || 18.0);
        const itemTax = Number((lineSubtotal * (gstRate / 100)).toFixed(2));
        const lineTotal = Number((lineSubtotal + itemTax).toFixed(2));

        subtotal += lineSubtotal;
        taxAmount += itemTax;

        orderItemsData.push({
          variantId: variant.id,
          productName: variant.product.name,
          variantName: variant.name || variant.packSize || null,
          sku: variant.sku,
          packSize: variant.packSize || null,
          hsnCode: variant.product.hsnCode || null,
          gstRate,
          quantity: item.quantity,
          unitPrice,
          taxAmount: itemTax,
          lineTotal,
        });

        // Decrement inventory stock safely in this transaction
        await tx.productVariant.update({
          where: { id: variant.id },
          data: {
            stockQuantity: {
              decrement: item.quantity,
            },
          },
        });
      }

      subtotal = Number(subtotal.toFixed(2));
      taxAmount = Number(taxAmount.toFixed(2));
      const shippingFee = 0.0;
      const totalAmount = Number((subtotal + taxAmount + shippingFee).toFixed(2));

      // b. Generate unique orderNumber and construct notes
      const orderNumber = generateOrderNumber();
      const finalNotes = idempotencyKey
        ? `[idempotency:${idempotencyKey}] ${notes || ""}`.trim()
        : notes || null;

      // c. Create Order record with OrderItem snapshots
      // Explicit Payment Boundary: paymentStatus and orderStatus are initialized to PENDING.
      const order = await tx.order.create({
        data: {
          orderNumber,
          userId,
          orderStatus: "PENDING",
          paymentStatus: "PENDING",
          paymentMethod: paymentMethod || "COD",
          subtotal,
          taxAmount,
          shippingFee,
          totalAmount,
          shippingRecipient: resolvedAddress.recipientName,
          shippingPhone: resolvedAddress.phone,
          shippingLine1: resolvedAddress.line1,
          shippingLine2: resolvedAddress.line2 || null,
          shippingCity: resolvedAddress.city,
          shippingState: resolvedAddress.state,
          shippingPostalCode: resolvedAddress.postalCode,
          shippingCountry: resolvedAddress.country || "India",
          notes: finalNotes,
          items: {
            create: orderItemsData,
          },
        },
        include: {
          items: true,
        },
      });

      // d. Clear the user's cart now that the order has been created
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      return order;
    },
    {
      maxWait: 10000,
      timeout: 25000,
    }
  );

  return formatOrder(createdOrder);
}

/**
 * Lists all orders belonging to the user.
 */
export async function listUserOrders(userId) {
  const orders = await prisma.order.findMany({
    where: { userId },
    include: {
      items: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return orders.map(formatOrder);
}

/**
 * Retrieves a single order by ID or order number, enforcing ownership.
 */
export async function getUserOrderById(userId, orderIdentifier) {
  const order = await prisma.order.findFirst({
    where: {
      OR: [
        { id: orderIdentifier },
        { orderNumber: orderIdentifier },
      ],
    },
    include: {
      items: true,
    },
  });

  if (!order) {
    const error = new Error("Order not found.");
    error.code = "ORDER_NOT_FOUND";
    error.status = 404;
    throw error;
  }

  if (order.userId !== userId) {
    const error = new Error("You do not have permission to view this order.");
    error.code = "FORBIDDEN";
    error.status = 403;
    throw error;
  }

  return formatOrder(order);
}
