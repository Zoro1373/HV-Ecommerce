# VERTEX Authentication and Security Requirements

## Implemented Authentication Architecture (Phase 3)
VERTEX uses secure, database-backed server-managed sessions with cryptographically isolated tokens:
1. **Raw Session Token**: Generated using Node.js `crypto.randomBytes(32).toString("hex")`.
2. **Database Storage**: Raw session tokens are never stored in the database. Only SHA-256 hashes (`tokenHash`) are persisted in PostgreSQL (`Session` model) with user references, client IP, User-Agent, and expiration timestamp.
3. **Cookie Transport**: The raw token is transported exclusively via a secure, HttpOnly cookie named `vertex_session`.
   - `httpOnly: true` (prevents JavaScript/XSS access)
   - `sameSite: "lax"` (protects cross-site cookie usage)
   - `secure: true` in production environments
   - `path: "/"`
   - `expires`: 7 days from generation
4. **Session Expiration & Revocation**: Expired sessions are detected on request, purged from PostgreSQL, and the client cookie is cleared with a `401 SESSION_EXPIRED` error.

## Passwords and Reset Flow
- **Password Hashing**: Passwords are encrypted using `bcryptjs` with salt work factor 12. Plaintext passwords, hashes, and secrets are never logged or returned in responses.
- **Password Complexity**: Enforced on server via Zod (minimum 8 characters, at least 1 uppercase letter, at least 1 number).
- **Password Change**: Requires verification of the current password. Upon success, all other active sessions for that user are immediately revoked in the database.
- **Safe Password Reset Flow**:
  - `POST /api/auth/forgot-password`: Returns a generic non-enumerating message whether or not an account exists with the supplied email.
  - If an external email provider (`SMTP_HOST`, `SENDGRID_API_KEY`, or `RESEND_API_KEY`) is not configured, the endpoint honestly informs the caller that no email could be dispatched.
  - Reset tokens are generated using HMAC-SHA256 containing `userId`, timestamp, and the user's current password hash signed with `SESSION_SECRET`.
  - As soon as the password is reset, the user's `passwordHash` changes, instantly invalidating the token and preventing replay attacks.
  - Password reset automatically invalidates all active sessions.

## Role-Based Access Control (RBAC)
- **Supported Roles**: `CUSTOMER`, `B2B`, and `ADMIN`.
- **Public Registration Bounds**: Public registration strictly allows `CUSTOMER` or `B2B` account creation. Any client attempt to submit `role: "ADMIN"` is rejected with `400 VALIDATION_ERROR`.
- **Authorization Middleware**: Reusable `authenticateSession` and `requireRole("ADMIN", ...)` middlewares enforce permissions on the server for all protected API endpoints.

## Safe Administrator Provisioning (`npm run seed:admin`)
- Administrators cannot register through public APIs.
- A dedicated, secure CLI tool is provided: `npm run seed:admin` (located at `server/src/scripts/seedAdmin.js`).
- **Safety guarantees**:
  - Requires `ADMIN_EMAIL` and `ADMIN_PASSWORD` (minimum 8 characters) in `server/.env`.
  - Never hardcodes or prints passwords or credentials to standard output or logs.
  - **Refusal to promote ordinary accounts**: If an existing account has role `CUSTOMER` or `B2B`, the tool strictly refuses to silently promote them to `ADMIN`.
  - **Safe repetition**: If the target account is already an `ADMIN`, running the command repeatedly is idempotent and safely updates credentials.

