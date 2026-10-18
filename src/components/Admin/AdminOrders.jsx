import React, { useState, useEffect } from "react";
import { getAdminOrders } from "../../services/adminApi";

export default function AdminOrders() {
  const [loading, setLoading] = useState(true);
  const [ordersResponse, setOrdersResponse] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
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

  const orders = ordersResponse?.orders || [];
  const isImplemented = ordersResponse?.isImplemented !== false;

  return (
    <div className="adm-orders-view">
      <div className="adm-page-header">
        <div className="adm-page-title-group">
          <h1>Orders &amp; Fulfillment Management</h1>
          <p className="adm-page-subtitle">
            Track customer orders, manage shipment lifecycle, verify payment status, and dispatch tracking details.
          </p>
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
            placeholder="Search by order number (e.g. VTX-2026-...) or recipient..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={!isImplemented || orders.length === 0}
            aria-label="Search orders"
          />
        </div>

        <div className="adm-filter-group">
          <select
            className="adm-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            disabled={!isImplemented || orders.length === 0}
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
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="adm-loading-screen" role="status">
          <span className="adm-spinner adm-spinner-dark" aria-hidden="true" />
          <p>Querying orders endpoint...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="adm-card">
          <div className="adm-card-header">
            <h2 className="adm-card-title">Order Lifecycle Architecture &amp; State Machine</h2>
            <span className="adm-badge adm-badge-info">Prisma Schema Aligned</span>
          </div>
          <div className="adm-card-body">
            <p style={{ margin: "0 0 16px", color: "var(--adm-text-secondary)", fontSize: "0.9rem" }}>
              The database tables for orders (<code>Order</code> and <code>OrderItem</code>) have been migrated and hardened in PostgreSQL with decimal-safe financial precision:
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, marginBottom: 20 }}>
              <div style={{ background: "#f8fafc", padding: 16, borderRadius: 8, border: "1px solid var(--adm-border)" }}>
                <span className="adm-label">Permitted Order Statuses</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                  {["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"].map((s) => (
                    <span key={s} className="adm-badge adm-badge-neutral">{s}</span>
                  ))}
                </div>
              </div>

              <div style={{ background: "#f8fafc", padding: 16, borderRadius: 8, border: "1px solid var(--adm-border)" }}>
                <span className="adm-label">Permitted Payment Statuses</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                  {["PENDING", "PAID", "FAILED", "REFUNDED"].map((s) => (
                    <span key={s} className="adm-badge adm-badge-neutral">{s}</span>
                  ))}
                </div>
              </div>

              <div style={{ background: "#f8fafc", padding: 16, borderRadius: 8, border: "1px solid var(--adm-border)" }}>
                <span className="adm-label">Financial Safety Rules</span>
                <div style={{ fontSize: "0.82rem", color: "var(--adm-text-secondary)", marginTop: 6, lineHeight: 1.5 }}>
                  • Decimal(10,2) currency calculations on server<br />
                  • Stock decremented atomically via transaction<br />
                  • Historical pricing frozen in OrderItem
                </div>
              </div>
            </div>

            <div className="adm-empty-state" style={{ border: "1px dashed var(--adm-border)", background: "#ffffff" }}>
              <div className="adm-empty-icon" aria-hidden="true">🚚</div>
              <h3 className="adm-empty-title">Awaiting Live Orders</h3>
              <p className="adm-empty-desc">
                No orders have been submitted yet. When Phase 6 checkout is completed, customer purchases and B2B orders will display in real time here.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="adm-card" style={{ padding: 0 }}>
          <div className="adm-table-container">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Customer / Recipient</th>
                  <th>Order Status</th>
                  <th>Payment</th>
                  <th>Total Amount</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <code>{order.orderNumber}</code>
                    </td>
                    <td>
                      <strong>{order.shippingRecipient}</strong>
                      <div style={{ fontSize: "0.76rem", color: "var(--adm-text-secondary)" }}>
                        {order.shippingCity}, {order.shippingState}
                      </div>
                    </td>
                    <td>
                      <span className="adm-badge adm-badge-info">{order.orderStatus}</span>
                    </td>
                    <td>
                      <span className="adm-badge adm-badge-success">{order.paymentStatus}</span>
                    </td>
                    <td>
                      <strong>₹{Number(order.totalAmount).toLocaleString("en-IN")}</strong>
                    </td>
                    <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button
                        type="button"
                        className="adm-btn adm-btn-secondary adm-btn-sm"
                        onClick={() => setInspectingOrder(order)}
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Inspect Order Drawer */}
      {inspectingOrder && (
        <div className="adm-modal-backdrop" onClick={() => setInspectingOrder(null)}>
          <div
            className="adm-modal"
            style={{ maxWidth: 700 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="order-details-title"
          >
            <div className="adm-modal-header">
              <h2 id="order-details-title" className="adm-modal-title">
                Order #{inspectingOrder.orderNumber}
              </h2>
              <button
                type="button"
                className="adm-modal-close"
                onClick={() => setInspectingOrder(null)}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>
            <div className="adm-modal-body">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div>
                  <span className="adm-label">Shipping Recipient</span>
                  <strong>{inspectingOrder.shippingRecipient}</strong>
                  <div style={{ fontSize: "0.82rem", color: "var(--adm-text-secondary)" }}>
                    Phone: {inspectingOrder.shippingPhone}
                  </div>
                </div>
                <div>
                  <span className="adm-label">Delivery Address</span>
                  <div style={{ fontSize: "0.85rem", color: "var(--adm-text-secondary)" }}>
                    {inspectingOrder.shippingLine1}
                    {inspectingOrder.shippingLine2 && `, ${inspectingOrder.shippingLine2}`}
                    <br />
                    {inspectingOrder.shippingCity}, {inspectingOrder.shippingState} - {inspectingOrder.shippingPostalCode}
                  </div>
                </div>
              </div>

              <span className="adm-label">Ordered Items</span>
              <div className="adm-table-container" style={{ marginTop: 8 }}>
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>Product / SKU</th>
                      <th>Qty</th>
                      <th>Unit Price</th>
                      <th>Tax</th>
                      <th>Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(inspectingOrder.items || []).map((item) => (
                      <tr key={item.id}>
                        <td>
                          <strong>{item.productName}</strong>
                          <div style={{ fontSize: "0.74rem" }}>
                            <code>{item.sku}</code>
                          </div>
                        </td>
                        <td>{item.quantity}</td>
                        <td>₹{Number(item.unitPrice).toLocaleString("en-IN")}</td>
                        <td>₹{Number(item.taxAmount).toLocaleString("en-IN")}</td>
                        <td>
                          <strong>₹{Number(item.lineTotal).toLocaleString("en-IN")}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="adm-modal-footer">
              <button
                type="button"
                className="adm-btn adm-btn-secondary"
                onClick={() => setInspectingOrder(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
