import test, { describe, before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { app } from "../src/app.js";
import { prisma } from "../src/config/db.js";
import {
  hashPassword,
  hashToken,
  generateSessionToken,
  generateResetToken,
} from "../src/utils/crypto.js";
import { provisionAdmin } from "../src/scripts/seedAdmin.js";
import { getCanonicalOrigin, getTrustedOrigins } from "../src/middleware/auth.middleware.js";

describe("Phase 3 Authentication, Sessions & RBAC Test Suite", () => {
  const timestamp = Date.now();
  const testCustomerEmail = `test.customer.${timestamp}@example.com`;
  const testB2bEmail = `test.b2b.${timestamp}@example.com`;
  const testAdminEmail = `test.admin.${timestamp}@example.com`;
  const testProvisionAdminEmail = `test.provision.admin.${timestamp}@example.com`;
  const testPassword = "ValidPassword123";

  let customerCookie = "";
  let adminCookie = "";
  let testUserId = "";

  before(async () => {
    // Bootstrap explicit ADMIN user for RBAC verification
    const adminPasswordHash = await hashPassword(testPassword);
    await prisma.user.create({
      data: {
        email: testAdminEmail,
        fullName: "Test Admin",
        passwordHash: adminPasswordHash,
        role: "ADMIN",
        isActive: true,
      },
    });
  });

  after(async () => {
    // Clean up all created test users and related sessions
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            testCustomerEmail,
            testB2bEmail,
            testAdminEmail,
            testProvisionAdminEmail,
            `hacker.${timestamp}@example.com`,
          ],
        },
      },
    }).catch(() => {});
    await prisma.$disconnect();
  });

  // 1. Registration
  test("1. POST /api/auth/register registers customer and sets HttpOnly cookie", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        fullName: "Test Customer",
        email: testCustomerEmail,
        password: testPassword,
        phone: "+91 9876543210",
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.user.email, testCustomerEmail);
    assert.equal(res.body.user.role, "CUSTOMER");
    assert.equal(res.body.user.passwordHash, undefined, "passwordHash must never be returned");
    testUserId = res.body.user.id;

    // Verify Set-Cookie header is present with HttpOnly
    const setCookie = res.headers["set-cookie"];
    assert.ok(setCookie, "Set-Cookie header must be present");
    const cookieStr = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    assert.ok(cookieStr.includes("vertex_session="), "Cookie name must be vertex_session");
    assert.ok(cookieStr.toLowerCase().includes("httponly"), "Cookie must be HttpOnly");

    // Save cookie for subsequent requests
    customerCookie = cookieStr.split(";")[0];
  });

  // 2. Role Tampering Protection
  test("2. POST /api/auth/register rejects attempt to register as ADMIN", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        fullName: "Hacker Admin",
        email: `hacker.${timestamp}@example.com`,
        password: testPassword,
        role: "ADMIN",
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, "VALIDATION_ERROR");
  });

  // 3. B2B Registration
  test("3. POST /api/auth/register allows B2B registration with company and GSTIN", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        fullName: "Industrial Parts Ltd",
        email: testB2bEmail,
        password: testPassword,
        accountType: "B2B",
        companyName: "Industrial Parts Private Limited",
        gstin: "27AAAAA0000A1Z5",
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.user.role, "B2B");
    assert.equal(res.body.user.companyName, "Industrial Parts Private Limited");
  });

  // 4. Duplicate Registration
  test("4. POST /api/auth/register rejects duplicate email with 409 Conflict", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        fullName: "Duplicate User",
        email: testCustomerEmail.toUpperCase(), // Test case-insensitive normalization
        password: testPassword,
      });

    assert.equal(res.status, 409);
    assert.equal(res.body.error.code, "EMAIL_ALREADY_EXISTS");
  });

  // 5. Input Validation and Malformed Requests
  test("5. POST /api/auth/register rejects malformed inputs with 400 VALIDATION_ERROR", async () => {
    // Invalid email format
    const resInvalidEmail = await request(app)
      .post("/api/auth/register")
      .send({
        fullName: "Bad Email",
        email: "not-a-valid-email",
        password: testPassword,
      });
    assert.equal(resInvalidEmail.status, 400);
    assert.equal(resInvalidEmail.body.error.code, "VALIDATION_ERROR");

    // Weak password (under 8 characters)
    const resWeakPassword = await request(app)
      .post("/api/auth/register")
      .send({
        fullName: "Weak Pass",
        email: `weak.${timestamp}@example.com`,
        password: "short",
      });
    assert.equal(resWeakPassword.status, 400);
    assert.equal(resWeakPassword.body.error.code, "VALIDATION_ERROR");
  });

  // 6. Login
  test("6. POST /api/auth/login succeeds with valid credentials and sets cookie", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: testCustomerEmail,
        password: testPassword,
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.user.email, testCustomerEmail);
    assert.equal(res.body.user.passwordHash, undefined);

    const setCookie = res.headers["set-cookie"];
    assert.ok(setCookie);
    customerCookie = (Array.isArray(setCookie) ? setCookie[0] : setCookie).split(";")[0];
  });

  test("7. POST /api/auth/login fails with invalid credentials and generic message", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: testCustomerEmail,
        password: "WrongPassword999",
      });

    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, "INVALID_CREDENTIALS");
    assert.equal(res.body.error.message, "Invalid email or password.");
  });

  test("8. POST /api/auth/login rejects empty password with 400 VALIDATION_ERROR", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: testCustomerEmail,
        password: "",
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, "VALIDATION_ERROR");
  });

  // 9. Profile Check (GET /api/auth/me)
  test("9. GET /api/auth/me returns current user profile when authenticated", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Cookie", customerCookie);

    assert.equal(res.status, 200);
    assert.equal(res.body.user.email, testCustomerEmail);
    assert.equal(res.body.user.passwordHash, undefined);
  });

  test("10. GET /api/auth/me returns 401 Unauthorized without session cookie", async () => {
    const res = await request(app)
      .get("/api/auth/me");

    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, "UNAUTHORIZED");
  });

  // 11. Session Expiration
  test("11. GET /api/auth/me returns 401 SESSION_EXPIRED when session token has expired", async () => {
    // Generate an explicitly expired session for test customer
    const expiredRawToken = generateSessionToken();
    const expiredTokenHash = hashToken(expiredRawToken);
    const expiredSession = await prisma.session.create({
      data: {
        userId: testUserId,
        tokenHash: expiredTokenHash,
        expiresAt: new Date(Date.now() - 10000), // 10 seconds ago
      },
    });

    const res = await request(app)
      .get("/api/auth/me")
      .set("Cookie", `vertex_session=${expiredRawToken}`);

    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, "SESSION_EXPIRED");

    // Verify session was automatically purged from database
    const sessionInDb = await prisma.session.findUnique({
      where: { id: expiredSession.id },
    });
    assert.equal(sessionInDb, null, "Expired session must be deleted from DB upon detection");
  });

  // 12. RBAC Authorization
  test("12. GET /api/auth/admin-check rejects CUSTOMER with 403 Forbidden", async () => {
    const res = await request(app)
      .get("/api/auth/admin-check")
      .set("Cookie", customerCookie);

    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, "FORBIDDEN");
  });

  test("13. GET /api/auth/admin-check allows ADMIN user with 200 OK", async () => {
    // Log in as admin
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({
        email: testAdminEmail,
        password: testPassword,
      });

    assert.equal(loginRes.status, 200);
    const setCookie = loginRes.headers["set-cookie"];
    adminCookie = (Array.isArray(setCookie) ? setCookie[0] : setCookie).split(";")[0];

    const adminCheckRes = await request(app)
      .get("/api/auth/admin-check")
      .set("Cookie", adminCookie);

    assert.equal(adminCheckRes.status, 200);
    assert.equal(adminCheckRes.body.status, "AUTHORIZED");
    assert.equal(adminCheckRes.body.user.role, "ADMIN");
  });

  // 14. CSRF Protection
  test("14. POST /api/auth/change-password rejects untrusted origin without custom header with 403 CSRF_ERROR", async () => {
    const res = await request(app)
      .post("/api/auth/change-password")
      .set("Cookie", customerCookie)
      .set("Origin", "http://malicious-attacker-site.com")
      .send({
        currentPassword: testPassword,
        newPassword: "NewSafePassword123",
      });

    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, "CSRF_ERROR");
  });

  test("15. POST /api/auth/change-password rejects untrusted origin even when X-Requested-With header is present", async () => {
    const res = await request(app)
      .post("/api/auth/change-password")
      .set("Cookie", customerCookie)
      .set("Origin", "http://malicious-attacker-site.com")
      .set("X-Requested-With", "XMLHttpRequest")
      .send({
        currentPassword: "WrongCurrentPassword",
        newPassword: "NewSafePassword123",
      });

    // Custom header must NEVER bypass an explicit untrusted origin check
    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, "CSRF_ERROR");
  });

  test("15a. CSRF protection strictly rejects malicious lookalike prefix origins", async () => {
    const lookalikeOrigins = [
      "http://localhost:3000.attacker.com",
      "http://localhost:3000@evil.com",
      "https://localhost:3000.phish.org",
      "http://localhost:30000",
    ];

    for (const origin of lookalikeOrigins) {
      const res = await request(app)
        .post("/api/auth/change-password")
        .set("Cookie", customerCookie)
        .set("Origin", origin)
        .send({
          currentPassword: testPassword,
          newPassword: "NewSafePassword123",
        });

      assert.equal(res.status, 403, `Lookalike origin ${origin} must be rejected`);
      assert.equal(res.body.error.code, "CSRF_ERROR");
    }
  });

  test("15b. CSRF protection accepts requests from exact trusted origin", async () => {
    const res = await request(app)
      .post("/api/auth/change-password")
      .set("Cookie", customerCookie)
      .set("Origin", "http://localhost:3000")
      .send({
        currentPassword: "WrongCurrentPassword",
        newPassword: "NewSafePassword123",
      });

    // Successfully passed CSRF check; fails on incorrect password validation
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, "INVALID_CURRENT_PASSWORD");
  });

  test("15c. CSRF protection accepts requests without Origin header if X-Requested-With is present", async () => {
    const res = await request(app)
      .post("/api/auth/change-password")
      .set("Cookie", customerCookie)
      .set("X-Requested-With", "XMLHttpRequest")
      .send({
        currentPassword: "WrongCurrentPassword",
        newPassword: "NewSafePassword123",
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, "INVALID_CURRENT_PASSWORD");
  });

  test("15d. CSRF protection rejects state-changing authenticated requests when both Origin and custom header are missing", async () => {
    const res = await request(app)
      .post("/api/auth/change-password")
      .set("Cookie", customerCookie)
      .send({
        currentPassword: testPassword,
        newPassword: "NewSafePassword123",
      });

    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, "CSRF_ERROR");
  });

  test("15e. getTrustedOrigins does not automatically trust localhost in production mode", () => {
    const originalEnv = process.env.NODE_ENV;
    const originalFrontend = process.env.FRONTEND_URL;
    try {
      process.env.NODE_ENV = "production";
      process.env.FRONTEND_URL = "https://vertex.in";

      const trusted = getTrustedOrigins();
      assert.ok(trusted.has("https://vertex.in"), "Must trust configured production FRONTEND_URL");
      assert.equal(trusted.has("http://localhost:3000"), false, "Must NOT trust localhost in production");
      assert.equal(trusted.has("http://127.0.0.1:3000"), false, "Must NOT trust 127.0.0.1 in production");
    } finally {
      process.env.NODE_ENV = originalEnv;
      process.env.FRONTEND_URL = originalFrontend;
    }
  });

  // 16. Password Change
  test("16. POST /api/auth/change-password updates password and verifies current password", async () => {
    const newPassword = "BrandNewPassword456";

    // Attempt with incorrect current password
    const failRes = await request(app)
      .post("/api/auth/change-password")
      .set("Cookie", customerCookie)
      .set("X-Requested-With", "XMLHttpRequest")
      .send({
        currentPassword: "WrongCurrentPassword",
        newPassword,
      });

    assert.equal(failRes.status, 400);

    // Attempt with correct current password
    const successRes = await request(app)
      .post("/api/auth/change-password")
      .set("Cookie", customerCookie)
      .set("X-Requested-With", "XMLHttpRequest")
      .send({
        currentPassword: testPassword,
        newPassword,
      });

    assert.equal(successRes.status, 200);
    assert.equal(successRes.body.success, true);
  });

  // 17. Password Reset Flow
  test("17. POST /api/auth/forgot-password returns safe generic non-enumerating message", async () => {
    // Non-existent email
    const unknownRes = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "nonexistent.user@example.com" });

    assert.equal(unknownRes.status, 200);
    assert.equal(unknownRes.body.success, true);
    assert.ok(unknownRes.body.message.toLowerCase().includes("password reset") || unknownRes.body.message.toLowerCase().includes("reset"));

    // Existing customer email
    const knownRes = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: testCustomerEmail });

    assert.equal(knownRes.status, 200);
    assert.equal(knownRes.body.success, true);
    assert.ok(knownRes.body.message.toLowerCase().includes("password reset") || knownRes.body.message.toLowerCase().includes("reset"));
  });

  test("18. POST /api/auth/reset-password rejects invalid/malformed tokens", async () => {
    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({
        token: "invalid-dummy-token-that-fails-verification-12345",
        newPassword: "ResetPassword789",
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, "INVALID_RESET_TOKEN");
  });

  test("19. POST /api/auth/reset-password resets password with valid token and enforces single-use", async () => {
    const resetSuccessPassword = "FinalResetPassword999";

    // Fetch user and generate valid token using crypto utility
    const user = await prisma.user.findUnique({
      where: { email: testCustomerEmail },
    });
    assert.ok(user, "Test user must exist in database");

    const validResetToken = generateResetToken(user.id, user.passwordHash);

    // Valid reset attempt
    const resetRes = await request(app)
      .post("/api/auth/reset-password")
      .send({
        token: validResetToken,
        newPassword: resetSuccessPassword,
      });

    assert.equal(resetRes.status, 200);
    assert.equal(resetRes.body.success, true);

    // Verify user can log in with new password
    const loginNewRes = await request(app)
      .post("/api/auth/login")
      .send({
        email: testCustomerEmail,
        password: resetSuccessPassword,
      });
    assert.equal(loginNewRes.status, 200);
    assert.equal(loginNewRes.body.success, true);

    // Verify old password fails
    const loginOldRes = await request(app)
      .post("/api/auth/login")
      .send({
        email: testCustomerEmail,
        password: "BrandNewPassword456",
      });
    assert.equal(loginOldRes.status, 401);

    // Single-use token enforcement: Replay of the same token must be rejected
    const replayRes = await request(app)
      .post("/api/auth/reset-password")
      .send({
        token: validResetToken,
        newPassword: "AnotherNewPassword000",
      });
    assert.equal(replayRes.status, 400);
    assert.equal(replayRes.body.error.code, "INVALID_RESET_TOKEN");
  });

  // 20. Logout
  test("20. POST /api/auth/logout invalidates session and clears cookie", async () => {
    // Log in to obtain a fresh session cookie
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({
        email: testCustomerEmail,
        password: "FinalResetPassword999",
      });
    assert.equal(loginRes.status, 200);
    const setCookie = loginRes.headers["set-cookie"];
    assert.ok(setCookie, "Login must return a Set-Cookie header");
    const freshCookie = (Array.isArray(setCookie) ? setCookie[0] : setCookie).split(";")[0];

    const logoutRes = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", freshCookie)
      .set("X-Requested-With", "XMLHttpRequest");

    assert.equal(logoutRes.status, 200);
    assert.equal(logoutRes.body.success, true);

    // Subsequent /me request with old cookie must fail with 401
    const meRes = await request(app)
      .get("/api/auth/me")
      .set("Cookie", freshCookie);

    assert.equal(meRes.status, 401);
  });

  // 21. Safe Administrator Provisioning (CLI & Function)
  test("21. provisionAdmin creates administrator and is safe to run repeatedly", async () => {
    // Create new admin
    const created = await provisionAdmin({
      email: testProvisionAdminEmail,
      password: "SuperSecretAdminPassword123",
      name: "Provisioned Admin",
    });
    assert.equal(created.action, "CREATED");
    assert.equal(created.role, "ADMIN");

    // Run again with updated password (idempotent / repeatable update)
    const updated = await provisionAdmin({
      email: testProvisionAdminEmail,
      password: "UpdatedAdminPassword456",
      name: "Provisioned Admin Updated",
    });
    assert.equal(updated.action, "UPDATED");
    assert.equal(updated.role, "ADMIN");
  });

  test("22. provisionAdmin refuses to silently promote an existing customer to ADMIN", async () => {
    // testCustomerEmail has role CUSTOMER
    await assert.rejects(
      async () => {
        await provisionAdmin({
          email: testCustomerEmail,
          password: "TryToHijackAccount123",
          name: "Fake Admin",
        });
      },
      (err) => {
        assert.ok(err.message.includes("Refusing to silently promote an ordinary account to ADMIN"));
        return true;
      }
    );
  });

  // 23. Rate Limiting
  test("23. Rate limiter triggers 429 TOO_MANY_REQUESTS on excessive reset attempts", async () => {
    // forgotPasswordLimiter allows max 5 requests per hour
    // We already made 2 requests in test 17. Subsequent requests cross the limit and trigger 429.
    let hit429 = false;
    for (let i = 0; i < 8; i++) {
      const res = await request(app)
        .post("/api/auth/forgot-password")
        .send({ email: `ratelimit.${timestamp}.${i}@example.com` });

      if (res.status === 429) {
        hit429 = true;
        assert.equal(res.body.error.code, "TOO_MANY_REQUESTS");
        break;
      }
    }
    assert.equal(hit429, true, "Excessive reset requests must be blocked with 429 TOO_MANY_REQUESTS");
  });
});
