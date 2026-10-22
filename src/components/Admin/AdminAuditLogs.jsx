import React, { useState, useEffect, useCallback, useRef } from "react";
import { getAdminAuditLogs } from "../../services/adminApi";

export default function AdminAuditLogs() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [logsResponse, setLogsResponse] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");
  const [inspectingLog, setInspectingLog] = useState(null);
  const requestIdRef = useRef(0);

  const loadLogs = useCallback(async (isRefresh = false) => {
    const currentRequestId = ++requestIdRef.current;
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      const res = await getAdminAuditLogs({ limit: 100 });
      if (currentRequestId === requestIdRef.current) {
        setLogsResponse(res);
      }
    } catch (err) {
      if (currentRequestId === requestIdRef.current) {
        setError(err.message || "Failed to query security audit logs from server.");
        setLogsResponse({
          isImplemented: false,
          message: err.message,
          logs: [],
        });
      }
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // Lock body scroll when modal is active
  useEffect(() => {
    if (inspectingLog) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [inspectingLog]);

  const logs = logsResponse?.logs || [];

  // Filter logic: search query, action, and entity type
  const filteredLogs = logs.filter((log) => {
    const term = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !term ||
      (log.action && log.action.toLowerCase().includes(term)) ||
      (log.entityType && log.entityType.toLowerCase().includes(term)) ||
      (log.entityId && log.entityId.toLowerCase().includes(term)) ||
      (log.actor?.email && log.actor.email.toLowerCase().includes(term)) ||
      (log.actor?.fullName && log.actor.fullName.toLowerCase().includes(term));

    const matchesAction = actionFilter === "all" || log.action === actionFilter;
    const matchesEntity = entityFilter === "all" || log.entityType === entityFilter;

    return matchesSearch && matchesAction && matchesEntity;
  });

  const hasActiveFilters = Boolean(searchQuery.trim()) || actionFilter !== "all" || entityFilter !== "all";

  const handleClearFilters = () => {
    setSearchQuery("");
    setActionFilter("all");
    setEntityFilter("all");
  };

  // Extract distinct actions and entity types for filter dropdowns
  const availableActions = Array.from(new Set(logs.map((l) => l.action).filter(Boolean)));
  const availableEntities = Array.from(new Set(logs.map((l) => l.entityType).filter(Boolean)));

  const getActionBadgeClass = (action) => {
    if (!action) return "adm-badge-info";
    if (action.includes("STOCK") || action.includes("INVENTORY")) return "adm-badge-warning";
    if (action.includes("ORDER") || action.includes("CONFIRM")) return "adm-badge-success";
    if (action.includes("AUTH") || action.includes("LOGIN") || action.includes("SESSION")) return "adm-badge-primary";
    if (action.includes("PASSWORD") || action.includes("SECURITY")) return "adm-badge-danger";
    return "adm-badge-info";
  };

  return (
    <div className="adm-audit-logs-view">
      <div className="adm-page-header">
        <div className="adm-page-title-group">
          <h1>Security &amp; Operational Audit Trail</h1>
          <p className="adm-page-subtitle">
            Inspect security events, administrative logins, catalog modifications, and stock adjustments.
          </p>
        </div>
        <div className="adm-page-actions">
          <button
            type="button"
            className="adm-btn adm-btn-secondary"
            onClick={() => loadLogs(true)}
            disabled={loading || refreshing}
            data-testid="refresh-audit-logs-btn"
            title="Refresh audit trail from database"
          >
            {refreshing ? "↻ Syncing..." : "↻ Refresh Audit Trail"}
          </button>
        </div>
      </div>

      {/* Integration Notice */}
      <div className="adm-notice-banner adm-notice-info" role="status">
        <span className="adm-notice-icon">📜</span>
        <div>
          <strong>Prisma AuditLog Model:</strong> The PostgreSQL database includes the <code>AuditLog</code> table with indexes on <code>actorId</code> and <code>[entityType, entityId]</code>. Administrative and security events are logged on the server.
        </div>
      </div>

      {error && (
        <div className="adm-notice-banner adm-notice-warning" role="alert" style={{ marginBottom: 16 }}>
          <span className="adm-notice-icon">⚠️</span>
          <div style={{ flex: 1 }}>
            <strong>Audit Log Notice:</strong> {error}
          </div>
          <button
            type="button"
            className="adm-btn adm-btn-secondary adm-btn-sm"
            onClick={() => loadLogs(false)}
            data-testid="retry-audit-logs-btn"
            style={{ marginLeft: 8 }}
          >
            ↻ Retry
          </button>
        </div>
      )}

      {/* Filter and Search Bar (rendered when logs are available or active filters exist) */}
      {(logs.length > 0 || hasActiveFilters) && (
        <div className="adm-filter-bar">
          <div className="adm-search-input-wrap">
            <span className="adm-search-icon" aria-hidden="true">
              🔍
            </span>
            <input
              type="text"
              className="adm-search-input"
              placeholder="Search by action, entity type, ID, or operator email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search audit logs"
            />
          </div>

          <div className="adm-filter-group">
            <select
              className="adm-select"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              aria-label="Filter by audit action"
            >
              <option value="all">All Actions ({logs.length})</option>
              {availableActions.map((act) => (
                <option key={act} value={act}>
                  {act}
                </option>
              ))}
            </select>

            <select
              className="adm-select"
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              aria-label="Filter by entity type"
            >
              <option value="all">All Entity Types</option>
              {availableEntities.map((ent) => (
                <option key={ent} value={ent}>
                  {ent}
                </option>
              ))}
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                className="adm-btn adm-btn-secondary adm-btn-sm"
                onClick={handleClearFilters}
                title="Reset filters"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="adm-loading-screen" role="status">
          <span className="adm-spinner adm-spinner-dark" aria-hidden="true" />
          <p>Querying security audit logs...</p>
        </div>
      ) : logs.length === 0 ? (
        /* Educational Empty State when no logs exist in the database */
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
      ) : filteredLogs.length === 0 ? (
        /* Empty search/filter state */
        <div className="adm-empty-state">
          <div className="adm-empty-icon" aria-hidden="true">🔍</div>
          <h3 className="adm-empty-title">No Matching Audit Logs Found</h3>
          <p className="adm-empty-desc">
            No audit log entries matched the query <strong>"{searchQuery}"</strong>
            {actionFilter !== "all" && <> with action <strong>{actionFilter}</strong></>}
            {entityFilter !== "all" && <> for entity <strong>{entityFilter}</strong></>}.
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
        /* Desktop Table View */
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
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      {log.createdAt
                        ? new Date(log.createdAt).toLocaleString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })
                        : "Recent"}
                    </td>
                    <td>
                      <span className={`adm-badge ${getActionBadgeClass(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td>
                      <strong>{log.entityType}</strong>
                    </td>
                    <td>
                      <code>{log.entityId}</code>
                    </td>
                    <td>
                      {log.actor?.email ? (
                        <div>
                          <span>{log.actor.email}</span>
                          {log.actor.fullName && (
                            <div style={{ fontSize: "0.76rem", color: "var(--adm-text-secondary)" }}>
                              {log.actor.fullName}
                            </div>
                          )}
                        </div>
                      ) : (
                        log.actorId || "System"
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="adm-btn adm-btn-secondary adm-btn-sm"
                        onClick={() => setInspectingLog(log)}
                        data-testid={`inspect-audit-log-${log.id}`}
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="adm-pagination">
            <span>
              Showing {filteredLogs.length} of {logs.length} audit records
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
      )}

      {/* Audit Log Entry Inspection Modal */}
      {inspectingLog && (
        <div
          className="adm-modal-backdrop"
          onClick={() => setInspectingLog(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="audit-log-modal-title"
        >
          <div
            className="adm-modal"
            style={{ maxWidth: 680 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="adm-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <h2 id="audit-log-modal-title" className="adm-modal-title" style={{ margin: 0 }}>
                  Audit Record Details
                </h2>
                <span className={`adm-badge ${getActionBadgeClass(inspectingLog.action)}`}>
                  {inspectingLog.action}
                </span>
              </div>
              <button
                type="button"
                className="adm-modal-close"
                onClick={() => setInspectingLog(null)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <div className="adm-modal-body" style={{ maxHeight: "75vh", overflowY: "auto" }}>
              <div className="adm-order-detail-card" style={{ marginBottom: 16 }}>
                <h3 className="adm-section-title">Event Information</h3>
                <div className="adm-detail-grid">
                  <div>
                    <span className="adm-label">Audit Log ID</span>
                    <p><code>{inspectingLog.id}</code></p>
                  </div>
                  <div>
                    <span className="adm-label">Event Timestamp</span>
                    <p>{new Date(inspectingLog.createdAt).toLocaleString("en-IN")}</p>
                  </div>
                  <div>
                    <span className="adm-label">Target Entity Type</span>
                    <p><strong>{inspectingLog.entityType}</strong></p>
                  </div>
                  <div>
                    <span className="adm-label">Target Entity ID</span>
                    <p><code>{inspectingLog.entityId}</code></p>
                  </div>
                  <div>
                    <span className="adm-label">Operator / Actor</span>
                    <p>{inspectingLog.actor?.email || inspectingLog.actorId || "System Engine"}</p>
                  </div>
                  <div>
                    <span className="adm-label">Actor Role</span>
                    <p>{inspectingLog.actor?.role || "SYSTEM"}</p>
                  </div>
                </div>
              </div>

              <div className="adm-order-detail-card">
                <h3 className="adm-section-title">Event Metadata &amp; Parameters</h3>
                {inspectingLog.metadata && Object.keys(inspectingLog.metadata).length > 0 ? (
                  <pre
                    style={{
                      background: "var(--adm-bg, #f8fafc)",
                      padding: 12,
                      borderRadius: 6,
                      border: "1px solid var(--adm-border)",
                      fontSize: "0.82rem",
                      overflowX: "auto",
                      margin: 0,
                    }}
                  >
                    {JSON.stringify(inspectingLog.metadata, null, 2)}
                  </pre>
                ) : (
                  <p style={{ margin: 0, color: "var(--adm-text-secondary)", fontSize: "0.85rem" }}>
                    No additional metadata attached to this audit event.
                  </p>
                )}
              </div>
            </div>

            <div className="adm-modal-footer">
              <button
                type="button"
                className="adm-btn adm-btn-secondary"
                onClick={() => setInspectingLog(null)}
              >
                Close Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
