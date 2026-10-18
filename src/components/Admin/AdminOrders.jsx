import React, { useState, useEffect } from "react";
import { getAdminOrders } from "../../services/adminApi";

export default function AdminOrders({ initialFilter = "all" }) {
  const [loading, setLoading] = useState(true);
  const [ordersResponse, setOrdersResponse] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(initialFilter);
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [inspectingOrder, setInspectingOrder] = useState(null);

  useEffect(() => {
    async function loadOrders() {
      try {
        setLoading(true);
        const res = await getAdminOrders();
        setOrdersResponse(res);
      } catch (err) {
        setOrdersResponse({
          isImplemented: false,
          message: err.message,
          orders: [],
        });
      } finally {
        setLoading(false);
      }
    }
    loadOrders();
  }, []);

  const rawOrders = ordersResponse?.orders || [];
  const displayOrders = rawOrders;

  const filteredOrders = displayOrders.filter((o) => {
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.shippingRecipient.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.shippingCity && o.shippingCity.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === "all" || o.orderStatus === statusFilter;
    const matchesPayment = paymentFilter === "all" || o.paymentStatus === paymentFilter;

    return matchesSearch && matchesStatus && matchesPayment;
  });

  return (
    <div className="adm-orders-view">
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
            onClick={() => {
              setLoading(true);
              getAdminOrders()
                .then((res) => setOrdersResponse(res))
                .catch(() => {})
                .finally(() => setLoading(false));
            }}
          >
            ↻ Refresh Orders
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
            <option value="all">All Order Statuses</option>
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
        </div>
      </div>

      {/* Orders Table */}
      {loading ? (
        <div className="adm-loading-screen" role="status">
          <span className="adm-spinner adm-spinner-dark" aria-hidden="true" />
          <p>Querying orders endpoint...</p>
        </div>
      ) : (
        <div className="adm-card" style={{ padding: 0 }}>
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
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan="10" style={{ textAlign: "center", padding: "32px 16px", color: "var(--adm-text-secondary)" }}>
                      No orders match the selected search or filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    const itemCount = (order.items || []).reduce((acc, it) => acc + (it.quantity || 1), 0);
                    return (
                      <tr key={order.id || order.orderNumber}>
                        <td>
                          <code>{order.orderNumber}</code>
                        </td>
                        <td>{new Date(order.createdAt).toLocaleDateString("en-IN")}</td>
                        <td>
                          <strong>{order.shippingRecipient}</strong>
                          <div style={{ fontSize: "0.76rem", color: "var(--adm-text-secondary)" }}>
                            {order.shippingCity}, {order.shippingState}
                          </div>
                        </td>
                        <td>{itemCount} units</td>
                        <td>₹{Number(order.subtotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                        <td>₹{Number(order.taxAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                        <td>
                          <strong>₹{Number(order.totalAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>
                        </td>
                        <td>
                          <span className={`adm-badge ${
                            order.orderStatus === "DELIVERED" ? "adm-badge-success" :
                            order.orderStatus === "CANCELLED" ? "adm-badge-danger" :
                            order.orderStatus === "SHIPPED" ? "adm-badge-info" : "adm-badge-warning"
                          }`}>
                            {order.orderStatus}
                          </span>
                        </td>
                        <td>
                          <span className={`adm-badge ${
                            order.paymentStatus === "PAID" ? "adm-badge-success" :
                            order.paymentStatus === "REFUNDED" ? "adm-badge-neutral" : "adm-badge-warning"
                          }`}>
                            {order.paymentStatus}
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
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
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
                <span className="adm-badge adm-badge-info">{inspectingOrder.orderStatus}</span>
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
                      <strong>{inspectingOrder.paymentMethod || "COD"}</strong> —{" "}
                      <span className="adm-badge adm-badge-warning">{inspectingOrder.paymentStatus}</span>
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
                  <p style={{ margin: "4px 0 0", fontWeight: 600 }}>{inspectingOrder.shippingRecipient}</p>
                  <p style={{ margin: "2px 0 0", color: "var(--adm-text-secondary)", fontSize: "0.85rem" }}>
                    Phone: {inspectingOrder.shippingPhone}
                    <br />
                    {inspectingOrder.shippingLine1}
                    {inspectingOrder.shippingLine2 && `, ${inspectingOrder.shippingLine2}`}
                    <br />
                    {inspectingOrder.shippingCity}, {inspectingOrder.shippingState} - {inspectingOrder.shippingPostalCode}, {inspectingOrder.shippingCountry || "India"}
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
                            <strong>{item.productName}</strong>
                            <div style={{ fontSize: "0.76rem" }}>
                              <code>{item.sku}</code> {item.packSize && `• ${item.packSize}`}
                            </div>
                          </td>
                          <td>{item.quantity}</td>
                          <td>₹{Number(item.unitPrice).toFixed(2)}</td>
                          <td>{item.gstRate !== undefined && item.gstRate !== null ? `${Number(item.gstRate)}%` : "—"}</td>
                          <td>₹{Number(item.taxAmount || 0).toFixed(2)}</td>
                          <td>
                            <strong>₹{Number(item.lineTotal || 0).toFixed(2)}</strong>
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
                    <span>₹{Number(inspectingOrder.subtotal || 0).toFixed(2)}</span>
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
                      ₹{Number(inspectingOrder.shippingFee || 0).toFixed(2)}
                      {Number(inspectingOrder.shippingFee || 0) === 0 ? " (Free Commercial Shipping)" : ""}
                    </span>
                  </div>
                  <div className="adm-breakdown-row">
                    <span>Goods &amp; Services Tax (GST)</span>
                    <span>₹{Number(inspectingOrder.taxAmount || 0).toFixed(2)}</span>
                  </div>
                  {Number(inspectingOrder.refundAmount || 0) > 0 && (
                    <div className="adm-breakdown-row" style={{ color: "var(--adm-orange)" }}>
                      <span>Refund Amount</span>
                      <span>-₹{Number(inspectingOrder.refundAmount).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="adm-breakdown-row adm-breakdown-total">
                    <span>Authoritative Order Total</span>
                    <span>₹{Number(inspectingOrder.totalAmount || 0).toFixed(2)}</span>
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
