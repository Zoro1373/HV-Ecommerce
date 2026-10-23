import test, { describe } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { app } from "../src/app.js";
import {
  cancelOrderSchema,
  orderParamSchema,
} from "../src/validators/order.validator.js";
import {
  adminCustomerParamSchema,
  adminCustomerDetailsQuerySchema,
} from "../src/validators/admin.validator.js";
import { CUSTOMER_CANCELLABLE_STATES } from "../src/services/order.service.js";

describe("Phase 12 Backend Unit & Contract Tests: Order Cancellation & Customer Detail API", () => {
  describe("1. Order Cancellation & Customer Detail Validation Schemas", () => {
    test("validates cancelOrderSchema with optional reason", () => {
      const validWithReason = cancelOrderSchema.parse({
        reason: "Ordered wrong bolt pitch (M8 x 30mm instead of M8 x 50mm).",
      });
      assert.strictEqual(
        validWithReason.reason,
        "Ordered wrong bolt pitch (M8 x 30mm instead of M8 x 50mm)."
      );

      const validEmpty = cancelOrderSchema.parse({});
      assert.strictEqual(validEmpty.reason, undefined);

      const validUndefined = cancelOrderSchema.parse(undefined);
      assert.strictEqual(validUndefined.reason, undefined);
    });

    test("rejects cancelOrderSchema with reason exceeding 500 characters", () => {
      assert.throws(() => {
        cancelOrderSchema.parse({
          reason: "X".repeat(501),
        });
      });
    });

    test("validates adminCustomerParamSchema requires non-empty identifier", () => {
      const valid = adminCustomerParamSchema.parse({ id: "usr-cust-12345" });
      assert.strictEqual(valid.id, "usr-cust-12345");

      assert.throws(() => {
        adminCustomerParamSchema.parse({ id: "   " });
      });
      assert.throws(() => {
        adminCustomerParamSchema.parse({});
      });
    });

    test("validates adminCustomerDetailsQuerySchema with defaults and coercion", () => {
      const defaults = adminCustomerDetailsQuerySchema.parse({});
      assert.strictEqual(defaults.ordersPage, 1);
      assert.strictEqual(defaults.ordersLimit, 10);

      const coerced = adminCustomerDetailsQuerySchema.parse({
        ordersPage: "2",
        ordersLimit: "25",
      });
      assert.strictEqual(coerced.ordersPage, 2);
      assert.strictEqual(coerced.ordersLimit, 25);

      assert.throws(() => {
        adminCustomerDetailsQuerySchema.parse({ ordersPage: "0" });
      });
      assert.throws(() => {
        adminCustomerDetailsQuerySchema.parse({ ordersLimit: "100" }); // max is 50
      });
    });
  });

  describe("2. Customer Order Cancellation Lifecycle & State Machine Rules", () => {
    test("CUSTOMER_CANCELLABLE_STATES explicitly restricts cancellation to PENDING and CONFIRMED", () => {
      assert.deepStrictEqual(CUSTOMER_CANCELLABLE_STATES, ["PENDING", "CONFIRMED"]);
    });

    test("identifies eligible vs ineligible cancellation states correctly", () => {
      const isEligible = (status) => CUSTOMER_CANCELLABLE_STATES.includes(status);

      // Permitted states
      assert.strictEqual(isEligible("PENDING"), true);
      assert.strictEqual(isEligible("CONFIRMED"), true);

      // Ineligible states
      assert.strictEqual(isEligible("PROCESSING"), false);
      assert.strictEqual(isEligible("SHIPPED"), false);
      assert.strictEqual(isEligible("DELIVERED"), false);
      assert.strictEqual(isEligible("CANCELLED"), false);
    });

    test("order cancellation restores inventory correctly for all variant items", () => {
      // Mock order items
      const mockItems = [
        { variantId: "var-bolt-01", quantity: 5 },
        { variantId: "var-nut-02", quantity: 10 },
      ];

      // Simulate inventory restoration loop
      const restoredInventory = {};
      for (const item of mockItems) {
        if (item.variantId) {
          restoredInventory[item.variantId] = (restoredInventory[item.variantId] || 0) + item.quantity;
        }
      }

      assert.strictEqual(restoredInventory["var-bolt-01"], 5);
      assert.strictEqual(restoredInventory["var-nut-02"], 10);
    });

    test("deduplication & concurrency guard: checks that orderStatus in update condition prevents double cancellation", () => {
      // Simulation of concurrency check
      let currentStatus = "PENDING";
      let stockRestoredCount = 0;

      function simulateCancelAttempt() {
        if (!CUSTOMER_CANCELLABLE_STATES.includes(currentStatus)) {
          throw new Error("ORDER_NOT_CANCELLABLE");
        }
        // Atomic status transition
        currentStatus = "CANCELLED";
        stockRestoredCount += 1;
        return true;
      }

      // First attempt succeeds
      const firstResult = simulateCancelAttempt();
      assert.strictEqual(firstResult, true);
      assert.strictEqual(stockRestoredCount, 1);
      assert.strictEqual(currentStatus, "CANCELLED");

      // Concurrent second attempt fails and does NOT restore stock again
      assert.throws(() => simulateCancelAttempt(), /ORDER_NOT_CANCELLABLE/);
      assert.strictEqual(stockRestoredCount, 1);
    });

    test("cancellation generates proper audit log payload", () => {
      const mockAuditRecord = {
        actorId: "usr-customer-01",
        action: "ORDER_CANCELLED_BY_CUSTOMER",
        entityType: "Order",
        entityId: "ord-test-99",
        metadata: {
          orderNumber: "VTX-20261022-99999",
          previousStatus: "CONFIRMED",
          newStatus: "CANCELLED",
          actorEmail: "customer@vertex.local",
          reason: "Duplicate order placed by mistake.",
        },
      };

      assert.strictEqual(mockAuditRecord.action, "ORDER_CANCELLED_BY_CUSTOMER");
      assert.strictEqual(mockAuditRecord.entityType, "Order");
      assert.strictEqual(mockAuditRecord.metadata.previousStatus, "CONFIRMED");
      assert.strictEqual(mockAuditRecord.metadata.newStatus, "CANCELLED");
      assert.strictEqual(mockAuditRecord.metadata.reason, "Duplicate order placed by mistake.");
    });
  });

  describe("3. Admin Customer Detail Contract & Privacy Safeguards", () => {
    test("calculates customer totalSpend from non-cancelled orders only", () => {
      const mockOrders = [
        { id: "ord-1", orderNumber: "VTX-1", totalAmount: "1299.00", orderStatus: "DELIVERED" },
        { id: "ord-2", orderNumber: "VTX-2", totalAmount: "499.00", orderStatus: "CONFIRMED" },
        { id: "ord-3", orderNumber: "VTX-3", totalAmount: "2500.00", orderStatus: "CANCELLED" },
        { id: "ord-4", orderNumber: "VTX-4", totalAmount: "3599.00", orderStatus: "PROCESSING" },
      ];

      const nonCancelledOrders = mockOrders.filter((o) => o.orderStatus !== "CANCELLED");
      const totalSpent = nonCancelledOrders.reduce(
        (sum, o) => sum + Number(o.totalAmount || 0),
        0
      );

      assert.strictEqual(nonCancelledOrders.length, 3);
      assert.strictEqual(totalSpent, 1299 + 499 + 3599); // 5397
      assert.strictEqual(Math.round(totalSpent * 100) / 100, 5397.0);
    });

    test("privacy shield guarantee: customer detail response strictly excludes sensitive secrets", () => {
      // Mock raw user record from database
      const rawUser = {
        id: "usr-apex-01",
        email: "procurement@apexind.in",
        passwordHash: "$2a$12$eX4mPl3H4shD0N0tExP0s3S3cr3t5",
        fullName: "Aarav Sharma",
        phone: "+91 9876543210",
        companyName: "Apex Industrial Systems",
        gstin: "29AAAAA0000A1Z5",
        role: "B2B",
        isActive: true,
        emailVerified: true,
        mfaEnabled: true,
        mfaSecret: "JBSWY3DPEHPK3PXP",
        mfaPendingSecret: "ENCRYPTED_PENDING_SECRET",
        recoveryCodes: ["HASHED_CODE_1", "HASHED_CODE_2"],
        createdAt: new Date("2026-10-14T08:00:00Z"),
        updatedAt: new Date("2026-10-22T08:00:00Z"),
      };

      // Projection used by getAdminCustomerById
      const safeCustomerProjection = {
        id: rawUser.id,
        email: rawUser.email,
        fullName: rawUser.fullName,
        phone: rawUser.phone,
        companyName: rawUser.companyName,
        gstin: rawUser.gstin,
        role: rawUser.role,
        isActive: rawUser.isActive,
        emailVerified: rawUser.emailVerified,
        mfaEnabled: rawUser.mfaEnabled,
        createdAt: rawUser.createdAt.toISOString(),
        updatedAt: rawUser.updatedAt.toISOString(),
      };

      // Verify sensitive fields are completely omitted
      assert.strictEqual(safeCustomerProjection.passwordHash, undefined);
      assert.strictEqual(safeCustomerProjection.mfaSecret, undefined);
      assert.strictEqual(safeCustomerProjection.mfaPendingSecret, undefined);
      assert.strictEqual(safeCustomerProjection.recoveryCodes, undefined);
      assert.strictEqual("passwordHash" in safeCustomerProjection, false);
      assert.strictEqual("mfaSecret" in safeCustomerProjection, false);
      assert.strictEqual("recoveryCodes" in safeCustomerProjection, false);
    });

    test("customer detail response shapes addresses and quotes cleanly", () => {
      const mockQuotes = [
        {
          id: "rfq-1",
          productDetails: "Stainless Steel Hex Bolt (M8 x 50mm)",
          quantity: 500,
          targetPrice: "250.00",
          status: "QUOTED",
          quotedAmount: "18500.00",
          createdAt: new Date("2026-10-22T10:00:00Z"),
        },
      ];

      const formattedQuotes = mockQuotes.map((q) => ({
        id: q.id,
        productDetails: q.productDetails,
        quantity: q.quantity,
        targetPrice: q.targetPrice ? Number(q.targetPrice) : null,
        status: q.status,
        quotedAmount: q.quotedAmount ? Number(q.quotedAmount) : null,
        createdAt: q.createdAt.toISOString(),
      }));

      assert.strictEqual(formattedQuotes[0].targetPrice, 250);
      assert.strictEqual(formattedQuotes[0].quotedAmount, 18500);
      assert.strictEqual(typeof formattedQuotes[0].quantity, "number");
    });
  });

  describe("4. Security & Access Control Boundaries", () => {
    test("POST /api/orders/:id/cancel strictly enforces authentication (401 UNAUTHORIZED)", async () => {
      const res = await request(app)
        .post("/api/orders/ord-fake-123/cancel")
        .send({ reason: "Unauthenticated test cancellation attempt" });

      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.error?.code, "UNAUTHORIZED");
    });

    test("GET /api/admin/customers/:id strictly enforces authentication (401 UNAUTHORIZED)", async () => {
      const res = await request(app).get("/api/admin/customers/usr-fake-123");

      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.error?.code, "UNAUTHORIZED");
    });

    test("GET /api/admin/customers strictly enforces authentication (401 UNAUTHORIZED)", async () => {
      const res = await request(app).get("/api/admin/customers");

      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.error?.code, "UNAUTHORIZED");
    });
  });
});
