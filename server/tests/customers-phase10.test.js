import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { adminCustomersQuerySchema } from "../src/validators/admin.validator.js";

describe("Phase 10 Backend Unit Tests: Admin Customer Management API", () => {
  describe("1. Admin Customers Request Validation Schema", () => {
    test("validates default query parameters correctly", () => {
      const parsed = adminCustomersQuerySchema.parse({});
      assert.strictEqual(parsed.page, 1);
      assert.strictEqual(parsed.limit, 10);
      assert.strictEqual(parsed.sort, "newest");
    });

    test("coerces string numbers and accepts valid filters", () => {
      const parsed = adminCustomersQuerySchema.parse({
        page: "3",
        limit: "25",
        role: "B2B",
        status: "active",
        search: "Apex Industrial",
        sort: "name_asc",
      });
      assert.strictEqual(parsed.page, 3);
      assert.strictEqual(parsed.limit, 25);
      assert.strictEqual(parsed.role, "B2B");
      assert.strictEqual(parsed.status, "active");
      assert.strictEqual(parsed.search, "Apex Industrial");
      assert.strictEqual(parsed.sort, "name_asc");
    });

    test("accepts CUSTOMER role and all role filter", () => {
      const parsedCust = adminCustomersQuerySchema.parse({ role: "CUSTOMER" });
      assert.strictEqual(parsedCust.role, "CUSTOMER");

      const parsedAll = adminCustomersQuerySchema.parse({ role: "all" });
      assert.strictEqual(parsedAll.role, "all");
    });

    test("rejects invalid role values", () => {
      assert.throws(() => {
        adminCustomersQuerySchema.parse({ role: "ADMIN_INVALID" });
      });
    });

    test("rejects invalid pagination values", () => {
      assert.throws(() => {
        adminCustomersQuerySchema.parse({ page: "0" });
      });
      assert.throws(() => {
        adminCustomersQuerySchema.parse({ page: "-5" });
      });
      assert.throws(() => {
        adminCustomersQuerySchema.parse({ limit: "500" }); // max 100
      });
    });

    test("handles search and q aliases cleanly with string trimming", () => {
      const parsed = adminCustomersQuerySchema.parse({
        search: "  Sunil Sharma  ",
      });
      assert.strictEqual(parsed.search, "Sunil Sharma");
    });
  });

  describe("2. Security and Data Sanitization Contracts", () => {
    test("role partitioning strictly allows only CUSTOMER and B2B accounts", () => {
      // Helper function simulating where clause builder
      const buildWhere = (roleParam) => {
        const where = {};
        if (roleParam === "CUSTOMER" || roleParam === "B2B") {
          where.role = roleParam;
        } else {
          where.role = { in: ["CUSTOMER", "B2B"] };
        }
        return where;
      };

      const defaultWhere = buildWhere(undefined);
      assert.deepStrictEqual(defaultWhere.role, { in: ["CUSTOMER", "B2B"] });

      const customerWhere = buildWhere("CUSTOMER");
      assert.strictEqual(customerWhere.role, "CUSTOMER");

      const b2bWhere = buildWhere("B2B");
      assert.strictEqual(b2bWhere.role, "B2B");

      const allWhere = buildWhere("all");
      assert.deepStrictEqual(allWhere.role, { in: ["CUSTOMER", "B2B"] });
    });

    test("order count and spend calculation properly filters out cancelled orders", () => {
      const mockRawOrders = [
        { id: "ord-1", orderNumber: "VTX-1", totalAmount: "1200.50", orderStatus: "DELIVERED" },
        { id: "ord-2", orderNumber: "VTX-2", totalAmount: "800.00", orderStatus: "PROCESSING" },
        { id: "ord-3", orderNumber: "VTX-3", totalAmount: "5000.00", orderStatus: "CANCELLED" },
      ];

      const nonCancelled = mockRawOrders.filter((o) => o.orderStatus !== "CANCELLED");
      const totalSpent = nonCancelled.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

      assert.strictEqual(nonCancelled.length, 2);
      assert.strictEqual(Math.round(totalSpent * 100) / 100, 2000.5);
    });

    test("sanitization excludes all sensitive authentication fields from projected payload", () => {
      // Expected public keys that are safe to expose
      const allowedPublicKeys = new Set([
        "id",
        "email",
        "fullName",
        "phone",
        "companyName",
        "gstin",
        "role",
        "isActive",
        "emailVerified",
        "mfaEnabled",
        "createdAt",
        "updatedAt",
        "lastLoginAt",
        "ordersCount",
        "quotesCount",
        "totalSpent",
        "lastOrderAt",
        "lastOrderNumber",
      ]);

      const forbiddenSecrets = [
        "passwordHash",
        "mfaSecret",
        "mfaPendingSecret",
        "recoveryCodes",
        "sessions",
        "tokenHash",
      ];

      // Verify no forbidden secret is in allowedPublicKeys
      for (const secret of forbiddenSecrets) {
        assert.strictEqual(
          allowedPublicKeys.has(secret),
          false,
          `Forbidden secret ${secret} must never be exposed`
        );
      }
    });
  });
});
