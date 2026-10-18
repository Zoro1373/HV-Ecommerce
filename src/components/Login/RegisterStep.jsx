import React, { useState } from "react";
import { registerUser } from "../../services/authApi";

export default function RegisterStep({ onRegisterSuccess, onBackToLogin }) {
  const [accountType, setAccountType] = useState("CUSTOMER");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [gstin, setGstin] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError("Password must contain at least one uppercase letter and one number.");
      return;
    }

    if (accountType === "B2B" && !companyName.trim()) {
      setError("Please enter your company or business name for B2B registration.");
      return;
    }

    setLoading(true);
    try {
      const response = await registerUser({
        fullName,
        email,
        password,
        phone,
        accountType,
        companyName,
        gstin,
      });

      if (response.success) {
        onRegisterSuccess(response.user);
      }
    } catch (err) {
      setError(err.message || "Registration failed. Please check your details and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="vtx-register-step" role="region" aria-label="Create an Account">
      <h2 className="vtx-form-title">Create an Account</h2>
      <p className="vtx-form-sub">
        Join VERTEX for high-precision electronics, hardware prototyping, and bulk component procurement.
      </p>

      {/* Account Type Selector */}
      <div className="vtx-account-type-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={accountType === "CUSTOMER"}
          className={`vtx-type-tab ${accountType === "CUSTOMER" ? "active" : ""}`}
          onClick={() => {
            setAccountType("CUSTOMER");
            setError(null);
          }}
        >
          <span className="vtx-tab-icon" aria-hidden="true">🛠️</span>
          <div>
            <strong>Makers &amp; Engineers</strong>
            <small>Standard personal account</small>
          </div>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={accountType === "B2B"}
          className={`vtx-type-tab ${accountType === "B2B" ? "active" : ""}`}
          onClick={() => {
            setAccountType("B2B");
            setError(null);
          }}
        >
          <span className="vtx-tab-icon" aria-hidden="true">🏭</span>
          <div>
            <strong>Business &amp; Industry</strong>
            <small>GST invoice &amp; bulk tier pricing</small>
          </div>
        </button>
      </div>

      {error && (
        <div className="vtx-alert vtx-alert-danger" role="alert" aria-live="polite">
          <span className="vtx-alert-icon" aria-hidden="true">⚠️</span>
          <span className="vtx-alert-text">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="vtx-input-group">
          <label htmlFor="reg-fullname" className="vtx-label">
            Full Name <span className="vtx-required">*</span>
          </label>
          <div className="vtx-input-wrapper">
            <span className="vtx-input-icon" aria-hidden="true">👤</span>
            <input
              id="reg-fullname"
              type="text"
              autoComplete="name"
              placeholder="e.g. Adarsh Sharma"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                if (error) setError(null);
              }}
              disabled={loading}
              className="vtx-input"
              required
            />
          </div>
        </div>

        <div className="vtx-input-group">
          <label htmlFor="reg-email" className="vtx-label">
            Email Address <span className="vtx-required">*</span>
          </label>
          <div className="vtx-input-wrapper">
            <span className="vtx-input-icon" aria-hidden="true">✉️</span>
            <input
              id="reg-email"
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
              required
            />
          </div>
        </div>

        <div className="vtx-input-group">
          <label htmlFor="reg-password" className="vtx-label">
            Password <span className="vtx-required">*</span>
          </label>
          <div className="vtx-input-wrapper">
            <span className="vtx-input-icon" aria-hidden="true">🔒</span>
            <input
              id="reg-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Min. 8 chars, 1 uppercase, 1 digit"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(null);
              }}
              disabled={loading}
              className="vtx-input vtx-input-with-action"
              required
            />
            <button
              type="button"
              className="vtx-input-action-btn"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>
        </div>

        <div className="vtx-input-group">
          <label htmlFor="reg-phone" className="vtx-label">
            Phone Number <span className="vtx-optional">(optional)</span>
          </label>
          <div className="vtx-input-wrapper">
            <span className="vtx-input-icon" aria-hidden="true">📱</span>
            <input
              id="reg-phone"
              type="tel"
              autoComplete="tel"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={loading}
              className="vtx-input"
            />
          </div>
        </div>

        {accountType === "B2B" && (
          <div className="vtx-b2b-fields">
            <div className="vtx-input-group">
              <label htmlFor="reg-company" className="vtx-label">
                Company / Organization <span className="vtx-required">*</span>
              </label>
              <div className="vtx-input-wrapper">
                <span className="vtx-input-icon" aria-hidden="true">🏢</span>
                <input
                  id="reg-company"
                  type="text"
                  placeholder="Apex Robotics Pvt Ltd"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  disabled={loading}
                  className="vtx-input"
                  required
                />
              </div>
            </div>

            <div className="vtx-input-group">
              <label htmlFor="reg-gstin" className="vtx-label">
                GSTIN <span className="vtx-optional">(for business tax credit)</span>
              </label>
              <div className="vtx-input-wrapper">
                <span className="vtx-input-icon" aria-hidden="true">📋</span>
                <input
                  id="reg-gstin"
                  type="text"
                  placeholder="29ABCDE1234F1Z5"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  disabled={loading}
                  className="vtx-input vtx-mono-input"
                />
              </div>
            </div>
          </div>
        )}

        <button
          type="submit"
          className="vtx-btn vtx-btn-primary vtx-btn-block"
          disabled={loading}
        >
          {loading ? (
            <span className="vtx-btn-loading">
              <span className="vtx-spinner" aria-hidden="true" />
              Creating Account...
            </span>
          ) : (
            `Create ${accountType === "B2B" ? "B2B Enterprise" : "Customer"} Account →`
          )}
        </button>
      </form>

      <div className="vtx-card-foot">
        <span>Already have an account?</span>{" "}
        <button
          type="button"
          className="vtx-link-btn"
          onClick={onBackToLogin}
        >
          Sign In instead
        </button>
      </div>
    </div>
  );
}
