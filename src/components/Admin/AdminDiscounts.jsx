import React, { useState } from "react";

export default function AdminDiscounts() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <div className="adm-discounts-view">
      <div className="adm-page-header">
        <div className="adm-page-title-group">
          <h1>Discounts &amp; Promotions Management</h1>
          <p className="adm-page-subtitle">
            Configure industrial B2B discount tiers, coupon campaigns, bulk purchase incentives, and promotional vouchers.
          </p>
        </div>
        <div className="adm-page-actions">
          <button
            type="button"
            className="adm-btn adm-btn-primary"
            onClick={() => setShowCreateModal(true)}
            data-testid="create-discount-btn"
          >
            + Create Promotion
          </button>
        </div>
      </div>

      {/* Integration Status Notice */}
      <div className="adm-notice-banner adm-notice-info" role="status">
        <span className="adm-notice-icon">ℹ️</span>
        <div>
          <strong>Backend Architecture Roadmap Notice:</strong> The PostgreSQL schema currently enforces server-authoritative pricing via <code>TieredPrice</code> for volume orders. Order-level coupon and promotion codes (e.g. <code>Discount</code> or <code>Promotion</code> models) require an authorized database migration and validation engine. Promotion parameters below reflect the planned specification.
        </div>
      </div>

      {/* Search and Filters */}
      <div className="adm-filter-bar">
        <div className="adm-search-input-wrap">
          <span className="adm-search-icon" aria-hidden="true">
            🔍
          </span>
          <input
            type="text"
            className="adm-search-input"
            placeholder="Search by promo code or campaign name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search promotions"
          />
        </div>

        <div className="adm-filter-group">
          <select
            className="adm-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter promotions by status"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="scheduled">Scheduled</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      {/* Promotions Specification & Overview Table */}
      <div className="adm-card">
        <div className="adm-card-header">
          <h2 className="adm-card-title">Promotions &amp; Voucher Registry</h2>
          <span className="adm-badge adm-badge-neutral">Read-Only Architecture Preview</span>
        </div>
        <div className="adm-card-body">
          <div className="adm-table-container">
            <table className="adm-table" aria-label="Promotions list">
              <thead>
                <tr>
                  <th>Coupon Code</th>
                  <th>Campaign Name</th>
                  <th>Discount Type</th>
                  <th>Value</th>
                  <th>Min Order</th>
                  <th>Max Discount</th>
                  <th>Status</th>
                  <th>Valid Period</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>VTX-IND-BULK10</code></td>
                  <td>Industrial Bulk Fasteners Incentive</td>
                  <td>Percentage</td>
                  <td>10.00%</td>
                  <td>₹10,000.00</td>
                  <td>₹2,500.00</td>
                  <td><span className="adm-badge adm-badge-success">Active Specification</span></td>
                  <td>Jan 2026 – Dec 2026</td>
                </tr>
                <tr>
                  <td><code>VTX-ELEC-FIRST</code></td>
                  <td>New Lab Welcome Voucher</td>
                  <td>Fixed Amount</td>
                  <td>₹500.00</td>
                  <td>₹3,000.00</td>
                  <td>₹500.00</td>
                  <td><span className="adm-badge adm-badge-info">Scheduled</span></td>
                  <td>Nov 2026 – Dec 2026</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="adm-info-callout" style={{ marginTop: 20 }}>
            <h4>Financial Integrity &amp; Validation Constraints</h4>
            <ul>
              <li><strong>Authoritative Recalculation:</strong> Client-submitted discount amounts will never be trusted. The backend recalculates all order totals and taxes.</li>
              <li><strong>Tax Ordering:</strong> Pre-tax discounts apply to line subtotals before 18% GST calculation; post-tax vouchers apply against gross totals.</li>
              <li><strong>Stacking Protection:</strong> Prevents compounding multiple percentage discounts beyond permitted commercial thresholds.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Create Promotion Specification Modal */}
      {showCreateModal && (
        <div className="adm-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="promo-modal-title">
          <div className="adm-modal-content">
            <div className="adm-modal-header">
              <h3 id="promo-modal-title">New Promotion Campaign Specification</h3>
              <button
                type="button"
                className="adm-modal-close"
                onClick={() => setShowCreateModal(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="adm-modal-body">
              <p className="adm-modal-intro">
                Promotion creation requires backend database migration (pending authorization). You may review the campaign parameter contract:
              </p>

              <div className="adm-form-grid">
                <div className="adm-form-field">
                  <label htmlFor="promoCode">Coupon Code</label>
                  <input id="promoCode" type="text" className="adm-input" placeholder="e.g. VTX-OFFER-15" disabled />
                </div>
                <div className="adm-form-field">
                  <label htmlFor="promoType">Discount Type</label>
                  <select id="promoType" className="adm-select" disabled>
                    <option>Percentage (%)</option>
                    <option>Fixed Amount (₹)</option>
                  </select>
                </div>
                <div className="adm-form-field">
                  <label htmlFor="promoVal">Discount Value</label>
                  <input id="promoVal" type="number" className="adm-input" placeholder="10" disabled />
                </div>
                <div className="adm-form-field">
                  <label htmlFor="minOrder">Minimum Order Value (₹)</label>
                  <input id="minOrder" type="number" className="adm-input" placeholder="5000" disabled />
                </div>
              </div>

              <div className="adm-notice-banner adm-notice-warning" style={{ marginTop: 16 }}>
                <span className="adm-notice-icon">⚠️</span>
                <div>
                  <strong>Read-Only Guardrail:</strong> Frontend submissions are disabled to prevent simulating non-persisted commercial discounts.
                </div>
              </div>
            </div>
            <div className="adm-modal-footer">
              <button
                type="button"
                className="adm-btn adm-btn-secondary"
                onClick={() => setShowCreateModal(false)}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
