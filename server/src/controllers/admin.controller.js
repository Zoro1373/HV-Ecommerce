import * as adminService from "../services/admin.service.js";
import * as quoteService from "../services/quote.service.js";
import * as newsletterService from "../services/newsletter.service.js";

/**
 * Controller to create a category via Admin API.
 */
export async function createCategory(req, res, next) {
  try {
    const actorId = req.user?.id || null;
    const category = await adminService.createCategory(req.body, actorId);

    return res.status(201).json({
      success: true,
      message: "Category created successfully.",
      category,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller to update a category via Admin API.
 */
export async function updateCategory(req, res, next) {
  try {
    const { id } = req.params;
    const actorId = req.user?.id || null;
    const category = await adminService.updateCategory(id, req.body, actorId);

    return res.status(200).json({
      success: true,
      message: "Category updated successfully.",
      category,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller to create a product and its initial variant via Admin API.
 */
export async function createProduct(req, res, next) {
  try {
    const actorId = req.user?.id || null;
    const product = await adminService.createProduct(req.body, actorId);

    return res.status(201).json({
      success: true,
      message: "Product and initial variant created successfully.",
      product,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller to update product and its category assignment via Admin API.
 */
export async function updateProduct(req, res, next) {
  try {
    const { id } = req.params;
    const actorId = req.user?.id || null;
    const product = await adminService.updateProduct(id, req.body, actorId);

    return res.status(200).json({
      success: true,
      message: "Product updated successfully.",
      product,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller to update product selling price via Admin API.
 * Enforces admin authorization, validates positive numeric values, and creates audit log.
 */
export async function updateProductPrice(req, res, next) {
  try {
    const { id } = req.params;
    const actorId = req.user?.id || null;
    const actorEmail = req.user?.email || null;

    const result = await adminService.updateProductPrice(
      id,
      req.body,
      actorId,
      actorEmail
    );

    return res.status(200).json({
      success: true,
      message: "Product selling price updated successfully.",
      product: result.product,
      variant: result.variant,
      auditLog: result.auditLog,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller to adjust inventory stock for a variant via Admin API.
 */
export async function updateVariantStock(req, res, next) {
  try {
    const { id } = req.params;
    const actorId = req.user?.id || null;
    const actorEmail = req.user?.email || null;

    const result = await adminService.updateVariantStock(
      id,
      req.body,
      actorId,
      actorEmail
    );

    return res.status(200).json({
      success: true,
      message: "Variant stock updated successfully.",
      variant: result.variant,
      difference: result.difference,
      auditLog: result.auditLog,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller to list all orders with pagination, search, and status filters via Admin API.
 */
export async function listOrders(req, res, next) {
  try {
    const result = await adminService.getAdminOrders(req.query);

    return res.status(200).json({
      success: true,
      orders: result.orders,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller to retrieve a single order by ID or orderNumber via Admin API.
 */
export async function getOrder(req, res, next) {
  try {
    const { id } = req.params;
    const order = await adminService.getAdminOrderById(id);

    return res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller to update order fulfillment status via Admin API.
 */
export async function updateOrderStatus(req, res, next) {
  try {
    const { id } = req.params;
    const actorId = req.user?.id || null;
    const actorEmail = req.user?.email || null;

    const result = await adminService.updateOrderStatus(
      id,
      req.body,
      actorId,
      actorEmail
    );

    return res.status(200).json({
      success: true,
      message: `Order status updated to ${result.order.orderStatus} successfully.`,
      order: result.order,
      auditLog: result.auditLog,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller to list all customers (CUSTOMER and B2B) with pagination, search,
 * role, and status filters via Admin API.
 */
export async function listCustomers(req, res, next) {
  try {
    const result = await adminService.getAdminCustomers(req.query);

    return res.status(200).json({
      success: true,
      customers: result.customers,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller to list security and operational audit logs with pagination,
 * search, action, entity type, and actor filters via Admin API.
 */
export async function listAuditLogs(req, res, next) {
  try {
    const result = await adminService.getAdminAuditLogs(req.query);

    return res.status(200).json({
      success: true,
      logs: result.logs,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller to list all quote requests with pagination, search,
 * and status filters via Admin API.
 */
export async function listQuotes(req, res, next) {
  try {
    const result = await quoteService.getAdminQuotes(req.query);

    return res.status(200).json({
      success: true,
      quotes: result.quotes,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller to retrieve a single quote request by ID via Admin API.
 */
export async function getQuote(req, res, next) {
  try {
    const { id } = req.params;
    const quote = await quoteService.getAdminQuoteById(id);

    return res.status(200).json({
      success: true,
      quote,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller to update quote status, notes, or quoted amount via Admin API.
 */
export async function updateQuote(req, res, next) {
  try {
    const { id } = req.params;
    const actorId = req.user?.id || null;
    const actorEmail = req.user?.email || null;

    const result = await quoteService.updateAdminQuote(
      id,
      req.body,
      actorId,
      actorEmail
    );

    return res.status(200).json({
      success: true,
      message: "Quote request updated successfully.",
      quote: result.quote,
      auditLog: result.auditLog,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller to list newsletter subscribers with pagination and search via Admin API.
 */
export async function listNewsletterSubscriptions(req, res, next) {
  try {
    const result = await newsletterService.getAdminNewsletterSubscriptions(req.query);

    return res.status(200).json({
      success: true,
      subscriptions: result.subscriptions,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller to retrieve full details for a single customer by ID via Admin API.
 */
export async function getCustomer(req, res, next) {
  try {
    const { id } = req.params;
    const { ordersPage, ordersLimit } = req.query;
    const result = await adminService.getAdminCustomerById(id, {
      ordersPage,
      ordersLimit,
    });

    return res.status(200).json({
      success: true,
      customer: result.customer,
    });
  } catch (error) {
    next(error);
  }
}



