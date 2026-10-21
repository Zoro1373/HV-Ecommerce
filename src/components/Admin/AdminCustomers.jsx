import React, { useState, useEffect, useCallback } from "react";
import { getAdminCustomers } from "../../services/adminApi";

export default function AdminCustomers({ currentAdminUser }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [customersResponse, setCustomersResponse] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [inspectingCustomer, setInspectingCustomer] = useState(null);

  const loadCustomers = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      const res = await getAdminCustomers();
      setCustomersResponse(res);
    } catch (err) {
      setError(err.message || "Failed to query customer directory from server.");
      setCustomersResponse({
        isImplemented: false,
        message: err.message,
        customers: [],
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  // Prevent background page from scrolling while modal is open
  useEffect(() => {
    if (inspectingCustomer) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [inspectingCustomer]);

  const customers = customersResponse?.customers || [];
  const isImplemented = customersResponse?.isImplemented !== false;

  // Filter logic: search query and role filter
  const filteredCustomers = customers.filter((c) => {
    const term = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !term ||
      (c.fullName && c.fullName.toLowerCase().includes(term)) ||
      (c.email && c.email.toLowerCase().includes(term)) ||
      (c.companyName && c.companyName.toLowerCase().includes(term)) ||
      (c.gstin && c.gstin.toLowerCase().includes(term)) ||
      (c.phone && c.phone.toLowerCase().includes(term)) ||
      (c.id && c.id.toLowerCase().includes(term));

    const matchesRole = roleFilter === "all" || c.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const hasActiveFilters = Boolean(searchQuery.trim()) || roleFilter !== "all";

  // Summary Metrics (strictly computed from loaded customer data)
  const totalCustomers = customers.length;
  const individualCount = customers.filter((c) => c.role === "CUSTOMER").length;
  const b2bCount = customers.filter((c) => c.role === "B2B").length;
  const gstinVerifiedCount = customers.filter((c) => Boolean(c.gstin)).length;

  const handleClearFilters = () => {
    setSearchQuery("");
    setRoleFilter("all");
  };

  const getInitials = (name) => {
    if (!name) return "C";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  };

  return (
    <div className="adm-customers-view">
      {/* Page Header */}
      <div className="adm-page-header">
        <div className="adm-page-title-group">
          <h1>Customer &amp; B2B Account Directory</h1>
          <p className="adm-page-subtitle">
            Manage maker accounts, engineering institutional profiles, and verified B2B wholesale buyers.
          </p>
        </div>
        <div className="adm-page-actions">
          <button
            type="button"
            className="adm-btn adm-btn-secondary"
            onClick={() => loadCustomers(true)}
            disabled={loading || refreshing}
            data-testid="refresh-customers-btn"
            title="Refresh customer data from database"
          >
            {refreshing ? "↻ Syncing..." : "↻ Refresh Directory"}
          </button>
        </div>
      </div>

      {/* Privacy Shield Banner */}
      <div className="adm-notice-banner adm-notice-info" role="status">
        <span className="adm-notice-icon">🛡️</span>
        <div>
          <strong>Privacy &amp; Data Safeguards:</strong> In accordance with VERTEX security policy, customer passwords, bcrypt hashes, session tokens, MFA TOTP secrets, and recovery codes are strictly protected and never exposed through administrative queries.
        </div>
      </div>

      {error && (
        <div className="adm-notice-banner adm-notice-warning" role="alert">
          <span className="adm-notice-icon">⚠️</span>
          <div>
            <strong>Directory Notice:</strong> {error}
          </div>
        </div>
      )}

      {/* Summary KPI Grid (shown when customers are loaded) */}
      {isImplemented && customers.length > 0 && (
        <div className="adm-customer-kpi-grid">
          <div className="adm-customer-kpi-card">
            <div className="adm-customer-kpi-info">
              <span className="adm-customer-kpi-label">Total Accounts</span>
              <span className="adm-customer-kpi-val">{totalCustomers}</span>
            </div>
            <div className="adm-customer-kpi-icon icon-blue" aria-hidden="true">
              👥
            </div>
          </div>

          <div className="adm-customer-kpi-card">
            <div className="adm-customer-kpi-info">
              <span className="adm-customer-kpi-label">Individual Retail</span>
              <span className="adm-customer-kpi-val">{individualCount}</span>
            </div>
            <div className="adm-customer-kpi-icon icon-green" aria-hidden="true">
              👤
            </div>
          </div>

          <div className="adm-customer-kpi-card">
            <div className="adm-customer-kpi-info">
              <span className="adm-customer-kpi-label">B2B Wholesale</span>
              <span className="adm-customer-kpi-val">{b2bCount}</span>
            </div>
            <div className="adm-customer-kpi-icon icon-amber" aria-hidden="true">
              🏢
            </div>
          </div>

          <div className="adm-customer-kpi-card">
            <div className="adm-customer-kpi-info">
              <span className="adm-customer-kpi-label">Verified GSTINs</span>
              <span className="adm-customer-kpi-val">{gstinVerifiedCount}</span>
            </div>
            <div className="adm-customer-kpi-icon icon-purple" aria-hidden="true">
              📋
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="adm-filter-bar">
        <div className="adm-search-input-wrap">
          <span className="adm-search-icon" aria-hidden="true">
            🔍
          </span>
          <input
            type="text"
            className="adm-search-input"
            placeholder="Search by customer name, email, company, or GSTIN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={!isImplemented || (customers.length === 0 && !hasActiveFilters)}
            aria-label="Search customers"
          />
        </div>

        <div className="adm-filter-group">
          <select
            className="adm-select"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            disabled={!isImplemented || (customers.length === 0 && !hasActiveFilters)}
            aria-label="Filter by customer role"
          >
            <option value="all">All Account Types ({customers.length})</option>
            <option value="CUSTOMER">Individual Customers ({individualCount})</option>
            <option value="B2B">B2B Wholesale Accounts ({b2bCount})</option>
          </select>

          {hasActiveFilters && (
            <button
              type="button"
              className="adm-btn adm-btn-secondary adm-btn-sm"
              onClick={handleClearFilters}
              title="Reset search and filters"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Main View Area */}
      {loading ? (
        <div className="adm-loading-screen" role="status">
          <span className="adm-spinner adm-spinner-dark" aria-hidden="true" />
          <p>Querying customer directory from database...</p>
        </div>
      ) : !isImplemented ? (
        /* Architecture Roadmap View (when backend endpoint is scheduled) */
        <div className="adm-card">
          <div className="adm-card-header">
            <h2 className="adm-card-title">Customer Schema &amp; Role Definitions</h2>
            <span className="adm-badge adm-badge-info">Prisma User Model</span>
          </div>
          <div className="adm-card-body">
            <p style={{ margin: "0 0 16px", color: "var(--adm-text-secondary)", fontSize: "0.9rem" }}>
              Customer accounts are partitioned into distinct roles with verified database constraints:
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 20 }}>
              <div style={{ background: "#f8fafc", padding: 16, borderRadius: 8, border: "1px solid var(--adm-border)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span className="adm-badge adm-badge-info">CUSTOMER</span>
                  <strong>Individual Retail</strong>
                </div>
                <div style={{ fontSize: "0.82rem", color: "var(--adm-text-secondary)", lineHeight: 1.5 }}>
                  Individual engineers, students, hobbyists, and makers. Standard catalog pricing and direct checkout.
                </div>
              </div>

              <div style={{ background: "#f8fafc", padding: 16, borderRadius: 8, border: "1px solid var(--adm-border)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span className="adm-badge adm-badge-warning">B2B</span>
                  <strong>Wholesale &amp; Institutional</strong>
                </div>
                <div style={{ fontSize: "0.82rem", color: "var(--adm-text-secondary)", lineHeight: 1.5 }}>
                  Corporate institutions, educational labs, and manufacturing companies with registered GSTIN and company verification.
                </div>
              </div>
            </div>

            {currentAdminUser && (
              <div style={{ marginTop: 20 }}>
                <span className="adm-label">Currently Authenticated Administrator</span>
                <div className="adm-table-container" style={{ marginTop: 8 }}>
                  <table className="adm-table">
                    <thead>
                      <tr>
                        <th>Administrator Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>MFA Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>
                          <strong>{currentAdminUser.fullName || "Administrator"}</strong>
                        </td>
                        <td>{currentAdminUser.email}</td>
                        <td>
                          <span className="adm-badge adm-badge-primary">
                            {currentAdminUser.role}
                          </span>
                        </td>
                        <td>
                          <span className="adm-badge adm-badge-success">Active</span>
                        </td>
                        <td>
                          <span className="adm-badge adm-badge-info">
                            {currentAdminUser.mfaEnabled ? "TOTP Enrolled" : "Pending Setup"}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : customers.length === 0 ? (
        /* Empty Database State */
        <div className="adm-empty-state">
          <div className="adm-empty-icon" aria-hidden="true">
            👥
          </div>
          <h3 className="adm-empty-title">No Customer Accounts Found</h3>
          <p className="adm-empty-desc">
            No customer accounts have registered in the database yet. When visitors sign up or complete checkout, their profiles will appear here.
          </p>
        </div>
      ) : filteredCustomers.length === 0 ? (
        /* Search Empty State */
        <div className="adm-empty-state">
          <div className="adm-empty-icon" aria-hidden="true">
            🔍
          </div>
          <h3 className="adm-empty-title">No Matching Customers Found</h3>
          <p className="adm-empty-desc">
            No customer accounts matched the search query <strong>"{searchQuery}"</strong>
            {roleFilter !== "all" && <> under the <strong>{roleFilter}</strong> role filter</>}.
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
        /* Filtered Customers List */
        <>
          {/* Desktop Table View */}
          <div className="adm-card adm-customer-desktop-table" style={{ padding: 0 }}>
            <div className="adm-table-container">
              <table className="adm-table" aria-label="Customer accounts directory">
                <thead>
                  <tr>
                    <th>Customer / Account</th>
                    <th>Role</th>
                    <th>Contact Phone</th>
                    <th>Company / GSTIN</th>
                    <th>Account Status</th>
                    <th>Joined Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((c) => {
                    const isB2B = c.role === "B2B";
                    const avatarInitials = getInitials(c.fullName);

                    return (
                      <tr key={c.id || c.email}>
                        <td>
                          <div className="adm-customer-cell">
                            <div
                              className={`adm-customer-avatar ${
                                isB2B ? "avatar-b2b" : "avatar-customer"
                              }`}
                              aria-hidden="true"
                            >
                              {avatarInitials}
                            </div>
                            <div className="adm-customer-meta">
                              <span className="adm-customer-name">
                                {c.fullName}
                              </span>
                              <span className="adm-customer-email">
                                {c.email}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span
                            className={`adm-badge ${
                              isB2B ? "adm-badge-warning" : "adm-badge-info"
                            }`}
                          >
                            {isB2B ? "🏢 B2B Wholesale" : "👤 CUSTOMER"}
                          </span>
                        </td>
                        <td>
                          {c.phone ? (
                            <span style={{ fontSize: "0.85rem" }}>{c.phone}</span>
                          ) : (
                            <span style={{ color: "var(--adm-text-muted)" }}>—</span>
                          )}
                        </td>
                        <td>
                          {c.companyName ? (
                            <div>
                              <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>
                                {c.companyName}
                              </div>
                              {c.gstin && (
                                <code style={{ fontSize: "0.72rem", color: "var(--adm-text-muted)" }}>
                                  GSTIN: {c.gstin}
                                </code>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: "var(--adm-text-muted)" }}>—</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span
                              className={`adm-status-dot ${
                                c.isActive !== false ? "" : "degraded"
                              }`}
                              style={{ width: 7, height: 7 }}
                              aria-hidden="true"
                            />
                            <span style={{ fontSize: "0.82rem", fontWeight: 600 }}>
                              {c.isActive !== false ? "Active" : "Suspended"}
                            </span>
                            {c.mfaEnabled && (
                              <span
                                className="adm-badge adm-badge-success"
                                style={{ fontSize: "0.65rem", padding: "1px 6px" }}
                                title="Two-factor authentication active"
                              >
                                MFA
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: "0.82rem", color: "var(--adm-text-secondary)" }}>
                            {c.createdAt
                              ? new Date(c.createdAt).toLocaleDateString("en-IN", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })
                              : "Active Session"}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="adm-btn adm-btn-secondary adm-btn-sm"
                            onClick={() => setInspectingCustomer(c)}
                            data-testid={`inspect-customer-${c.id || c.email}`}
                          >
                            Inspect Profile
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
                Showing {filteredCustomers.length} of {customers.length} customer accounts
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

          {/* Mobile Card View (optimized for viewports <= 768px) */}
          <div className="adm-customer-mobile-cards">
            {filteredCustomers.map((c) => {
              const isB2B = c.role === "B2B";
              const avatarInitials = getInitials(c.fullName);

              return (
                <div key={c.id || c.email} className="adm-customer-card">
                  <div className="adm-customer-card-header">
                    <div className="adm-customer-cell">
                      <div
                        className={`adm-customer-avatar ${
                          isB2B ? "avatar-b2b" : "avatar-customer"
                        }`}
                        aria-hidden="true"
                      >
                        {avatarInitials}
                      </div>
                      <div className="adm-customer-meta">
                        <span className="adm-customer-name">{c.fullName}</span>
                        <span className="adm-customer-email">{c.email}</span>
                      </div>
                    </div>
                    <span
                      className={`adm-badge ${
                        isB2B ? "adm-badge-warning" : "adm-badge-info"
                      }`}
                    >
                      {isB2B ? "B2B" : "CUSTOMER"}
                    </span>
                  </div>

                  <div className="adm-customer-card-body">
                    <div className="adm-customer-card-item">
                      <span className="adm-customer-card-label">Contact Phone</span>
                      <span className="adm-customer-card-value">{c.phone || "—"}</span>
                    </div>

                    <div className="adm-customer-card-item">
                      <span className="adm-customer-card-label">Company / GSTIN</span>
                      <span className="adm-customer-card-value">
                        {c.companyName || "—"}
                        {c.gstin && ` (${c.gstin})`}
                      </span>
                    </div>

                    <div className="adm-customer-card-item">
                      <span className="adm-customer-card-label">Account Status</span>
                      <span className="adm-customer-card-value">
                        {c.isActive !== false ? "Active" : "Suspended"}
                        {c.mfaEnabled && " • MFA"}
                      </span>
                    </div>

                    <div className="adm-customer-card-item">
                      <span className="adm-customer-card-label">Joined</span>
                      <span className="adm-customer-card-value">
                        {c.createdAt
                          ? new Date(c.createdAt).toLocaleDateString("en-IN")
                          : "Active"}
                      </span>
                    </div>
                  </div>

                  <div className="adm-customer-card-actions">
                    <button
                      type="button"
                      className="adm-btn adm-btn-secondary adm-btn-sm"
                      onClick={() => setInspectingCustomer(c)}
                    >
                      Inspect Profile &rarr;
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Customer Profile Inspection Modal */}
      {inspectingCustomer && (
        <div
          className="adm-modal-backdrop"
          onClick={() => setInspectingCustomer(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="customer-details-title"
        >
          <div
            className="adm-modal"
            style={{ maxWidth: 640 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="adm-modal-header">
              <h2 id="customer-details-title" className="adm-modal-title">
                Customer Profile
              </h2>
              <button
                type="button"
                className="adm-modal-close"
                onClick={() => setInspectingCustomer(null)}
                aria-label="Close customer details"
              >
                ✕
              </button>
            </div>

            <div className="adm-modal-body">
              {/* Hero Banner */}
              <div className="adm-customer-modal-hero">
                <div
                  className={`adm-customer-modal-avatar ${
                    inspectingCustomer.role === "B2B"
                      ? "avatar-b2b"
                      : "avatar-customer"
                  }`}
                  aria-hidden="true"
                >
                  {getInitials(inspectingCustomer.fullName)}
                </div>
                <div className="adm-customer-modal-info">
                  <h3 className="adm-customer-modal-name">
                    {inspectingCustomer.fullName}
                  </h3>
                  <span style={{ fontSize: "0.85rem", color: "var(--adm-text-secondary)" }}>
                    {inspectingCustomer.email}
                  </span>
                  <div className="adm-customer-modal-badges">
                    <span
                      className={`adm-badge ${
                        inspectingCustomer.role === "B2B"
                          ? "adm-badge-warning"
                          : "adm-badge-info"
                      }`}
                    >
                      {inspectingCustomer.role === "B2B"
                        ? "🏢 B2B Wholesale Account"
                        : "👤 Individual Customer"}
                    </span>
                    <span className="adm-badge adm-badge-success">
                      {inspectingCustomer.isActive !== false ? "Active Status" : "Suspended"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 1: Account Identification */}
              <div className="adm-customer-section">
                <h4 className="adm-customer-section-title">
                  <span>🆔</span> Account Identification
                </h4>
                <div className="adm-customer-section-grid">
                  <div className="adm-customer-info-box">
                    <div className="adm-customer-info-label">Customer ID (UUID)</div>
                    <code className="adm-customer-info-val">
                      {inspectingCustomer.id || "N/A"}
                    </code>
                  </div>

                  <div className="adm-customer-info-box">
                    <div className="adm-customer-info-label">Primary Email</div>
                    <div className="adm-customer-info-val">
                      {inspectingCustomer.email}
                    </div>
                  </div>

                  <div className="adm-customer-info-box">
                    <div className="adm-customer-info-label">Contact Phone</div>
                    <div className="adm-customer-info-val">
                      {inspectingCustomer.phone || "Not provided"}
                    </div>
                  </div>

                  <div className="adm-customer-info-box">
                    <div className="adm-customer-info-label">Pricing Tier Policy</div>
                    <div className="adm-customer-info-val">
                      {inspectingCustomer.role === "B2B"
                        ? "Volume Wholesale (TieredPrice)"
                        : "Standard Retail Catalog"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Corporate & Tax Credentials (B2B) */}
              <div className="adm-customer-section">
                <h4 className="adm-customer-section-title">
                  <span>🏢</span> Corporate &amp; Tax Credentials
                </h4>
                <div className="adm-customer-section-grid">
                  <div className="adm-customer-info-box">
                    <div className="adm-customer-info-label">Registered Company</div>
                    <div className="adm-customer-info-val">
                      {inspectingCustomer.companyName || "Individual Consumer (Not Registered)"}
                    </div>
                  </div>

                  <div className="adm-customer-info-box">
                    <div className="adm-customer-info-label">GSTIN Identifier</div>
                    <div className="adm-customer-info-val">
                      {inspectingCustomer.gstin ? (
                        <code>{inspectingCustomer.gstin}</code>
                      ) : (
                        "None (Standard 18% GST on checkout)"
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Security & Session Telemetry */}
              <div className="adm-customer-section">
                <h4 className="adm-customer-section-title">
                  <span>🔒</span> Security &amp; Session Telemetry
                </h4>
                <div className="adm-customer-section-grid">
                  <div className="adm-customer-info-box">
                    <div className="adm-customer-info-label">Two-Factor Authentication (2FA)</div>
                    <div className="adm-customer-info-val">
                      {inspectingCustomer.mfaEnabled ? (
                        <span style={{ color: "var(--adm-success-text)" }}>
                          ✓ TOTP RFC 6238 Enrolled
                        </span>
                      ) : (
                        <span style={{ color: "var(--adm-text-muted)" }}>
                          Standard Password Authentication
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="adm-customer-info-box">
                    <div className="adm-customer-info-label">Last Recorded Login</div>
                    <div className="adm-customer-info-val">
                      {inspectingCustomer.lastLoginAt
                        ? new Date(inspectingCustomer.lastLoginAt).toLocaleString("en-IN")
                        : "No recorded session (Pre-analytics)"}
                    </div>
                  </div>

                  <div className="adm-customer-info-box">
                    <div className="adm-customer-info-label">Registration Date</div>
                    <div className="adm-customer-info-val">
                      {inspectingCustomer.createdAt
                        ? new Date(inspectingCustomer.createdAt).toLocaleString("en-IN")
                        : "Active Account"}
                    </div>
                  </div>

                  <div className="adm-customer-info-box">
                    <div className="adm-customer-info-label">Email Verification</div>
                    <div className="adm-customer-info-val">
                      {inspectingCustomer.emailVerified ? "✓ Verified" : "Self-Registered"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Security Shield Callout */}
              <div className="adm-info-callout" style={{ margin: "16px 0 0" }}>
                <h4 style={{ margin: "0 0 4px", fontSize: "0.82rem" }}>
                  Cryptographic Protection Guarantee
                </h4>
                <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--adm-text-secondary)" }}>
                  Customer passwords (bcrypt hashes), session tokens, and MFA TOTP secrets are encrypted and never transmitted over admin APIs.
                </p>
              </div>
            </div>

            <div className="adm-modal-footer">
              <button
                type="button"
                className="adm-btn adm-btn-secondary"
                onClick={() => setInspectingCustomer(null)}
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
