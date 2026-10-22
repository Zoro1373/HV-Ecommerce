/**
 * VERTEX Request for Quote (RFQ) Modal
 * 
 * Allows industrial customers, engineering teams, and institutional buyers
 * to request direct volume quotes for unpriced SKUs or bulk purchases.
 */

import React, { useState, useEffect } from "react";
import { submitQuoteRequest } from "../../services/quoteApi";

export default function QuoteModal({ product, isOpen, onClose, currentUser }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    quantity: "100",
    notes: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rfqNumber, setRfqNumber] = useState("");
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    if (currentUser) {
      setFormData((prev) => ({
        ...prev,
        name: currentUser.fullName || "",
        email: currentUser.email || "",
        phone: currentUser.phone || "",
        company: currentUser.companyName || "",
      }));
    }
  }, [currentUser]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen || !product) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);

    const primarySku = product.variants?.[0]?.sku || product.sku || `VTX-${product.slug?.toUpperCase()}`;
    const payload = {
      contactName: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      companyName: formData.company?.trim() || null,
      productDetails: product.name ? `${product.name} (SKU: ${primarySku})` : primarySku,
      quantity: Math.max(1, parseInt(formData.quantity, 10) || 1),
      message: formData.notes?.trim() || null,
    };

    try {
      const res = await submitQuoteRequest(payload);
      const generatedId = res.quote?.id
        ? `RFQ-${res.quote.id.slice(0, 8).toUpperCase()}`
        : `RFQ-${Math.floor(100000 + Math.random() * 900000)}`;
      setRfqNumber(generatedId);
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err.message || "Failed to submit quote request. Please check your inputs.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setSubmitted(false);
    setRfqNumber("");
    setSubmitError(null);
    onClose();
  };

  const primarySku = product.variants?.[0]?.sku || product.sku || `VTX-${product.slug?.toUpperCase()}`;

  return (
    <div
      className="vtx-modal-backdrop"
      onClick={handleResetAndClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="rfq-modal-title"
    >
      <div className="vtx-modal rfq-modal" onClick={(e) => e.stopPropagation()}>
        <div className="vtx-modal-header">
          <div>
            <span className="vtx-modal-badge">B2B &amp; Direct Sourcing</span>
            <h3 id="rfq-modal-title" className="vtx-modal-title">
              Request a Commercial Quote
            </h3>
          </div>
          <button
            type="button"
            className="vtx-modal-close"
            onClick={handleResetAndClose}
            aria-label="Close quote modal"
          >
            ✕
          </button>
        </div>

        <div className="vtx-modal-body">
          {submitted ? (
            <div className="rfq-success-container" role="status">
              <div className="rfq-success-icon" aria-hidden="true">✓</div>
              <h4>Quote Request Submitted</h4>
              <p className="rfq-success-ref">
                Reference ID: <strong>{rfqNumber}</strong>
              </p>
              <p className="rfq-success-desc">
                Our technical sales team has received your inquiry for <strong>{product.name}</strong> ({primarySku}).
                A formal quotation with volume discounts and tax schedule will be dispatched to <strong>{formData.email}</strong> within 1 business day.
              </p>
              <div className="rfq-success-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleResetAndClose}
                >
                  Return to Storefront
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="rfq-form">
              {submitError && (
                <div
                  className="rfq-error-alert"
                  style={{
                    background: "#fef2f2",
                    color: "#991b1b",
                    padding: "10px 14px",
                    borderRadius: "6px",
                    fontSize: "13px",
                    marginBottom: "16px",
                    border: "1px solid #fecaca",
                  }}
                  role="alert"
                >
                  ⚠️ {submitError}
                </div>
              )}
              <div className="rfq-product-summary">
                <div className="rfq-prod-info">
                  <span className="rfq-prod-label">Product Inquired:</span>
                  <div className="rfq-prod-name">{product.name}</div>
                  <div className="rfq-prod-meta">
                    <span>SKU: <code>{primarySku}</code></span>
                    {product.brand && <span>Brand: {product.brand}</span>}
                    {product.category?.name && <span>Category: {product.category.name}</span>}
                  </div>
                </div>
              </div>

              <div className="rfq-form-grid">
                <div className="rfq-field">
                  <label htmlFor="rfq-name">Full Name *</label>
                  <input
                    id="rfq-name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Dr. Rajesh Kumar"
                  />
                </div>

                <div className="rfq-field">
                  <label htmlFor="rfq-email">Business / Institute Email *</label>
                  <input
                    id="rfq-email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="name@company.com"
                  />
                </div>

                <div className="rfq-field">
                  <label htmlFor="rfq-phone">Contact Phone Number *</label>
                  <input
                    id="rfq-phone"
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                  />
                </div>

                <div className="rfq-field">
                  <label htmlFor="rfq-company">Company / Institution / Lab</label>
                  <input
                    id="rfq-company"
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    placeholder="e.g. TechCorp Robotics Lab"
                  />
                </div>

                <div className="rfq-field rfq-field-full">
                  <label htmlFor="rfq-quantity">Estimated Quantity Required *</label>
                  <input
                    id="rfq-quantity"
                    type="number"
                    min="1"
                    required
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    placeholder="e.g. 50, 100, 500"
                  />
                  <span className="rfq-hint">Standard bulk tiers begin at 50+ units.</span>
                </div>

                <div className="rfq-field rfq-field-full">
                  <label htmlFor="rfq-notes">Project Specifications or Special Requirements</label>
                  <textarea
                    id="rfq-notes"
                    rows="3"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Specify project delivery timelines, custom pack sizes, GST invoicing details, or technical documentation required."
                  />
                </div>
              </div>

              <div className="vtx-modal-footer">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={handleResetAndClose}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? "Transmitting..." : "Submit Quote Request →"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
