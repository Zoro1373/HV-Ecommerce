import React from "react";
import logo from "../../assets/logo.png";

const navSections = [
  { id: "dashboard", label: "Dashboard", icon: "📊" },
  { id: "products", label: "Products", icon: "📦" },
  { id: "categories", label: "Categories", icon: "🏷️" },
  { id: "inventory", label: "Inventory", icon: "📋" },
  { id: "orders", label: "Orders", icon: "🚚", badge: "Phase 6" },
  { id: "customers", label: "Customers", icon: "👥" },
  { id: "reports", label: "Reports & Analytics", icon: "📈" },
  { id: "users", label: "Admin Users & Roles", icon: "🛡️" },
  { id: "settings", label: "Settings", icon: "⚙️" },
  { id: "audit-logs", label: "Audit Log", icon: "📜" },
];

export default function AdminSidebar({
  activeSection,
  onSelectSection,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
  onNavigateStorefront,
  healthStatus,
}) {
  return (
    <>
      {mobileOpen && (
        <div
          className="adm-modal-backdrop"
          onClick={onCloseMobile}
          style={{ zIndex: 95 }}
          aria-hidden="true"
        />
      )}

      <aside
        className={`adm-sidebar ${collapsed ? "collapsed" : ""} ${
          mobileOpen ? "mobile-open" : ""
        }`}
        aria-label="Admin Navigation"
      >
        <div className="adm-sidebar-brand">
          <button
            type="button"
            className="adm-brand-link"
            onClick={() => onSelectSection("dashboard")}
            title="VERTEX Admin Console"
          >
            <img src={logo} alt="VERTEX Logo" className="adm-brand-logo" />
            {!collapsed && (
              <div className="adm-brand-text">
                <span className="adm-brand-name">VERTEX</span>
                <span className="adm-brand-badge">ADMIN CONSOLE</span>
              </div>
            )}
          </button>
          <button
            type="button"
            className="adm-sidebar-toggle"
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? "»" : "«"}
          </button>
        </div>

        <ul className="adm-nav-list" role="navigation">
          {navSections.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <li
                key={item.id}
                className={`adm-nav-item ${isActive ? "active" : ""}`}
              >
                <button
                  type="button"
                  onClick={() => {
                    onSelectSection(item.id);
                    if (mobileOpen) onCloseMobile();
                  }}
                  title={item.label}
                  aria-current={isActive ? "page" : undefined}
                >
                  <span className="adm-nav-icon" aria-hidden="true">
                    {item.icon}
                  </span>
                  {!collapsed && (
                    <>
                      <span className="adm-nav-label">{item.label}</span>
                      {item.badge && (
                        <span className="adm-nav-badge">{item.badge}</span>
                      )}
                    </>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="adm-sidebar-footer">
          <button
            type="button"
            className="adm-storefront-link"
            onClick={onNavigateStorefront}
            title="View customer storefront"
          >
            <span aria-hidden="true">🏪</span>
            {!collapsed && <span>Storefront ↗</span>}
          </button>

          {!collapsed && (
            <div className="adm-system-status-indicator">
              <span
                className={`adm-status-dot ${
                  healthStatus?.status === "UP" ? "" : "degraded"
                }`}
                aria-hidden="true"
              />
              <span>
                {healthStatus?.database?.connected
                  ? "PostgreSQL 18.6 Live"
                  : "Database Checking..."}
              </span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
