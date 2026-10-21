# VERTEX REST API Contract

Base URL during development: `http://localhost:<API_PORT>/api`

Use JSON request/response bodies unless an endpoint explicitly uses another content type. Keep error formats consistent, for example:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid fields.",
    "details": []
  }
}
```

Never return stack traces, database credentials, password hashes, or secret tokens.

## Health
- `GET /health` — report application status and safe database connectivity status.

## Authentication & Session Endpoints
All authentication endpoints are mounted under `/api/auth`.

### Cookie & CSRF Specifications
- **Session Cookie**: Named `vertex_session`. Configured with `HttpOnly`, `SameSite=Lax`, `Path=/`, and `Secure` (in production). Valid for 7 days.
- **CSRF Defense**: All state-changing (`POST`, `PUT`, `PATCH`, `DELETE`) cookie-authenticated requests are protected. Clients must supply a custom header (such as `X-Requested-With: XMLHttpRequest` or `X-CSRF-Token`) or send requests from a verified trusted Origin matching `FRONTEND_URL`.
- **Token Security**: Session tokens are cryptographically generated (32 bytes entropy). Only SHA-256 hashes (`tokenHash`) are persisted in the database; raw session tokens are never stored.

### Endpoints

- `POST /api/auth/register`
  - **Access**: Public (Rate limit: max 10 registrations per hour per IP)
  - **Body**: `{ fullName, email, password, phone?, accountType: "CUSTOMER" | "B2B", companyName?, gstin? }`
  - **Security**: Strict Zod validation. Rejects any attempt to register as `ADMIN`. Automatically creates database session and sets `vertex_session` HttpOnly cookie. Returns `201 Created` with sanitized user.

- `POST /api/auth/login`
  - **Access**: Public (Rate limit: max 5 failed login attempts per 15 min per IP; successful logins do not consume limit)
  - **Body**: `{ email, password }`
  - **Security**: Constant-time timing attack protection. Returns safe generic error (`401 INVALID_CREDENTIALS`) on failure without enumerating accounts.
  - **MFA Flow**:
    - If user does not have MFA enabled and no mandatory role policy applies: issues authenticated `vertex_session` HttpOnly cookie and returns `{ success: true, user: { ... } }`.
    - If user has MFA enabled (`mfaEnabled: true`): does **not** set a session cookie. Returns `200 OK` with `{ success: true, mfaRequired: true, mfaChallengeToken: "...", message: "Multi-factor authentication code required." }`.
    - If user role is subject to mandatory MFA and user is not yet enrolled: does **not** set a session cookie. Returns `200 OK` with `{ success: true, mfaRequired: true, mfaSetupRequired: true, mfaSetupToken: "...", message: "Multi-factor authentication enrollment is required for your account role." }`.

- `POST /api/auth/mfa/enroll`
  - **Access**: Protected (Session cookie + CSRF protection; Rate limit: 10/hr)
  - **Description**: Generates a new TOTP secret for the logged-in user, stores it encrypted in `mfaPendingSecret`, and returns provisioning credentials.
  - **Response `200 OK`**:
    ```json
    {
      "success": true,
      "secret": "JBSWY3DPEHPK3PXP...",
      "otpauthUri": "otpauth://totp/VERTEX:user%40example.com?secret=...&issuer=VERTEX",
      "qrCode": "data:image/png;base64,..."
    }
    ```

- `POST /api/auth/mfa/confirm-enroll`
  - **Access**: Protected (Session cookie + CSRF protection; Rate limit: 5/15m)
  - **Body**: `{ code: "123456" }` (6-digit TOTP string)
  - **Description**: Verifies the submitted code against `mfaPendingSecret`. Upon success, promotes to `mfaSecret`, sets `mfaEnabled: true`, generates 10 single-use recovery codes (stored hashed), and returns them.
  - **Response `200 OK`**:
    ```json
    {
      "success": true,
      "message": "MFA has been successfully confirmed and enabled.",
      "recoveryCodes": ["ABCD-1234", "EFGH-5678", "..."]
    }
    ```

- `POST /api/auth/mfa/verify-login`
  - **Access**: Public (Rate limit: 5 failed attempts per 15m per IP)
  - **Body**: `{ mfaChallengeToken: "...", code?: "123456", recoveryCode?: "ABCD-1234" }` (either `code` or `recoveryCode` is required)
  - **Description**: Validates and consumes the short-lived, single-use `mfaChallengeToken`. If TOTP `code` is provided, verifies with clock drift protection (±30s) and checks monotonic time-step replay prevention. If `recoveryCode` is provided, matches against unconsumed hashed recovery codes and marks it used. Upon success, creates a full database session and sets the HttpOnly `vertex_session` cookie.
  - **Response `200 OK`**:
    ```json
    {
      "success": true,
      "message": "Multi-factor authentication successful.",
      "user": { "id": "...", "email": "...", "role": "..." }
    }
    ```

- `POST /api/auth/mfa/disable`
  - **Access**: Protected (Session cookie + CSRF protection; Rate limit: 5/15m)
  - **Body**: `{ password: "...", code: "123456" }`
  - **Description**: Verifies current password and current TOTP code. Upon verification, sets `mfaEnabled: false`, purges encrypted secrets, deletes all recovery codes, invalidates all active sessions for the user, and clears the session cookie.
  - **Response `200 OK`**:
    ```json
    {
      "success": true,
      "message": "MFA has been successfully disabled and recovery codes revoked."
    }
    ```

- `POST /api/auth/mfa/recovery-codes`
  - **Access**: Protected (Session cookie + CSRF protection; Rate limit: 5/15m)
  - **Body**: `{ password: "..." }`
  - **Description**: Reauthenticates password, revokes and deletes all existing recovery codes for the user, generates 10 fresh high-entropy single-use recovery codes, and stores their SHA-256 hashes.
  - **Response `200 OK`**:
    ```json
    {
      "success": true,
      "message": "New recovery codes generated. All previous codes have been invalidated.",
      "recoveryCodes": ["WXYZ-9876", "..."]
    }
    ```

- `POST /api/auth/mfa/setup-enroll`
  - **Access**: Public (Bound to `mfaSetupToken` challenge; Rate limit: 10/hr)
  - **Body**: `{ mfaSetupToken: "..." }`
  - **Description**: Used during mandatory-MFA first-login flow for unenrolled privileged users. Validates `mfaSetupToken`, generates TOTP secret, and returns QR code / provisioning URI.

- `POST /api/auth/mfa/setup-confirm`
  - **Access**: Public (Bound to `mfaSetupToken` challenge; Rate limit: 5/15m)
  - **Body**: `{ mfaSetupToken: "...", code: "123456" }`
  - **Description**: Validates code, confirms enrollment, enables MFA, generates recovery codes, creates authenticated session, and sets `vertex_session` HttpOnly cookie.

- `POST /api/auth/logout`
  - **Access**: Protected (Session cookie + CSRF protection)
  - **Security**: Invalidate and delete the session row from PostgreSQL, then clear the HttpOnly `vertex_session` cookie.

- `GET /api/auth/me`
  - **Access**: Protected (Session cookie)
  - **Response**: `{ user: { id, fullName, email, role, phone, companyName, gstin, isActive, emailVerified, mfaEnabled, mfaEnrolledAt, createdAt, updatedAt } }`.
  - **Security**: Returns sanitized user record (TOTP secrets and recovery hashes are strictly omitted). Automatically purges expired sessions with `401 SESSION_EXPIRED`.

- `POST /api/auth/change-password`
  - **Access**: Protected (Session cookie + CSRF protection)
  - **Body**: `{ currentPassword, newPassword }`
  - **Security**: Verifies current password against database bcrypt hash before updating. Revokes all other active sessions for that user upon successful password change.

- `POST /api/auth/forgot-password`
  - **Access**: Public (Rate limit: max 5 requests per hour per IP)
  - **Body**: `{ email }`
  - **Security**: Prevents account enumeration by returning a generic success response regardless of whether the email is registered. Dispatches email only if external provider (SMTP/SendGrid/Resend) is configured.

- `POST /api/auth/reset-password`
  - **Access**: Public (Rate limit: max 5 failed attempts per 15 min per IP)
  - **Body**: `{ token, newPassword }`
  - **Security**: Validates single-use expiring cryptographic HMAC token. Upon successful reset, updates password hash and revokes all active sessions for the user. Repeated use of the same token is rejected.

- `GET /api/auth/admin-check`
  - **Access**: Protected (Session cookie + `Role: ADMIN`)
  - **Security**: Enforces server-side Role-Based Access Control (`requireRole("ADMIN")`). Returns `200 OK` for verified administrators, `403 FORBIDDEN` for customers/B2B users, and `401 UNAUTHORIZED` for unauthenticated requests.


## Categories
Public endpoints to browse the active category hierarchy. Only categories marked `isActive: true` are returned.

### `GET /api/categories`
- **Access**: Public
- **Description**: Lists all active top-level categories, their active subcategories, and counts of active products.
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "categories": [
      {
        "id": "800fb3df-e5c3-4b6a-98a1-2de1dee390fc",
        "name": "Electronics",
        "slug": "electronics",
        "description": "Microcontrollers, Motor Drives, PLC, Development Boards",
        "icon": "🔌",
        "tint": "tint-blue",
        "imageUrl": null,
        "parentId": null,
        "children": [],
        "productsCount": 4
      }
    ]
  }
  ```

