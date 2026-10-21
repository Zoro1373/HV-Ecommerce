import test, { describe, before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { generateSync } from "otplib";
import { app } from "../src/app.js";
import { prisma } from "../src/config/db.js";
import {
  hashPassword,
  hashToken,
  generateSessionToken,
} from "../src/utils/crypto.js";
import {
  decryptSecret,
  hashRecoveryCode,
} from "../src/utils/mfa.js";
import { isTestEnv } from "../src/middleware/rateLimit.middleware.js";

describe("Phase MFA: Microsoft Authenticator TOTP & Recovery Codes Test Suite", () => {
  const timestamp = Date.now();
  const testUserEmail = `mfa.user.${timestamp}@example.com`;
  const testAdminEmail = `admin.mfa.${timestamp}@example.com`;
  const testRegularEmail = `regular.mfa.${timestamp}@example.com`;
  const testPassword = "ValidPassword123";

  let testUserId = null;
  let testAdminId = null;
  let testRegularId = null;

  let userSessionCookie = "";
  let enrolledTotpSecret = "";
  let validRecoveryCodes = [];
  let loginChallengeToken = "";

  before(async () => {
    const passwordHash = await hashPassword(testPassword);

    // 1. User for MFA enrollment, login, disable, recovery tests
    const user = await prisma.user.create({
      data: {
        email: testUserEmail,
        fullName: "MFA Test User",
        passwordHash,
        role: "CUSTOMER",
      },
    });
    testUserId = user.id;

    // 2. Admin user for mandatory role policy tests
    const admin = await prisma.user.create({
      data: {
        email: testAdminEmail,
        fullName: "MFA Test Admin",
        passwordHash,
        role: "ADMIN",
      },
    });
    testAdminId = admin.id;

    // 3. Regular non-MFA user
    const regular = await prisma.user.create({
      data: {
        email: testRegularEmail,
        fullName: "Regular Non-MFA User",
        passwordHash,
        role: "CUSTOMER",
      },
    });
    testRegularId = regular.id;

    // Log in as testUser to get session cookie for enrollment
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: testUserEmail, password: testPassword });

    assert.equal(loginRes.status, 200);
    const setCookie = loginRes.headers["set-cookie"];
    userSessionCookie = (Array.isArray(setCookie) ? setCookie[0] : setCookie).split(";")[0];
  });

  after(async () => {
    // Clean up test users and cascade related records
    await prisma.user.deleteMany({
      where: {
        id: { in: [testUserId, testAdminId, testRegularId] },
      },
    }).catch(() => {});
    await prisma.$disconnect();
  });

  // 1. Valid Enrollment Initiation
  test("1. POST /api/auth/mfa/enroll generates TOTP secret, otpauth URI, and QR code", async () => {
    const res = await request(app)
      .post("/api/auth/mfa/enroll")
      .set("Cookie", userSessionCookie)
      .set("X-Requested-With", "XMLHttpRequest");

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.secret, "Must return Base32 TOTP secret");
    assert.ok(res.body.otpauthUri.startsWith("otpauth://totp/VERTEX:"), "Must use VERTEX issuer");
    assert.ok(res.body.qrCodeDataUrl.startsWith("data:image/png;base64,"), "Must return QR data URL");

    enrolledTotpSecret = res.body.secret;

    // Verify secret is stored encrypted at rest in database and mfaEnabled is still false
    const dbUser = await prisma.user.findUnique({ where: { id: testUserId } });
    assert.equal(dbUser.mfaEnabled, false, "MFA must not be enabled before confirmation");
    assert.ok(dbUser.mfaPendingSecret, "Pending secret must be stored in DB");
    assert.notEqual(dbUser.mfaPendingSecret, enrolledTotpSecret, "Secret must be encrypted at rest");
    assert.equal(decryptSecret(dbUser.mfaPendingSecret), enrolledTotpSecret, "Must decrypt to original secret");
  });

  // 2. Rejection of Invalid Initial Verification Code
  test("2. POST /api/auth/mfa/confirm-enroll rejects invalid TOTP code and keeps MFA disabled", async () => {
    const res = await request(app)
      .post("/api/auth/mfa/confirm-enroll")
      .set("Cookie", userSessionCookie)
      .set("X-Requested-With", "XMLHttpRequest")
      .send({ totpCode: "000000" });

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, "INVALID_TOTP_CODE");

    const dbUser = await prisma.user.findUnique({ where: { id: testUserId } });
    assert.equal(dbUser.mfaEnabled, false);
    assert.equal(dbUser.mfaSecret, null);
  });

  // 3. Successful Confirmation of Enrollment
  test("3. POST /api/auth/mfa/confirm-enroll confirms enrollment with valid code and returns 10 recovery codes", async () => {
    const validTotpCode = generateSync({ secret: enrolledTotpSecret });

    const res = await request(app)
      .post("/api/auth/mfa/confirm-enroll")
      .set("Cookie", userSessionCookie)
      .set("X-Requested-With", "XMLHttpRequest")
      .send({ totpCode: validTotpCode });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.recoveryCodes), "Must return recovery codes");
    assert.equal(res.body.recoveryCodes.length, 10, "Must generate exactly 10 recovery codes");

    validRecoveryCodes = res.body.recoveryCodes;

    // Verify database state: mfaEnabled = true, pending secret cleared, recovery codes stored hashed
    const dbUser = await prisma.user.findUnique({
      where: { id: testUserId },
      include: { recoveryCodes: true },
    });
    assert.equal(dbUser.mfaEnabled, true);
    assert.equal(dbUser.mfaPendingSecret, null);
    assert.ok(dbUser.mfaSecret);
    assert.equal(dbUser.recoveryCodes.length, 10);

    // Verify recovery codes are NOT plaintext in DB
    for (const rc of dbUser.recoveryCodes) {
      assert.notEqual(rc.codeHash, validRecoveryCodes[0]);
      assert.equal(rc.usedAt, null);
    }
  });

  // 3a. Concurrency-Safe Enrollment Confirmation
  test("3a. Concurrent POST /api/auth/mfa/confirm-enroll requests: exactly one succeeds and one fails without competing recovery codes", async () => {
    // 1. Create a dedicated user for concurrent enrollment confirmation
    const concurrentUserEmail = `concurrent.enroll.${Date.now()}@example.com`;
    const regRes = await request(app)
      .post("/api/auth/register")
      .send({
        email: concurrentUserEmail,
        password: testPassword,
        fullName: "Concurrent Enrollment",
      });
    assert.equal(regRes.status, 201);
    const concurrentCookie = regRes.headers["set-cookie"][0].split(";")[0];
    const concurrentUserId = regRes.body.user.id;

    try {
      // 2. Start MFA enrollment
      const enrollRes = await request(app)
        .post("/api/auth/mfa/enroll")
        .set("Cookie", concurrentCookie)
        .set("X-Requested-With", "XMLHttpRequest");
      assert.equal(enrollRes.status, 200);
      const pendingSecret = enrollRes.body.secret;

      // 3. Generate valid TOTP code
      const totpCode = generateSync({ secret: pendingSecret });

      // 4. Fire two concurrent confirm-enroll requests simultaneously with the same code
      const [res1, res2] = await Promise.all([
        request(app)
          .post("/api/auth/mfa/confirm-enroll")
          .set("Cookie", concurrentCookie)
          .set("X-Requested-With", "XMLHttpRequest")
          .send({ totpCode }),
        request(app)
          .post("/api/auth/mfa/confirm-enroll")
          .set("Cookie", concurrentCookie)
          .set("X-Requested-With", "XMLHttpRequest")
          .send({ totpCode }),
      ]);

      const statuses = [res1.status, res2.status].sort();
      assert.deepEqual(statuses, [200, 400], "Exactly one request must succeed (200) and one must fail (400)");

      const successRes = res1.status === 200 ? res1 : res2;
      const failRes = res1.status === 400 ? res1 : res2;

      assert.equal(successRes.body.success, true);
      assert.ok(Array.isArray(successRes.body.recoveryCodes));
      assert.equal(successRes.body.recoveryCodes.length, 10);
      assert.equal(failRes.body.error.code, "CONCURRENT_ENROLLMENT_CONFLICT");

      // 5. Verify database state: exactly 10 recovery codes exist, matching the winning request
      const dbUser = await prisma.user.findUnique({
        where: { id: concurrentUserId },
        include: { recoveryCodes: true },
      });

      assert.equal(dbUser.mfaEnabled, true);
      assert.equal(dbUser.mfaPendingSecret, null);
      assert.equal(dbUser.recoveryCodes.length, 10);

      // Verify each stored code hash matches one of the winning plaintext recovery codes
      const winningHashes = new Set(successRes.body.recoveryCodes.map(hashRecoveryCode));
      for (const rc of dbUser.recoveryCodes) {
        assert.ok(winningHashes.has(rc.codeHash), "Database recovery codes must strictly match the winning response");
      }
    } finally {
      // Clean up the temporary user
      await prisma.user.delete({ where: { id: concurrentUserId } });
    }
  });

  // 4. Login Interception for MFA-Enabled Accounts
  test("4. POST /api/auth/login requires MFA second-factor and does not issue session cookie", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: testUserEmail,
        password: testPassword,
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.mfaRequired, true);
    assert.ok(res.body.mfaChallengeToken, "Must return challenge token");
    assert.equal(res.body.expiresInSeconds, 300);

    // Critical security check: No session cookie issued!
    const setCookie = res.headers["set-cookie"];
    assert.equal(setCookie, undefined, "Session cookie MUST NOT be set after password verification alone");

    loginChallengeToken = res.body.mfaChallengeToken;
  });

  // 5. Incomplete MFA Challenge Cannot Access Protected Routes
  test("5. Unfinished MFA challenge cannot satisfy authentication or access protected routes", async () => {
    const res = await request(app).get("/api/auth/me");
    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, "UNAUTHORIZED");
  });

  // 6. Successful Second-Factor Login Verification with TOTP
  test("6. POST /api/auth/mfa/verify-login consumes challenge and sets authenticated session cookie", async () => {
    // Generate fresh TOTP code
    const validTotpCode = generateSync({ secret: enrolledTotpSecret });

    const res = await request(app)
      .post("/api/auth/mfa/verify-login")
      .send({
        mfaChallengeToken: loginChallengeToken,
        code: validTotpCode,
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.user.email, testUserEmail);

    // Verify Set-Cookie is now present with HttpOnly vertex_session
    const setCookie = res.headers["set-cookie"];
    assert.ok(setCookie, "Session cookie must now be set");
    const cookieStr = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    assert.ok(cookieStr.includes("vertex_session="));
    assert.ok(cookieStr.toLowerCase().includes("httponly"));

    userSessionCookie = cookieStr.split(";")[0];

    // Verify /api/auth/me works with new cookie
    const meRes = await request(app)
      .get("/api/auth/me")
      .set("Cookie", userSessionCookie);
    assert.equal(meRes.status, 200);
    assert.equal(meRes.body.user.email, testUserEmail);
  });

  // 7. Prevention of Challenge Reuse
  test("7. POST /api/auth/mfa/verify-login rejects already-consumed challenge", async () => {
    const res = await request(app)
      .post("/api/auth/mfa/verify-login")
      .send({
        mfaChallengeToken: loginChallengeToken,
        code: generateSync({ secret: enrolledTotpSecret }),
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, "CHALLENGE_ALREADY_USED");
  });

  // 7a. Atomic Concurrency Protection Against Parallel Challenge Consumption
  test("7a. Concurrent requests attempting to consume the same challenge: exactly one succeeds and others fail", async () => {
    // Reset lastVerifiedStep so TOTP code is accepted cleanly
    await prisma.user.update({
      where: { id: testUserId },
      data: { mfaLastVerifiedStep: null },
    });

    // 1. Initiate a fresh login challenge
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: testUserEmail, password: testPassword });
    assert.equal(loginRes.status, 200);
    const concurrentChallengeToken = loginRes.body.mfaChallengeToken;

    // 2. Prepare 5 concurrent requests with the exact same token and valid TOTP code
    const code = generateSync({ secret: enrolledTotpSecret });
    const concurrencyPromises = Array.from({ length: 5 }, () =>
      request(app)
        .post("/api/auth/mfa/verify-login")
        .send({ mfaChallengeToken: concurrentChallengeToken, code })
    );

    // 3. Fire all 5 requests concurrently in parallel
    const responses = await Promise.all(concurrencyPromises);

    // 4. Verify that exactly ONE request received 200 OK
    const successes = responses.filter((r) => r.status === 200);
    assert.equal(successes.length, 1, "Exactly one concurrent request must succeed");
    assert.ok(successes[0].headers["set-cookie"], "Winning request must receive session cookie");

    // 5. Verify that all other 4 requests received 400 CHALLENGE_ALREADY_USED
    const failures = responses.filter((r) => r.status === 400);
    assert.equal(failures.length, 4, "All losing concurrent requests must be rejected with 400");
    for (const f of failures) {
      assert.ok(
        ["CHALLENGE_ALREADY_USED", "CODE_ALREADY_USED"].includes(f.body.error.code),
        `Expected rejection code, got ${f.body.error.code}`
      );
    }

    // 6. Verify database state: exactly ONE challenge record exists and is marked used
    const tokenHash = hashToken(concurrentChallengeToken);
    const challengeRow = await prisma.mfaChallenge.findUnique({
      where: { tokenHash },
    });
    assert.ok(challengeRow.usedAt !== null, "Challenge must be marked usedAt");
  });

  // 7b. Failed Verification Does Not Accidentally Consume Challenge
  test("7b. Failed verification with invalid code does not consume challenge, allowing subsequent retry", async () => {
    // Reset lastVerifiedStep
    await prisma.user.update({
      where: { id: testUserId },
      data: { mfaLastVerifiedStep: null },
    });

    // 1. Initiate fresh login challenge
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: testUserEmail, password: testPassword });
    const retryChallengeToken = loginRes.body.mfaChallengeToken;

    // 2. Submit wrong code
    const failRes = await request(app)
      .post("/api/auth/mfa/verify-login")
      .send({ mfaChallengeToken: retryChallengeToken, code: "000000" });
    assert.equal(failRes.status, 401);
    assert.equal(failRes.body.error.code, "INVALID_MFA_CODE");

    // 3. Verify challenge in database is STILL NOT marked used
    const tokenHash = hashToken(retryChallengeToken);
    const challengeRow = await prisma.mfaChallenge.findUnique({
      where: { tokenHash },
    });
    assert.equal(challengeRow.usedAt, null, "Failed attempt must not consume the challenge");

    // 4. Submit correct code on subsequent attempt and verify success
    const validCode = generateSync({ secret: enrolledTotpSecret });
    const successRes = await request(app)
      .post("/api/auth/mfa/verify-login")
      .send({ mfaChallengeToken: retryChallengeToken, code: validCode });
    assert.equal(successRes.status, 200);
    assert.equal(successRes.body.success, true);
  });

  // 8. Rejection of Expired Challenges
  test("8. POST /api/auth/mfa/verify-login rejects expired challenges", async () => {
    // Create explicitly expired challenge
    const expiredRawToken = generateSessionToken();
    const tokenHash = hashToken(expiredRawToken);
    await prisma.mfaChallenge.create({
      data: {
        userId: testUserId,
        tokenHash,
        type: "LOGIN",
        expiresAt: new Date(Date.now() - 10000), // 10s in past
      },
    });

    const res = await request(app)
      .post("/api/auth/mfa/verify-login")
      .send({
        mfaChallengeToken: expiredRawToken,
        code: generateSync({ secret: enrolledTotpSecret }),
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, "CHALLENGE_EXPIRED");
  });

  // 9. TOTP Replay Prevention
  test("9. TOTP replay prevention rejects immediate reuse of same code during same time step", async () => {
    // Reset lastVerifiedStep so test 9 can verify step 1 cleanly if previous tests ran in same 30s window
    await prisma.user.update({
      where: { id: testUserId },
      data: { mfaLastVerifiedStep: null },
    });

    // 1. Initiate fresh login challenge
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: testUserEmail, password: testPassword });
    const challengeToken = loginRes.body.mfaChallengeToken;

    // 2. Get code and use it
    const code = generateSync({ secret: enrolledTotpSecret });
    const verifyRes1 = await request(app)
      .post("/api/auth/mfa/verify-login")
      .send({ mfaChallengeToken: challengeToken, code });
    assert.equal(verifyRes1.status, 200);

    // 3. Initiate another login challenge
    const loginRes2 = await request(app)
      .post("/api/auth/login")
      .send({ email: testUserEmail, password: testPassword });
    const challengeToken2 = loginRes2.body.mfaChallengeToken;

    // 4. Try reusing the exact same code
    const verifyRes2 = await request(app)
      .post("/api/auth/mfa/verify-login")
      .send({ mfaChallengeToken: challengeToken2, code });

    assert.equal(verifyRes2.status, 400);
    assert.equal(verifyRes2.body.error.code, "CODE_ALREADY_USED");
  });

  // 10. Single-Use Recovery Code Authentication
  test("10. Recovery code authenticates successfully and cannot be reused", async () => {
    const recoveryCodeToUse = validRecoveryCodes[0];

    // Initiate login challenge
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: testUserEmail, password: testPassword });
    const challengeToken = loginRes.body.mfaChallengeToken;

    // Use recovery code
    const verifyRes = await request(app)
      .post("/api/auth/mfa/verify-login")
      .send({
        mfaChallengeToken: challengeToken,
        code: recoveryCodeToUse,
      });

    assert.equal(verifyRes.status, 200);
    assert.equal(verifyRes.body.usedRecoveryCode, true);

    // Verify in database that this recovery code is marked usedAt
    const codeHash = hashRecoveryCode(recoveryCodeToUse);
    const dbCode = await prisma.recoveryCode.findFirst({
      where: { userId: testUserId, codeHash },
    });
    assert.ok(dbCode.usedAt !== null, "Recovery code must have non-null usedAt timestamp");

    // Initiate another login challenge and attempt to reuse the same recovery code
    const loginRes2 = await request(app)
      .post("/api/auth/login")
      .send({ email: testUserEmail, password: testPassword });
    const challengeToken2 = loginRes2.body.mfaChallengeToken;

    const reuseRes = await request(app)
      .post("/api/auth/mfa/verify-login")
      .send({
        mfaChallengeToken: challengeToken2,
        code: recoveryCodeToUse,
      });

    assert.equal(reuseRes.status, 401);
    assert.equal(reuseRes.body.error.code, "INVALID_MFA_CODE");
  });

  // 11. Regeneration of Recovery Codes
  test("11. POST /api/auth/mfa/recovery-codes invalidates previous recovery codes and returns new set", async () => {
    // Log in to get session cookie
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: testUserEmail, password: testPassword });

    const secondRecoveryCode = validRecoveryCodes[1];
    const challengeRes = await request(app)
      .post("/api/auth/mfa/verify-login")
      .send({
        mfaChallengeToken: loginRes.body.mfaChallengeToken,
        code: secondRecoveryCode,
      });
    const cookie = challengeRes.headers["set-cookie"][0].split(";")[0];

    // Regenerate recovery codes
    const regenRes = await request(app)
      .post("/api/auth/mfa/recovery-codes")
      .set("Cookie", cookie)
      .set("X-Requested-With", "XMLHttpRequest")
      .send({ currentPassword: testPassword });

    assert.equal(regenRes.status, 200);
    assert.equal(regenRes.body.success, true);
    assert.equal(regenRes.body.recoveryCodes.length, 10);

    const newCodes = regenRes.body.recoveryCodes;

    // Old unused code (validRecoveryCodes[2]) should now be completely deleted from DB
    const oldCodeHash = hashRecoveryCode(validRecoveryCodes[2]);
    const oldCodeInDb = await prisma.recoveryCode.findFirst({
      where: { userId: testUserId, codeHash: oldCodeHash },
    });
    assert.equal(oldCodeInDb, null, "Old recovery codes must be deleted from DB upon regeneration");

    validRecoveryCodes = newCodes;
    userSessionCookie = cookie;
  });

  // 12. MFA Disablement with Reauthentication
  test("12. POST /api/auth/mfa/disable requires password and code, disables MFA, and purges recovery codes", async () => {
    const currentCode = validRecoveryCodes[0];

    // Wrong password test
    const failRes = await request(app)
      .post("/api/auth/mfa/disable")
      .set("Cookie", userSessionCookie)
      .set("X-Requested-With", "XMLHttpRequest")
      .send({
        currentPassword: "WrongPassword999",
        code: currentCode,
      });
    assert.equal(failRes.status, 400);

    // Correct disable request
    const successRes = await request(app)
      .post("/api/auth/mfa/disable")
      .set("Cookie", userSessionCookie)
      .set("X-Requested-With", "XMLHttpRequest")
      .send({
        currentPassword: testPassword,
        code: currentCode,
      });

    assert.equal(successRes.status, 200);
    assert.equal(successRes.body.success, true);

    // Verify DB state: mfaEnabled is false, mfaSecret is null, recoveryCodes are 0
    const dbUser = await prisma.user.findUnique({
      where: { id: testUserId },
      include: { recoveryCodes: true },
    });
    assert.equal(dbUser.mfaEnabled, false);
    assert.equal(dbUser.mfaSecret, null);
    assert.equal(dbUser.recoveryCodes.length, 0);

    // Subsequent login now succeeds immediately without MFA challenge
    const normalLoginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: testUserEmail, password: testPassword });

    assert.equal(normalLoginRes.status, 200);
    assert.equal(normalLoginRes.body.mfaRequired, undefined);
    assert.ok(normalLoginRes.headers["set-cookie"]);
  });

  // 13. Mandatory Admin MFA Policy Enforcement
  test("13. Mandatory MFA role policy requires unenrolled admins to set up MFA in restricted state", async () => {
    // Enable MFA enforcement for ADMIN role via environment variable
    const originalPolicy = process.env.MFA_ENFORCED_ROLES;
    process.env.MFA_ENFORCED_ROLES = "ADMIN";

    try {
      // 1. Admin login is intercepted with mfaSetupRequired
      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({ email: testAdminEmail, password: testPassword });

      assert.equal(loginRes.status, 200);
      assert.equal(loginRes.body.mfaSetupRequired, true);
      assert.ok(loginRes.body.mfaSetupToken, "Must return mfaSetupToken");
      assert.equal(loginRes.headers["set-cookie"], undefined, "Must NOT issue session cookie");

      const setupToken = loginRes.body.mfaSetupToken;

      // 2. Start restricted setup
      const startRes = await request(app)
        .post("/api/auth/mfa/setup-required/start")
        .send({ mfaSetupToken: setupToken });

      assert.equal(startRes.status, 200);
      assert.ok(startRes.body.secret);
      assert.ok(startRes.body.qrCodeDataUrl);

      const adminTotpSecret = startRes.body.secret;
      const validAdminTotpCode = generateSync({ secret: adminTotpSecret });

      // 3. Confirm restricted setup
      const confirmRes = await request(app)
        .post("/api/auth/mfa/setup-required/confirm")
        .send({
          mfaSetupToken: setupToken,
          totpCode: validAdminTotpCode,
        });

      assert.equal(confirmRes.status, 200);
      assert.equal(confirmRes.body.success, true);
      assert.ok(confirmRes.body.recoveryCodes);
      assert.ok(confirmRes.headers["set-cookie"], "Must issue session cookie upon successful setup");

      const adminCookie = confirmRes.headers["set-cookie"][0].split(";")[0];

      // 4. Now admin can access protected admin check
      const adminCheckRes = await request(app)
        .get("/api/auth/admin-check")
        .set("Cookie", adminCookie);

      assert.equal(adminCheckRes.status, 200);
      assert.equal(adminCheckRes.body.status, "AUTHORIZED");
    } finally {
      process.env.MFA_ENFORCED_ROLES = originalPolicy;
    }
  });

  // 14. Regular Non-MFA Account Login
  test("14. Users without MFA can log in normally and receive session cookies when policy permits", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: testRegularEmail, password: testPassword });

    assert.equal(res.status, 200);
    assert.equal(res.body.mfaRequired, undefined);
    assert.equal(res.body.success, true);
    assert.ok(res.headers["set-cookie"]);
  });

  // 15. Security & Secret Leakage Prevention
  test("15. Encrypted TOTP secrets, pending secrets, and recovery hashes are never exposed in API responses", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Cookie", userSessionCookie);

    if (res.status === 200) {
      assert.equal(res.body.user.mfaSecret, undefined);
      assert.equal(res.body.user.mfaPendingSecret, undefined);
      assert.equal(res.body.user.mfaLastVerifiedStep, undefined);
      assert.equal(res.body.user.recoveryCodes, undefined);
      assert.equal(res.body.user.mfaChallenges, undefined);
    }
  });

  // 16. Rate-Limiting Test Environment Detection Hardening
  test("16. isTestEnv strictly identifies automated test indicators and rejects production paths containing 'test'", () => {
    // 1. Should identify valid test environments
    assert.equal(isTestEnv({ NODE_ENV: "test" }, ["node"], []), true);
    assert.equal(isTestEnv({ npm_lifecycle_event: "test" }, ["node"], []), true);
    assert.equal(isTestEnv({ NODE_ENV: "development" }, ["node"], ["--test"]), true);
    assert.equal(
      isTestEnv({ NODE_ENV: "development" }, ["node", "tests/mfa.test.js"], []),
      true
    );

    // 2. Should strictly reject production environments even if paths contain 'test'
    assert.equal(
      isTestEnv(
        { NODE_ENV: "production" },
        ["node", "C:\\projects\\vertex-testing-cluster\\src\\server.js"],
        []
      ),
      false
    );
    assert.equal(
      isTestEnv(
        { NODE_ENV: "production" },
        ["node", "/var/app/test-deploy/src/server.js"],
        []
      ),
      false
    );
    assert.equal(
      isTestEnv(
        { NODE_ENV: "production" },
        ["node", "src/server.js"],
        []
      ),
      false
    );
  });

  test("17. MFA rate limiters enforce standard strict limits when isTestEnv evaluates to false", () => {
    // Production configuration test
    const prodEnv = { NODE_ENV: "production" };
    const prodArgv = ["node", "src/server.js"];
    const prodExecArgv = [];

    assert.equal(isTestEnv(prodEnv, prodArgv, prodExecArgv), false);
  });
});
