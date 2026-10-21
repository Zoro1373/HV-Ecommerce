import React, { useState } from "react";
import { getSystemHealth } from "../../services/adminApi";

export default function AdminSettings({ healthStatus }) {
  const [currentHealth, setCurrentHealth] = useState(healthStatus);
  const [testingHealth, setTestingHealth] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const handleTestHealth = async () => {
    try {
      setTestingHealth(true);
      setTestResult(null);
      const res = await getSystemHealth();
      setCurrentHealth(res);
      setTestResult({
        type: "success",
        text: `Health Check Succeeded: API is ${res.status}, PostgreSQL database connected.`,
      });
    } catch (err) {
      setTestResult({
        type: "error",
        text: `Health Check Failed: ${err.message}`,
      });
    } finally {
      setTestingHealth(false);
    }
  };

  return (
    <div className="adm-settings-view">
      <div className="adm-page-header">
        <div className="adm-page-title-group">
          <h1>System Configuration &amp; Store Settings</h1>
          <p className="adm-page-subtitle">
            Store identity parameters, security policies, tax configuration, and infrastructure telemetry.
          </p>
        </div>
        <div className="adm-page-actions">
          <button
            type="button"
            className="adm-btn adm-btn-secondary"
            onClick={handleTestHealth}
            disabled={testingHealth}
          >
            {testingHealth ? "Pinging..." : "⚡ Run Live Health Diagnostic"}
          </button>
        </div>
      </div>

      {testResult && (
        <div
          className={`adm-notice-banner ${
            testResult.type === "success"
              ? "adm-notice-info"
              : "adm-notice-warning"
          }`}
          role="status"
        >
          <span className="adm-notice-icon">
            {testResult.type === "success" ? "✓" : "⚠️"}
          </span>
          <div>{testResult.text}</div>
        </div>
      )}

      {/* Store Identity Settings */}
      <div className="adm-card">
        <div className="adm-card-header">
          <h2 className="adm-card-title">Store Identity &amp; Commercial Defaults</h2>
          <span className="adm-badge adm-badge-neutral">System Defaults</span>
        </div>
        <div className="adm-card-body">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
            <div>
              <span className="adm-label">Store Brand Name</span>
              <div style={{ fontWeight: 600 }}>VERTEX</div>
              <div className="adm-form-hint">Electronics, Arduino &amp; Fasteners Store</div>
            </div>
            <div>
              <span className="adm-label">Commercial Currency</span>
              <div style={{ fontWeight: 600 }}>INR (₹) — Indian Rupee</div>
              <div className="adm-form-hint">Stored as Decimal(10,2) on server</div>
            </div>
            <div>
              <span className="adm-label">Default GST Tax Bracket</span>
              <div style={{ fontWeight: 600 }}>18.00% GST</div>
              <div className="adm-form-hint">Applicable to microcontrollers and fasteners</div>
            </div>
            <div>
              <span className="adm-label">Fulfillment Region</span>
              <div style={{ fontWeight: 600 }}>Pan-India Delivery</div>
              <div className="adm-form-hint">Courier dispatch with tracking</div>
            </div>
          </div>
        </div>
      </div>

      {/* Security Architecture Settings */}
      <div className="adm-card">
        <div className="adm-card-header">
          <h2 className="adm-card-title">Security &amp; Session Policies</h2>
          <span className="adm-badge adm-badge-success">Enforced</span>
        </div>
        <div className="adm-card-body">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
            <div>
              <span className="adm-label">Session Storage Medium</span>
              <div style={{ fontWeight: 600 }}>HttpOnly Cookie (vertex_session)</div>
              <div className="adm-form-hint">Client JavaScript cannot read tokens</div>
            </div>
            <div>
              <span className="adm-label">Session Lifetime</span>
              <div style={{ fontWeight: 600 }}>7 Days (Expiring Token Hash)</div>
              <div className="adm-form-hint">Raw token hashed with SHA-256</div>
            </div>
            <div>
              <span className="adm-label">CSRF Protection</span>
              <div style={{ fontWeight: 600 }}>Custom Header Verification</div>
              <div className="adm-form-hint">Requires X-Requested-With: XMLHttpRequest</div>
            </div>
            <div>
              <span className="adm-label">MFA Algorithm</span>
              <div style={{ fontWeight: 600 }}>TOTP RFC 6238 (SHA-1 / 30s)</div>
              <div className="adm-form-hint">Monotonic clock replay prevention</div>
            </div>
          </div>
        </div>
      </div>

      {/* Database & Infrastructure */}
      <div className="adm-card">
        <div className="adm-card-header">
          <h2 className="adm-card-title">Database &amp; Connection Infrastructure</h2>
          <span className="adm-badge adm-badge-info">PostgreSQL 18.6</span>
        </div>
        <div className="adm-card-body">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
            <div>
              <span className="adm-label">Database Engine</span>
              <div style={{ fontWeight: 600 }}>Neon Serverless PostgreSQL</div>
              <div className="adm-form-hint">Driver: pgBouncer connection pooling</div>
            </div>
            <div>
              <span className="adm-label">Active Connection Role</span>
              <div style={{ fontWeight: 600 }}>vertex_app</div>
              <div className="adm-form-hint">Least privilege: SELECT, INSERT, UPDATE, DELETE</div>
            </div>
            <div>
              <span className="adm-label">Server Timestamp</span>
              <div style={{ fontWeight: 600 }}>
                {currentHealth?.timestamp ? new Date(currentHealth.timestamp).toLocaleString() : "Real-time sync"}
              </div>
              <div className="adm-form-hint">UTC ISO-8601 synchronization</div>
            </div>
            <div>
              <span className="adm-label">Server Service Name</span>
              <div style={{ fontWeight: 600 }}>{currentHealth?.service || "vertex-backend"}</div>
              <div className="adm-form-hint">Express.js on Node.js runtime</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
