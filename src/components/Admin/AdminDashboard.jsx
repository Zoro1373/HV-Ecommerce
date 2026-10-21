import React, { useState, useEffect, useCallback } from "react";
import {
  getAdminProducts,
  getAdminCategories,
  getSystemHealth,
  getAdminOrders,
} from "../../services/adminApi";

export default function AdminDashboard({ onNavigateSection, onNavigateStorefront }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [productsData, setProductsData] = useState({ products: [], pagination: {} });
  const [categories, setCategories] = useState([]);
  const [health, setHealth] = useState(null);
  const [ordersData, setOrdersData] = useState({ orders: [], isImplemented: false });

  const loadDashboardData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const [prodRes, catRes, healthRes, ordRes] = await Promise.all([
        getAdminProducts({ limit: 50 }),
        getAdminCategories(),
        getSystemHealth().catch(() => null),
        getAdminOrders().catch(() => ({ orders: [], isImplemented: false })),
      ]);

      setProductsData(prodRes || { products: [], pagination: {} });
      setCategories(catRes?.categories || []);
      setHealth(healthRes);
      setOrdersData(ordRes || { orders: [], isImplemented: false });
    } catch (err) {
      setError(err.message || "Failed to load dashboard metrics from backend API.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const products = productsData.products || [];
  const totalProductsCount = productsData.pagination?.totalItems || products.length;

  // Flatten all variants from loaded products
  const allVariants = products.flatMap((p) =>
    (p.variants || []).map((v) => ({
      ...v,
      productName: p.name,
      productSlug: p.slug,
      categoryName: p.category?.name || "General",
    }))
  );

  const lowStockItems = allVariants.filter(
    (v) => (v.stockQuantity || 0) <= 50
  );

  // Orders operational calculations - strictly derived from live API response
  const rawOrders = ordersData.orders || [];
  const totalOrders = rawOrders.length;
  const isOrdersEndpointAvailable = ordersData.isImplemented !== false;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const ordersToday = rawOrders.filter(
    (o) => o.createdAt && new Date(o.createdAt) >= todayStart
  ).length;

  const pendingOrders = rawOrders.filter((o) => o.orderStatus === "PENDING").length;
  const processingOrders = rawOrders.filter((o) => o.orderStatus === "PROCESSING" || o.orderStatus === "CONFIRMED").length;
  const shippedOrders = rawOrders.filter((o) => o.orderStatus === "SHIPPED").length;
  const deliveredOrders = rawOrders.filter((o) => o.orderStatus === "DELIVERED").length;
  const cancelledOrders = rawOrders.filter((o) => o.orderStatus === "CANCELLED").length;

  if (loading) {
    return (
      <div className="adm-loading-screen" role="status">
        <span className="adm-spinner adm-spinner-dark" aria-hidden="true" />
        <p>Connecting to VERTEX PostgreSQL database &amp; loading metrics...</p>
      </div>
    );
  }

  return (
    <div className="adm-dashboard-view">
      {/* Page Title & Actions */}
      <div className="adm-page-header">
        <div className="adm-page-title-group">
          <h1>Admin Overview</h1>
          <p className="adm-page-subtitle">
            Real-time industrial electronics catalog, stock telemetry, and store operations.
          </p>
        </div>
        <div className="adm-page-actions">
          <button
            type="button"
            className="adm-btn adm-btn-secondary"
            onClick={() => loadDashboardData(true)}
            disabled={refreshing}
            data-testid="refresh-telemetry-btn"
          >
            {refreshing ? "Refreshing..." : "↻ Refresh Telemetry"}
          </button>
          <button
            type="button"
            className="adm-btn adm-btn-secondary"
            onClick={onNavigateStorefront}
          >
            🏪 View Storefront
          </button>
          <button
            type="button"
            className="adm-btn adm-btn-primary"
            onClick={() => onNavigateSection("products")}
          >
            + Add Product
          </button>
        </div>
      </div>

      {error && (
        <div className="adm-notice-banner adm-notice-warning" role="alert">
          <span className="adm-notice-icon">⚠️</span>
          <div>
            <strong>API Notice:</strong> {error}
          </div>
        </div>
      )}

      {/* Primary KPI Metrics Grid */}
      <div className="adm-metrics-grid">
        <div
          className="adm-metric-card"
          onClick={() => onNavigateSection("products")}
          style={{ cursor: "pointer" }}
        >
          <div className="adm-metric-info">
            <span className="adm-metric-label">Active Products</span>
            <span className="adm-metric-value">{totalProductsCount}</span>
            <span className="adm-metric-sub">
              {categories.length} Categories • Verified Active
            </span>
          </div>
          <div className="adm-metric-icon" aria-hidden="true">
            📦
          </div>
        </div>

        <div
          className="adm-metric-card"
          onClick={() => onNavigateSection("orders")}
          style={{ cursor: "pointer" }}
        >
          <div className="adm-metric-info">
            <span className="adm-metric-label">Orders &amp; Revenue</span>
            <span className="adm-metric-value" style={{ fontSize: "1.2rem", marginTop: 4 }}>
              Phase 6 Ready
            </span>
            <span className="adm-metric-sub">
              {totalOrders > 0 ? `${totalOrders} Orders Recorded` : "Awaiting checkout order placement"}
            </span>
          </div>
          <div className="adm-metric-icon icon-orange" aria-hidden="true">
            🚚
          </div>
        </div>
      </div>

      {/* Operational Order Monitoring Dashboard Panel */}
      <div className="adm-card" style={{ marginBottom: 24 }}>
        <div className="adm-card-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: "1.2rem" }}>📡</span>
            <h2 className="adm-card-title" style={{ margin: 0 }}>
              Operational Order Monitoring Dashboard
            </h2>
          </div>
          <span className="adm-badge adm-badge-info">Real-Time Operational Status</span>
        </div>
        <div className="adm-card-body">
          <p style={{ margin: "0 0 16px", color: "var(--adm-text-secondary)", fontSize: "0.88rem" }}>
            Live status visibility across customer fulfillment pipelines. Select any metric to jump to filtered orders:
          </p>

          <div className="adm-order-kpi-grid">
            <div
              className="adm-order-kpi-box"
              onClick={() => onNavigateSection("orders")}
              role="button"
              tabIndex={0}
              title="View all orders"
            >
              <span className="adm-order-kpi-count">{totalOrders}</span>
              <span className="adm-order-kpi-title">Total Orders</span>
              <span className="adm-order-kpi-hint">All time</span>
            </div>

            <div
              className="adm-order-kpi-box"
              onClick={() => onNavigateSection("orders")}
              role="button"
              tabIndex={0}
              title="View orders received today"
            >
              <span className="adm-order-kpi-count">{isOrdersEndpointAvailable ? ordersToday : 0}</span>
              <span className="adm-order-kpi-title">Orders Today</span>
              <span className="adm-order-kpi-hint">{isOrdersEndpointAvailable ? "Active shift" : "Pending endpoint"}</span>
            </div>

            <div
              className="adm-order-kpi-box kpi-pending"
              onClick={() => onNavigateSection("orders")}
              role="button"
              tabIndex={0}
              title="View pending orders"
            >
              <span className="adm-order-kpi-count">{isOrdersEndpointAvailable ? pendingOrders : 0}</span>
              <span className="adm-order-kpi-title">Pending Review</span>
              <span className="adm-order-kpi-hint">{isOrdersEndpointAvailable ? "Unprocessed" : "Pending endpoint"}</span>
            </div>

            <div
              className="adm-order-kpi-box kpi-processing"
              onClick={() => onNavigateSection("orders")}
              role="button"
              tabIndex={0}
              title="View processing orders"
            >
              <span className="adm-order-kpi-count">{isOrdersEndpointAvailable ? processingOrders : 0}</span>
              <span className="adm-order-kpi-title">Processing</span>
              <span className="adm-order-kpi-hint">{isOrdersEndpointAvailable ? "Picking / Packing" : "Pending endpoint"}</span>
            </div>

            <div
              className="adm-order-kpi-box kpi-shipped"
              onClick={() => onNavigateSection("orders")}
              role="button"
              tabIndex={0}
              title="View shipped orders"
            >
              <span className="adm-order-kpi-count">{isOrdersEndpointAvailable ? shippedOrders : 0}</span>
              <span className="adm-order-kpi-title">Dispatched</span>
              <span className="adm-order-kpi-hint">{isOrdersEndpointAvailable ? "In transit" : "Pending endpoint"}</span>
            </div>

            <div
              className="adm-order-kpi-box kpi-delivered"
              onClick={() => onNavigateSection("orders")}
              role="button"
              tabIndex={0}
              title="View delivered orders"
            >
              <span className="adm-order-kpi-count">{isOrdersEndpointAvailable ? deliveredOrders : 0}</span>
              <span className="adm-order-kpi-title">Delivered</span>
              <span className="adm-order-kpi-hint">{isOrdersEndpointAvailable ? "Completed" : "Pending endpoint"}</span>
            </div>

            <div
              className="adm-order-kpi-box kpi-cancelled"
              onClick={() => onNavigateSection("orders")}
              role="button"
              tabIndex={0}
              title="View cancelled orders"
            >
              <span className="adm-order-kpi-count">{isOrdersEndpointAvailable ? cancelledOrders : 0}</span>
              <span className="adm-order-kpi-title">Cancelled</span>
              <span className="adm-order-kpi-hint">{isOrdersEndpointAvailable ? "Voided" : "Pending endpoint"}</span>
            </div>

            <div
              className="adm-order-kpi-box kpi-refund"
              onClick={() => onNavigateSection("refunds")}
              role="button"
              tabIndex={0}
              title="View refund requests"
            >
              <span className="adm-order-kpi-count">0</span>
              <span className="adm-order-kpi-title">Refund Requests</span>
              <span className="adm-order-kpi-hint">Gateway Pending</span>
            </div>
          </div>
        </div>
      </div>

      {/* System Status & Diagnostics Card */}
      <div className="adm-card">
        <div className="adm-card-header">
          <h2 className="adm-card-title">System Health &amp; Infrastructure</h2>
          <span className="adm-badge adm-badge-success">Operational</span>
        </div>
        <div className="adm-card-body">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
            <div>
              <span className="adm-label">Database Provider</span>
              <div style={{ fontWeight: 600, color: "var(--adm-text-primary)" }}>
                PostgreSQL 18.6 (Neon Cloud)
              </div>
              <div className="adm-form-hint">Role: vertex_app (Least Privilege)</div>
            </div>
            <div>
              <span className="adm-label">API Health Status</span>
              <div style={{ fontWeight: 600, color: health?.status === "UP" ? "#10b981" : "#ef4444" }}>
                ● {health?.status === "UP" ? "UP (Connected)" : "Degraded"}
              </div>
              <div className="adm-form-hint">Prisma ORM Connection Active</div>
            </div>
            <div>
              <span className="adm-label">Authentication &amp; Session</span>
              <div style={{ fontWeight: 600, color: "var(--adm-text-primary)" }}>
                HttpOnly Cookies (7-day valid)
              </div>
              <div className="adm-form-hint">CSRF: Strict Custom Header Mode</div>
            </div>
            <div>
              <span className="adm-label">Admin Protection</span>
              <div style={{ fontWeight: 600, color: "var(--adm-primary)" }}>
                MFA TOTP Supported
              </div>
              <div className="adm-form-hint">Role-based Access Control Enforced</div>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Grid: Low Stock Alert Items & Operational Activity Feed */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 24, marginBottom: 24 }}>
        {/* Low Stock Items Table */}
        <div className="adm-card" style={{ marginBottom: 0 }}>
          <div className="adm-card-header">
            <h2 className="adm-card-title">Low Stock Telemetry (&le; 50 Units)</h2>
            <button
              type="button"
              className="adm-btn adm-btn-secondary adm-btn-sm"
              onClick={() => onNavigateSection("inventory")}
            >
              Manage Inventory →
            </button>
          </div>
          <div className="adm-card-body" style={{ padding: 0 }}>
            {lowStockItems.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: "var(--adm-text-muted)" }}>
                ✓ All catalog variants are well-stocked above thresholds.
              </div>
            ) : (
              <div className="adm-table-container" style={{ border: "none" }}>
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>Product / Variant</th>
                      <th>SKU</th>
                      <th>Available</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStockItems.slice(0, 5).map((item) => (
                      <tr key={item.id}>
                        <td>
                          <strong>{item.productName}</strong>
                          <div style={{ fontSize: "0.76rem", color: "var(--adm-text-secondary)" }}>
                            {item.name || item.packSize || "Standard"}
                          </div>
                        </td>
                        <td>
                          <code style={{ fontSize: "0.78rem" }}>{item.sku}</code>
                        </td>
                        <td>
                          <strong>{item.stockQuantity}</strong> units
                        </td>
                        <td>
                          <span className="adm-badge adm-badge-warning">
                            Low Stock
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Operational Activity Feed */}
        <div className="adm-card" style={{ marginBottom: 0 }}>
          <div className="adm-card-header">
            <h2 className="adm-card-title">Operational Activity Feed</h2>
            <span className="adm-badge adm-badge-neutral">Audit Telemetry</span>
          </div>
          <div className="adm-card-body">
            <div className="adm-activity-feed">
              <div className="adm-activity-item">
                <span className={`adm-activity-dot ${health?.status === "UP" ? "dot-green" : "dot-orange"}`} aria-hidden="true" />
                <div className="adm-activity-content">
                  <div className="adm-activity-header">
                    <strong>PostgreSQL Connection {health?.status === "UP" ? "Verified" : "Check Needed"}</strong>
                    <span className="adm-activity-time">{health?.status === "UP" ? "Health: UP" : "Degraded"}</span>
                  </div>
                  <p className="adm-activity-desc">
                    {health?.status === "UP"
                      ? "Neon serverless database connection active and verified via /api/health."
                      : "Database health probe did not report UP status. Verify Neon connectivity."}
                  </p>
                </div>
              </div>

              <div className="adm-activity-item">
                <span className="adm-activity-dot dot-blue" aria-hidden="true" />
                <div className="adm-activity-content">
                  <div className="adm-activity-header">
                    <strong>Storefront Checkout System</strong>
                    <span className="adm-activity-time">Phase 3 Verified</span>
                  </div>
                  <p className="adm-activity-desc">
                    Customer checkout service mounted with atomic concurrency locks. Admin order query endpoint is pending backend route integration.
                  </p>
                </div>
              </div>

              <div className="adm-activity-item">
                <span className={`adm-activity-dot ${lowStockItems.length > 0 ? "dot-orange" : "dot-green"}`} aria-hidden="true" />
                <div className="adm-activity-content">
                  <div className="adm-activity-header">
                    <strong>Catalog Stock Telemetry</strong>
                    <span className="adm-activity-time">{lowStockItems.length > 0 ? "Alert Active" : "Stock Normal"}</span>
                  </div>
                  <p className="adm-activity-desc">
                    {lowStockItems.length > 0
                      ? `${lowStockItems.length} catalog variant(s) monitored at or below threshold (50 units).`
                      : "All catalog variants are well-stocked above thresholds."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Category Breakdown Card */}
      <div className="adm-card" style={{ marginBottom: 24 }}>
        <div className="adm-card-header">
          <h2 className="adm-card-title">Product Distribution by Category</h2>
          <button
            type="button"
            className="adm-btn adm-btn-secondary adm-btn-sm"
            onClick={() => onNavigateSection("categories")}
          >
            View Categories →
          </button>
        </div>
        <div className="adm-card-body">
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {categories.map((cat) => {
              const count = cat.productsCount || 0;
              const pct = totalProductsCount > 0 ? Math.round((count / totalProductsCount) * 100) : 0;
              return (
                <div key={cat.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: "0.86rem" }}>
                    <span>
                      <span style={{ marginRight: 6 }}>{cat.icon || "📦"}</span>
                      <strong>{cat.name}</strong>
                    </span>
                    <span style={{ color: "var(--adm-text-secondary)", fontWeight: 600 }}>
                      {count} products ({pct}%)
                    </span>
                  </div>
                  <div style={{ width: "100%", height: 8, background: "#e2e8f0", borderRadius: 4, overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${pct}%`,
                        height: "100%",
                        background: "var(--adm-primary)",
                        borderRadius: 4,
                        transition: "width 0.3s ease",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
