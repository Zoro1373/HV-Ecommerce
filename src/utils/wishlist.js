/**
 * VERTEX Wishlist Storage & Synchronization Utility
 * 
 * Provides persistent, reactive local storage for customer wishlist items.
 * Dispatches cross-component update events so badges, product cards,
 * and detail pages update instantly without conflicting with cart or checkout.
 */

const WISHLIST_STORAGE_KEY = "vertex_wishlist_items";

/**
 * Retrieves the current wishlist items from localStorage safely.
 * @returns {Array<object>} List of wishlisted product objects
 */
export function getWishlistItems() {
  if (typeof window === "undefined" || !window.localStorage) {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(WISHLIST_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("Failed to read wishlist from localStorage:", err);
    return [];
  }
}

/**
 * Checks if a specific product (by id or slug) is in the wishlist.
 * @param {string} productId - Product ID or slug
 * @returns {boolean}
 */
export function isItemInWishlist(productId) {
  if (!productId) return false;
  const items = getWishlistItems();
  return items.some((item) => item.id === productId || item.slug === productId);
}

/**
 * Saves the wishlist items and triggers the update event.
 * @param {Array<object>} items 
 */
function saveWishlist(items) {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(
      new CustomEvent("vertex_wishlist_updated", {
        detail: { items, count: items.length },
      })
    );
  } catch (err) {
    console.error("Failed to write wishlist to localStorage:", err);
  }
}

/**
 * Toggles an item in the wishlist (adds if absent, removes if present).
 * @param {object} product - Full or minimal product record
 * @returns {boolean} True if item is now in wishlist, false if removed
 */
export function toggleWishlistItem(product) {
  if (!product) return false;
  const targetId = product.id || product.slug;
  const currentItems = getWishlistItems();
  const existingIdx = currentItems.findIndex(
    (item) => item.id === targetId || item.slug === targetId
  );

  let updated;
  let isInWishlist;

  if (existingIdx >= 0) {
    // Remove from wishlist
    updated = currentItems.filter((_, idx) => idx !== existingIdx);
    isInWishlist = false;
  } else {
    // Add to wishlist
    const wishlistItem = {
      id: product.id || product.slug,
      slug: product.slug || product.id,
      name: product.name,
      price: product.price,
      mrp: product.mrp,
      imageUrl: product.imageUrl,
      tag: product.tag,
      inStock: product.inStock,
      category: product.category,
      addedAt: new Date().toISOString(),
    };
    updated = [wishlistItem, ...currentItems];
    isInWishlist = true;
  }

  saveWishlist(updated);
  return isInWishlist;
}

/**
 * Removes an item from the wishlist by id or slug.
 * @param {string} productId 
 */
export function removeFromWishlist(productId) {
  if (!productId) return;
  const currentItems = getWishlistItems();
  const updated = currentItems.filter(
    (item) => item.id !== productId && item.slug !== productId
  );
  saveWishlist(updated);
}

/**
 * Clears all items from the wishlist.
 */
export function clearWishlist() {
  saveWishlist([]);
}

/**
 * Returns the count of items in the wishlist.
 * @returns {number}
 */
export function getWishlistCount() {
  return getWishlistItems().length;
}
