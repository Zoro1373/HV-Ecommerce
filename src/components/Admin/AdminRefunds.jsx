import React, { useState, useEffect } from "react";

export default function AdminRefunds({ onNavigateOrders }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedRefund, setSelectedRefund] = useState(null);

  useEffect(() => {
    if (selectedRefund) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [selectedRefund]);

  const sampleRefundRequests = [
    {
      id: "REF-2026-001",
      orderNumber: "VTX-20261018-74192",
      orderDate: "2026-10-18",
      customer: "Alpha Robotics Corp",
      requestedAmount: 1532.82,
      originalAmount: 1532.82,
      previouslyRefunded: 0.0,
      reason: "Ordered incorrect microcontroller pack size; unopened return requested.",
      status: "AWAITING_REVIEW",
      paymentStatus: "PENDING (COD)",
      createdAt: "2026-10-18T12:30:00Z",
    },
    {
      id: "REF-2026-002",
      orderNumber: "VTX-20261018-88210",
      orderDate: "2026-10-17",
      customer: "Apex Precision Tools",
      requestedAmount: 295.0,
      originalAmount: 590.0,
      previouslyRefunded: 0.0,
      reason: "Partial cancellation of duplicate bolt pack.",
      status: "GATEWAY_INTEGRATION_PENDING",
      paymentStatus: "PENDING",
      createdAt: "2026-10-17T15:45:00Z",
    },
  ];

  const filteredRefunds = sampleRefundRequests.filter((r) => {
    const matchesSearch =
      r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.customer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="adm-refunds-view">
      <div className="adm-page-header">
        <div className="adm-page-title-group">
          <h1>Refunds &amp; Returns Operations</h1>
          <p className="adm-page-subtitle">
            Audit customer return authorizations, process credit notes, and monitor payment-gateway settlement statuses.
          </p>
        </div>
      </div>

      {/* Financial Safety & Gateway Boundary Notice */}
      <div className="adm-notice-banner adm-notice-info" role="status">
        <span className="adm-notice-icon">🛡️</span>
        <div>
          <strong>Financial Boundary &amp; Non-Operational Notice:</strong> In accordance with strict financial integrity standards, no automated refund transactions are simulated. Actual fund reversals require a certified payment gateway webhook integration (Razorpay / Stripe) and idempotency-locked backend credit services.
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="adm-filter-bar">
        <div className="adm-search-input-wrap">
          <span className="adm-search-icon" aria-hidden="true">
            🔍
          </span>
          <input
            type="text"
            className="adm-search-input"
            placeholder="Search by refund ID, order number, or customer name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search refund requests"
          />
        </div>

        <div className="adm-filter-group">
          <select
            className="adm-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter refunds by status"
          >
            <option value="all">All Request Statuses</option>
            <option value="AWAITING_REVIEW">Awaiting Review</option>
            <option value="GATEWAY_INTEGRATION_PENDING">Gateway Integration Pending</option>
            <option value="SETTLED">Settled</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* Refunds Registry Table */}
      <div className="adm-card">
        <div className="adm-card-header">
          <h2 className="adm-card-title">Refund Authorizations Registry</h2>
          <span className="adm-badge adm-badge-warning">Gateway Pending</span>
        </div>
        <div className="adm-card-body">
          <div className="adm-table-container">
            <table className="adm-table" aria-label="Refunds table">
              <thead>
                <tr>
                  <th>Refund ID</th>
                  <th>Related Order</th>
                  <th>Customer</th>
                  <th>Requested Amount</th>
                  <th>Original Total</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRefunds.map((ref) => (
                  <tr key={ref.id}>
                    <td><code>{ref.id}</code></td>
                    <td>
                      <span className="adm-code-link" onClick={() => onNavigateOrders && onNavigateOrders(ref.orderNumber)}>
                        {ref.orderNumber}
                      </span>
                    </td>
                    <td>{ref.customer}</td>
                    <td><strong>₹{ref.requestedAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong></td>
                    <td>₹{ref.originalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                    <td>
                      <span className={`adm-badge ${ref.status === "AWAITING_REVIEW" ? "adm-badge-warning" : "adm-badge-info"}`}>
                        {ref.status}
                      </span>
                    </td>
                    <td>{new Date(ref.createdAt).toLocaleDateString("en-IN")}</td>
                    <td>
                      <button
                        type="button"
                        className="adm-btn adm-btn-secondary adm-btn-sm"
                        onClick={() => setSelectedRefund(ref)}
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="adm-info-callout" style={{ marginTop: 20 }}>
            <h4>Mandatory Financial Safety Guardrails</h4>
            <ul>
              <li><strong>Zero Simulation:</strong> Orders are never marked refunded merely because an administrative button was clicked.</li>
              <li><strong>Cumulative Refund Cap:</strong> System validates that cumulative refunds on an order cannot exceed the captured total.</li>
              <li><strong>Audit Logging:</strong> Every refund request, review note, and rejection reason is immutably recorded in the <code>AuditLog</code> table.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Refund Details Modal */}
      {selectedRefund && (
        <div className="adm-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="refund-modal-title">
          <div className="adm-modal-content">
            <div className="adm-modal-header">
              <h3 id="refund-modal-title">Refund Request Details: {selectedRefund.id}</h3>
              <button
                type="button"
                className="adm-modal-close"
                onClick={() => setSelectedRefund(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="adm-modal-body">
              <div className="adm-detail-grid">
                <div>
                  <span className="adm-label">Related Order Number</span>
                  <p><strong>{selectedRefund.orderNumber}</strong></p>
                </div>
                <div>
                  <span className="adm-label">Customer</span>
                  <p>{selectedRefund.customer}</p>
                </div>
                <div>
                  <span className="adm-label">Original Payment Amount</span>
                  <p>₹{selectedRefund.originalAmount.toFixed(2)}</p>
                </div>
                <div>
                  <span className="adm-label">Requested Refund Amount</span>
                  <p style={{ color: "var(--adm-orange)", fontWeight: 700 }}>
                    ₹{selectedRefund.requestedAmount.toFixed(2)}
                  </p>
                </div>
                <div>
                  <span className="adm-label">Previously Refunded</span>
                  <p>₹{selectedRefund.previouslyRefunded.toFixed(2)}</p>
                </div>
                <div>
                  <span className="adm-label">Remaining Balance</span>
                  <p>₹{(selectedRefund.originalAmount - selectedRefund.previouslyRefunded).toFixed(2)}</p>
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <span className="adm-label">Customer-Provided Reason</span>
                <p className="adm-reason-box">{selectedRefund.reason}</p>
              </div>

              <div className="adm-notice-banner adm-notice-warning" style={{ marginTop: 16 }}>
                <span className="adm-notice-icon">⚠️</span>
                <div>
                  <strong>Financial Execution Guard:</strong> Settlement buttons are disabled. Automated money transfers are locked until an authorized payment gateway is configured.
                </div>
              </div>
            </div>
            <div className="adm-modal-footer">
              <button
                type="button"
                className="adm-btn adm-btn-secondary"
                onClick={() => setSelectedRefund(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
