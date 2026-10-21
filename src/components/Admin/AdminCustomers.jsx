import React, { useState, useEffect } from "react";
import { getAdminCustomers } from "../../services/adminApi";

export default function AdminCustomers({ currentAdminUser }) {
  const [loading, setLoading] = useState(true);
  const [customersResponse, setCustomersResponse] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  useEffect(() => {
    async function loadCustomers() {
      try {
        setLoading(true);
        const res = await getAdminCustomers();
        setCustomersResponse(res);
      } catch (err) {
        setCustomersResponse({
          isImplemented: false,
          message: err.message,
          customers: [],
        });
      } finally {
        setLoading(false);
      }
    }
    loadCustomers();
  }, []);

  const customers = customersResponse?.customers || [];
  const isImplemented = customersResponse?.isImplemented !== false;

  return (
    <div className="adm-customers-view">
      <div className="adm-page-header">
        <div className="adm-page-title-group">
          <h1>Customer &amp; B2B Account Directory</h1>
          <p className="adm-page-subtitle">
            Manage maker accounts, engineering institutional profiles, and verified B2B wholesale buyers.
          </p>
        </div>
      </div>

      {/* Privacy Shield Banner */}
      <div className="adm-notice-banner adm-notice-info" role="status">
        <span className="adm-notice-icon">🛡️</span>
        <div>
          <strong>Privacy &amp; Data Safeguards:</strong> In accordance with VERTEX security policy, customer passwords, bcrypt hashes, session tokens, MFA TOTP secrets, and recovery codes are strictly protected and never exposed through administrative queries.
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="adm-filter-bar">
        <div className="adm-search-input-wrap">
          <span className="adm-search-icon" aria-hidden="true">
            🔍
          </span>
          <input
            type="text"
            className="adm-search-input"
            placeholder="Search by customer name, email, or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={!isImplemented || customers.length === 0}
            aria-label="Search customers"
          />
        </div>

        <div className="adm-filter-group">
          <select
            className="adm-select"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            disabled={!isImplemented || customers.length === 0}
            aria-label="Filter by customer role"
          >
            <option value="all">All Account Types</option>
            <option value="CUSTOMER">Individual Customers</option>
            <option value="B2B">B2B Wholesale Accounts</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="adm-loading-screen" role="status">
          <span className="adm-spinner adm-spinner-dark" aria-hidden="true" />
          <p>Querying customer directory...</p>
        </div>
      ) : customers.length === 0 ? (
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
                          <span className="adm-badge adm-badge-primary" style={{ background: "#eff6ff", color: "#1e40af", border: "1px solid #bfdbfe" }}>
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
      ) : (
        <div className="adm-card" style={{ padding: 0 }}>
          <div className="adm-table-container">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Customer Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Company / GSTIN</th>
                  <th>Joined Date</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.fullName}</strong>
                    </td>
                    <td>{c.email}</td>
                    <td>
                      <span className={`adm-badge ${c.role === "B2B" ? "adm-badge-warning" : "adm-badge-info"}`}>
                        {c.role}
                      </span>
                    </td>
                    <td>
                      {c.companyName || "—"}
                      {c.gstin && <div style={{ fontSize: "0.74rem" }}>GSTIN: {c.gstin}</div>}
                    </td>
                    <td>{new Date(c.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
