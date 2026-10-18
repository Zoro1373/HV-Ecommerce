import test, { describe, before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { app } from "../src/app.js";
import { prisma } from "../src/config/db.js";
import {
  hashPassword,
  hashToken,
  generateSessionToken,
} from "../src/utils/crypto.js";

describe("Order Backend Phase 3: Checkout & Order Placement Test Suite", () => {
  const timestamp = Date.now();
  const testCustomerEmail1 = `test.order.user1.${timestamp}@vertex.local`;
  const testCustomerEmail2 = `test.order.user2.${timestamp}@vertex.local`;
  const testPassword = "CustomerSecurePass123!";

  let user1 = null;
  let user2 = null;
  let cookieUser1 = "";
  let cookieUser2 = "";

  // Test catalog fixtures
  let testCategoryId = "";
  let testProductId1 = "";
  let testProductId2 = "";
  let testVariantId1 = "";
  let testVariantId2 = "";
  let testInactiveVariantId = "";
  let testLimitedVariantId = "";

  // Test address fixtures
  let addressUser1 = null;
  let addressUser2 = null;

  before(async () => {
    const passwordHash = await hashPassword(testPassword);

    // 1. Create two test customer users
    user1 = await prisma.user.create({
      data: {
        email: testCustomerEmail1,
        fullName: "Test Order Customer 1",
        passwordHash,
        role: "CUSTOMER",
        isActive: true,
      },
    });

    const token1 = generateSessionToken();
    await prisma.session.create({
      data: {
        userId: user1.id,
        tokenHash: hashToken(token1),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    cookieUser1 = `vertex_session=${token1}`;

    user2 = await prisma.user.create({
      data: {
        email: testCustomerEmail2,
        fullName: "Test Order Customer 2",
        passwordHash,
        role: "CUSTOMER",
        isActive: true,
      },
    });

    const token2 = generateSessionToken();
    await prisma.session.create({
      data: {
        userId: user2.id,
        tokenHash: hashToken(token2),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    cookieUser2 = `vertex_session=${token2}`;

    // 2. Create addresses
    addressUser1 = await prisma.address.create({
      data: {
        userId: user1.id,
        recipientName: "Test Order Customer 1",
        phone: "+91 98765 43210",
        line1: "123 Tech Park, Hitech City",
        line2: "Floor 4, Suite B",
        city: "Hyderabad",
        state: "Telangana",
        postalCode: "500081",
        country: "India",
        isDefault: true,
      },
    });

    addressUser2 = await prisma.address.create({
      data: {
        userId: user2.id,
        recipientName: "Test Order Customer 2",
        phone: "+91 98765 99999",
        line1: "456 Industrial Area",
        city: "Bengaluru",
        state: "Karnataka",
        postalCode: "560001",
        country: "India",
        isDefault: true,
      },
    });

    // 3. Create Category and Products
    const category = await prisma.category.create({
      data: {
        name: `Order Test Category ${timestamp}`,
        slug: `order-test-cat-${timestamp}`,
      },
    });
    testCategoryId = category.id;

    // Product 1: 18% GST
    const product1 = await prisma.product.create({
      data: {
        name: `Order Board ${timestamp}`,
        slug: `order-board-${timestamp}`,
        categoryId: category.id,
        brand: "VertexElectronics",
        gstRate: 18.00,
        hsnCode: "854231",
      },
    });
    testProductId1 = product1.id;

    // Variant 1: Price 500, Stock 20
    const variant1 = await prisma.productVariant.create({
      data: {
        productId: product1.id,
        sku: `ORD-VAR1-${timestamp}`,
        name: "Standard Pack",
        price: 500.00,
        stockQuantity: 20,
        isActive: true,
      },
    });
    testVariantId1 = variant1.id;

    // Product 2: 12% GST
    const product2 = await prisma.product.create({
      data: {
        name: `Order Sensor ${timestamp}`,
        slug: `order-sensor-${timestamp}`,
        categoryId: category.id,
        brand: "VertexSensors",
        gstRate: 12.00,
        hsnCode: "903180",
      },
    });
    testProductId2 = product2.id;

    // Variant 2: Price 1000, Stock 5
    const variant2 = await prisma.productVariant.create({
      data: {
        productId: product2.id,
        sku: `ORD-VAR2-${timestamp}`,
        name: "Precision Pack",
        price: 1000.00,
        stockQuantity: 5,
        isActive: true,
      },
    });
    testVariantId2 = variant2.id;

    // Inactive variant
    const inactiveVariant = await prisma.productVariant.create({
      data: {
        productId: product1.id,
        sku: `ORD-INACT-${timestamp}`,
        name: "Discontinued",
        price: 200.00,
        stockQuantity: 10,
        isActive: false,
      },
    });
    testInactiveVariantId = inactiveVariant.id;

    // Limited stock variant: Stock = 1 (for concurrency testing)
    const limitedVariant = await prisma.productVariant.create({
      data: {
        productId: product2.id,
        sku: `ORD-LIMIT-${timestamp}`,
        name: "Limited Edition",
        price: 750.00,
        stockQuantity: 1,
        isActive: true,
      },
    });
    testLimitedVariantId = limitedVariant.id;
  });

  after(async () => {
    // Cleanup fixtures
    try {
      await prisma.orderItem.deleteMany({
        where: { order: { userId: { in: [user1.id, user2.id] } } },
      }).catch(() => {});
      await prisma.order.deleteMany({
        where: { userId: { in: [user1.id, user2.id] } },
      }).catch(() => {});
      await prisma.cartItem.deleteMany({
        where: { cart: { userId: { in: [user1.id, user2.id] } } },
      }).catch(() => {});
      await prisma.cart.deleteMany({
        where: { userId: { in: [user1.id, user2.id] } },
      }).catch(() => {});
      await prisma.address.deleteMany({
        where: { userId: { in: [user1.id, user2.id] } },
      }).catch(() => {});
      await prisma.session.deleteMany({
        where: { userId: { in: [user1.id, user2.id] } },
      }).catch(() => {});
      await prisma.productVariant.deleteMany({
        where: { id: { in: [testVariantId1, testVariantId2, testInactiveVariantId, testLimitedVariantId] } },
      }).catch(() => {});
      await prisma.product.deleteMany({
        where: { id: { in: [testProductId1, testProductId2] } },
      }).catch(() => {});
      await prisma.category.deleteMany({
        where: { id: testCategoryId },
      }).catch(() => {});
      await prisma.user.deleteMany({
        where: { id: { in: [user1.id, user2.id] } },
      }).catch(() => {});
    } catch {
      // Ignored
    }
  });

  // Helper to ensure clean cart for a user
  async function clearUserCart(userId) {
    const cart = await prisma.cart.findUnique({ where: { userId } });
    if (cart) {
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    }
  }

  // Helper to add item to cart directly in DB
  async function addItemToDbCart(userId, variantId, quantity) {
    let cart = await prisma.cart.findUnique({ where: { userId } });
    if (!cart) {
      cart = await prisma.cart.create({ data: { userId } });
    }
    return prisma.cartItem.create({
      data: {
        cartId: cart.id,
        variantId,
        quantity,
      },
    });
  }

  /* ====================================================================
     TEST SUITE CASES
     ==================================================================== */

  test("1. POST /api/orders requires authentication", async () => {
    const res = await request(app)
      .post("/api/orders")
      .set("X-Requested-With", "XMLHttpRequest")
      .send({ addressId: addressUser1.id });

    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, "UNAUTHORIZED");
  });

  test("2. POST /api/orders rejects empty cart with 400 EMPTY_CART", async () => {
    await clearUserCart(user1.id);

    const res = await request(app)
      .post("/api/orders")
      .set("Cookie", cookieUser1)
      .set("X-Requested-With", "XMLHttpRequest")
      .send({ addressId: addressUser1.id });

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, "EMPTY_CART");
  });

  test("3. POST /api/orders rejects missing delivery address with 400", async () => {
    await addItemToDbCart(user1.id, testVariantId1, 1);

    const res = await request(app)
      .post("/api/orders")
      .set("Cookie", cookieUser1)
      .set("X-Requested-With", "XMLHttpRequest")
      .send({});

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, "VALIDATION_ERROR");
  });

  test("4. Address Ownership: Rejects address belonging to another user with 403 FORBIDDEN", async () => {
    const res = await request(app)
      .post("/api/orders")
      .set("Cookie", cookieUser1)
      .set("X-Requested-With", "XMLHttpRequest")
      .send({ addressId: addressUser2.id }); // addressUser2 belongs to user2

    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, "FORBIDDEN");
  });

  test("5. Successful order placement with server-derived pricing, stock decrement, and cart clearing", async () => {
    await clearUserCart(user1.id);

    // Reset stock
    await prisma.productVariant.update({ where: { id: testVariantId1 }, data: { stockQuantity: 20 } });
    await prisma.productVariant.update({ where: { id: testVariantId2 }, data: { stockQuantity: 5 } });

    // Add variant1 (qty 2 @ ₹500) and variant2 (qty 1 @ ₹1000)
    await addItemToDbCart(user1.id, testVariantId1, 2);
    await addItemToDbCart(user1.id, testVariantId2, 1);

    const res = await request(app)
      .post("/api/orders")
      .set("Cookie", cookieUser1)
      .set("X-Requested-With", "XMLHttpRequest")
      .send({
        addressId: addressUser1.id,
        paymentMethod: "COD",
        notes: "Deliver to front desk please",
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    const order = res.body.order;

    assert.ok(order.orderNumber.startsWith("VTX-"));
    assert.equal(order.userId, user1.id);
    assert.equal(order.orderStatus, "PENDING");
    assert.equal(order.paymentStatus, "PENDING");
    assert.equal(order.paymentMethod, "COD");

    // Subtotal: (2 * 500) + (1 * 1000) = 2000
    assert.equal(order.subtotal, 2000.00);
    // Tax: 18% on 1000 (180) + 12% on 1000 (120) = 300
    assert.equal(order.taxAmount, 300.00);
    assert.equal(order.shippingFee, 0.00);
    assert.equal(order.totalAmount, 2300.00);

    // Verify shipping snapshot
    assert.equal(order.shippingAddress.recipientName, addressUser1.recipientName);
    assert.equal(order.shippingAddress.city, "Hyderabad");
    assert.equal(order.shippingAddress.state, "Telangana");

    // Verify order items snapshots
    assert.equal(order.items.length, 2);
    const item1 = order.items.find((it) => it.variantId === testVariantId1);
    assert.ok(item1);
    assert.equal(item1.quantity, 2);
    assert.equal(item1.unitPrice, 500.00);
    assert.equal(item1.gstRate, 18.00);
    assert.equal(item1.taxAmount, 180.00);
    assert.equal(item1.lineTotal, 1180.00);

    // Verify inventory decremented
    const freshVariant1 = await prisma.productVariant.findUnique({ where: { id: testVariantId1 } });
    assert.equal(freshVariant1.stockQuantity, 18); // 20 - 2

    const freshVariant2 = await prisma.productVariant.findUnique({ where: { id: testVariantId2 } });
    assert.equal(freshVariant2.stockQuantity, 4); // 5 - 1

    // Verify user cart is cleared
    const cart = await prisma.cart.findUnique({
      where: { userId: user1.id },
      include: { items: true },
    });
    assert.equal(cart.items.length, 0);
  });

  test("6. Payment Boundary: Newly created orders remain PENDING and are never marked PAID without verified payment", async () => {
    await clearUserCart(user1.id);
    await addItemToDbCart(user1.id, testVariantId1, 1);

    const res = await request(app)
      .post("/api/orders")
      .set("Cookie", cookieUser1)
      .set("X-Requested-With", "XMLHttpRequest")
      .send({
        addressId: addressUser1.id,
        paymentMethod: "COD",
      });

    assert.equal(res.status, 201);
    const order = res.body.order;

    // Explicit boundary verification: neither orderStatus nor paymentStatus is PAID
    assert.equal(order.paymentStatus, "PENDING");
    assert.equal(order.orderStatus, "PENDING");
    assert.equal(order.paymentId, null);
  });

  test("7. Inactive variants/products reject order placement with 400", async () => {
    await clearUserCart(user1.id);
    await addItemToDbCart(user1.id, testInactiveVariantId, 1);

    const res = await request(app)
      .post("/api/orders")
      .set("Cookie", cookieUser1)
      .set("X-Requested-With", "XMLHttpRequest")
      .send({ addressId: addressUser1.id });

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, "INACTIVE_PRODUCT_OR_VARIANT");
  });

  test("8. Insufficient stock rejects order with 400 INSUFFICIENT_STOCK", async () => {
    await clearUserCart(user1.id);
    // testVariantId2 currently has 4 in stock
    await addItemToDbCart(user1.id, testVariantId2, 10);

    const res = await request(app)
      .post("/api/orders")
      .set("Cookie", cookieUser1)
      .set("X-Requested-With", "XMLHttpRequest")
      .send({ addressId: addressUser1.id });

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, "INSUFFICIENT_STOCK");
  });

  test("9. Rollback Guarantee: When an order fails mid-transaction, no stock is decremented and cart is preserved", async () => {
    await clearUserCart(user1.id);

    // Initial stock for variant1
    const v1Before = await prisma.productVariant.findUnique({ where: { id: testVariantId1 } });
    const stock1Before = v1Before.stockQuantity;

    // Add variant1 (has plenty of stock) and variant2 (request 99, exceeds available stock)
    await addItemToDbCart(user1.id, testVariantId1, 2);
    await addItemToDbCart(user1.id, testVariantId2, 99);

    const res = await request(app)
      .post("/api/orders")
      .set("Cookie", cookieUser1)
      .set("X-Requested-With", "XMLHttpRequest")
      .send({ addressId: addressUser1.id });

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, "INSUFFICIENT_STOCK");

    // Stock for variant1 must NOT have been decremented
    const v1After = await prisma.productVariant.findUnique({ where: { id: testVariantId1 } });
    assert.equal(v1After.stockQuantity, stock1Before);

    // User's cart must still contain both items
    const cart = await prisma.cart.findUnique({
      where: { userId: user1.id },
      include: { items: true },
    });
    assert.equal(cart.items.length, 2);
  });

  test("10. Duplicate Submission Protection: Idempotency key returns original order without re-deducting stock", async () => {
    await clearUserCart(user1.id);
    await addItemToDbCart(user1.id, testVariantId1, 1);

    const idempotencyKey = `idem-key-${Date.now()}`;

    // First submission
    const res1 = await request(app)
      .post("/api/orders")
      .set("Cookie", cookieUser1)
      .set("X-Requested-With", "XMLHttpRequest")
      .send({
        addressId: addressUser1.id,
        idempotencyKey,
      });

    assert.equal(res1.status, 201);
    const order1 = res1.body.order;

    const stockAfterFirstOrder = (
      await prisma.productVariant.findUnique({ where: { id: testVariantId1 } })
    ).stockQuantity;

    // Second repeated submission with identical idempotencyKey
    const res2 = await request(app)
      .post("/api/orders")
      .set("Cookie", cookieUser1)
      .set("X-Requested-With", "XMLHttpRequest")
      .send({
        addressId: addressUser1.id,
        idempotencyKey,
      });

    assert.equal(res2.status, 201);
    const order2 = res2.body.order;

    // Verifies it returned the identical order
    assert.equal(order2.id, order1.id);
    assert.equal(order2.orderNumber, order1.orderNumber);

    // Verifies stock was not decremented again
    const stockAfterSecondOrder = (
      await prisma.productVariant.findUnique({ where: { id: testVariantId1 } })
    ).stockQuantity;
    assert.equal(stockAfterSecondOrder, stockAfterFirstOrder);
  });

  test("11. Concurrency Safety: Parallel checkout attempts for last remaining stock prevent overselling", async () => {
    // Limited variant stock is currently 1
    await clearUserCart(user1.id);
    await clearUserCart(user2.id);

    await addItemToDbCart(user1.id, testLimitedVariantId, 1);
    await addItemToDbCart(user2.id, testLimitedVariantId, 1);

    // Attempt to checkout both carts concurrently
    const [res1, res2] = await Promise.all([
      request(app)
        .post("/api/orders")
        .set("Cookie", cookieUser1)
        .set("X-Requested-With", "XMLHttpRequest")
        .send({ addressId: addressUser1.id }),
      request(app)
        .post("/api/orders")
        .set("Cookie", cookieUser2)
        .set("X-Requested-With", "XMLHttpRequest")
        .send({ addressId: addressUser2.id }),
    ]);

    const statuses = [res1.status, res2.status];
    // Exactly one should succeed (201) and the other should fail with 400 INSUFFICIENT_STOCK
    assert.ok(statuses.includes(201), "One concurrent order must succeed");
    assert.ok(statuses.includes(400), "The other concurrent order must fail");

    const failedRes = res1.status === 400 ? res1 : res2;
    assert.equal(failedRes.body.error.code, "INSUFFICIENT_STOCK");

    // Stock must be exactly 0, never negative
    const finalVariant = await prisma.productVariant.findUnique({ where: { id: testLimitedVariantId } });
    assert.equal(finalVariant.stockQuantity, 0);
  });

  test("12. GET /api/orders lists user's orders and GET /api/orders/:id enforces ownership", async () => {
    // List user1's orders
    const listRes = await request(app)
      .get("/api/orders")
      .set("Cookie", cookieUser1)
      .set("X-Requested-With", "XMLHttpRequest");

    assert.equal(listRes.status, 200);
    assert.ok(Array.isArray(listRes.body.orders));
    assert.ok(listRes.body.orders.length > 0);

    const firstOrder = listRes.body.orders[0];

    // User1 can fetch their own order
    const singleRes = await request(app)
      .get(`/api/orders/${firstOrder.id}`)
      .set("Cookie", cookieUser1)
      .set("X-Requested-With", "XMLHttpRequest");

    assert.equal(singleRes.status, 200);
    assert.equal(singleRes.body.order.id, firstOrder.id);

    // User2 cannot access User1's order
    const crossRes = await request(app)
      .get(`/api/orders/${firstOrder.id}`)
      .set("Cookie", cookieUser2)
      .set("X-Requested-With", "XMLHttpRequest");

    assert.equal(crossRes.status, 403);
    assert.equal(crossRes.body.error.code, "FORBIDDEN");
  });

  test("13. Address API: CRUD operations for customer saved addresses", async () => {
    // Create new address
    const createRes = await request(app)
      .post("/api/addresses")
      .set("Cookie", cookieUser1)
      .set("X-Requested-With", "XMLHttpRequest")
      .send({
        recipientName: "Adarsh Betha",
        phone: "+91 91234 56789",
        line1: "Plot 88, Electronic City",
        city: "Bengaluru",
        state: "Karnataka",
        postalCode: "560100",
        isDefault: false,
      });

    assert.equal(createRes.status, 201);
    const newAddress = createRes.body.address;
    assert.equal(newAddress.recipientName, "Adarsh Betha");

    // List addresses
    const listRes = await request(app)
      .get("/api/addresses")
      .set("Cookie", cookieUser1);

    assert.equal(listRes.status, 200);
    assert.ok(listRes.body.addresses.some((a) => a.id === newAddress.id));

    // Delete address
    const delRes = await request(app)
      .delete(`/api/addresses/${newAddress.id}`)
      .set("Cookie", cookieUser1)
      .set("X-Requested-With", "XMLHttpRequest");

    assert.equal(delRes.status, 200);
  });

  test("14. Enforces CSRF header on state-changing order placement", async () => {
    const res = await request(app)
      .post("/api/orders")
      .set("Cookie", cookieUser1)
      // Omit X-Requested-With
      .send({ addressId: addressUser1.id });

    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, "CSRF_ERROR");
  });
});
