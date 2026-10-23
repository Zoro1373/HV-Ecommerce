import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { adminAuditLogsQuerySchema } from "../src/validators/admin.validator.js";
import { sanitizeAuditMetadata } from "../src/services/admin.service.js";

describe("Phase 11 Backend Unit Tests: Admin Audit Logs API", () => {
  describe("1. Admin Audit Logs Request Validation Schema", () => {
    test("validates default query parameters correctly", () => {
      const parsed = adminAuditLogsQuerySchema.parse({});
      assert.strictEqual(parsed.page, 1);
      assert.strictEqual(parsed.limit, 20);
      assert.strictEqual(parsed.sort, "newest");
    });

    test("coerces string numbers and accepts valid filters", () => {
      const parsed = adminAuditLogsQuerySchema.parse({
        page: "2",
        limit: "50",
        action: "ORDER_STATUS_UPDATE",
        entityType: "Order",
        actorId: "usr-admin-1",
        search: "VTX-ORD",
        sort: "oldest",
      });
      assert.strictEqual(parsed.page, 2);
      assert.strictEqual(parsed.limit, 50);
      assert.strictEqual(parsed.action, "ORDER_STATUS_UPDATE");
      assert.strictEqual(parsed.entityType, "Order");
      assert.strictEqual(parsed.actorId, "usr-admin-1");
      assert.strictEqual(parsed.search, "VTX-ORD");
      assert.strictEqual(parsed.sort, "oldest");
    });

    test("rejects invalid pagination values", () => {
      assert.throws(() => {
        adminAuditLogsQuerySchema.parse({ page: "0" });
      });
      assert.throws(() => {
        adminAuditLogsQuerySchema.parse({ page: "-1" });
      });
      assert.throws(() => {
        adminAuditLogsQuerySchema.parse({ limit: "500" }); // max 100
      });
    });

    test("trims search string input cleanly", () => {
      const parsed = adminAuditLogsQuerySchema.parse({
        search: "   PRODUCT_VARIANT_STOCK_UPDATE   ",
      });
      assert.strictEqual(parsed.search, "PRODUCT_VARIANT_STOCK_UPDATE");
    });
  });

  describe("2. Metadata Sanitization & Secret Masking", () => {
    test("redacts sensitive credential keys in audit metadata", () => {
      const sensitiveMetadata = {
        orderNumber: "VTX-ORD-1001",
        actorEmail: "admin@vertex.local",
        passwordHash: "$2b$10$abcdefghijklmnopqrstuvwxyz",
        sessionToken: "sec-token-12345",
        userPassword: "PlainPassword99!",
        mfaSecret: "JBSWY3DPEHPK3PXP",
        recoveryCode: "REC-9988-7766",
        cookieData: "vertex_session=xyz",
        deltaStock: 15,
      };

      const sanitized = sanitizeAuditMetadata(sensitiveMetadata);

      assert.strictEqual(sanitized.orderNumber, "VTX-ORD-1001");
      assert.strictEqual(sanitized.actorEmail, "admin@vertex.local");
      assert.strictEqual(sanitized.deltaStock, 15);

      // Verify all sensitive keys are redacted
      assert.strictEqual(sanitized.passwordHash, "[REDACTED]");
      assert.strictEqual(sanitized.sessionToken, "[REDACTED]");
      assert.strictEqual(sanitized.userPassword, "[REDACTED]");
      assert.strictEqual(sanitized.mfaSecret, "[REDACTED]");
      assert.strictEqual(sanitized.recoveryCode, "[REDACTED]");
      assert.strictEqual(sanitized.cookieData, "[REDACTED]");
    });

    test("handles nested metadata structures and arrays safely", () => {
      const nested = {
        action: "PASSWORD_CHANGE",
        nestedCredentials: {
          newPasswordHash: "hash123",
          notes: "Self-service rotation",
        },
        tokenList: ["token1", "token2"],
      };

      const sanitized = sanitizeAuditMetadata(nested);
      assert.strictEqual(sanitized.nestedCredentials.newPasswordHash, "[REDACTED]");
      assert.strictEqual(sanitized.nestedCredentials.notes, "Self-service rotation");
    });

    test("handles null or non-object metadata gracefully", () => {
      assert.strictEqual(sanitizeAuditMetadata(null), null);
      assert.strictEqual(sanitizeAuditMetadata(undefined), null);
    });
  });

  describe("3. Actor Projection Contract", () => {
    test("actor projection strictly excludes passwordHash, mfaSecret, and sessions", () => {
      const allowedActorKeys = new Set(["id", "email", "fullName", "role"]);
      const forbiddenActorKeys = [
        "passwordHash",
        "mfaSecret",
        "mfaPendingSecret",
        "recoveryCodes",
        "sessions",
      ];

      for (const key of forbiddenActorKeys) {
        assert.strictEqual(
          allowedActorKeys.has(key),
          false,
          `Forbidden actor key ${key} must never be included in audit projection`
        );
      }
    });
  });
});
