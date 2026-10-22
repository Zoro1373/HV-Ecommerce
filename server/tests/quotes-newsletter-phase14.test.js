import test, { describe } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { app } from "../src/app.js";
import {
  createQuoteSchema,
  adminQuotesQuerySchema,
  adminQuoteParamSchema,
  updateQuoteSchema,
} from "../src/validators/quote.validator.js";
import {
  subscribeNewsletterSchema,
  adminNewsletterQuerySchema,
} from "../src/validators/newsletter.validator.js";
import { formatQuote } from "../src/services/quote.service.js";

describe("Phase 14 Backend Unit & Contract Tests: RFQ & Newsletter APIs", () => {
  describe("1. Commercial RFQ Validation Schemas", () => {
    test("validates valid quote submission payload", () => {
      const valid = createQuoteSchema.parse({
        contactName: "Dr. Vikram Sarabhai",
        email: "Vikram@Isro.gov.in ",
        phone: "+91 9876543210",
        companyName: "ISRO Propulsion Division",
        gstin: "29AAAAA0000A1Z5",
        productDetails: "Stainless Steel Hex Bolt (M8 x 50mm) - Box of 500",
        quantity: "500",
        message: "Requirement for cryogenic testing fixture assembly.",
      });

      assert.strictEqual(valid.contactName, "Dr. Vikram Sarabhai");
      assert.strictEqual(valid.email, "vikram@isro.gov.in"); // Normalized lowercase & trimmed
      assert.strictEqual(valid.phone, "+91 9876543210");
      assert.strictEqual(valid.quantity, 500); // Coerced to integer
      assert.strictEqual(valid.companyName, "ISRO Propulsion Division");
    });

    test("allows minimal valid quote payload without optional fields", () => {
      const minimal = createQuoteSchema.parse({
        contactName: "Aarav Sharma",
        email: "aarav@vertex.local",
        phone: "+91 9123456789",
        productDetails: "Arduino Uno R3 Microcontroller Board",
        quantity: 10,
      });

      assert.strictEqual(minimal.contactName, "Aarav Sharma");
      assert.strictEqual(minimal.quantity, 10);
      assert.strictEqual(minimal.companyName, undefined);
      assert.strictEqual(minimal.message, undefined);
    });

    test("rejects invalid emails in quote submission", () => {
      assert.throws(() => {
        createQuoteSchema.parse({
          contactName: "Test Buyer",
          email: "not-an-email",
          phone: "+91 9876543210",
          productDetails: "Hex Bolt",
          quantity: 10,
        });
      });
    });

    test("rejects zero or negative quantities", () => {
      assert.throws(() => {
        createQuoteSchema.parse({
          contactName: "Test Buyer",
          email: "test@example.com",
          phone: "+91 9876543210",
          productDetails: "Hex Bolt",
          quantity: 0,
        });
      });

      assert.throws(() => {
        createQuoteSchema.parse({
          contactName: "Test Buyer",
          email: "test@example.com",
          phone: "+91 9876543210",
          productDetails: "Hex Bolt",
          quantity: -5,
        });
      });
    });

    test("rejects missing required fields (contactName, productDetails, phone)", () => {
      assert.throws(() => {
        createQuoteSchema.parse({
          email: "test@example.com",
          phone: "+91 9876543210",
          quantity: 10,
        });
      });

      assert.throws(() => {
        createQuoteSchema.parse({
          contactName: "Test",
          email: "test@example.com",
          quantity: 10,
        });
      });
    });

    test("validates admin quotes query schema defaults and filters", () => {
      const defaults = adminQuotesQuerySchema.parse({});
      assert.strictEqual(defaults.page, 1);
      assert.strictEqual(defaults.limit, 10);

      const filtered = adminQuotesQuerySchema.parse({
        page: "2",
        limit: "25",
        status: "UNDER_REVIEW",
        search: "Propulsion",
      });
      assert.strictEqual(filtered.page, 2);
      assert.strictEqual(filtered.limit, 25);
      assert.strictEqual(filtered.status, "UNDER_REVIEW");
      assert.strictEqual(filtered.search, "Propulsion");
    });

    test("validates update quote schema and rejects empty payload", () => {
      const validUpdate = updateQuoteSchema.parse({
        status: "QUOTED",
        adminNotes: "Dispatched proposal with 15% volume discount.",
        quotedAmount: "45000.50",
      });
      assert.strictEqual(validUpdate.status, "QUOTED");
      assert.strictEqual(validUpdate.quotedAmount, 45000.5);

      assert.throws(() => {
        updateQuoteSchema.parse({});
      }, /At least one update field/);

      assert.throws(() => {
        updateQuoteSchema.parse({
          quotedAmount: -100,
        });
      });
    });
  });

  describe("2. Newsletter Validation Schemas", () => {
    test("validates and normalizes valid email for newsletter", () => {
      const valid = subscribeNewsletterSchema.parse({
        email: "  TechBuyer@Company.CO.IN  ",
      });
      assert.strictEqual(valid.email, "techbuyer@company.co.in");
    });

    test("rejects malformed email for newsletter", () => {
      assert.throws(() => {
        subscribeNewsletterSchema.parse({ email: "invalid-email" });
      });

      assert.throws(() => {
        subscribeNewsletterSchema.parse({ email: "" });
      });
    });

    test("validates admin newsletter query schema defaults", () => {
      const defaults = adminNewsletterQuerySchema.parse({});
      assert.strictEqual(defaults.page, 1);
      assert.strictEqual(defaults.limit, 20);
    });
  });

  describe("3. Security & Access Control Boundaries", () => {
    test("POST /api/quotes rejects invalid payload with 400 VALIDATION_ERROR", async () => {
      const res = await request(app)
        .post("/api/quotes")
        .send({ email: "invalid" })
        .set("Content-Type", "application/json");

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.error?.code, "VALIDATION_ERROR");
    });

    test("POST /api/newsletter/subscribe rejects malformed email with 400 VALIDATION_ERROR", async () => {
      const res = await request(app)
        .post("/api/newsletter/subscribe")
        .send({ email: "not-an-email" })
        .set("Content-Type", "application/json");

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.error?.code, "VALIDATION_ERROR");
    });

    test("GET /api/admin/quotes strictly enforces authentication (401 UNAUTHORIZED)", async () => {
      const res = await request(app)
        .get("/api/admin/quotes")
        .set("X-Requested-With", "XMLHttpRequest");

      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.error?.code, "UNAUTHORIZED");
    });

    test("GET /api/admin/quotes/:id strictly enforces authentication (401 UNAUTHORIZED)", async () => {
      const res = await request(app)
        .get("/api/admin/quotes/rfq-uuid-test")
        .set("X-Requested-With", "XMLHttpRequest");

      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.error?.code, "UNAUTHORIZED");
    });

    test("PATCH /api/admin/quotes/:id strictly enforces authentication (401 UNAUTHORIZED)", async () => {
      const res = await request(app)
        .patch("/api/admin/quotes/rfq-uuid-test")
        .send({ status: "QUOTED" })
        .set("X-Requested-With", "XMLHttpRequest");

      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.error?.code, "UNAUTHORIZED");
    });

    test("GET /api/admin/newsletter strictly enforces authentication (401 UNAUTHORIZED)", async () => {
      const res = await request(app)
        .get("/api/admin/newsletter")
        .set("X-Requested-With", "XMLHttpRequest");

      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.error?.code, "UNAUTHORIZED");
    });
  });

  describe("4. Serializer & Decimal Projection Contract", () => {
    test("formatQuote safely serializes Prisma Decimal and handles user profile", () => {
      const mockDbQuote = {
        id: "rfq-uuid-9988",
        userId: "usr-b2b-1",
        contactName: "Aditi Rao",
        email: "aditi@tataadvanced.com",
        phone: "+91 9988776655",
        companyName: "Tata Advanced Systems",
        gstin: "27AAAAA1234A1Z1",
        productDetails: "DC Motor Driver Module (L298N) - 250 Units",
        quantity: 250,
        message: "Bulk order for educational robotics kits.",
        status: "QUOTED",
        adminNotes: "Dispatched commercial quote with GST breakdown.",
        quotedAmount: 112500.0,
        createdAt: new Date("2026-10-22T10:00:00Z"),
        updatedAt: new Date("2026-10-22T11:00:00Z"),
        user: {
          id: "usr-b2b-1",
          fullName: "Aditi Rao",
          email: "aditi@tataadvanced.com",
          companyName: "Tata Advanced Systems",
          role: "B2B",
        },
      };

      const formatted = formatQuote(mockDbQuote);

      assert.strictEqual(formatted.id, "rfq-uuid-9988");
      assert.strictEqual(formatted.contactName, "Aditi Rao");
      assert.strictEqual(formatted.status, "QUOTED");
      assert.strictEqual(formatted.quotedAmount, 112500.0);
      assert.strictEqual(typeof formatted.quotedAmount, "number");
      assert.strictEqual(formatted.user.role, "B2B");
      assert.strictEqual(formatted.user.companyName, "Tata Advanced Systems");
    });

    test("formatQuote handles unassigned guest quotes without crashing", () => {
      const mockGuestQuote = {
        id: "rfq-uuid-1122",
        userId: null,
        contactName: "Guest Engineer",
        email: "engineer@freelance.org",
        phone: "+91 9876500000",
        companyName: null,
        gstin: null,
        productDetails: "Allen Countersunk Screws - 1000 Pcs",
        quantity: 1000,
        message: null,
        status: "PENDING",
        adminNotes: null,
        quotedAmount: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: null,
      };

      const formatted = formatQuote(mockGuestQuote);

      assert.strictEqual(formatted.id, "rfq-uuid-1122");
      assert.strictEqual(formatted.userId, null);
      assert.strictEqual(formatted.quotedAmount, null);
      assert.strictEqual(formatted.user, null);
    });
  });
});
