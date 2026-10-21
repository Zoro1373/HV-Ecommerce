import React, { useState, useEffect } from "react";

export default function AdminReviews() {
  const [searchQuery, setSearchQuery] = useState("");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedReview, setSelectedReview] = useState(null);

  useEffect(() => {
    if (selectedReview) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [selectedReview]);

  // Architecture preview records demonstrating moderation state machine
  const sampleReviews = [
    {
      id: "REV-101",
      productName: "Arduino Uno R3 Microcontroller Board",
      sku: "ELEC-ARD-UNO-R3",
      customer: "TechLab Dynamics",
      rating: 5,
      title: "Genuine ATmega328P Board - Reliable Prototyping",
      comment: "Rock solid industrial grade board. Header pins are aligned and solder quality is top notch.",
      status: "APPROVED",
      verifiedPurchase: true,
      createdAt: "2026-10-16T09:15:00Z",
    },
    {
      id: "REV-102",
      productName: "Stainless Steel Hex Socket Cap Screws (M3 x 12mm)",
      sku: "FAST-HEX-M3-12-P50",
      customer: "Apex Robotics",
      rating: 4,
      title: "Clean threading and dimensional tolerance",
      comment: "Threads fit smoothly into our 3D printed brass inserts without binding. Very clean finish.",
      status: "PENDING_MODERATION",
      verifiedPurchase: true,
      createdAt: "2026-10-18T10:00:00Z",
    },
  ];

  const filteredReviews = sampleReviews.filter((r) => {
    const matchesSearch =
      r.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRating = ratingFilter === "all" || r.rating.toString() === ratingFilter;
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    return matchesSearch && matchesRating && matchesStatus;
  });

  return (
    <div className="adm-reviews-view">
      <div className="adm-page-header">
        <div className="adm-page-title-group">
          <h1>Product Reviews &amp; Ratings Moderation</h1>
          <p className="adm-page-subtitle">
            Moderate verified customer product reviews, evaluate technical feedback, and enforce community standards.
          </p>
        </div>
      </div>

      {/* Backend Integration Roadmap Notice */}
      <div className="adm-notice-banner adm-notice-info" role="status">
        <span className="adm-notice-icon">ℹ️</span>
        <div>
          <strong>Backend Architecture Roadmap Notice:</strong> The current PostgreSQL schema contains <code>Product</code>, <code>ProductVariant</code>, and <code>OrderItem</code> models. Customer review persistence (<code>ProductReview</code> model) and verified-purchase moderation endpoints are scheduled for upcoming catalog community features.
        </div>
      </div>

      {/* Filter Bar */}
      <div className="adm-filter-bar">
        <div className="adm-search-input-wrap">
          <span className="adm-search-icon" aria-hidden="true">
            🔍
          </span>
          <input
            type="text"
            className="adm-search-input"
            placeholder="Search reviews by product name, title, or customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search reviews"
          />
        </div>

        <div className="adm-filter-group">
          <select
            className="adm-select"
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            aria-label="Filter by star rating"
          >
            <option value="all">All Star Ratings</option>
            <option value="5">5 Stars ★★★★★</option>
            <option value="4">4 Stars ★★★★☆</option>
            <option value="3">3 Stars ★★★☆☆</option>
            <option value="2">2 Stars ★★☆☆☆</option>
            <option value="1">1 Star  ★☆☆☆☆</option>
          </select>

          <select
            className="adm-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by moderation status"
          >
            <option value="all">All Moderation Statuses</option>
            <option value="APPROVED">Approved</option>
            <option value="PENDING_MODERATION">Pending Moderation</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* Reviews Table */}
      <div className="adm-card">
        <div className="adm-card-header">
          <h2 className="adm-card-title">Reviews &amp; Ratings Registry</h2>
          <span className="adm-badge adm-badge-neutral">Architecture Preview</span>
        </div>
        <div className="adm-card-body">
          <div className="adm-table-container">
            <table className="adm-table" aria-label="Customer reviews table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Product</th>
                  <th>Customer</th>
                  <th>Rating</th>
                  <th>Review Summary</th>
                  <th>Verified Purchase</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredReviews.map((rev) => (
                  <tr key={rev.id}>
                    <td><code>{rev.id}</code></td>
                    <td>
                      <strong>{rev.productName}</strong>
                      <span className="adm-subtext">{rev.sku}</span>
                    </td>
                    <td>{rev.customer}</td>
                    <td>
                      <span style={{ color: "var(--adm-warning)", fontWeight: 700 }}>
                        {"★".repeat(rev.rating)}{"☆".repeat(5 - rev.rating)}
                      </span>
                    </td>
                    <td>
                      <strong>{rev.title}</strong>
                      <p className="adm-table-truncate">{rev.comment}</p>
                    </td>
                    <td>
                      {rev.verifiedPurchase ? (
                        <span className="adm-badge adm-badge-success">✓ Verified</span>
                      ) : (
                        <span className="adm-badge adm-badge-neutral">Unverified</span>
                      )}
                    </td>
                    <td>
                      <span className={`adm-badge ${rev.status === "APPROVED" ? "adm-badge-success" : "adm-badge-warning"}`}>
                        {rev.status}
                      </span>
                    </td>
                    <td>{new Date(rev.createdAt).toLocaleDateString("en-IN")}</td>
                    <td>
                      <button
                        type="button"
                        className="adm-btn adm-btn-secondary adm-btn-sm"
                        onClick={() => setSelectedReview(rev)}
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
            <h4>Review Moderation Standards</h4>
            <ul>
              <li><strong>Zero Content Tampering:</strong> Administrators may approve or reject reviews, but customer review text is never silently modified.</li>
              <li><strong>Verified Purchase Validation:</strong> Reviews are validated against historical completed orders to prevent fraudulent reviews.</li>
              <li><strong>Audit Logging:</strong> All moderation decisions and rejection reasons are recorded in the <code>AuditLog</code> table.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Review Details Modal */}
      {selectedReview && (
        <div className="adm-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="rev-modal-title">
          <div className="adm-modal-content">
            <div className="adm-modal-header">
              <h3 id="rev-modal-title">Review Inspection: {selectedReview.id}</h3>
              <button
                type="button"
                className="adm-modal-close"
                onClick={() => setSelectedReview(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="adm-modal-body">
              <div className="adm-detail-grid">
                <div>
                  <span className="adm-label">Product Name</span>
                  <p><strong>{selectedReview.productName}</strong></p>
                </div>
                <div>
                  <span className="adm-label">Customer</span>
                  <p>{selectedReview.customer}</p>
                </div>
                <div>
                  <span className="adm-label">Rating</span>
                  <p style={{ color: "var(--adm-warning)", fontWeight: 700, fontSize: "1.1rem" }}>
                    {"★".repeat(selectedReview.rating)}{"☆".repeat(5 - selectedReview.rating)} ({selectedReview.rating}/5)
                  </p>
                </div>
                <div>
                  <span className="adm-label">Verified Purchase Status</span>
                  <p>{selectedReview.verifiedPurchase ? "Confirmed Order Verified" : "Not Verified"}</p>
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <span className="adm-label">Review Headline</span>
                <h4>{selectedReview.title}</h4>
                <span className="adm-label" style={{ marginTop: 8, display: "block" }}>Customer Comment</span>
                <p className="adm-reason-box">{selectedReview.comment}</p>
              </div>

              <div className="adm-notice-banner adm-notice-warning" style={{ marginTop: 16 }}>
                <span className="adm-notice-icon">⚠️</span>
                <div>
                  <strong>Read-Only Guardrail:</strong> Moderation actions (Approve / Reject) are read-only until the <code>ProductReview</code> backend API is mounted.
                </div>
              </div>
            </div>
            <div className="adm-modal-footer">
              <button
                type="button"
                className="adm-btn adm-btn-secondary"
                onClick={() => setSelectedReview(null)}
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