## HTTP and application security
- **Helmet**: Enforces secure HTTP response headers (X-Content-Type-Options, X-Frame-Options, HSTS, Strict-Transport-Security).
- **Canonical Origin & CSRF Defense (`verifyCsrf`)**:
  - **Exact Parsed Origin Matching**: Eliminates `.startsWith()` string matching vulnerabilities. Both incoming `Origin` and `Referer` headers are parsed into canonical lowercase origins (`new URL(url).origin`) and checked for exact equality against the trusted origins set.
  - **Lookalike Origin Rejection**: Rejects malicious prefix domains such as `http://localhost:3000.attacker.com`, `http://localhost:3000@evil.com`, or `https://vertex.in.attacker.com`.
  - **Defense-in-Depth (Custom Headers & Untrusted Origins)**: If an incoming request provides an `Origin` or `Referer` that does NOT match trusted origins, the request is **strictly rejected** with `403 CSRF_ERROR`. Custom headers (`X-Requested-With`, `X-CSRF-Token`) alone **never** override an untrusted origin.
  - **Non-Browser / Privacy Proxy Requests**: If neither `Origin` nor `Referer` is present (e.g. CLI or privacy proxies), an explicit custom header (`X-Requested-With` or `X-CSRF-Token`) is required on state-changing authenticated requests to block traditional HTML `<form>` submissions.
  - **Production Origin Isolation**: In production mode (`NODE_ENV === "production"`), localhost origins (`http://localhost:3000`, `http://127.0.0.1:3000`) are **not** automatically trusted. Only the explicitly configured `FRONTEND_URL` and `ADDITIONAL_ALLOWED_ORIGINS` are accepted.
- **CORS Configuration**: Synchronized with `getTrustedOrigins()`. Does not use wildcard `*` with credentials. Disallows untrusted cross-origin requests.
- **Input Validation & Body Limits**: Validates all inputs via Zod schemas. Limits request body payloads to `1mb`.
## Multi-Factor Authentication (MFA / TOTP)
VERTEX implements production-grade, RFC 6238-compliant Time-based One-Time Password (TOTP) MFA compatible with Microsoft Authenticator and Google Authenticator.

### 1. Cryptographic Security & Encryption at Rest
- **Dedicated Encryption Key (`MFA_ENCRYPTION_KEY`)**: 256-bit key (64 hex characters) isolated from session secrets.
- **Authenticated Encryption (AES-256-GCM)**: All TOTP secrets and pending secrets are stored encrypted at rest using AES-256-GCM with a random 12-byte IV per encryption operation and a 16-byte authentication tag (`iv:authTag:ciphertext`).
- **No Secret Leakage**: `mfaSecret`, `mfaPendingSecret`, raw challenge tokens, and raw recovery codes are stripped in `sanitizeUser` and never leaked via API responses, error messages, or logs.

### 2. Enrollment Flow & Pending Secrets
1. `POST /api/auth/mfa/enroll`: Authenticated user requests enrollment. Server generates a cryptographically random Base32 TOTP secret, encrypts it into `User.mfaPendingSecret`, and returns `otpauth://` provisioning URI and Data-URL QR code. MFA remains `mfaEnabled: false`.
2. `POST /api/auth/mfa/confirm-enroll`: User submits a 6-digit TOTP code. Server decrypts pending secret, verifies code (window ±1 step), promotes pending secret to `mfaSecret`, sets `mfaEnabled: true`, generates 10 high-entropy recovery codes, and clears `mfaPendingSecret`.

### 3. Clock Drift & Replay Protection
- **Narrow Clock Drift**: Enforces RFC 6238 standard 30-second time steps with `window: 1` (±30s drift allowance to accommodate client clock skew).
- **Time-Step Replay Prevention**: The database records `User.mfaLastVerifiedStep`. If an attacker attempts to replay a valid TOTP code within the same 30-second time step, it is strictly rejected with `400 CODE_ALREADY_USED`.

### 4. MFA Challenge Login Flow
For accounts with `mfaEnabled: true`:
1. `POST /api/auth/login`: Verifies email and password. Does NOT issue an authenticated session cookie.
2. Returns `{ mfaRequired: true, mfaChallengeToken: "..." }`. The raw challenge token is single-use and valid for 5 minutes; only its SHA-256 hash (`tokenHash`) is stored in PostgreSQL (`MfaChallenge` model).
3. `POST /api/auth/mfa/verify-login`: Submits `mfaChallengeToken` + 6-digit `code` OR `recoveryCode`.
4. Concurrency-safe atomic consumption: The challenge is marked `usedAt: NOW()`. If valid, the authenticated `vertex_session` HttpOnly cookie is set and user profile returned.

