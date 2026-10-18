import React, { useState } from "react";
import logo from "../../assets/logo.png";
import HardwareBackground from "./HardwareBackground";
import MfaStep from "./MfaStep";
import ForgotPasswordStep from "./ForgotPasswordStep";
import RegisterStep from "./RegisterStep";
import { loginUser } from "../../services/authApi";
import "./LoginPage.css";

export default function LoginPage({
  onLoginSuccess,
  onNavigateHome,
  initialView = "login",
}) {
  const [viewMode, setViewMode] = useState(initialView); // "login" | "mfa" | "forgot" | "register"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // MFA Challenge State
  const [mfaChallengeToken, setMfaChallengeToken] = useState(null);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Client-side quick validation
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Please enter your email address.");
      return;
    }
    if (!trimmedEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);
    try {
      const response = await loginUser({
        email: trimmedEmail,
        password,
      });

      // 1. Account requires 2FA second factor (Microsoft Authenticator / TOTP / Recovery Code)
      if (response.mfaRequired && response.mfaChallengeToken) {
        setMfaChallengeToken(response.mfaChallengeToken);
        setViewMode("mfa");
        return;
      }

      // 2. Account role has mandatory MFA policy and is not yet enrolled
      if (response.mfaSetupRequired) {
        setError(
          response.message ||
            "Multi-factor authentication (MFA) is mandatory for your role. Please complete setup via the administrative console."
        );
        return;
      }

      // 3. Normal successful login
      if (response.success && response.user) {
        onLoginSuccess(response.user);
      }
    } catch (err) {
      // Safe, non-technical error display
      if (err.status === 401) {
        setError("Invalid email or password. Please verify your credentials and try again.");
      } else if (err.status === 429) {
        setError("Too many login attempts. For security, please wait a few minutes before trying again.");
      } else if (err.status === 403) {
        setError("This account is currently disabled. Please contact VERTEX support.");
      } else {
        setError(err.message || "Unable to reach the authentication service. Please check your network connection.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSuccess = (user) => {
    onLoginSuccess(user);
  };

  const handleMfaCancel = () => {
    setMfaChallengeToken(null);
    setViewMode("login");
    setError(null);
  };

  return (
    <div className="vtx-login-page">
      {/* 1. Full-screen sliding hardware imagery carousel */}
      <HardwareBackground />

      {/* 2. Top Header Navigation Bar */}
      <header className="vtx-login-topbar">
        <button
          type="button"
          className="vtx-back-store-btn"
          onClick={onNavigateHome}
          aria-label="Return to VERTEX storefront"
        >
          <span className="vtx-back-arrow" aria-hidden="true">←</span>
          <span>Back to Store</span>
        </button>

        <div className="vtx-topbar-brand">
          <img src={logo} alt="VERTEX Logo" className="vtx-topbar-logo" />
          <span className="vtx-topbar-title">VERTEX</span>
        </div>

        <div className="vtx-topbar-right">
          <span className="vtx-security-badge" title="256-Bit SSL Encrypted & RFC 6238 TOTP Secured">
            <span className="vtx-pulse-dot" aria-hidden="true" />
            <span className="vtx-security-text">Secure Hardware Portal</span>
          </span>
        </div>
      </header>

      {/* 3. Main Center Composition */}
      <main className="vtx-login-main">
        <div className="vtx-login-wrapper">
          {/* Left Hero Brand Panel (visible on desktop) */}
          <section className="vtx-login-sidepanel" aria-label="About VERTEX Hardware">
            <div className="vtx-sidepanel-inner">
              <div className="vtx-sidepanel-tag">
                <span className="vtx-tag-icon" aria-hidden="true">⚡</span>
                <span>AUTHENTIC HARDWARE &amp; COMPONENTS</span>
              </div>

              <h1 className="vtx-sidepanel-heading">
                Small Components.
                <br />
                <span className="vtx-sidepanel-accent">Big Possibilities.</span>
              </h1>

              <p className="vtx-sidepanel-desc">
                Log in to order authentic Arduino microcontrollers, industrial PLCs, embedded sensors,
                and high-precision metric fasteners with pan-India delivery and certified quality.
              </p>

              {/* Technical Feature Highlights */}
              <div className="vtx-feature-list">
                <div className="vtx-feature-item">
                  <div className="vtx-feature-icon" aria-hidden="true">🔌</div>
                  <div>
                    <strong>Microcontrollers &amp; SMT</strong>
                    <p>Genuine dev boards, modules &amp; robotics kits</p>
                  </div>
                </div>

                <div className="vtx-feature-item">
                  <div className="vtx-feature-icon" aria-hidden="true">🔩</div>
                  <div>
                    <strong>Precision Metric Fasteners</strong>
                    <p>Hex bolts, Nyloc nuts, brass inserts &amp; washers</p>
                  </div>
                </div>

                <div className="vtx-feature-item">
                  <div className="vtx-feature-icon" aria-hidden="true">🛡️</div>
                  <div>
                    <strong>Enterprise Security &amp; 2FA</strong>
                    <p>Microsoft Authenticator TOTP &amp; single-use recovery codes</p>
                  </div>
                </div>
              </div>

              {/* Technical Stats Bar */}
              <div className="vtx-sidepanel-stats">
                <div className="vtx-stat-col">
                  <span className="vtx-stat-val">100%</span>
                  <span className="vtx-stat-lbl">Genuine Parts</span>
                </div>
                <div className="vtx-stat-col">
                  <span className="vtx-stat-val">10,000+</span>
                  <span className="vtx-stat-lbl">Hardware SKUs</span>
                </div>
                <div className="vtx-stat-col">
                  <span className="vtx-stat-val">Tiered</span>
                  <span className="vtx-stat-lbl">Bulk Pricing</span>
                </div>
              </div>
            </div>
          </section>

          {/* Right Card: Login / MFA / Forgot / Register */}
          <section className="vtx-login-card-container">
            <div className="vtx-login-card">
              {/* Card Header Brand Logo */}
              <div className="vtx-card-header">
                <div className="vtx-card-brand">
                  <img src={logo} alt="VERTEX" className="vtx-card-logo" />
                  <div className="vtx-card-brand-text">
                    <span className="vtx-card-brand-name">VERTEX</span>
                    <span className="vtx-card-brand-sub">BUILD BETTER TOGETHER</span>
                  </div>
                </div>
              </div>

              {/* Step 1: Standard Login Form */}
              {viewMode === "login" && (
                <div className="vtx-card-body" role="region" aria-label="Sign In Form">
                  <h2 className="vtx-form-title">Welcome back</h2>
                  <p className="vtx-form-sub">
                    Sign in to continue to your hardware store.
                  </p>

                  {/* Contextual notice if user was redirected from /admin */}
                  {typeof window !== "undefined" &&
                    new URLSearchParams(window.location.search).get("redirect")?.startsWith("/admin") && (
                      <div
                        className="vtx-admin-badge-notice"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          background: "#f0fdf4",
                          border: "1px solid #bbf7d0",
                          borderRadius: 8,
                          padding: "10px 14px",
                          marginBottom: 16,
                          fontSize: "0.85rem",
                          color: "#166534",
                        }}
                        role="note"
                      >
                        <span style={{ fontSize: "1.1rem" }} aria-hidden="true">🔐</span>
                        <span>
                          <strong>Admin Access:</strong> Please sign in with your credentials to access the Administration Console.
                        </span>
                      </div>
                    )}

                  {/* Accessible Error Area */}
                  {error && (
                    <div
                      className="vtx-alert vtx-alert-danger"
                      role="alert"
                      aria-live="polite"
                      id="login-error-alert"
                    >
                      <span className="vtx-alert-icon" aria-hidden="true">⚠️</span>
                      <span className="vtx-alert-text">{error}</span>
                    </div>
                  )}

                  <form onSubmit={handleLoginSubmit} noValidate>
                    {/* Email Input */}
                    <div className="vtx-input-group">
                      <label htmlFor="login-email" className="vtx-label">
                        Email Address
                      </label>
                      <div className="vtx-input-wrapper">
                        <span className="vtx-input-icon" aria-hidden="true">✉️</span>
                        <input
                          id="login-email"
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
                          aria-describedby={error ? "login-error-alert" : undefined}
                          autoFocus
                          required
                        />
                      </div>
                    </div>

                    {/* Password Input */}
                    <div className="vtx-input-group">
                      <div className="vtx-label-row">
                        <label htmlFor="login-password" className="vtx-label">
                          Password
                        </label>
                        <button
                          type="button"
                          className="vtx-link-btn vtx-forgot-link"
                          onClick={() => {
                            setViewMode("forgot");
                            setError(null);
                          }}
                        >
                          Forgot password?
                        </button>
                      </div>
                      <div className="vtx-input-wrapper">
                        <span className="vtx-input-icon" aria-hidden="true">🔒</span>
                        <input
                          id="login-password"
                          type={showPassword ? "text" : "password"}
                          autoComplete="current-password"
                          placeholder="••••••••"
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

                    {/* Options Row: Remember Me */}
                    <div className="vtx-options-row">
                      <label htmlFor="remember-me" className="vtx-checkbox-label">
                        <input
                          id="remember-me"
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          disabled={loading}
                          className="vtx-checkbox"
                        />
                        <span className="vtx-checkbox-custom" aria-hidden="true" />
                        <span className="vtx-checkbox-text">
                          Remember me
                          <span className="vtx-info-tip" title="Session stays active for 7 days via secure HttpOnly cookie.">
                            ℹ️
                          </span>
                        </span>
                      </label>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      id="login-submit-btn"
                      className="vtx-btn vtx-btn-primary vtx-btn-block"
                      disabled={loading}
                    >
                      {loading ? (
                        <span className="vtx-btn-loading">
                          <span className="vtx-spinner" aria-hidden="true" />
                          Signing In...
                        </span>
                      ) : (
                        "Sign In →"
                      )}
                    </button>
                  </form>

                  {/* Alternative Auth Notice */}
                  <div className="vtx-divider">
                    <span className="vtx-divider-text">ENTERPRISE ACCESS</span>
                  </div>

                  <div className="vtx-sso-note" role="note">
                    <span className="vtx-sso-icon" aria-hidden="true">🏢</span>
                    <span className="vtx-sso-desc">
                      Business &amp; institutional procurement accounts: use your registered work email.
                    </span>
                  </div>

                  {/* Card Footer: Registration Link */}
                  <div className="vtx-card-foot">
                    <span>Don't have an account?</span>{" "}
                    <button
                      type="button"
                      className="vtx-link-btn vtx-link-highlight"
                      onClick={() => {
                        setViewMode("register");
                        setError(null);
                      }}
                    >
                      Create an account
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Multi-Factor Authentication Verification */}
              {viewMode === "mfa" && (
                <div className="vtx-card-body">
                  <MfaStep
                    mfaChallengeToken={mfaChallengeToken}
                    userEmail={email}
                    onSuccess={handleMfaSuccess}
                    onCancel={handleMfaCancel}
                  />
                </div>
              )}

              {/* Step 3: Forgot Password */}
              {viewMode === "forgot" && (
                <div className="vtx-card-body">
                  <ForgotPasswordStep
                    onBackToLogin={() => {
                      setViewMode("login");
                      setError(null);
                    }}
                  />
                </div>
              )}

              {/* Step 4: Register Account */}
              {viewMode === "register" && (
                <div className="vtx-card-body">
                  <RegisterStep
                    onRegisterSuccess={(user) => onLoginSuccess(user)}
                    onBackToLogin={() => {
                      setViewMode("login");
                      setError(null);
                    }}
                  />
                </div>
              )}
            </div>

            {/* Sub-card security credentials and footer */}
            <footer className="vtx-login-page-footer">
              <div className="vtx-trust-badges">
                <span>🔒 256-Bit SSL Encrypted</span>
                <span>•</span>
                <span>🛡️ RFC 6238 TOTP 2FA</span>
                <span>•</span>
                <span>⚡ High-Torque Prototyping</span>
              </div>
              <p className="vtx-footer-copy">
                © 2026 VERTEX Electronics &amp; Fasteners. All rights reserved.
              </p>
            </footer>
          </section>
        </div>
      </main>
    </div>
  );
}
