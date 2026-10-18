import React, { useState } from "react";
import { requestPasswordReset } from "../../services/authApi";

export default function ForgotPasswordStep({ onBackToLogin }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !email.includes("@")) {
      setError("Please provide a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await requestPasswordReset({ email });
      setSubmitted(true);
      setMessage(
        res.message ||
          "If an account with that email address exists, password reset instructions have been dispatched."
      );
    } catch (err) {
      setError(err.message || "Failed to process password reset request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="vtx-forgot-step" role="region" aria-label="Reset Password">
      <h2 className="vtx-form-title">Reset Password</h2>
      <p className="vtx-form-sub">
        Enter your registered email address and we will dispatch instructions to securely reset your credentials.
      </p>

      {error && (
        <div className="vtx-alert vtx-alert-danger" role="alert" aria-live="polite">
          <span className="vtx-alert-icon" aria-hidden="true">⚠️</span>
          <span className="vtx-alert-text">{error}</span>
        </div>
      )}

      {submitted ? (
        <div className="vtx-alert vtx-alert-success" role="status">
          <span className="vtx-alert-icon" aria-hidden="true">✉️</span>
          <div className="vtx-alert-text">
            <strong>Check Your Inbox:</strong>
            <p className="vtx-mb-0">{message}</p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <div className="vtx-input-group">
            <label htmlFor="reset-email" className="vtx-label">
              Account Email
            </label>
            <div className="vtx-input-wrapper">
              <span className="vtx-input-icon" aria-hidden="true">✉️</span>
              <input
                id="reset-email"
                type="email"
                autoComplete="email"
                placeholder="engineer@vertex.in"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                disabled={loading}
                className="vtx-input"
                autoFocus
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="vtx-btn vtx-btn-primary vtx-btn-block"
            disabled={loading || !email.trim()}
          >
            {loading ? (
              <span className="vtx-btn-loading">
                <span className="vtx-spinner" aria-hidden="true" />
                Dispatching Instructions...
              </span>
            ) : (
              "Send Reset Instructions →"
            )}
          </button>
        </form>
      )}

      <div className="vtx-card-foot">
        <button
          type="button"
          className="vtx-link-btn"
          onClick={onBackToLogin}
        >
          ← Back to Sign In
        </button>
      </div>
    </div>
  );
}
