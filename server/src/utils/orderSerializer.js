/**
 * Serializes Address database records into clean client-facing JSON objects.
 */
export function formatAddress(address) {
  if (!address) return null;

  return {
    id: address.id,
    userId: address.userId,
    recipientName: address.recipientName,
    phone: address.phone,
    line1: address.line1,
    line2: address.line2 || null,
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    country: address.country,
    isDefault: address.isDefault,
    createdAt: address.createdAt,
    updatedAt: address.updatedAt,
  };
}

/**
 * Serializes OrderItem database records with exact numeric prices and tax values.
 */
export function formatOrderItem(item) {
  if (!item) return null;

  return {
    id: item.id,
    orderId: item.orderId,
    variantId: item.variantId || null,
    productName: item.productName,
    variantName: item.variantName || null,
    sku: item.sku,
    packSize: item.packSize || null,
    hsnCode: item.hsnCode || null,
    gstRate: Number(item.gstRate),
    quantity: item.quantity,
    unitPrice: Number(item.unitPrice),
    taxAmount: Number(item.taxAmount),
    lineTotal: Number(item.lineTotal),
    createdAt: item.createdAt,
  };
}

/**
 * Serializes Order database records, converting Decimal fields to numbers and formatting nested items.
 */
export function formatOrder(order) {
  if (!order) return null;

  const items = (order.items || []).map(formatOrderItem);
  const totalQuantity = items.reduce((acc, it) => acc + it.quantity, 0);

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    userId: order.userId,
    orderStatus: order.orderStatus,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    paymentId: order.paymentId || null,
    subtotal: Number(order.subtotal),
    taxAmount: Number(order.taxAmount),
    shippingFee: Number(order.shippingFee),
    totalAmount: Number(order.totalAmount),
    shippingAddress: {
      recipientName: order.shippingRecipient,
      phone: order.shippingPhone,
      line1: order.shippingLine1,
      line2: order.shippingLine2 || null,
      city: order.shippingCity,
      state: order.shippingState,
      postalCode: order.shippingPostalCode,
      country: order.shippingCountry,
    },
    trackingNumber: order.trackingNumber || null,
    carrier: order.carrier || null,
    notes: order.notes || null,
    items,
    itemCount: items.length,
    totalQuantity,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}
