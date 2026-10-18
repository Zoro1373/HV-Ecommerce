import React from "react";

export default function AdminUsers({ currentAdminUser }) {
  return (
    <div className="adm-users-view">
      <div className="adm-page-header">
        <div className="adm-page-title-group">
          <h1>Admin Users &amp; Role-Based Access Control</h1>
          <p className="adm-page-subtitle">
            Configure administrative security privileges, verify administrator accounts, and inspect role policies.
          </p>
        </div>
      </div>

      {/* Security Provisioning Banner */}
      <div className="adm-notice-banner adm-notice-info" role="status">
        <span className="adm-notice-icon">🛡️</span>
        <div>
          <strong>Controlled Administration Policy:</strong> Public registration of administrator accounts is strictly blocked by the server-side validator. New administrators must be provisioned via the secure CLI procedure (<code>node src/scripts/seedAdmin.js</code>) to prevent privilege escalation.
        </div>
      </div>

      {/* Current Active Administrator Card */}
      {currentAdminUser && (
        <div className="adm-card">
          <div className="adm-card-header">
            <h2 className="adm-card-title">Current Active Administrator</h2>
            <span className="adm-badge adm-badge-success">Session Active</span>
          </div>
          <div className="adm-card-body">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
              <div>
                <span className="adm-label">Full Name</span>
                <strong>{currentAdminUser.fullName || "Administrator"}</strong>
              </div>
              <div>
                <span className="adm-label">Email Address</span>
                <code>{currentAdminUser.email}</code>
              </div>
              <div>
                <span className="adm-label">System Role</span>
                <span className="adm-badge adm-badge-primary" style={{ background: "#eff6ff", color: "#1e40af", border: "1px solid #bfdbfe" }}>
                  {currentAdminUser.role}
                </span>
              </div>
              <div>
                <span className="adm-label">Two-Factor Authentication</span>
                <span className={`adm-badge ${currentAdminUser.mfaEnabled ? "adm-badge-success" : "adm-badge-warning"}`}>
                  {currentAdminUser.mfaEnabled ? "✓ TOTP Enabled" : "⚠️ Recommended"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Role Permissions Matrix */}
      <div className="adm-card">
        <div className="adm-card-header">
          <h2 className="adm-card-title">Role-Based Access Control (RBAC) Matrix</h2>
          <span className="adm-badge adm-badge-neutral">Server-Enforced</span>
        </div>
        <div className="adm-card-body" style={{ padding: 0 }}>
          <div className="adm-table-container" style={{ border: "none" }}>
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Storefront Access</th>
                  <th>Catalog &amp; Inventory Management</th>
                  <th>Order Fulfillment</th>
                  <th>MFA Requirement</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <strong>ADMIN</strong>
                  </td>
                  <td>Yes (Full)</td>
                  <td>Yes (Create, Edit, Adjust)</td>
                  <td>Yes (Update Status, Dispatch)</td>
                  <td>
                    <span className="adm-badge adm-badge-warning">Mandatory Policy</span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>B2B</strong>
                  </td>
                  <td>Yes (Tiered Pricing)</td>
                  <td>Read-Only (Public API)</td>
                  <td>Own Orders Only</td>
                  <td>Optional</td>
                </tr>
                <tr>
                  <td>
                    <strong>CUSTOMER</strong>
                  </td>
                  <td>Yes (Standard)</td>
                  <td>Read-Only (Public API)</td>
                  <td>Own Orders Only</td>
                  <td>Optional</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
