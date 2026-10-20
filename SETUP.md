# VERTEX Local Development Setup

This guide is a template. The exact commands depend on whether the existing frontend uses Create React App or Vite and on the backend scripts generated during implementation. Do not replace existing scripts blindly.

## Prerequisites
- Node.js LTS and npm
- PostgreSQL installed locally or a reachable hosted PostgreSQL database
- Git (recommended)
- Existing VERTEX React project

Check installations in Windows PowerShell:

```powershell
node --version
npm --version
git --version
```

## 1. Install existing frontend dependencies
From the repository root:

```powershell
npm install
```

Keep the current frontend package configuration and build tool.

## 1a. Frontend-Only Development Mode (No Backend or Database Required)
For frontend UI/UX engineers or when network/database connectivity is unavailable, VERTEX provides a **Frontend-Only Development Mode**:

1. **Option A: Persistent flag in `.env.local`**:
   Create `.env.local` in the project root:
   ```ini
   REACT_APP_USE_MOCK_API=true
   ```
   Start the frontend dev server:
   ```powershell
   npm start
   ```

2. **Option B: Quick URL parameter**:
   Launch `npm start`, then open your browser at:
   ```text
   http://localhost:3000/?mock=true
   ```

3. **Option C: UI Dev Banner Toggle**:
   When mock mode is active, an orange `⚡ Mock Dev Mode` banner displays across the top of the viewport. Use the interactive controls to toggle between simulated `Guest`, `Customer`, and `Admin` sessions with one click, or click `Disable Mock` to return to live backend connectivity.

4. **Accessing the Admin Portal in Mock Mode**:
   - **Method 1 (1-Click Banner)**: In Mock Dev Mode, click the **`Admin`** button in the top banner. This automatically sets the simulated Chief Engineer admin session and immediately transitions to `/admin#dashboard`.
   - **Method 2 (Direct URL)**: Navigate directly to `http://localhost:3000/admin?mock=true`.
   - **Return to Storefront**: While inside the Admin Portal, click the **`← Storefront`** button in the mock banner to switch back to the customer homepage.

> **Security Guard**: Mock mode is strictly guarded in `src/mock/mockConfig.js` and automatically disabled in production builds (`npm run build`). Mock authentication and mock checkout will never run or be accessible in production.

## 2. Configure PostgreSQL & Least-Privilege Role Separation
VERTEX utilizes a least-privilege database security model separating normal application runtime access from migration/administrative access:
1. **Application Runtime Role (`vertex_app`)**: Restricted to DML operations (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) on domain tables. Strictly blocked from DDL, TRUNCATE, and `_prisma_migrations`. Connects via `DATABASE_URL` using the connection pooler.
2. **Migration & Admin Role (`neondb_owner`)**: Has DDL and schema management privileges. Used exclusively for Prisma migrations (`npx prisma migrate deploy`) and administrative seeds (`npm run seed:admin`). Connects via `DIRECT_URL` using direct unpooled access.

Set both `DATABASE_URL` and `DIRECT_URL` in `server/.env`:

```text
# Runtime application connection (restricted role, pooled)
DATABASE_URL="postgresql://vertex_app:APP_PASSWORD@ep-patient-flower-b4y82qxp-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# Migration connection (cluster owner role, direct unpooled)
DIRECT_URL="postgresql://neondb_owner:OWNER_PASSWORD@ep-patient-flower-b4y82qxp.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
```

Never commit the populated `.env` file or credentials to Git.

## 3. Configure environment variables
Copy the backend example file:

```powershell
Copy-Item server/.env.example server/.env
```

If a root `.env.example` is also supplied, configure it according to the project's chosen frontend build tool. For Create React App, browser-exposed variables normally use the `REACT_APP_` prefix; for Vite, they normally use `VITE_`. Never place secrets in frontend variables.