### 5. Recovery Codes Architecture
- **Format**: 10 distinct, 10-character alphanumeric high-entropy codes (`XXXX-XXXX`).
- **Storage**: Plaintext recovery codes are never stored. Only their SHA-256 hashes are persisted in `RecoveryCode.codeHash`.
- **Single-Use Consumption**: When a recovery code is used, it is atomically marked with `usedAt: NOW()`. Reusing a spent recovery code is strictly rejected.
- **Regeneration**: `POST /api/auth/mfa/recovery-codes` requires current session + password reauthentication, deletes all existing recovery codes, and issues a fresh set.

### 6. MFA Disablement & Reauthentication
- `POST /api/auth/mfa/disable`: Requires active session + current password verification + valid TOTP code.
- Disables MFA, purges `mfaSecret` and `mfaPendingSecret`, deletes all stored recovery codes, and revokes all active sessions to ensure strict security state change.

### 7. Mandatory Role Policy & Restricted Enrollment
- Environment variable `MFA_ENFORCED_ROLES` (e.g. `ADMIN` or `ADMIN,B2B`) allows configuring mandatory MFA for privileged roles.
- When an unenrolled user with an enforced role logs in, they receive `{ mfaRequired: true, mfaSetupToken: "..." }`.
- They are held in a restricted enrollment state: no session cookie is issued, and they cannot access protected APIs or exercise admin privileges.
- They must complete `POST /api/auth/mfa/setup-enroll` and `POST /api/auth/mfa/setup-confirm` using their `mfaSetupToken` before an authenticated session is granted.

- **Safe Error Responses**: Centralized error middleware masks stack traces and internal errors in production.
- **Rate Limiting**:
  - `loginLimiter`: 5 failed attempts per 15 minutes per IP (successful logins do not consume limit).
  - `registerLimiter`: 10 account creations per hour per IP.
  - `forgotPasswordLimiter`: 5 requests per hour per IP.
  - `resetPasswordLimiter`: 5 failed attempts per 15 minutes per IP.
  - `mfaVerifyLimiter`: 5 failed attempts per 15 minutes per IP (blocks brute-forcing TOTP/recovery codes).
  - `mfaEnrollLimiter`: 10 enrollment attempts per hour per IP.
- **Secrets & Git Hygiene**: Secrets are kept in environment variables and `.env` is ignored by Git. No secrets, credentials, or session tokens are ever printed or returned.

## Database and commerce safety
- Use Prisma parameterized operations.
- Enforce database constraints.
- Use decimal-safe money calculations.
- Recalculate all totals on the server.
- Verify stock at checkout and use transactions/concurrency-safe inventory updates.
- Validate order status transitions.
- Verify payment provider signatures on the server before changing payment status.
- Never store card numbers or CVVs.
- Audit important admin changes without recording sensitive data.

## Configuration checklist
- `DATABASE_URL`
- `FRONTEND_URL`
- `PORT`
- Authentication/session secret(s) (`SESSION_SECRET`)
- `MFA_ENCRYPTION_KEY` (Dedicated 256-bit AES-256-GCM encryption key, 64 hex characters)
- `MFA_ENFORCED_ROLES` (Optional comma-separated list of roles requiring mandatory MFA, e.g. `ADMIN`)
- `NODE_ENV`
- Email-provider configuration only if email features are enabled

Validate required configuration at startup. Use strong random production secrets. Do not commit a populated `.env` file.

## Before deployment
- Run tests and production build.
- Review CORS, cookie, CSRF, rate-limit, and proxy settings for the actual hosting environment.
- Use managed secrets.
- Apply migrations safely.
- Configure backups and test restoration.
- Configure HTTPS and monitoring.
- Review applicable privacy and data-retention obligations.
