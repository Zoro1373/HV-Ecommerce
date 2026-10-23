import test, { describe } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { app } from "../src/app.js";
import { formatOrder } from "../src/utils/orderSerializer.js";
import {
  ALLOWED_STATUS_TRANSITIONS,
  validateStatusTransition,
} from "../src/services/admin.service.js";
import {
  adminOrdersQuerySchema,
  adminOrderParamSchema,
  updateOrderStatusSchema,
} from "../src/validators/admin.validator.js";

describe("Phase 9 Backend Unit Tests: Admin Orders & Fulfillment Lifecycle", () => {
  describe("1. Fulfillment State Machine & Status Transitions", () => {
    test("allows valid forward transitions from PENDING", () => {
      assert.strictEqual(validateStatusTransition("PENDING", "CONFIRMED"), true);
      assert.strictEqual(validateStatusTransition("PENDING", "PROCESSING"), true);
      assert.strictEqual(validateStatusTransition("PENDING", "CANCELLED"), true);
    });

    test("allows valid forward transitions from CONFIRMED", () => {
      assert.strictEqual(validateStatusTransition("CONFIRMED", "PROCESSING"), true);
      assert.strictEqual(validateStatusTransition("CONFIRMED", "SHIPPED"), true);
      assert.strictEqual(validateStatusTransition("CONFIRMED", "CANCELLED"), true);
    });

    test("allows valid forward transitions from PROCESSING", () => {
      assert.strictEqual(validateStatusTransition("PROCESSING", "SHIPPED"), true);
      assert.strictEqual(validateStatusTransition("PROCESSING", "CANCELLED"), true);
    });

    test("allows valid forward transitions from SHIPPED", () => {
      assert.strictEqual(validateStatusTransition("SHIPPED", "DELIVERED"), true);
      assert.strictEqual(validateStatusTransition("SHIPPED", "CANCELLED"), true);
    });

    test("allows self-transitions (metadata updates) without changing status", () => {
      assert.strictEqual(validateStatusTransition("PENDING", "PENDING"), true);
      assert.strictEqual(validateStatusTransition("CONFIRMED", "CONFIRMED"), true);
      assert.strictEqual(validateStatusTransition("SHIPPED", "SHIPPED"), true);
      assert.strictEqual(validateStatusTransition("DELIVERED", "DELIVERED"), true);
      assert.strictEqual(validateStatusTransition("CANCELLED", "CANCELLED"), true);
    });

    test("rejects invalid skipping transitions (e.g., PENDING directly to DELIVERED)", () => {
      assert.throws(
        () => validateStatusTransition("PENDING", "DELIVERED"),
        (err) => {
          assert.strictEqual(err.code, "INVALID_STATUS_TRANSITION");
          assert.strictEqual(err.status, 400);
          return true;
        }
      );
    });

    test("rejects invalid backward transitions (e.g., SHIPPED back to PENDING)", () => {
      assert.throws(
        () => validateStatusTransition("SHIPPED", "PENDING"),
        (err) => {
          assert.strictEqual(err.code, "INVALID_STATUS_TRANSITION");
          assert.strictEqual(err.status, 400);
          return true;
        }
      );
    });

    test("rejects transitions out of terminal states (DELIVERED)", () => {
      assert.throws(
        () => validateStatusTransition("DELIVERED", "CANCELLED"),
        (err) => {
          assert.strictEqual(err.code, "INVALID_STATUS_TRANSITION");
          assert.strictEqual(err.status, 400);
          return true;
        }
      );
    });

    test("rejects transitions out of terminal states (CANCELLED)", () => {
      assert.throws(
        () => validateStatusTransition("CANCELLED", "CONFIRMED"),
        (err) => {
          assert.strictEqual(err.code, "INVALID_STATUS_TRANSITION");
          assert.strictEqual(err.status, 400);
          return true;
        }
      );
    });
  });

  describe("2. Admin Orders Request Validation Schemas", () => {
    test("validates adminOrdersQuerySchema defaults and valid parameters", () => {
      const parsed = adminOrdersQuerySchema.parse({});
      assert.strictEqual(parsed.page, 1);
      assert.strictEqual(parsed.limit, 10);
      assert.strictEqual(parsed.sort, "newest");

      const filtered = adminOrdersQuerySchema.parse({
        page: "2",
        limit: "25",
        status: "PROCESSING",
        paymentStatus: "PAID",
        search: "VTX-ORD",
        sort: "total_desc",
      });
      assert.strictEqual(filtered.page, 2);
      assert.strictEqual(filtered.limit, 25);
      assert.strictEqual(filtered.status, "PROCESSING");
      assert.strictEqual(filtered.paymentStatus, "PAID");
      assert.strictEqual(filtered.search, "VTX-ORD");
      assert.strictEqual(filtered.sort, "total_desc");
    });

    test("rejects invalid query parameters", () => {
      assert.throws(() => {
        adminOrdersQuerySchema.parse({ status: "UNKNOWN_STATUS" });
      });
      assert.throws(() => {
        adminOrdersQuerySchema.parse({ page: "-1" });
      });
      assert.throws(() => {
        adminOrdersQuerySchema.parse({ limit: "999" }); // max 100
      });
    });

    test("validates adminOrderParamSchema identifier", () => {
      const valid = adminOrderParamSchema.parse({ id: "ord-uuid-12345" });
      assert.strictEqual(valid.id, "ord-uuid-12345");

      assert.throws(() => {
        adminOrderParamSchema.parse({ id: "" });
      });
    });

    test("validates updateOrderStatusSchema payload", () => {
      const valid = updateOrderStatusSchema.parse({
        orderStatus: "SHIPPED",
        carrier: "Blue Dart",
        trackingNumber: "BLD-12345678",
        notes: "Package handed over to courier hub",
      });
      assert.strictEqual(valid.orderStatus, "SHIPPED");
      assert.strictEqual(valid.carrier, "Blue Dart");
      assert.strictEqual(valid.trackingNumber, "BLD-12345678");

      // Allows optional fields as null/undefined
      const minimal = updateOrderStatusSchema.parse({
        orderStatus: "CONFIRMED",
      });
      assert.strictEqual(minimal.orderStatus, "CONFIRMED");

      // Rejects invalid enum value
      assert.throws(() => {
        updateOrderStatusSchema.parse({
          orderStatus: "INVALID_STATUS",
        });
      });
    });
  });

  describe("3. Admin Single-Order Retrieval API (GET /api/admin/orders/:id)", () => {
    test("supports both UUIDs and human-readable order numbers as valid identifiers", () => {
      // UUID format
      const parsedUuid = adminOrderParamSchema.parse({ id: "e5b7d8c0-1234-4567-89ab-cdef01234567" });
      assert.strictEqual(parsedUuid.id, "e5b7d8c0-1234-4567-89ab-cdef01234567");

      // Human-readable orderNumber formats
      const parsedOrderNum1 = adminOrderParamSchema.parse({ id: "VTX-20261022-77112" });
      assert.strictEqual(parsedOrderNum1.id, "VTX-20261022-77112");

      const parsedOrderNum2 = adminOrderParamSchema.parse({ id: "VTX-ORD-9001" });
      assert.strictEqual(parsedOrderNum2.id, "VTX-ORD-9001");

      const parsedMockNum = adminOrderParamSchema.parse({ id: "MOCK-104928" });
      assert.strictEqual(parsedMockNum.id, "MOCK-104928");
    });

    test("rejects invalid, empty, or whitespace-only order identifiers", () => {
      assert.throws(() => {
        adminOrderParamSchema.parse({ id: "" });
      });

      assert.throws(() => {
        adminOrderParamSchema.parse({ id: "   " });
      });

      assert.throws(() => {
        adminOrderParamSchema.parse({});
      });
    });

    test("enforces unauthenticated access rejection on GET /api/admin/orders/:id", async () => {
      const res = await request(app)
        .get("/api/admin/orders/VTX-ORD-9001")
        .set("X-Requested-With", "XMLHttpRequest");

      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.error?.code, "UNAUTHORIZED");
    });

    test("customer endpoint GET /api/orders/:id also enforces authentication", async () => {
      const res = await request(app)
        .get("/api/orders/VTX-ORD-9001")
        .set("X-Requested-With", "XMLHttpRequest");

      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.error?.code, "UNAUTHORIZED");
    });

    test("verifies single-order projection contract includes all administrative fields", () => {
      const mockDbOrder = {
        id: "ord-test-uuid-8899",
        orderNumber: "VTX-20261022-55443",
        userId: "usr-customer-123",
        orderStatus: "PROCESSING",
        paymentStatus: "PAID",
        paymentMethod: "RAZORPAY",
        paymentId: "pay_xyz123456",
        subtotal: 2598.0,
        taxAmount: 467.64,
        shippingFee: 0.0,
        totalAmount: 3065.64,
        shippingRecipient: "Sunil Sharma",
        shippingPhone: "+91 9876543210",
        shippingLine1: "Industrial Plot 42, Peenya Phase 2",
        shippingLine2: "Near Metro Depot",
        shippingCity: "Bengaluru",
        shippingState: "Karnataka",
        shippingPostalCode: "560058",
        shippingCountry: "India",
        trackingNumber: "BLD-99887766",
        carrier: "Blue Dart Express",
        notes: "Fragile precision fasteners - handle with care",
        createdAt: new Date("2026-10-22T10:00:00Z"),
        updatedAt: new Date("2026-10-22T10:30:00Z"),
        items: [
          {
            id: "item-1",
            orderId: "ord-test-uuid-8899",
            variantId: "var-1",
            productName: "Stainless Steel Hex Bolt",
            variantName: "M8 x 50mm",
            sku: "FAST-HEX-M8-50",
            packSize: "Box of 100",
            hsnCode: "7318",
            gstRate: 18.0,
            quantity: 2,
            unitPrice: 1299.0,
            taxAmount: 467.64,
            lineTotal: 3065.64,
            createdAt: new Date("2026-10-22T10:00:00Z"),
          },
        ],
        user: {
          id: "usr-customer-123",
          email: "sunil.sharma@apexind.in",
          fullName: "Sunil Sharma",
          companyName: "Apex Industrial Systems",
          role: "B2B",
        },
      };

      const formatted = formatOrder(mockDbOrder);
      formatted.shippingRecipient = mockDbOrder.shippingRecipient;
      formatted.shippingPhone = mockDbOrder.shippingPhone;
      formatted.shippingLine1 = mockDbOrder.shippingLine1;
      formatted.shippingLine2 = mockDbOrder.shippingLine2;
      formatted.shippingCity = mockDbOrder.shippingCity;
      formatted.shippingState = mockDbOrder.shippingState;
      formatted.shippingPostalCode = mockDbOrder.shippingPostalCode;
      formatted.shippingCountry = mockDbOrder.shippingCountry;

      if (mockDbOrder.user) {
        formatted.customer = {
          id: mockDbOrder.user.id,
          email: mockDbOrder.user.email,
          fullName: mockDbOrder.user.fullName,
          companyName: mockDbOrder.user.companyName,
          role: mockDbOrder.user.role,
        };
      }

      // Verify top-level order telemetry
      assert.strictEqual(formatted.id, "ord-test-uuid-8899");
      assert.strictEqual(formatted.orderNumber, "VTX-20261022-55443");
      assert.strictEqual(formatted.orderStatus, "PROCESSING");
      assert.strictEqual(formatted.paymentStatus, "PAID");
      assert.strictEqual(formatted.paymentMethod, "RAZORPAY");
      assert.strictEqual(formatted.totalAmount, 3065.64);

      // Verify shipping details (both nested and flat)
      assert.strictEqual(formatted.shippingAddress.recipientName, "Sunil Sharma");
      assert.strictEqual(formatted.shippingAddress.city, "Bengaluru");
      assert.strictEqual(formatted.shippingRecipient, "Sunil Sharma");
      assert.strictEqual(formatted.shippingCity, "Bengaluru");

      // Verify carrier and tracking
      assert.strictEqual(formatted.carrier, "Blue Dart Express");
      assert.strictEqual(formatted.trackingNumber, "BLD-99887766");
      assert.strictEqual(formatted.notes, "Fragile precision fasteners - handle with care");

      // Verify customer identity
      assert.strictEqual(formatted.customer.email, "sunil.sharma@apexind.in");
      assert.strictEqual(formatted.customer.fullName, "Sunil Sharma");
      assert.strictEqual(formatted.customer.companyName, "Apex Industrial Systems");
      assert.strictEqual(formatted.customer.role, "B2B");

      // Verify items snapshot
      assert.strictEqual(formatted.items.length, 1);
      assert.strictEqual(formatted.items[0].sku, "FAST-HEX-M8-50");
      assert.strictEqual(formatted.items[0].productName, "Stainless Steel Hex Bolt");
      assert.strictEqual(formatted.items[0].quantity, 2);
      assert.strictEqual(formatted.items[0].unitPrice, 1299.0);
      assert.strictEqual(formatted.items[0].lineTotal, 3065.64);
    });
  });
});

