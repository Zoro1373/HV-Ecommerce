/**
 * Formats a single CartItem database record for client consumption.
 * Derives prices and line totals from server-side variant records.
 */
export function formatCartItem(item) {
  if (!item) return null;

  const variant = item.variant;
  const product = variant?.product;
  const unitPrice = variant ? Number(variant.price) : 0;
  const lineTotal = Number((unitPrice * item.quantity).toFixed(2));
  const isAvailable = Boolean(variant?.isActive && product?.isActive);

  return {
    id: item.id,
    cartId: item.cartId,
    variantId: item.variantId,
    quantity: item.quantity,
    unitPrice,
    lineTotal,
    isAvailable,
    variant: variant
      ? {
          id: variant.id,
          sku: variant.sku,
          partNumber: variant.partNumber || null,
          name: variant.name || null,
          packSize: variant.packSize || null,
          dimensions: variant.dimensions || null,
          price: unitPrice,
          mrp: variant.mrp ? Number(variant.mrp) : null,
          stockQuantity: variant.stockQuantity,
          inStock: variant.stockQuantity > 0,
          isActive: variant.isActive,
        }
      : null,
    product: product
      ? {
          id: product.id,
          name: product.name,
          slug: product.slug,
          imageUrl: product.imageUrl || null,
          tag: product.tag || null,
          isActive: product.isActive,
          category: product.category
            ? {
                id: product.category.id,
                name: product.category.name,
                slug: product.category.slug,
              }
            : null,
        }
      : null,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

/**
 * Formats a complete Cart record with items, item counts, and calculated totals.
 */
export function formatCart(cart) {
  if (!cart) {
    return {
      id: null,
      userId: null,
      items: [],
      itemCount: 0,
      totalQuantity: 0,
      subtotal: 0,
    };
  }

  const items = (cart.items || []).map(formatCartItem);
  const itemCount = items.length;
  const totalQuantity = items.reduce((acc, item) => acc + item.quantity, 0);

  // Subtotal reflects server-calculated sum of available line totals
  const subtotal = Number(
    items
      .filter((item) => item.isAvailable)
      .reduce((acc, item) => acc + item.lineTotal, 0)
      .toFixed(2)
  );

  return {
    id: cart.id,
    userId: cart.userId,
    items,
    itemCount,
    totalQuantity,
    subtotal,
    createdAt: cart.createdAt,
    updatedAt: cart.updatedAt,
  };
}