### `GET /api/categories/:slug`
- **Access**: Public
- **Description**: Retrieves details for a specific active category and all its active products.
- **Parameters**: `slug` (URL path parameter, validated format)
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "category": {
      "id": "800fb3df-e5c3-4b6a-98a1-2de1dee390fc",
      "name": "Electronics",
      "slug": "electronics",
      "description": "Microcontrollers, Motor Drives, PLC, Development Boards",
      "icon": "🔌",
      "tint": "tint-blue",
      "children": [],
      "productsCount": 4
    },
    "products": [ ... ]
  }
  ```
- **Errors**: `404 CATEGORY_NOT_FOUND` if the category does not exist or is inactive; `400 VALIDATION_ERROR` if the slug parameter is malformed.

---

## Products
Public endpoints to browse, search, filter, and view the active product catalog. Only products and variants marked `isActive: true` are returned.

### `GET /api/products`
- **Access**: Public
- **Description**: Lists active products with pagination, keyword search, category/brand/price filtering, and validated sorting.
- **Query Parameters**:
  - `q` (string, optional, max 100): Case-insensitive keyword search across product name, description, brand, tag, category name, and variant SKU/partNumber.
  - `category` (string, optional, max 100): Filter by category slug or ID.
  - `brand` (string, optional, max 100): Filter by brand name.
  - `minPrice` (number, optional, >= 0): Filter products with variants priced >= minPrice.
  - `maxPrice` (number, optional, >= 0): Filter products with variants priced <= maxPrice (must be >= minPrice).
  - `sort` (enum, optional, default: `newest`): Allowlist: `price_asc`, `price_desc`, `name_asc`, `name_desc`, `newest`.
  - `page` (integer, optional, min 1, default 1): Current page.
  - `limit` (integer, optional, min 1, max 50, default 12): Items per page.
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "products": [
      {
        "id": "832b3917-d025-4064-b252-dd0d515c522b",
        "name": "Arduino Uno R3 Microcontroller Board",
        "slug": "arduino-uno-r3",
        "description": "ATmega328P based microcontroller board for electronics and prototyping.",
        "brand": "Arduino",
        "hsnCode": "8542",
        "gstRate": 18,
        "tag": "Best Seller",
        "imageUrl": null,
        "category": {
          "id": "800fb3df-e5c3-4b6a-98a1-2de1dee390fc",
          "name": "Electronics",
          "slug": "electronics"
        },
        "price": 1299,
        "mrp": null,
        "inStock": true,
        "variants": [
          {
            "id": "fa97f707-b375-4185-9c7f-5bac1d64bf82",
            "sku": "ELEC-ARD-UNO-R3",
            "partNumber": "A000066",
            "name": "Standard Unit",
            "packSize": "1 Unit",
            "dimensions": null,
            "price": 1299,
            "mrp": null,
            "stockQuantity": 50,
            "inStock": true,
            "tieredPrices": []
          }
        ],
        "createdAt": "2026-10-14T13:43:59.164Z",
        "updatedAt": "2026-10-14T13:43:59.164Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 12,
      "totalItems": 6,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
  ```
