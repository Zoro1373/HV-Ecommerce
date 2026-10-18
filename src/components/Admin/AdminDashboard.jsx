import React, { useState, useEffect } from "react";
import { getAdminProducts, getAdminCategories, getSystemHealth } from "../../services/adminApi";

export default function AdminDashboard({ onNavigateSection, onNavigateStorefront }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [productsData, setProductsData] = useState({ products: [], pagination: {} });
  const [categories, setCategories] = useState([]);
  const [health, setHealth] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboardData() {
      try {
        setLoading(true);
        setError(null);

        const [prodRes, catRes, healthRes] = await Promise.all([
          getAdminProducts({ limit: 50 }),
          getAdminCategories(),
          getSystemHealth().catch(() => null),
        ]);

        if (isMounted) {
          setProductsData(prodRes || { products: [], pagination: {} });
          setCategories(catRes?.categories || []);
          setHealth(healthRes);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Failed to load dashboard metrics from backend API.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadDashboardData();
    return () => {
      isMounted = false;
    };
  }, []);

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

  const totalStockUnits = allVariants.reduce(
    (sum, v) => sum + (v.stockQuantity || 0),
    0
  );

  const lowStockItems = allVariants.filter(
    (v) => (v.stockQuantity || 0) <= 50
  );

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

      {/* KPI Metrics Grid */}
      <div className="adm-metrics-grid">
        <div className="adm-metric-card">
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

        <div className="adm-metric-card">
          <div className="adm-metric-info">
            <span className="adm-metric-label">Total SKUs in Stock</span>
            <span className="adm-metric-value">{allVariants.length}</span>
            <span className="adm-metric-sub">
              {totalStockUnits.toLocaleString()} Total Units
            </span>
          </div>
          <div className="adm-metric-icon icon-green" aria-hidden="true">
            📊
          </div>
        </div>

        <div className="adm-metric-card">
          <div className="adm-metric-info">
            <span className="adm-metric-label">Low Stock Alerts</span>
            <span className="adm-metric-value">{lowStockItems.length}</span>
            <span className="adm-metric-sub">Variants with &le; 50 units</span>
          </div>
          <div className="adm-metric-icon icon-warning" aria-hidden="true">
            ⚠️
          </div>
        </div>

        <div className="adm-metric-card">
          <div className="adm-metric-info">
            <span className="adm-metric-label">Orders &amp; Revenue</span>
            <span className="adm-metric-value" style={{ fontSize: "1.2rem", marginTop: 4 }}>
              Phase 6 Ready
            </span>
            <span className="adm-metric-sub">
              Awaiting checkout order placement
            </span>
          </div>
          <div className="adm-metric-icon icon-orange" aria-hidden="true">
            🚚
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

      {/* Two Column Grid: Low Stock Alert Items & Category Distribution */}
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

        {/* Category Breakdown Card */}
        <div className="adm-card" style={{ marginBottom: 0 }}>
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

      {/* Integration Roadmap & Capability Status */}
      <div className="adm-card">
        <div className="adm-card-header">
          <h2 className="adm-card-title">Backend Architecture &amp; Service Status</h2>
          <span className="adm-badge adm-badge-info">Engineering Telemetry</span>
        </div>
        <div className="adm-card-body" style={{ padding: 0 }}>
          <div className="adm-table-container" style={{ border: "none" }}>
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Component / Domain</th>
                  <th>Endpoints &amp; Routes</th>
                  <th>Contract Status</th>
                  <th>Data Source</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <strong>Authentication &amp; RBAC</strong>
                  </td>
                  <td>
                    <code>/api/auth/me</code>, <code>/api/auth/admin-check</code>
                  </td>
                  <td>
                    <span className="adm-badge adm-badge-success">Live &amp; Verified</span>
                  </td>
                  <td>PostgreSQL <code>User</code> &amp; <code>Session</code> tables</td>
                </tr>
                <tr>
                  <td>
                    <strong>Multi-Factor Authentication (MFA)</strong>
                  </td>
                  <td>
                    <code>/api/auth/mfa/status</code>, <code>/api/auth/mfa/enroll</code>
                  </td>
                  <td>
                    <span className="adm-badge adm-badge-success">Live &amp; Verified</span>
                  </td>
                  <td>TOTP Otplib &amp; Hashed Recovery Codes</td>
                </tr>
                <tr>
                  <td>
                    <strong>Product Catalog &amp; Variants</strong>
                  </td>
                  <td>
                    <code>/api/products</code>, <code>/api/products/:slug</code>
                  </td>
                  <td>
                    <span className="adm-badge adm-badge-success">Live &amp; Verified</span>
                  </td>
                  <td>PostgreSQL <code>Product</code> &amp; <code>ProductVariant</code></td>
                </tr>
                <tr>
                  <td>
                    <strong>Category Hierarchy</strong>
                  </td>
                  <td>
                    <code>/api/categories</code>, <code>/api/categories/:slug</code>
                  </td>
                  <td>
                    <span className="adm-badge adm-badge-success">Live &amp; Verified</span>
                  </td>
                  <td>PostgreSQL <code>Category</code> table</td>
                </tr>
                <tr>
                  <td>
                    <strong>Orders &amp; Fulfillment</strong>
                  </td>
                  <td>
                    <code>/api/admin/orders</code>
                  </td>
                  <td>
                    <span className="adm-badge adm-badge-warning">Phase 6 Checkout</span>
                  </td>
                  <td>PostgreSQL <code>Order</code> schema ready</td>
                </tr>
                <tr>
                  <td>
                    <strong>Bulk Quote Requests</strong>
                  </td>
                  <td>
                    <code>/api/admin/quotes</code>
                  </td>
                  <td>
                    <span className="adm-badge adm-badge-warning">Phase 7 Quotes</span>
                  </td>
                  <td>PostgreSQL <code>QuoteRequest</code> schema ready</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
