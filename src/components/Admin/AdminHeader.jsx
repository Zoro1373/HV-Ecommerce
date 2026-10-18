import React from "react";

const sectionLabels = {
  dashboard: "Dashboard",
  products: "Product Catalog",
  categories: "Categories",
  inventory: "Inventory Management",
  orders: "Orders & Fulfillment",
  customers: "Customer Directory",
  reports: "Reports & Analytics",
  users: "Admin Users & Roles",
  settings: "System Settings",
  "audit-logs": "Audit Log",
};

export default function AdminHeader({
  activeSection,
  onSelectSection,
  onOpenMobile,
  currentUser,
  onLogout,
  healthStatus,
}) {
  const currentTitle = sectionLabels[activeSection] || "Dashboard";

  return (
    <header className="adm-header">
      <div className="adm-header-left">
        <button
          type="button"
          className="adm-mobile-toggle"
          onClick={onOpenMobile}
          aria-label="Open navigation menu"
        >
          ☰
        </button>

        <nav className="adm-breadcrumbs" aria-label="Breadcrumb">
          <button type="button" onClick={() => onSelectSection("dashboard")}>
            Admin
          </button>
          <span className="adm-breadcrumbs-sep">/</span>
          <span className="adm-breadcrumbs-current" aria-current="page">
            {currentTitle}
          </span>
        </nav>
      </div>

      <div className="adm-header-right">
        {healthStatus && (
          <div
            className={`adm-health-pill ${
              healthStatus.status === "UP" ? "" : "degraded"
            }`}
            title={`Database: ${
              healthStatus.database?.type || "PostgreSQL"
            } (Connected)`}
          >
            <span
              className="adm-status-dot"
              style={{
                width: 6,
                height: 6,
                backgroundColor:
                  healthStatus.status === "UP" ? "#10b981" : "#ef4444",
              }}
              aria-hidden="true"
            />
            <span>
              {healthStatus.status === "UP" ? "API Live" : "Degraded"}
            </span>
          </div>
        )}

        {currentUser && (
          <div
            className="adm-user-profile"
            title={`Logged in as ${currentUser.email} (${currentUser.role})`}
          >
            <div className="adm-user-avatar" aria-hidden="true">
              {currentUser.fullName
                ? currentUser.fullName.charAt(0).toUpperCase()
                : "A"}
            </div>
            <div className="adm-user-details">
              <span className="adm-user-name">
                {currentUser.fullName?.split(" ")[0] || "Administrator"}
              </span>
              <span className="adm-user-role">{currentUser.role}</span>
            </div>
          </div>
        )}

        <button
          type="button"
          className="adm-btn-logout"
          onClick={onLogout}
          title="Sign out of Admin Console"
        >
          Sign Out
        </button>
      </div>
    </header>
  );
}