- **Errors**: `400 VALIDATION_ERROR` for negative prices, invalid sort fields, page < 1, or limit > 50.

### `GET /api/products/:slug` (and aliases `/api/products/slug/:slug`, `/api/products/id/:id`)
- **Access**: Public
- **Description**: Retrieves full product details and all active variants for a given slug or UUID.
- **Parameters**: `slug` (URL path parameter)
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "product": { ... }
  }
  ```
- **Errors**: `404 PRODUCT_NOT_FOUND` if the product is not found or is inactive.

### `GET /api/products/:slug/variants`
- **Access**: Public
- **Description**: Retrieves only the active variants for a specific product.
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "variants": [ ... ]
  }
  ```


## Cart
- `GET /cart` — authenticated user's cart.
- `POST /cart/items` — add product and quantity.
- `PATCH /cart/items/:itemId` — change quantity.
- `DELETE /cart/items/:itemId` — remove an item.
- `POST /cart/merge` — validate and merge a guest cart after login.

The server must validate product activity, quantity, stock, and price. Never accept client-submitted unit prices or totals.

## Addresses
- `GET /addresses` — current user's addresses.
- `POST /addresses` — create address for current user.
- `PATCH /addresses/:id` — update an address owned by current user.
- `DELETE /addresses/:id` — delete an address owned by current user.

