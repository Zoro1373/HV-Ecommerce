import React, { useState } from "react";
import { verifyMfaLogin } from "../../services/authApi";

export default function MfaStep({
  mfaChallengeToken,
  userEmail,
  onSuccess,
  onCancel,
}) {
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [code, setCode] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!useRecoveryCode && code.trim().length !== 6) {
      setError("Please enter the complete 6-digit authenticator code.");
      return;
    }

    if (useRecoveryCode && recoveryCode.trim().length < 8) {
      setError("Please enter a valid recovery code (e.g. ABCD-1234).");
      return;
    }

    setLoading(true);
    try {
      const response = await verifyMfaLogin({
        mfaChallengeToken,
        code: useRecoveryCode ? null : code.trim(),
        recoveryCode: useRecoveryCode ? recoveryCode.trim() : null,
      });

      if (response.success) {
        onSuccess(response.user);
      }
    } catch (err) {
      setError(err.message || "Failed to verify multi-factor authentication code.");
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (e) => {
    // Only allow digits for standard TOTP
    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
    setCode(val);
    if (error) setError(null);
  };

  const handleRecoveryChange = (e) => {
    let val = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 10);
    // Auto-hyphenate XXXX-XXXX
    if (val.length === 4 && !val.includes("-")) {
      val = val + "-";
    }
    setRecoveryCode(val);
    if (error) setError(null);
  };

  return (
    <div className="vtx-mfa-step" role="region" aria-label="Two-Factor Authentication">
      <div className="vtx-mfa-icon-badge" aria-hidden="true">
        🛡️
      </div>

      <h2 className="vtx-form-title">Two-Factor Authentication</h2>
      <p className="vtx-form-sub">
        {useRecoveryCode ? (
          "Enter one of your 10-character single-use emergency recovery codes."
        ) : (
          <>
            Enter the 6-digit code from <strong>Microsoft Authenticator</strong> or Google Authenticator for{" "}
            <span className="vtx-email-highlight">{userEmail}</span>.
          </>
        )}
      </p>

      {error && (
        <div className="vtx-alert vtx-alert-danger" role="alert" aria-live="polite">
          <span className="vtx-alert-icon" aria-hidden="true">⚠️</span>
          <span className="vtx-alert-text">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {!useRecoveryCode ? (
          <div className="vtx-input-group">
            <label htmlFor="mfa-totp-code" className="vtx-label">
              6-Digit Security Code
            </label>
            <div className="vtx-input-wrapper">
              <span className="vtx-input-icon" aria-hidden="true">🔢</span>
              <input
                id="mfa-totp-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="one-time-code"
                placeholder="123456"
                value={code}
                onChange={handleCodeChange}
                disabled={loading}
                className="vtx-input vtx-totp-input"
                autoFocus
                required
              />
            </div>
            <span className="vtx-input-help">Codes update every 30 seconds.</span>
          </div>
        ) : (
          <div className="vtx-input-group">
            <label htmlFor="mfa-recovery-code" className="vtx-label">
              Emergency Recovery Code
            </label>
            <div className="vtx-input-wrapper">
              <span className="vtx-input-icon" aria-hidden="true">🔑</span>
              <input
                id="mfa-recovery-code"
                type="text"
                placeholder="ABCD-1234"
                value={recoveryCode}
                onChange={handleRecoveryChange}
                disabled={loading}
                className="vtx-input vtx-recovery-input"
                autoFocus
                required
              />
            </div>
            <span className="vtx-input-help">Recovery codes can each be used only once.</span>
          </div>
        )}

        <button
          type="submit"
          className="vtx-btn vtx-btn-primary vtx-btn-block"
          disabled={loading || (!useRecoveryCode ? code.length !== 6 : recoveryCode.length < 8)}
        >
          {loading ? (
            <span className="vtx-btn-loading">
              <span className="vtx-spinner" aria-hidden="true" />
              Verifying...
            </span>
          ) : (
            "Verify & Continue →"
          )}
        </button>

        <div className="vtx-mfa-alternate-row">
          <button
            type="button"
            className="vtx-link-btn"
            onClick={() => {
              setUseRecoveryCode((prev) => !prev);
              setError(null);
            }}
          >
            {useRecoveryCode ? "← Use authenticator 6-digit code" : "Lost your phone? Use a recovery code"}
          </button>
        </div>

        <div className="vtx-mfa-back-row">
          <button
            type="button"
            className="vtx-link-btn vtx-link-muted"
            onClick={onCancel}
            disabled={loading}
          >
            ← Cancel and back to sign in
          </button>
        </div>
      </form>
    </div>
  );
}