Configure at least:
- `DATABASE_URL`
- `PORT`
- `FRONTEND_URL`
- `SESSION_SECRET`
- `MFA_ENCRYPTION_KEY`: 32-byte hexadecimal AES-256-GCM encryption key.
  Generate securely in PowerShell or bash:
  ```powershell
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- `MFA_ENFORCED_ROLES`: Optional. Set to `ADMIN` to enforce mandatory MFA enrollment for administrators.
- `NODE_ENV=development`

Use real random secrets locally and stronger managed secrets in production.

## 4. Install backend dependencies
If the backend has its own package file:

```powershell
Set-Location server
npm install
```

Return to the repository root when needed:

```powershell
Set-Location ..
```

## 5. Run Prisma migrations and seed data
From the `server` directory:

```powershell
Set-Location server
npx prisma generate
npx prisma migrate deploy
npm run seed
Set-Location ..
```

### Safe Administrator Provisioning & Mandatory MFA Workflow
1. **Bootstrap Administrator Account**:
   - Ensure `ADMIN_EMAIL` and `ADMIN_PASSWORD` (minimum 8 characters) are configured in `server/.env`.
   - Run the secure provisioning script:
     ```powershell
     Set-Location server
     npm run seed:admin
     Set-Location ..
     ```
   *Note: This command will never silently promote an existing customer/B2B account to an administrator. It is safe and idempotent to run repeatedly for existing admin accounts.*

2. **Mandatory MFA Policy & Initial Enrollment**:
   - When `MFA_ENFORCED_ROLES=ADMIN` is enabled, an administrator logging in with email and password receives:
     ```json
     {
       "success": true,
       "mfaRequired": true,
       "mfaSetupRequired": true,
       "mfaSetupToken": "...",
       "message": "Multi-factor authentication enrollment is required for your account role."
     }
     ```
   - In this restricted enrollment state, **no authenticated session is issued** and the administrator **cannot access protected admin APIs**.
   - The admin calls `POST /api/auth/mfa/setup-enroll` with `{ mfaSetupToken }` to receive the `otpauth://` provisioning URI and QR code.
   - The admin scans the QR code in Microsoft Authenticator or Google Authenticator.
   - The admin submits `POST /api/auth/mfa/setup-confirm` with `{ mfaSetupToken, code }` (e.g. `123456`).
   - Upon confirmation, MFA is enabled on the administrator account, 10 single-use recovery codes are returned for safe storage, and the administrator receives their authenticated session cookie.

## 6. Run automated tests
Run the complete backend test suite (77 tests across 4 test suites: Authentication & RBAC, Catalog & Search, Database Integrity & Precision, and MFA TOTP & Recovery Codes):

```powershell
Set-Location server
npm test
Set-Location ..
```

To run individual test suites independently:

```powershell
Set-Location server
# 1. Authentication, Sessions, RBAC & CSRF test suite (28 tests)
node --test tests/auth.test.js

# 2. Product Catalog, Categories & Search test suite (22 tests)
node --test tests/catalog.test.js

# 3. Database Integrity, CHECK Constraints & Precision test suite (12 tests)
node --test tests/database.test.js

# 4. Multi-Factor Authentication TOTP, Challenges & Recovery Codes test suite (15 tests)
node --test tests/mfa.test.js
Set-Location ..
```

Run existing frontend storefront regression tests from repository root:

```powershell
npm test -- --watchAll=false
```

## 7. Start the application
Start the backend Express REST API in one terminal:

```powershell
Set-Location server
npm run dev
```

Start the React storefront in a second terminal from the repository root:

```powershell
npm start
```

## 8. Verify
- Open `http://localhost:3000` to verify the storefront loads cleanly.
- Verify `http://localhost:5000/api/health` reports status `UP` with PostgreSQL connectivity.
- Verify registration via `POST /api/auth/register` creates a user and sets the `vertex_session` HttpOnly cookie.
- Verify authentication via `GET /api/auth/me`.
- Verify role restrictions on `GET /api/auth/admin-check` (returns 403 for customers, 200 for admins).
- Verify safe admin provisioning using `npm run seed:admin`.
- Verify logout via `POST /api/auth/logout`.

## Troubleshooting
- **Database connection failure:** verify PostgreSQL is running, database/user exist, and `DATABASE_URL` is correct.
- **CORS error:** verify `FRONTEND_URL`, credentials mode, and allowed origins agree.
- **Cookie not set:** inspect cookie flags, localhost setup, SameSite settings, and whether frontend requests include credentials.
- **Prisma client/schema mismatch:** regenerate Prisma Client after schema changes and apply migrations.
- **Port already in use:** change the configured port and update the frontend API base URL.
- **Missing module:** install dependencies in the correct project directory and inspect package.json.
- **Frontend still shows hardcoded products:** verify the React components use the API client and inspect the browser Network tab.

## Production caution
Development setup is not production deployment. Production requires HTTPS, secure managed secrets, safe migrations, backups, monitoring, rate limits, correctly configured cookies/CORS/CSRF, and a verified payment integration before accepting online payments.
