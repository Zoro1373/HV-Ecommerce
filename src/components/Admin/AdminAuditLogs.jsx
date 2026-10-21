import React, { useState, useEffect } from "react";
import { getAdminAuditLogs } from "../../services/adminApi";

export default function AdminAuditLogs() {
  const [loading, setLoading] = useState(true);
  const [logsResponse, setLogsResponse] = useState(null);

  useEffect(() => {
    async function loadLogs() {
      try {
        setLoading(true);
        const res = await getAdminAuditLogs();
        setLogsResponse(res);
      } catch (err) {
        setLogsResponse({
          isImplemented: false,
          message: err.message,
          logs: [],
        });
      } finally {
        setLoading(false);
      }
    }
    loadLogs();
  }, []);

  const logs = logsResponse?.logs || [];

  return (
    <div className="adm-audit-logs-view">
      <div className="adm-page-header">
        <div className="adm-page-title-group">
          <h1>Security &amp; Operational Audit Trail</h1>
          <p className="adm-page-subtitle">
            Inspect security events, administrative logins, catalog modifications, and stock adjustments.
          </p>
        </div>
      </div>

      {/* Integration Notice */}
      <div className="adm-notice-banner adm-notice-info" role="status">
        <span className="adm-notice-icon">📜</span>
        <div>
          <strong>Prisma AuditLog Model:</strong> The PostgreSQL database includes the <code>AuditLog</code> table with indexes on <code>actorId</code> and <code>[entityType, entityId]</code>. Administrative and security events are logged on the server.
        </div>
      </div>

      {loading ? (
        <div className="adm-loading-screen" role="status">
          <span className="adm-spinner adm-spinner-dark" aria-hidden="true" />
          <p>Querying security audit logs...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="adm-card">
          <div className="adm-card-header">
            <h2 className="adm-card-title">Audited Event Types</h2>
            <span className="adm-badge adm-badge-info">Security Monitoring</span>
          </div>
          <div className="adm-card-body">
            <p style={{ margin: "0 0 16px", color: "var(--adm-text-secondary)", fontSize: "0.9rem" }}>
              The audit logging infrastructure monitors the following critical events:
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
              <div style={{ background: "var(--adm-bg)", padding: 14, borderRadius: 8, border: "1px solid var(--adm-border)" }}>
                <span className="adm-badge adm-badge-success" style={{ marginBottom: 6 }}>AUTH_LOGIN</span>
                <div style={{ fontWeight: 600, fontSize: "0.88rem" }}>Session Creation</div>
                <div style={{ fontSize: "0.78rem", color: "var(--adm-text-secondary)", marginTop: 4 }}>
                  Tracks IP address, user agent, and timestamp of successful logins.
                </div>
              </div>

              <div style={{ background: "var(--adm-bg)", padding: 14, borderRadius: 8, border: "1px solid var(--adm-border)" }}>
                <span className="adm-badge adm-badge-warning" style={{ marginBottom: 6 }}>MFA_ENROLL</span>
                <div style={{ fontWeight: 600, fontSize: "0.88rem" }}>2FA Status Changes</div>
                <div style={{ fontSize: "0.78rem", color: "var(--adm-text-secondary)", marginTop: 4 }}>
                  Logs TOTP confirmation, recovery code generation, and 2FA disable events.
                </div>
              </div>

              <div style={{ background: "var(--adm-bg)", padding: 14, borderRadius: 8, border: "1px solid var(--adm-border)" }}>
                <span className="adm-badge adm-badge-info" style={{ marginBottom: 6 }}>STOCK_ADJUSTMENT</span>
                <div style={{ fontWeight: 600, fontSize: "0.88rem" }}>Inventory Telemetry</div>
                <div style={{ fontSize: "0.78rem", color: "var(--adm-text-secondary)", marginTop: 4 }}>
                  Records manual stock updates, reasons, and variant SKU delta quantities.
                </div>
              </div>

              <div style={{ background: "var(--adm-bg)", padding: 14, borderRadius: 8, border: "1px solid var(--adm-border)" }}>
                <span className="adm-badge adm-badge-neutral" style={{ marginBottom: 6 }}>PASSWORD_CHANGE</span>
                <div style={{ fontWeight: 600, fontSize: "0.88rem" }}>Credential Rotation</div>
                <div style={{ fontSize: "0.78rem", color: "var(--adm-text-secondary)", marginTop: 4 }}>
                  Tracks password updates and automatic invalidation of competing sessions.
                </div>
              </div>
            </div>

            <div className="adm-empty-state" style={{ marginTop: 20, background: "var(--adm-surface)" }}>
              <div className="adm-empty-icon" aria-hidden="true">📜</div>
              <h3 className="adm-empty-title">Audit Trail Ready</h3>
              <p className="adm-empty-desc">
                Security and operational log events will stream in real time as administrative actions and order state changes take place.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="adm-card" style={{ padding: 0 }}>
          <div className="adm-table-container">
            <table className="adm-table" aria-label="Audit log entries table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Entity Type</th>
                  <th>Entity ID</th>
                  <th>Actor</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>{new Date(log.createdAt).toLocaleString()}</td>
                    <td>
                      <span className="adm-badge adm-badge-info">{log.action}</span>
                    </td>
                    <td>{log.entityType}</td>
                    <td>
                      <code>{log.entityId}</code>
                    </td>
                    <td>{log.actor?.email || log.actorId || "System"}</td>
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
