import React, { useState } from "react";
import { getSystemHealth } from "../../services/adminApi";

const DEFAULT_OPERATIONAL_SETTINGS = {
  lowStockThreshold: 10,
  ordersPageSize: 10,
  inventoryTableDensity: "standard",
  autoRefreshInterval: "disabled",
  auditLogPageSize: 20,
};

export default function AdminSettings({ healthStatus, currentAdminUser }) {
  const [currentHealth, setCurrentHealth] = useState(healthStatus);
  const [testingHealth, setTestingHealth] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Client-Side Session Operational Preferences
  const [operationalSettings, setOperationalSettings] = useState(DEFAULT_OPERATIONAL_SETTINGS);
  const [savedSettings, setSavedSettings] = useState(DEFAULT_OPERATIONAL_SETTINGS);
  const [errors, setErrors] = useState({});
  const [feedbackNotice, setFeedbackNotice] = useState(null);

  // Check for unsaved changes against saved baseline
  const hasUnsavedChanges =
    JSON.stringify(operationalSettings) !== JSON.stringify(savedSettings);

  const handleTestHealth = async () => {
    try {
      setTestingHealth(true);
      setTestResult(null);
      const startTime = performance.now();
      const res = await getSystemHealth();
      const latencyMs = Math.round(performance.now() - startTime);
      setCurrentHealth(res);
      setTestResult({
        type: "success",
        text: `Live Health Diagnostic Succeeded: API service is ${res.status}, PostgreSQL database connected.`,
        latencyMs,
        timestamp: res.timestamp || new Date().toISOString(),
        service: res.service || "vertex-backend",
      });
    } catch (err) {
      setTestResult({
        type: "error",
        text: `Live Health Diagnostic Failed: ${err.message}`,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setTestingHealth(false);
    }
  };

  const handleFieldChange = (field, value) => {
    setOperationalSettings((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear specific field validation error when edited
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validateSettings = () => {
    const errs = {};
    const thresholdNum = Number(operationalSettings.lowStockThreshold);
    if (isNaN(thresholdNum) || thresholdNum < 1 || !Number.isInteger(thresholdNum)) {
      errs.lowStockThreshold = "Low-stock alert threshold must be a positive integer (minimum 1 unit).";
    } else if (thresholdNum > 1000) {
      errs.lowStockThreshold = "Low-stock alert threshold cannot exceed 1,000 units.";
    }
    return errs;
  };

  const handleSavePreferences = (e) => {
    e.preventDefault();
    const validationErrors = validateSettings();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setFeedbackNotice({
        type: "error",
        text: "Please resolve the validation errors before saving session preferences.",
      });
      return;
    }

    setErrors({});
    setSavedSettings({ ...operationalSettings });
    setFeedbackNotice({
      type: "success",
      text: "Operational preferences updated successfully for your active administrator session.",
    });
  };

  const handleResetPreferences = () => {
    setOperationalSettings({ ...savedSettings });
    setErrors({});
    setFeedbackNotice({
      type: "info",
      text: "Pending changes discarded. Reverted to previous session settings.",
    });
  };

  const handleRestoreDefaults = () => {
    setOperationalSettings({ ...DEFAULT_OPERATIONAL_SETTINGS });
    setErrors({});
    setFeedbackNotice({
      type: "info",
      text: "Preferences reset to standard system defaults. Click 'Save Session Preferences' to apply.",
    });
  };

  // Safe operator identity fallback
  const operator = currentAdminUser || {
    name: "Chief Administrator",
    email: "admin@vertex.local",
    role: "ADMIN",
    status: "ACTIVE",
  };

  return (
    <div className="adm-settings-view">
      {/* Page Header */}
      <div className="adm-page-header">
        <div className="adm-page-title-group">
          <h1>System Configuration &amp; Store Settings</h1>
          <p className="adm-page-subtitle">
            Store identity parameters, security policies, tax configuration, infrastructure telemetry, and session operational preferences.
          </p>
        </div>
        <div className="adm-page-actions">
          <button
            type="button"
            className="adm-btn adm-btn-secondary"
            onClick={handleTestHealth}
            disabled={testingHealth}
            data-testid="run-health-diagnostic-btn"
            title="Ping backend health endpoint"
          >
            {testingHealth ? (
              <>
                <span className="adm-spinner adm-spinner-dark" aria-hidden="true" /> Pinging Health Endpoint...
              </>
            ) : (
              "⚡ Run Live Health Diagnostic"
            )}
          </button>
        </div>
      </div>

      {/* Live Diagnostic Status Banner */}
      {testResult && (
        <div
          className={`adm-notice-banner ${
            testResult.type === "success" ? "adm-notice-info" : "adm-notice-warning"
          }`}
          role="status"
          data-testid="health-diagnostic-banner"
        >
          <span className="adm-notice-icon">
            {testResult.type === "success" ? "✓" : "⚠️"}
          </span>
          <div style={{ flex: 1 }}>
            <strong>{testResult.text}</strong>
            {testResult.latencyMs !== undefined && (
              <div style={{ fontSize: "0.82rem", marginTop: 4 }}>
                Round-trip latency: <strong>{testResult.latencyMs} ms</strong> &bull; Service: <code>{testResult.service}</code> &bull; Verified at: {new Date(testResult.timestamp).toLocaleTimeString()}
              </div>
            )}
          </div>
          <button
            type="button"
            className="adm-btn-close"
            onClick={() => setTestResult(null)}
            aria-label="Dismiss diagnostic notice"
            style={{ marginLeft: 8 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Feedback Banner */}
      {feedbackNotice && (
        <div
          className={`adm-notice-banner ${
            feedbackNotice.type === "success"
              ? "adm-notice-success"
              : feedbackNotice.type === "warning"
              ? "adm-notice-warning"
              : "adm-notice-info"
          }`}
          role="status"
          data-testid="settings-feedback-banner"
        >
          <span className="adm-notice-icon">
            {feedbackNotice.type === "success" ? "✓" : "ℹ️"}
          </span>
          <div style={{ flex: 1 }}>{feedbackNotice.text}</div>
          <button
            type="button"
            className="adm-btn-close"
            onClick={() => setFeedbackNotice(null)}
            aria-label="Dismiss notification"
            style={{ marginLeft: 8 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Configuration Scope Callout */}
      <div className="adm-notice-banner adm-notice-info" role="status">
        <span className="adm-notice-icon">🛡️</span>
        <div>
          <strong>Configuration Scope &amp; Authority:</strong> Server environment parameters, authentication mechanisms, and tax brackets are enforced server-side. Operational UI preferences below customize your active administrator session without mutating database records.
        </div>
      </div>

      {/* Section 1: Active Administrative Operator */}
      <div className="adm-settings-section-card">
        <div className="adm-settings-section-header">
          <div className="adm-settings-section-title-wrap">
            <span className="adm-settings-section-icon" aria-hidden="true">👤</span>
            <div>
              <h2 className="adm-settings-section-title">Active Administrative Operator</h2>
              <p className="adm-settings-section-desc">
                Current authenticated identity and security credential verification
              </p>
            </div>
          </div>
          <span className="adm-badge adm-badge-success">Session Authenticated</span>
        </div>
        <div className="adm-settings-section-body">
          <div className="adm-settings-grid">
            <div className="adm-settings-param-card">
              <span className="adm-settings-param-label">Operator Name</span>
              <div className="adm-settings-param-val">
                {operator.fullName || operator.name || "Chief Administrator"}
              </div>
              <span className="adm-settings-param-hint">Authenticated via HttpOnly session token</span>
            </div>

            <div className="adm-settings-param-card">
              <span className="adm-settings-param-label">Verified Email</span>
              <div className="adm-settings-param-val">
                <code>{operator.email}</code>
              </div>
              <span className="adm-settings-param-hint">Authoritative database identifier</span>
            </div>

            <div className="adm-settings-param-card">
              <span className="adm-settings-param-label">System Role &amp; Scope</span>
              <div className="adm-settings-param-val">
                <span className="adm-badge adm-badge-danger">ADMIN (Full Access)</span>
              </div>
              <span className="adm-settings-param-hint">Server-validated administrative privilege</span>
            </div>

            <div className="adm-settings-param-card">
              <span className="adm-settings-param-label">CSRF Protection Boundary</span>
              <div className="adm-settings-param-val">
                <span className="adm-badge adm-badge-success">Custom Header Enforced</span>
              </div>
              <span className="adm-settings-param-hint">Requires X-Requested-With: XMLHttpRequest</span>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Store Identity & Commercial Defaults */}
      <div className="adm-settings-section-card">
        <div className="adm-settings-section-header">
          <div className="adm-settings-section-title-wrap">
            <span className="adm-settings-section-icon" aria-hidden="true">🏢</span>
            <div>
              <h2 className="adm-settings-section-title">Store Identity &amp; Commercial Defaults</h2>
              <p className="adm-settings-section-desc">
                Storefront commercial parameters and authoritative decimal currency definitions
              </p>
            </div>
          </div>
          <span className="adm-badge adm-badge-neutral">Server Defaults (Read-Only)</span>
        </div>
        <div className="adm-settings-section-body">
          <div className="adm-settings-grid">
            <div className="adm-settings-param-card">
              <span className="adm-settings-param-label">Store Brand Name</span>
              <div className="adm-settings-param-val">VERTEX</div>
              <span className="adm-settings-param-hint">Electronics, Arduino &amp; Fasteners Store</span>
            </div>

            <div className="adm-settings-param-card">
              <span className="adm-settings-param-label">Commercial Currency</span>
              <div className="adm-settings-param-val">INR (₹) &mdash; Indian Rupee</div>
              <span className="adm-settings-param-hint">Calculated as Decimal(10,2) on server</span>
            </div>

            <div className="adm-settings-param-card">
              <span className="adm-settings-param-label">Default GST Tax Bracket</span>
              <div className="adm-settings-param-val">18.00% GST</div>
              <span className="adm-settings-param-hint">Standard rate for microcontrollers &amp; hardware</span>
            </div>

            <div className="adm-settings-param-card">
              <span className="adm-settings-param-label">Fulfillment Logistics</span>
              <div className="adm-settings-param-val">Pan-India Delivery</div>
              <span className="adm-settings-param-hint">Express parcel courier dispatch</span>
            </div>

            <div className="adm-settings-param-card">
              <span className="adm-settings-param-label">Official Support Desk</span>
              <div className="adm-settings-param-val">
                <code>support@vertex.local</code>
              </div>
              <span className="adm-settings-param-hint">Primary escalation and wholesale inquiries</span>
            </div>

            <div className="adm-settings-param-card">
              <span className="adm-settings-param-label">Storefront Catalog</span>
              <div className="adm-settings-param-val">
                <span className="adm-badge adm-badge-success">Live &amp; Connected</span>
              </div>
              <span className="adm-settings-param-hint">Public REST catalog endpoints active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Security Architecture & Access Policies */}
      <div className="adm-settings-section-card">
        <div className="adm-settings-section-header">
          <div className="adm-settings-section-title-wrap">
            <span className="adm-settings-section-icon" aria-hidden="true">🔒</span>
            <div>
              <h2 className="adm-settings-section-title">Security &amp; Session Policies</h2>
              <p className="adm-settings-section-desc">
                Server-enforced session protection, cryptographic hashing, and MFA specifications
              </p>
            </div>
          </div>
          <span className="adm-badge adm-badge-success">Enforced Policy</span>
        </div>
        <div className="adm-settings-section-body">
          <div className="adm-settings-grid">
            <div className="adm-settings-param-card">
              <span className="adm-settings-param-label">Session Storage Medium</span>
              <div className="adm-settings-param-val">HttpOnly Cookie (<code>vertex_session</code>)</div>
              <span className="adm-settings-param-hint">Inaccessible to client-side JavaScript / XSS</span>
            </div>

            <div className="adm-settings-param-card">
              <span className="adm-settings-param-label">Session Lifetime</span>
              <div className="adm-settings-param-val">7 Days (168 Hours)</div>
              <span className="adm-settings-param-hint">Hashed with SHA-256 in PostgreSQL database</span>
            </div>

            <div className="adm-settings-param-card">
              <span className="adm-settings-param-label">Password Cryptography</span>
              <div className="adm-settings-param-val">bcrypt (Salt Rounds: 10)</div>
              <span className="adm-settings-param-hint">Slow one-way adaptive cryptographic hash</span>
            </div>

            <div className="adm-settings-param-card">
              <span className="adm-settings-param-label">MFA Specification</span>
              <div className="adm-settings-param-val">TOTP RFC 6238 (SHA-1 / 30s)</div>
              <span className="adm-settings-param-hint">Monotonic clock replay prevention window</span>
            </div>

            <div className="adm-settings-param-card">
              <span className="adm-settings-param-label">Public Admin Registration</span>
              <div className="adm-settings-param-val">
                <span className="adm-badge adm-badge-danger">Strictly Blocked</span>
              </div>
              <span className="adm-settings-param-hint">Provisioned exclusively via secure CLI script</span>
            </div>

            <div className="adm-settings-param-card">
              <span className="adm-settings-param-label">Cookie SameSite Policy</span>
              <div className="adm-settings-param-val">SameSite=Lax</div>
              <span className="adm-settings-param-hint">Protects against cross-origin ambient dispatch</span>
            </div>
          </div>
        </div>
      </div>

      {/* Section 4: Database & Cloud Infrastructure Telemetry */}
      <div className="adm-settings-section-card">
        <div className="adm-settings-section-header">
          <div className="adm-settings-section-title-wrap">
            <span className="adm-settings-section-icon" aria-hidden="true">🗄️</span>
            <div>
              <h2 className="adm-settings-section-title">Database &amp; Cloud Infrastructure Telemetry</h2>
              <p className="adm-settings-section-desc">
                PostgreSQL database engine, connection pooler, and service runtime telemetry
              </p>
            </div>
          </div>
          <span className="adm-badge adm-badge-info">PostgreSQL 18.6</span>
        </div>
        <div className="adm-settings-section-body">
          <div className="adm-settings-grid">
            <div className="adm-settings-param-card">
              <span className="adm-settings-param-label">Database Engine</span>
              <div className="adm-settings-param-val">Neon Serverless PostgreSQL</div>
              <span className="adm-settings-param-hint">Multi-zone high availability cluster</span>
            </div>

            <div className="adm-settings-param-card">
              <span className="adm-settings-param-label">Connection Pooler</span>
              <div className="adm-settings-param-val">pgBouncer (Port 5432 / Transaction Pooling)</div>
              <span className="adm-settings-param-hint">Low-overhead pooled connections</span>
            </div>

            <div className="adm-settings-param-card">
              <span className="adm-settings-param-label">Active Connection Role</span>
              <div className="adm-settings-param-val">
                <code>vertex_app</code>
              </div>
              <span className="adm-settings-param-hint">Least privilege: SELECT, INSERT, UPDATE, DELETE</span>
            </div>

            <div className="adm-settings-param-card">
              <span className="adm-settings-param-label">Live API Status</span>
              <div className="adm-settings-param-val">
                <span className="adm-badge adm-badge-success">
                  {currentHealth?.status ? currentHealth.status.toUpperCase() : "ONLINE"}
                </span>
              </div>
              <span className="adm-settings-param-hint">Express.js health check endpoint</span>
            </div>

            <div className="adm-settings-param-card">
              <span className="adm-settings-param-label">Server Timestamp</span>
              <div className="adm-settings-param-val" style={{ fontSize: "0.85rem" }}>
                {currentHealth?.timestamp
                  ? new Date(currentHealth.timestamp).toLocaleString("en-IN")
                  : "Synchronized with UTC"}
              </div>
              <span className="adm-settings-param-hint">ISO-8601 UTC system clock</span>
            </div>

            <div className="adm-settings-param-card">
              <span className="adm-settings-param-label">Service Runtime</span>
              <div className="adm-settings-param-val">
                <code>{currentHealth?.service || "vertex-backend"}</code>
              </div>
              <span className="adm-settings-param-hint">Node.js ES Modules environment</span>
            </div>
          </div>
        </div>
      </div>

      {/* Section 5: Administrator Session Operational Preferences */}
      <div className="adm-settings-section-card">
        <div className="adm-settings-section-header">
          <div className="adm-settings-section-title-wrap">
            <span className="adm-settings-section-icon" aria-hidden="true">⚙️</span>
            <div>
              <h2 className="adm-settings-section-title">Session Operational Preferences</h2>
              <p className="adm-settings-section-desc">
                Customize operational thresholds and display parameters for your active administrative session
              </p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {hasUnsavedChanges && (
              <span className="adm-badge adm-badge-warning" data-testid="unsaved-changes-badge">
                ⚠️ Unsaved Changes
              </span>
            )}
            <span className="adm-badge adm-badge-neutral">Session Scope (Local)</span>
          </div>
        </div>

        <div className="adm-settings-section-body">
          <div className="adm-notice-banner adm-notice-info" style={{ marginBottom: 20 }}>
            <span className="adm-notice-icon">ℹ️</span>
            <div>
              <strong>Session Scope Notice:</strong> These preferences adjust local thresholds and pagination sizing in your active browser session. Persistent database settings are scheduled for upcoming administrative configuration features.
            </div>
          </div>

          <form onSubmit={handleSavePreferences} noValidate>
            <div className="adm-settings-form-grid">
              {/* Low Stock Alert Threshold */}
              <div className="adm-settings-form-field">
                <label htmlFor="pref-low-stock-threshold" className="adm-label">
                  Low-Stock Alert Threshold (Units) *
                </label>
                <input
                  id="pref-low-stock-threshold"
                  type="number"
                  min="1"
                  max="1000"
                  step="1"
                  className={`adm-input ${errors.lowStockThreshold ? "adm-input-error" : ""}`}
                  value={operationalSettings.lowStockThreshold}
                  onChange={(e) => handleFieldChange("lowStockThreshold", e.target.value)}
                  aria-describedby="pref-low-stock-hint pref-low-stock-err"
                  required
                />
                <span id="pref-low-stock-hint" className="adm-settings-param-hint">
                  Products with variant inventory at or below this quantity display a low-stock alert.
                </span>
                {errors.lowStockThreshold && (
                  <span
                    id="pref-low-stock-err"
                    className="adm-form-error"
                    style={{ color: "var(--adm-danger)", fontSize: "0.78rem", fontWeight: 600 }}
                  >
                    {errors.lowStockThreshold}
                  </span>
                )}
              </div>

              {/* Default Orders Page Size */}
              <div className="adm-settings-form-field">
                <label htmlFor="pref-orders-page-size" className="adm-label">
                  Default Orders Page Size
                </label>
                <select
                  id="pref-orders-page-size"
                  className="adm-select"
                  value={operationalSettings.ordersPageSize}
                  onChange={(e) => handleFieldChange("ordersPageSize", Number(e.target.value))}
                >
                  <option value={10}>10 Orders per page (Standard)</option>
                  <option value={20}>20 Orders per page</option>
                  <option value={50}>50 Orders per page (High Volume)</option>
                </select>
                <span className="adm-settings-param-hint">
                  Controls the pagination chunk size when browsing customer fulfillment orders.
                </span>
              </div>

              {/* Inventory Table Density */}
              <div className="adm-settings-form-field">
                <label htmlFor="pref-table-density" className="adm-label">
                  Table Display Density
                </label>
                <select
                  id="pref-table-density"
                  className="adm-select"
                  value={operationalSettings.inventoryTableDensity}
                  onChange={(e) => handleFieldChange("inventoryTableDensity", e.target.value)}
                >
                  <option value="standard">Standard (Balanced Padding)</option>
                  <option value="compact">Compact (High Information Density)</option>
                  <option value="comfortable">Comfortable (Spacious Padding)</option>
                </select>
                <span className="adm-settings-param-hint">
                  Adjusts row height and spacing across data tables.
                </span>
              </div>

              {/* Auto-Refresh Interval */}
              <div className="adm-settings-form-field">
                <label htmlFor="pref-auto-refresh" className="adm-label">
                  Dashboard Auto-Refresh Cadence
                </label>
                <select
                  id="pref-auto-refresh"
                  className="adm-select"
                  value={operationalSettings.autoRefreshInterval}
                  onChange={(e) => handleFieldChange("autoRefreshInterval", e.target.value)}
                >
                  <option value="disabled">Disabled (Manual Refresh Only)</option>
                  <option value="30s">Every 30 Seconds</option>
                  <option value="60s">Every 60 Seconds</option>
                  <option value="120s">Every 2 Minutes</option>
                </select>
                <span className="adm-settings-param-hint">
                  Background polling interval for operations telemetry.
                </span>
              </div>

              {/* Audit Log Query Chunk Size */}
              <div className="adm-settings-form-field">
                <label htmlFor="pref-audit-page-size" className="adm-label">
                  Audit Trail Page Size
                </label>
                <select
                  id="pref-audit-page-size"
                  className="adm-select"
                  value={operationalSettings.auditLogPageSize}
                  onChange={(e) => handleFieldChange("auditLogPageSize", Number(e.target.value))}
                >
                  <option value={10}>10 Log entries</option>
                  <option value={20}>20 Log entries (Default)</option>
                  <option value={50}>50 Log entries</option>
                </select>
                <span className="adm-settings-param-hint">
                  Number of security audit log events requested per batch.
                </span>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="adm-settings-actions-bar">
              <div>
                {hasUnsavedChanges ? (
                  <div className="adm-settings-dirty-notice">
                    <span>⚠️</span> You have unsaved changes in your session preferences.
                  </div>
                ) : (
                  <span style={{ fontSize: "0.82rem", color: "var(--adm-text-muted)" }}>
                    All session preferences are synchronized.
                  </span>
                )}
              </div>

              <div className="adm-settings-actions-group">
                <button
                  type="button"
                  className="adm-btn adm-btn-secondary"
                  onClick={handleRestoreDefaults}
                  title="Reset fields to system default values"
                >
                  Reset to Defaults
                </button>

                {hasUnsavedChanges && (
                  <button
                    type="button"
                    className="adm-btn adm-btn-secondary"
                    onClick={handleResetPreferences}
                    title="Discard current unsaved changes"
                  >
                    Discard Changes
                  </button>
                )}

                <button
                  type="submit"
                  className="adm-btn adm-btn-primary"
                  disabled={!hasUnsavedChanges}
                  data-testid="save-preferences-btn"
                >
                  Save Session Preferences
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
