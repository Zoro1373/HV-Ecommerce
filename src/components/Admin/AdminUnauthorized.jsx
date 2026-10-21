import React from "react";
import logo from "../../assets/logo.png";

export default function AdminUnauthorized({
  errorStatus,
  errorMessage,
  currentUser,
  onNavigateLogin,
  onNavigateHome,
}) {
  const isForbidden = errorStatus === 403;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #172554 0%, #0f172a 100%)",
        padding: 24,
        fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif",
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: 12,
          padding: 36,
          maxWidth: 520,
          width: "100%",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
          textAlign: "center",
        }}
        role="alert"
      >
        <img
          src={logo}
          alt="VERTEX"
          style={{ height: 38, marginBottom: 16 }}
        />

        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: isForbidden ? "#fee2e2" : "#fef3c7",
            color: isForbidden ? "#ef4444" : "#d97706",
            fontSize: "1.8rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
          }}
          aria-hidden="true"
        >
          {isForbidden ? "🚫" : "🔒"}
        </div>

        <h1
          style={{
            fontSize: "1.4rem",
            fontWeight: 800,
            color: "#0f172a",
            margin: "0 0 10px",
          }}
        >
          {isForbidden ? "Admin Access Restricted" : "Authentication Required"}
        </h1>

        <p
          style={{
            fontSize: "0.92rem",
            color: "#475569",
            lineHeight: 1.5,
            margin: "0 0 20px",
          }}
        >
          {isForbidden ? (
            <>
              You are currently signed in as <strong>{currentUser?.email}</strong> with role{" "}
              <span
                style={{
                  background: "#f1f5f9",
                  padding: "2px 6px",
                  borderRadius: 4,
                  fontWeight: 700,
                }}
              >
                {currentUser?.role || "CUSTOMER"}
              </span>
              . Only accounts with verified <strong>ADMIN</strong> privileges can access the administration portal.
            </>
          ) : (
            errorMessage ||
            "You must be signed in with an authorized VERTEX administrator account to view the admin portal."
          )}
        </p>

        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            padding: 12,
            fontSize: "0.8rem",
            color: "#64748b",
            marginBottom: 24,
            textAlign: "left",
          }}
        >
          <strong>Security Note:</strong> Route access is verified on the server via session cookie and <code>requireRole("ADMIN")</code> middleware. Frontend navigation states cannot bypass server authorization.
        </div>

        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button
            type="button"
            className="adm-btn adm-btn-secondary"
            onClick={onNavigateHome}
          >
            🏪 Return to Storefront
          </button>
          <button
            type="button"
            className="adm-btn adm-btn-primary"
            onClick={onNavigateLogin}
          >
            {isForbidden ? "Switch to Admin Account" : "Sign In to Admin"}
          </button>
        </div>
      </div>
    </div>
  );
}
