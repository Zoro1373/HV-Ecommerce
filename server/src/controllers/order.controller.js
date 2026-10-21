import * as orderService from "../services/order.service.js";

export async function createOrder(req, res, next) {
  try {
    const idempotencyKey =
      req.body.idempotencyKey ||
      req.headers["idempotency-key"] ||
      req.headers["x-idempotency-key"] ||
      null;

    const order = await orderService.createOrder(req.user.id, {
      ...req.body,
      idempotencyKey,
    });

    res.status(201).json({ success: true, order });
  } catch (err) {
    next(err);
  }
}

export async function listOrders(req, res, next) {
  try {
    const orders = await orderService.listUserOrders(req.user.id);
    res.json({ success: true, orders });
  } catch (err) {
    next(err);
  }
}

export async function getOrder(req, res, next) {
  try {
    const order = await orderService.getUserOrderById(req.user.id, req.params.id);
    res.json({ success: true, order });
  } catch (err) {
    next(err);
  }
}
