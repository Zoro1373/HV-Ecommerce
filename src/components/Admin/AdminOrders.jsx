import React, { useState, useEffect, useCallback } from "react";
import { getAdminOrders } from "../../services/adminApi";

export default function AdminOrders({ initialFilter = "all" }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [ordersResponse, setOrdersResponse] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(initialFilter);
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [inspectingOrder, setInspectingOrder] = useState(null);

  const loadOrders = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      const res = await getAdminOrders();
      setOrdersResponse(res);
    } catch (err) {
      setError(err.message || "Failed to query orders from server.");
      setOrdersResponse({
        isImplemented: false,
        message: err.message,
        orders: [],
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Prevent background page from scrolling while modal is open
  useEffect(() => {
    if (inspectingOrder) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [inspectingOrder]);

  const rawOrders = ordersResponse?.orders || [];

  // Helper getters for robust data access across flat and nested schemas
  const getRecipient = (o) => o.shippingRecipient || o.shippingAddress?.recipientName || "Valued Customer";
  const getPhone = (o) => o.shippingPhone || o.shippingAddress?.phone || "—";
  const getCity = (o) => o.shippingCity || o.shippingAddress?.city || "";
  const getState = (o) => o.shippingState || o.shippingAddress?.state || "";
  const getPostalCode = (o) => o.shippingPostalCode || o.shippingAddress?.postalCode || "";
  const getCountry = (o) => o.shippingCountry || o.shippingAddress?.country || "India";
  const getLine1 = (o) => o.shippingLine1 || o.shippingAddress?.line1 || "";
  const getLine2 = (o) => o.shippingLine2 || o.shippingAddress?.line2 || "";

  const getOrderStatus = (o) => o.orderStatus || o.status || "PENDING";
  const getPaymentStatus = (o) => o.paymentStatus || "PENDING";
  const getPaymentMethod = (o) => o.paymentMethod || "COD";
  const getItemCount = (o) => (o.items || []).reduce((acc, it) => acc + (it.quantity || 1), 0);
  const getItemName = (it) => it.productName || it.product?.name || "VERTEX Component";
  const getItemSku = (it) => it.sku || it.variant?.sku || "SKU-GEN";
  const getItemPack = (it) => it.packSize || it.variant?.packSize || "";

  const formatINR = (val) =>
    "₹" +
    Number(val || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const formatOrderDate = (isoString) => {
    if (!isoString) return "Recent";
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "Recent";
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getOrderStatusBadgeClass = (status) => {
    switch (status) {
      case "DELIVERED":
        return "adm-badge-success";
      case "SHIPPED":
        return "adm-badge-info";
      case "CONFIRMED":
      case "PROCESSING":
        return "adm-badge-primary";
      case "CANCELLED":
        return "adm-badge-danger";
      case "PENDING":
      default:
        return "adm-badge-warning";
    }
  };

  const getPaymentBadgeClass = (status) => {
    switch (status) {
      case "PAID":
        return "adm-badge-success";
      case "REFUNDED":
        return "adm-badge-neutral";
      case "FAILED":
        return "adm-badge-danger";
      case "PENDING":
      default:
        return "adm-badge-warning";
    }
  };

  // Filter computation
  const filteredOrders = rawOrders.filter((o) => {
    const term = searchQuery.trim().toLowerCase();
    const orderNum = (o.orderNumber || "").toLowerCase();
    const recipient = getRecipient(o).toLowerCase();
    const city = getCity(o).toLowerCase();
    const state = getState(o).toLowerCase();
    const itemMatches = (o.items || []).some(
      (it) => getItemName(it).toLowerCase().includes(term) || getItemSku(it).toLowerCase().includes(term)
    );

    const matchesSearch =
      !term ||
      orderNum.includes(term) ||
      recipient.includes(term) ||
      city.includes(term) ||
      state.includes(term) ||
      itemMatches;

    const currentStatus = getOrderStatus(o);
    const currentPayment = getPaymentStatus(o);

    const matchesStatus = statusFilter === "all" || currentStatus === statusFilter;
    const matchesPayment = paymentFilter === "all" || currentPayment === paymentFilter;

    return matchesSearch && matchesStatus && matchesPayment;
  });

  const hasActiveFilters = Boolean(searchQuery.trim()) || statusFilter !== "all" || paymentFilter !== "all";

  const handleClearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setPaymentFilter("all");
  };

  // Summary KPI Calculations
  const totalOrdersCount = rawOrders.length;
  const pendingCount = rawOrders.filter((o) => ["PENDING", "PROCESSING", "CONFIRMED"].includes(getOrderStatus(o))).length;
  const fulfilledCount = rawOrders.filter((o) => ["SHIPPED", "DELIVERED"].includes(getOrderStatus(o))).length;
  const totalRevenue = rawOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

  return (
    <div className="adm-orders-view">
      {/* Page Header */}
      <div className="adm-page-header">
        <div className="adm-page-title-group">
          <h1>Orders &amp; Fulfillment Management</h1>
          <p className="adm-page-subtitle">
            Track customer orders, inspect itemized pricing, audit discounts, and manage fulfillment lifecycles.
          </p>
        </div>
        <div className="adm-page-actions">
          <button
            type="button"
            className="adm-btn adm-btn-secondary"
            onClick={() => loadOrders(true)}
            disabled={loading || refreshing}
            data-testid="refresh-orders-btn"
            title="Refresh orders from database"
          >
            {refreshing ? "↻ Syncing..." : "↻ Refresh Orders"}
          </button>
        </div>
      </div>

      {/* Integration Status Notice */}
      <div className="adm-notice-banner adm-notice-info" role="status">
        <span className="adm-notice-icon">ℹ️</span>
        <div>
          <strong>Phase 6 Engineering Roadmap Status:</strong> Customer checkout and order placement endpoints (
          <code>POST /api/orders</code> &amp; <code>GET /api/admin/orders</code>) are scheduled for Phase 6. The UI schema below is modeled against the active PostgreSQL <code>Order</code> and <code>OrderItem</code> Prisma schema tables.
        </div>
      </div>

      {error && (
        <div className="adm-notice-banner adm-notice-warning" role="alert">
          <span className="adm-notice-icon">⚠️</span>
          <div>
            <strong>Orders Notice:</strong> {error}
          </div>
        </div>
      )}

      {/* Summary KPI Grid (rendered when orders exist) */}
      {rawOrders.length > 0 && (
        <div className="adm-customer-kpi-grid">
          <div className="adm-customer-kpi-card">
            <div className="adm-customer-kpi-info">
              <span className="adm-customer-kpi-label">Total Orders</span>
              <span className="adm-customer-kpi-val">{totalOrdersCount}</span>
            </div>
            <div className="adm-customer-kpi-icon icon-blue" aria-hidden="true">
              📦
            </div>
          </div>

          <div className="adm-customer-kpi-card">
            <div className="adm-customer-kpi-info">
              <span className="adm-customer-kpi-label">Pending Fulfillment</span>
              <span className="adm-customer-kpi-val">{pendingCount}</span>
            </div>
            <div className="adm-customer-kpi-icon icon-amber" aria-hidden="true">
              ⏳
            </div>
          </div>

          <div className="adm-customer-kpi-card">
            <div className="adm-customer-kpi-info">
              <span className="adm-customer-kpi-label">Dispatched / Delivered</span>
              <span className="adm-customer-kpi-val">{fulfilledCount}</span>
            </div>
            <div className="adm-customer-kpi-icon icon-green" aria-hidden="true">
              🚚
            </div>
          </div>

          <div className="adm-customer-kpi-card">
            <div className="adm-customer-kpi-info">
              <span className="adm-customer-kpi-label">Gross Value</span>
              <span className="adm-customer-kpi-val" style={{ fontSize: "1.3rem" }}>
                {formatINR(totalRevenue)}
              </span>
            </div>
            <div className="adm-customer-kpi-icon icon-purple" aria-hidden="true">
              💰
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="adm-filter-bar">
        <div className="adm-search-input-wrap">
          <span className="adm-search-icon" aria-hidden="true">
            🔍
          </span>
          <input
            type="text"
            className="adm-search-input"
            placeholder="Search by order number (e.g. VTX-...) or recipient..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={rawOrders.length === 0 && !hasActiveFilters}
            aria-label="Search orders"
          />
        </div>

        <div className="adm-filter-group">
          <select
            className="adm-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by order status"
          >
            <option value="all">All Order Statuses ({rawOrders.length})</option>
            <option value="PENDING">PENDING</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="PROCESSING">PROCESSING</option>
            <option value="SHIPPED">SHIPPED</option>
            <option value="DELIVERED">DELIVERED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>

          <select
            className="adm-select"
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            aria-label="Filter by payment status"
          >
            <option value="all">All Payment Statuses</option>
            <option value="PENDING">Pending (COD)</option>
            <option value="PAID">Paid</option>
            <option value="FAILED">Failed</option>
            <option value="REFUNDED">Refunded</option>
          </select>

          {hasActiveFilters && (
            <button
              type="button"
              className="adm-btn adm-btn-secondary adm-btn-sm"
              onClick={handleClearFilters}
              title="Reset all filters"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="adm-loading-screen" role="status">
          <span className="adm-spinner adm-spinner-dark" aria-hidden="true" />
          <p>Querying orders endpoint...</p>
        </div>
      ) : rawOrders.length === 0 ? (
        /* Empty Database State */
        <div className="adm-empty-state">
          <div className="adm-empty-icon" aria-hidden="true">
            📦
          </div>
          <h3 className="adm-empty-title">No Orders Placed Yet</h3>
          <p className="adm-empty-desc">
            When customer checkouts and procurement orders are submitted, they will appear here in real time for fulfillment tracking.
          </p>
        </div>
      ) : filteredOrders.length === 0 ? (
        /* Empty Search / Filter Results State */
        <div className="adm-empty-state">
          <div className="adm-empty-icon" aria-hidden="true">
            🔍
          </div>
          <h3 className="adm-empty-title">No Matching Orders Found</h3>
          <p className="adm-empty-desc">
            No orders match the selected search query <strong>"{searchQuery}"</strong>
            {statusFilter !== "all" && <> with status <strong>{statusFilter}</strong></>}
            {paymentFilter !== "all" && <> and payment status <strong>{paymentFilter}</strong></>}.
          </p>
          <button
            type="button"
            className="adm-btn adm-btn-secondary"
            onClick={handleClearFilters}
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="adm-card adm-order-desktop-table" style={{ padding: 0 }}>
            <div className="adm-table-container">
              <table className="adm-table" aria-label="Orders list">
                <thead>
                  <tr>
                    <th>Order Number</th>
                    <th>Date</th>
                    <th>Customer / Recipient</th>
                    <th>Items</th>
                    <th>Subtotal</th>
                    <th>Tax (GST)</th>
                    <th>Total Amount</th>
                    <th>Order Status</th>
                    <th>Payment Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => {
                    const itemCount = getItemCount(order);
                    const recipient = getRecipient(order);
                    const city = getCity(order);
                    const state = getState(order);
                    const status = getOrderStatus(order);
                    const payment = getPaymentStatus(order);

                    return (
                      <tr key={order.id || order.orderNumber}>
                        <td>
                          <code style={{ fontWeight: 700 }}>{order.orderNumber}</code>
                        </td>
                        <td>{formatOrderDate(order.createdAt)}</td>
                        <td>
                          <strong>{recipient}</strong>
                          <div style={{ fontSize: "0.76rem", color: "var(--adm-text-secondary)" }}>
                            {city && state ? `${city}, ${state}` : city || state || "India"}
                          </div>
                        </td>
                        <td>{itemCount} unit{itemCount !== 1 ? "s" : ""}</td>
                        <td>{formatINR(order.subtotal)}</td>
                        <td>{formatINR(order.taxAmount)}</td>
                        <td>
                          <strong>{formatINR(order.totalAmount)}</strong>
                        </td>
                        <td>
                          <span className={`adm-badge ${getOrderStatusBadgeClass(status)}`}>
                            {status}
                          </span>
                        </td>
                        <td>
                          <span className={`adm-badge ${getPaymentBadgeClass(payment)}`}>
                            {payment}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="adm-btn adm-btn-secondary adm-btn-sm"
                            onClick={() => setInspectingOrder(order)}
                            data-testid={`inspect-order-${order.orderNumber}`}
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Desktop Table Footer */}
            <div className="adm-pagination">
              <span>
                Showing {filteredOrders.length} of {rawOrders.length} orders
              </span>
              {hasActiveFilters && (
                <button
                  type="button"
                  className="adm-btn adm-btn-secondary adm-btn-sm"
                  onClick={handleClearFilters}
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Mobile Cards View (Optimized for viewports <= 768px) */}
          <div className="adm-order-mobile-cards">
            {filteredOrders.map((order) => {
              const itemCount = getItemCount(order);
              const recipient = getRecipient(order);
              const city = getCity(order);
              const state = getState(order);
              const status = getOrderStatus(order);
              const payment = getPaymentStatus(order);

              return (
                <div key={order.id || order.orderNumber} className="adm-order-card">
                  <div className="adm-order-card-header">
                    <code>{order.orderNumber}</code>
                    <span className={`adm-badge ${getOrderStatusBadgeClass(status)}`}>
                      {status}
                    </span>
                  </div>

                  <div className="adm-order-card-meta">
                    <div>
                      <strong style={{ color: "var(--adm-text-primary)" }}>{recipient}</strong>
                      <div style={{ fontSize: "0.76rem", color: "var(--adm-text-secondary)" }}>
                        {city && state ? `${city}, ${state}` : city || state || "India"}
                      </div>
                    </div>
                    <span style={{ fontSize: "0.78rem", color: "var(--adm-text-muted)" }}>
                      {formatOrderDate(order.createdAt)}
                    </span>
                  </div>

                  <div className="adm-order-card-body">
                    <div className="adm-order-card-item">
                      <span className="adm-order-card-label">Items Count</span>
                      <span className="adm-order-card-value">
                        {itemCount} unit{itemCount !== 1 ? "s" : ""}
                      </span>
                    </div>

                    <div className="adm-order-card-item">
                      <span className="adm-order-card-label">Payment Status</span>
                      <span className={`adm-badge ${getPaymentBadgeClass(payment)}`} style={{ alignSelf: "flex-start" }}>
                        {payment}
                      </span>
                    </div>

                    <div className="adm-order-card-item">
                      <span className="adm-order-card-label">Subtotal + GST</span>
                      <span className="adm-order-card-value">
                        {formatINR(order.subtotal)} + {formatINR(order.taxAmount)}
                      </span>
                    </div>

                    <div className="adm-order-card-item">
                      <span className="adm-order-card-label">Total Amount</span>
                      <span className="adm-order-card-value" style={{ color: "var(--adm-primary)", fontSize: "0.95rem" }}>
                        {formatINR(order.totalAmount)}
                      </span>
                    </div>
                  </div>

                  <div className="adm-order-card-footer">
                    <span style={{ fontSize: "0.78rem", color: "var(--adm-text-muted)" }}>
                      Method: <strong>{getPaymentMethod(order)}</strong>
                    </span>
                    <button
                      type="button"
                      className="adm-btn adm-btn-secondary adm-btn-sm"
                      onClick={() => setInspectingOrder(order)}
                    >
                      Details &rarr;
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Comprehensive Order Details & Discount Breakdown Modal */}
      {inspectingOrder && (
        <div
          className="adm-modal-backdrop"
          onClick={() => setInspectingOrder(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="order-details-title"
        >
          <div
            className="adm-modal"
            style={{ maxWidth: 840 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="adm-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <h2 id="order-details-title" className="adm-modal-title" style={{ margin: 0 }}>
                  Order Details: {inspectingOrder.orderNumber}
                </h2>
                <span className={`adm-badge ${getOrderStatusBadgeClass(getOrderStatus(inspectingOrder))}`}>
                  {getOrderStatus(inspectingOrder)}
                </span>
              </div>
              <button
                type="button"
                className="adm-modal-close"
                onClick={() => setInspectingOrder(null)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <div className="adm-modal-body" style={{ maxHeight: "75vh", overflowY: "auto" }}>
              {/* Section A: Order Summary */}
              <div className="adm-order-detail-card" style={{ marginBottom: 20 }}>
                <h3 className="adm-section-title">A. Order Summary &amp; Fulfillment Tracking</h3>
                <div className="adm-detail-grid">
                  <div>
                    <span className="adm-label">Order Number</span>
                    <p><code>{inspectingOrder.orderNumber}</code></p>
                  </div>
                  <div>
                    <span className="adm-label">Order Date</span>
                    <p>{new Date(inspectingOrder.createdAt).toLocaleString("en-IN")}</p>
                  </div>
                  <div>
                    <span className="adm-label">Payment Method &amp; Status</span>
                    <p>
                      <strong>{getPaymentMethod(inspectingOrder)}</strong> —{" "}
                      <span className={`adm-badge ${getPaymentBadgeClass(getPaymentStatus(inspectingOrder))}`}>
                        {getPaymentStatus(inspectingOrder)}
                      </span>
                    </p>
                  </div>
                  <div>
                    <span className="adm-label">Carrier &amp; Tracking</span>
                    <p>
                      {inspectingOrder.carrier || "Standard Dispatch"}{" "}
                      {inspectingOrder.trackingNumber ? `(${inspectingOrder.trackingNumber})` : "(Pending dispatch)"}
                    </p>
                  </div>
                </div>

                <div style={{ marginTop: 12, borderTop: "1px solid var(--adm-border)", paddingTop: 12 }}>
                  <span className="adm-label">Shipping Recipient &amp; Delivery Destination</span>
                  <p style={{ margin: "4px 0 0", fontWeight: 600 }}>{getRecipient(inspectingOrder)}</p>
                  <p style={{ margin: "2px 0 0", color: "var(--adm-text-secondary)", fontSize: "0.85rem", lineHeight: 1.5 }}>
                    Phone: {getPhone(inspectingOrder)}
                    <br />
                    {getLine1(inspectingOrder)}
                    {getLine2(inspectingOrder) && `, ${getLine2(inspectingOrder)}`}
                    <br />
                    {getCity(inspectingOrder)}, {getState(inspectingOrder)} - {getPostalCode(inspectingOrder)}, {getCountry(inspectingOrder)}
                  </p>
                </div>
              </div>

              {/* Section B: Order Items */}
              <div className="adm-order-detail-card" style={{ marginBottom: 20 }}>
                <h3 className="adm-section-title">B. Order Items Snapshot</h3>
                <div className="adm-table-container">
                  <table className="adm-table">
                    <thead>
                      <tr>
                        <th>Product &amp; SKU</th>
                        <th>Qty</th>
                        <th>Unit Price</th>
                        <th>GST Rate</th>
                        <th>Item Tax</th>
                        <th>Item Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(inspectingOrder.items || []).map((item, idx) => (
                        <tr key={item.id || idx}>
                          <td>
                            <strong>{getItemName(item)}</strong>
                            <div style={{ fontSize: "0.76rem" }}>
                              <code>{getItemSku(item)}</code> {getItemPack(item) && `• ${getItemPack(item)}`}
                            </div>
                          </td>
                          <td>{item.quantity}</td>
                          <td>{formatINR(item.unitPrice)}</td>
                          <td>{item.gstRate !== undefined && item.gstRate !== null ? `${Number(item.gstRate)}%` : "18%"}</td>
                          <td>{formatINR(item.taxAmount || 0)}</td>
                          <td>
                            <strong>{formatINR(item.lineTotal || 0)}</strong>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section C: Price and Discount Breakdown */}
              <div className="adm-order-detail-card" style={{ marginBottom: 20 }}>
                <h3 className="adm-section-title">C. Authoritative Price &amp; Discount Breakdown</h3>
                <div className="adm-breakdown-list">
                  <div className="adm-breakdown-row">
                    <span>Subtotal (before discounts)</span>
                    <span>{formatINR(inspectingOrder.subtotal || 0)}</span>
                  </div>
                  <div className="adm-breakdown-row">
                    <span>Item-level Discounts</span>
                    <span style={{ color: "var(--adm-text-muted)" }}>
                      {inspectingOrder.itemDiscount ? `₹${Number(inspectingOrder.itemDiscount).toFixed(2)}` : "₹0.00"}
                    </span>
                  </div>
                  <div className="adm-breakdown-row">
                    <span>Order-level Discount</span>
                    <span style={{ color: "var(--adm-text-muted)" }}>
                      {inspectingOrder.orderDiscount ? `₹${Number(inspectingOrder.orderDiscount).toFixed(2)}` : "₹0.00"}
                    </span>
                  </div>
                  <div className="adm-breakdown-row">
                    <span>Coupon / Promotion Code</span>
                    <span style={{ color: "var(--adm-text-muted)" }}>
                      {inspectingOrder.couponCode || "None Applied"}
                    </span>
                  </div>
                  <div className="adm-breakdown-row">
                    <span>Shipping Charge</span>
                    <span style={{ color: Number(inspectingOrder.shippingFee || 0) === 0 ? "var(--adm-success)" : "inherit" }}>
                      {formatINR(inspectingOrder.shippingFee || 0)}
                      {Number(inspectingOrder.shippingFee || 0) === 0 ? " (Free Commercial Shipping)" : ""}
                    </span>
                  </div>
                  <div className="adm-breakdown-row">
                    <span>Goods &amp; Services Tax (GST)</span>
                    <span>{formatINR(inspectingOrder.taxAmount || 0)}</span>
                  </div>
                  {Number(inspectingOrder.refundAmount || 0) > 0 && (
                    <div className="adm-breakdown-row" style={{ color: "var(--adm-orange)" }}>
                      <span>Refund Amount</span>
                      <span>-{formatINR(inspectingOrder.refundAmount)}</span>
                    </div>
                  )}
                  <div className="adm-breakdown-row adm-breakdown-total">
                    <span>Authoritative Order Total</span>
                    <span>{formatINR(inspectingOrder.totalAmount || 0)}</span>
                  </div>
                </div>
              </div>

              {/* Section D: Discount Adjustment (Read-Only Guardrail) */}
              <div className="adm-order-detail-card">
                <h3 className="adm-section-title">D. Order Adjustment &amp; Discount Management</h3>
                <div className="adm-notice-banner adm-notice-warning" style={{ margin: "8px 0" }}>
                  <span className="adm-notice-icon">🔒</span>
                  <div>
                    <strong>Backend Discount Adjustment Capability Gap:</strong> The backend PostgreSQL schema does not currently support dynamic order adjustments (e.g. <code>PATCH /api/admin/orders/:id/discount</code>). Totals are locked immutably to prevent client-side financial discrepancies.
                  </div>
                </div>

                <div className="adm-form-grid" style={{ opacity: 0.65, marginTop: 12 }}>
                  <div className="adm-form-field">
                    <label>Adjustment Type</label>
                    <select className="adm-select" disabled>
                      <option>Fixed Commercial Credit (₹)</option>
                      <option>Percentage (%)</option>
                    </select>
                  </div>
                  <div className="adm-form-field">
                    <label>Adjustment Value</label>
                    <input type="number" className="adm-input" placeholder="0.00" disabled />
                  </div>
                  <div className="adm-form-field" style={{ gridColumn: "span 2" }}>
                    <label>Business Justification / Reason</label>
                    <input type="text" className="adm-input" placeholder="e.g. Volume tier reconciliation" disabled />
                  </div>
                </div>
              </div>
            </div>

            <div className="adm-modal-footer">
              <button
                type="button"
                className="adm-btn adm-btn-secondary"
                onClick={() => setInspectingOrder(null)}
              >
                Close Order Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
