import * as cartService from "../services/cart.service.js";

/**
 * Controller to get the current authenticated user's cart.
 */
export async function getCart(req, res, next) {
  try {
    const cart = await cartService.getOrCreateCart(req.user.id);
    return res.status(200).json({
      success: true,
      cart,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller to add a product variant to the current user's cart.
 */
export async function addItem(req, res, next) {
  try {
    const { variantId, quantity } = req.body;
    const cart = await cartService.addItemToCart(req.user.id, {
      variantId,
      quantity,
    });

    return res.status(200).json({
      success: true,
      message: "Item added to cart.",
      cart,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller to update the quantity of an item in the user's cart.
 */
export async function updateItem(req, res, next) {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;

    const cart = await cartService.updateCartItemQuantity(req.user.id, {
      itemId,
      quantity,
    });

    return res.status(200).json({
      success: true,
      message: "Cart updated.",
      cart,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller to remove an item from the user's cart.
 */
export async function removeItem(req, res, next) {
  try {
    const { itemId } = req.params;
    const cart = await cartService.removeCartItem(req.user.id, itemId);

    return res.status(200).json({
      success: true,
      message: "Item removed from cart.",
      cart,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller to clear all items from the user's cart.
 */
export async function clearCart(req, res, next) {
  try {
    const cart = await cartService.clearCart(req.user.id);

    return res.status(200).json({
      success: true,
      message: "Cart cleared.",
      cart,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller to merge guest cart items into the authenticated user's cart.
 */
export async function mergeCart(req, res, next) {
  try {
    const { items } = req.body;
    const cart = await cartService.mergeGuestCart(req.user.id, items);

    return res.status(200).json({
      success: true,
      message: "Guest cart merged successfully.",
      cart,
    });
  } catch (error) {
    next(error);
  }
}