## Orders
- `POST /orders` — validate cart/address, calculate totals, and create order transactionally.
- `GET /orders` — current user's order history.
- `GET /orders/:id` — get an order only if owned by current user, unless admin.
- `POST /orders/:id/cancel` — request/perform cancellation only when the order state allows it.
- `GET /admin/orders` — admin only.
- `PATCH /admin/orders/:id/status` — admin only, with valid state transitions.

Suggested order states: `PENDING`, `CONFIRMED`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`.

Suggested payment states: `PENDING`, `PAID`, `FAILED`, `REFUNDED`. Only server-verified payment provider events may mark an online payment as paid.

## Bulk quote requests
- `POST /quotes` — validate and persist a quote request.
- `GET /admin/quotes` — admin only.
- `GET /admin/quotes/:id` — admin only.
- `PATCH /admin/quotes/:id` — admin only to update permitted status/notes.

## Newsletter
- `POST /newsletter/subscribe` — validate and persist a normalized email; handle duplicates safely.
- Any admin listing/export endpoint must be authenticated and admin-only.

## Admin and reporting
- `GET /admin/reports/sales` — admin only; aggregate from valid order/payment states.
- `GET /admin/reports/inventory` — admin only; show low-stock products based on a configurable threshold.

## Cross-cutting requirements
- Use proper HTTP status codes.
- Validate every body, path parameter, and query parameter.
- Use authentication and role middleware for protected endpoints.
- Enforce resource ownership on the server.
- Configure CORS to the known frontend origin and credentials mode.
- For cookie authentication, implement appropriate CSRF protections.
- Apply rate limits to login, reset-password, and other abuse-prone endpoints.
- Document request/response examples and error codes in OpenAPI/Swagger.
- This document is a proposed contract: update it when implementation choices change, and keep it synchronized with actual tested routes.
