import test, { describe, before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { app } from "../src/app.js";
import { prisma } from "../src/config/db.js";
import {
  hashPassword,
  hashToken,
  generateSessionToken,
} from "../src/utils/crypto.js";

describe("Admin Backend Phase 1: Products, Categories & Inventory Test Suite", () => {
  const timestamp = Date.now();
  const testAdminEmail = `test.admin.${timestamp}@vertex.local`;
  const testCustomerEmail = `test.customer.${timestamp}@vertex.local`;
  const testPassword = "AdminSecurePass123!";

  let adminUser = null;
  let customerUser = null;
  let adminCookie = "";
  let customerCookie = "";

  // Test fixture identifiers
  const catSlug = `test-adm-cat-${timestamp}`;
  const prodSlug = `test-adm-prod-${timestamp}`;
  const variantSku = `TEST-ADM-SKU-${timestamp}`;
  let createdCategoryId = "";
  let createdProductId = "";
  let createdVariantId = "";

  before(async () => {
    const passwordHash = await hashPassword(testPassword);

    // 1. Create ADMIN user and active session
    adminUser = await prisma.user.create({
      data: {
        email: testAdminEmail,
        fullName: "Test Admin Engineer",
        passwordHash,
        role: "ADMIN",
        isActive: true,
      },
    });

    const adminToken = generateSessionToken();
    const adminTokenHash = hashToken(adminToken);
    await prisma.session.create({
      data: {
        userId: adminUser.id,
        tokenHash: adminTokenHash,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    adminCookie = `vertex_session=${adminToken}`;

    // 2. Create CUSTOMER user and active session (non-admin role)
    customerUser = await prisma.user.create({
      data: {
        email: testCustomerEmail,
        fullName: "Regular Customer",
        passwordHash,
        role: "CUSTOMER",
        isActive: true,
      },
    });

    const custToken = generateSessionToken();
    const custTokenHash = hashToken(custToken);
    await prisma.session.create({
      data: {
        userId: customerUser.id,
        tokenHash: custTokenHash,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    customerCookie = `vertex_session=${custToken}`;
  });

  after(async () => {
    // 1. Clean audit logs
    await prisma.auditLog.deleteMany({
      where: {
        OR: [
          { actorId: { in: [adminUser?.id, customerUser?.id].filter(Boolean) } },
          ...(createdVariantId ? [{ entityId: createdVariantId }] : []),
          ...(createdProductId ? [{ entityId: createdProductId }] : []),
          ...(createdCategoryId ? [{ entityId: createdCategoryId }] : []),
        ],
      },
    }).catch(() => {});

    // 2. Clean variants
    await prisma.productVariant.deleteMany({
      where: {
        OR: [
          { sku: { in: [variantSku, `DIFF-SKU-${timestamp}`] } },
          ...(createdProductId ? [{ productId: createdProductId }] : []),
        ],
      },
    }).catch(() => {});

    // 3. Clean products
    await prisma.product.deleteMany({
      where: {
        OR: [
          { slug: { in: [prodSlug, `diff-slug-${timestamp}`, `orphan-prod-${timestamp}`] } },
          ...(createdCategoryId ? [{ categoryId: createdCategoryId }] : []),
        ],
      },
    }).catch(() => {});

    // 4. Clean categories
    await prisma.category.deleteMany({
      where: { slug: catSlug },
    }).catch(() => {});

    // 5. Clean users & sessions
    if (adminUser || customerUser) {
      const userIds = [adminUser?.id, customerUser?.id].filter(Boolean);
      await prisma.session.deleteMany({
        where: { userId: { in: userIds } },
      }).catch(() => {});
      await prisma.user.deleteMany({
        where: { id: { in: userIds } },
      }).catch(() => {});
    }

    await prisma.$disconnect();
  });

  // 1. Unauthenticated Requests (401)
  test("1. Unauthenticated requests to admin routes return 401 UNAUTHORIZED", async () => {
    const endpoints = [
      { method: "post", url: "/api/admin/categories", body: { name: "Test" } },
      { method: "post", url: "/api/admin/products", body: { name: "Test" } },
      { method: "patch", url: "/api/admin/inventory/variants/any-id", body: { stockQuantity: 10, reason: "Audit" } },
    ];

    for (const ep of endpoints) {
      const res = await request(app)[ep.method](ep.url)
        .set("X-Requested-With", "XMLHttpRequest")
        .send(ep.body);

      assert.equal(res.status, 401, `Expected 401 for ${ep.method.toUpperCase()} ${ep.url}`);
      assert.equal(res.body.error.code, "UNAUTHORIZED");
    }
  });

  // 2. Non-Admin Requests (403)
  test("2. Customer role requests to admin routes return 403 FORBIDDEN", async () => {
    const endpoints = [
      { method: "post", url: "/api/admin/categories", body: { name: "Test", slug: "test" } },
      { method: "post", url: "/api/admin/products", body: { name: "Test", slug: "test" } },
      { method: "patch", url: "/api/admin/inventory/variants/any-id", body: { stockQuantity: 10, reason: "Audit" } },
    ];

    for (const ep of endpoints) {
      const res = await request(app)[ep.method](ep.url)
        .set("Cookie", customerCookie)
        .set("X-Requested-With", "XMLHttpRequest")
        .send(ep.body);

      assert.equal(res.status, 403, `Expected 403 for ${ep.method.toUpperCase()} ${ep.url}`);
      assert.equal(res.body.error.code, "FORBIDDEN");
    }
  });

  // 3. CSRF Protection (403)
  test("3. Requests with untrusted Origin header return 403 CSRF_ERROR", async () => {
    const res = await request(app)
      .post("/api/admin/categories")
      .set("Cookie", adminCookie)
      .set("Origin", "https://malicious-phishing-site.com")
      .send({ name: "Malicious Category", slug: "malicious-cat" });

    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, "CSRF_ERROR");
  });

  // 4. Invalid Input Validation (400)
  test("4. Invalid category input returns 400 VALIDATION_ERROR with field details", async () => {
    const res = await request(app)
      .post("/api/admin/categories")
      .set("Cookie", adminCookie)
      .set("X-Requested-With", "XMLHttpRequest")
      .send({
        name: "", // Empty name
        slug: "invalid slug with spaces!",
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, "VALIDATION_ERROR");
    assert.ok(Array.isArray(res.body.error.details));
    assert.ok(res.body.error.details.length >= 2);
  });

  // 5. Successful Category Creation (201)
  test("5. POST /api/admin/categories creates category and writes audit record", async () => {
    const res = await request(app)
      .post("/api/admin/categories")
      .set("Cookie", adminCookie)
      .set("X-Requested-With", "XMLHttpRequest")
      .send({
        name: `Automated Test Category ${timestamp}`,
        slug: catSlug,
        description: "Created via automated admin test suite",
        icon: "🔌",
        tint: "tint-green",
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.category.slug, catSlug);
    assert.ok(res.body.category.id);
    createdCategoryId = res.body.category.id;

    // Verify AuditLog record was created
    const audit = await prisma.auditLog.findFirst({
      where: {
        entityType: "Category",
        entityId: createdCategoryId,
        action: "CATEGORY_CREATE",
      },
    });
    assert.ok(audit, "AuditLog entry for CATEGORY_CREATE must exist");
    assert.equal(audit.actorId, adminUser.id);
  });

  // 6. Duplicate Category Slug (409)
  test("6. Duplicate category slug returns 409 DUPLICATE_IDENTIFIER", async () => {
    const res = await request(app)
      .post("/api/admin/categories")
      .set("Cookie", adminCookie)
      .set("X-Requested-With", "XMLHttpRequest")
      .send({
        name: "Duplicate Category Attempt",
        slug: catSlug, // Already used in test 5
      });

    assert.equal(res.status, 409);
    assert.equal(res.body.error.code, "DUPLICATE_IDENTIFIER");
  });

  // 7. Product Validation (400)
  test("7. Invalid product creation body returns 400 VALIDATION_ERROR", async () => {
    const res = await request(app)
      .post("/api/admin/products")
      .set("Cookie", adminCookie)
      .set("X-Requested-With", "XMLHttpRequest")
      .send({
        name: "Incomplete Product",
        slug: "incomplete-prod",
        // missing categoryId, price, sku
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, "VALIDATION_ERROR");
  });

  // 8. Product with Non-Existent Category (404)
  test("8. Product creation with non-existent category returns 404 CATEGORY_NOT_FOUND", async () => {
    const res = await request(app)
      .post("/api/admin/products")
      .set("Cookie", adminCookie)
      .set("X-Requested-With", "XMLHttpRequest")
      .send({
        name: "Orphan Product",
        slug: `orphan-prod-${timestamp}`,
        categoryId: "00000000-0000-0000-0000-000000000000",
        sku: `ORPHAN-SKU-${timestamp}`,
        price: 999.0,
      });

    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, "CATEGORY_NOT_FOUND");
  });

  // 9. Successful Product & Variant Creation in Prisma Transaction (201)
  test("9. POST /api/admin/products creates product & variant in atomic transaction", async () => {
    const res = await request(app)
      .post("/api/admin/products")
      .set("Cookie", adminCookie)
      .set("X-Requested-With", "XMLHttpRequest")
      .send({
        name: `Automated Test Board ${timestamp}`,
        slug: prodSlug,
        categoryId: createdCategoryId,
        brand: "VERTEX Robotics",
        hsnCode: "85423100",
        gstRate: 18.0,
        description: "Industrial test microcontroller board",
        sku: variantSku,
        partNumber: `PN-VTX-${timestamp}`,
        variantName: "Standard Industrial Edition",
        price: 1499.5,
        stockQuantity: 75,
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.product.slug, prodSlug);
    assert.ok(res.body.product.id);
    createdProductId = res.body.product.id;

    // Verify initial variant was created in the transaction
    assert.ok(Array.isArray(res.body.product.variants));
    assert.equal(res.body.product.variants.length, 1);
    assert.equal(res.body.product.variants[0].sku, variantSku);
    assert.equal(res.body.product.variants[0].stockQuantity, 75);
    createdVariantId = res.body.product.variants[0].id;

    // Verify AuditLog record was created
    const audit = await prisma.auditLog.findFirst({
      where: {
        entityType: "Product",
        entityId: createdProductId,
        action: "PRODUCT_CREATE",
      },
    });
    assert.ok(audit, "AuditLog entry for PRODUCT_CREATE must exist");
    assert.equal(audit.actorId, adminUser.id);
  });

  // 10. Duplicate Product Slug (409)
  test("10. Duplicate product slug returns 409 DUPLICATE_IDENTIFIER", async () => {
    const res = await request(app)
      .post("/api/admin/products")
      .set("Cookie", adminCookie)
      .set("X-Requested-With", "XMLHttpRequest")
      .send({
        name: "Another Product with Same Slug",
        slug: prodSlug, // Already exists
        categoryId: createdCategoryId,
        sku: `DIFF-SKU-${timestamp}`,
        price: 500,
      });

    assert.equal(res.status, 409);
    assert.equal(res.body.error.code, "DUPLICATE_IDENTIFIER");
  });

  // 11. Duplicate Variant SKU (409)
  test("11. Duplicate variant SKU returns 409 DUPLICATE_IDENTIFIER", async () => {
    const res = await request(app)
      .post("/api/admin/products")
      .set("Cookie", adminCookie)
      .set("X-Requested-With", "XMLHttpRequest")
      .send({
        name: "Different Product Different Slug",
        slug: `diff-slug-${timestamp}`,
        categoryId: createdCategoryId,
        sku: variantSku, // Already exists from test 9
        price: 500,
      });

    assert.equal(res.status, 409);
    assert.equal(res.body.error.code, "DUPLICATE_IDENTIFIER");
  });

  // 12. Negative Stock Quantity Validation (400)
  test("12. Negative stock adjustment is rejected with 400 VALIDATION_ERROR", async () => {
    const res = await request(app)
      .patch(`/api/admin/inventory/variants/${createdVariantId}`)
      .set("Cookie", adminCookie)
      .set("X-Requested-With", "XMLHttpRequest")
      .send({
        stockQuantity: -15, // Violates non-negative constraint
        reason: "Illegal deduction attempt",
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, "VALIDATION_ERROR");
  });

  // 13. Update Non-Existent Variant (404)
  test("13. Adjusting stock for non-existent variant returns 404 VARIANT_NOT_FOUND", async () => {
    const res = await request(app)
      .patch("/api/admin/inventory/variants/00000000-0000-0000-0000-000000000000")
      .set("Cookie", adminCookie)
      .set("X-Requested-With", "XMLHttpRequest")
      .send({
        stockQuantity: 100,
        reason: "Adjust ghost item",
      });

    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, "VARIANT_NOT_FOUND");
  });

  // 14. Successful Stock Adjustment & Audit Record (200)
  test("14. PATCH /api/admin/inventory/variants/:id safely updates stock and records audit log", async () => {
    const newStock = 120;
    const adjustmentReason = "Q4 Annual Warehouse Physical Inventory Audit";

    const res = await request(app)
      .patch(`/api/admin/inventory/variants/${createdVariantId}`)
      .set("Cookie", adminCookie)
      .set("X-Requested-With", "XMLHttpRequest")
      .send({
        stockQuantity: newStock,
        reason: adjustmentReason,
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.variant.stockQuantity, newStock);
    assert.equal(res.body.difference, 45); // 120 - 75 = 45

    // Verify AuditLog entry in database
    const audit = await prisma.auditLog.findFirst({
      where: {
        entityType: "ProductVariant",
        entityId: createdVariantId,
        action: "INVENTORY_ADJUSTMENT",
      },
      orderBy: { createdAt: "desc" },
    });

    assert.ok(audit, "AuditLog record for stock adjustment must exist in PostgreSQL");
    assert.equal(audit.actorId, adminUser.id);
    assert.equal(audit.metadata.previousStock, 75);
    assert.equal(audit.metadata.newStock, 120);
    assert.equal(audit.metadata.difference, 45);
    assert.equal(audit.metadata.reason, adjustmentReason);
    assert.equal(audit.metadata.actorEmail, testAdminEmail);
  });

  // 15. Persistence Verification across Re-fetch
  test("15. Persistence verified: Created category and product with updated stock persist across re-fetch", async () => {
    // 1. Fetch category via public API
    const catRes = await request(app).get(`/api/categories/${catSlug}`);
    assert.equal(catRes.status, 200);
    assert.equal(catRes.body.category.slug, catSlug);

    // 2. Fetch product via public catalog API
    const prodRes = await request(app).get(`/api/products/${prodSlug}`);
    assert.equal(prodRes.status, 200);
    assert.equal(prodRes.body.product.slug, prodSlug);
    assert.equal(prodRes.body.product.variants.length, 1);
    assert.equal(prodRes.body.product.variants[0].sku, variantSku);
    assert.equal(prodRes.body.product.variants[0].stockQuantity, 120, "Stock quantity must be 120 in PostgreSQL");
  });

  // 16. RBAC: Unauthenticated Price Edit Rejected (401)
  test("16. PATCH /api/admin/products/:id/price rejects unauthenticated requests with 401", async () => {
    const res = await request(app)
      .patch(`/api/admin/products/${createdProductId}/price`)
      .set("X-Requested-With", "XMLHttpRequest")
      .send({ price: 349.00 });

    assert.equal(res.status, 401);
  });

  // 17. RBAC: Customer / Non-Admin Price Edit Forbidden (403)
  test("17. PATCH /api/admin/products/:id/price rejects customer requests with 403 Forbidden", async () => {
    const res = await request(app)
      .patch(`/api/admin/products/${createdProductId}/price`)
      .set("Cookie", customerCookie)
      .set("X-Requested-With", "XMLHttpRequest")
      .send({ price: 349.00 });

    assert.equal(res.status, 403);
  });

  // 18. Validation: Rejects Negative and Non-Numeric Prices (400)
  test("18. PATCH /api/admin/products/:id/price rejects negative or zero price with 400", async () => {
    const resNegative = await request(app)
      .patch(`/api/admin/products/${createdProductId}/price`)
      .set("Cookie", adminCookie)
      .set("X-Requested-With", "XMLHttpRequest")
      .send({ price: -50.00 });

    assert.equal(resNegative.status, 400);

    const resZero = await request(app)
      .patch(`/api/admin/products/${createdProductId}/price`)
      .set("Cookie", adminCookie)
      .set("X-Requested-With", "XMLHttpRequest")
      .send({ price: 0 });

    assert.equal(resZero.status, 400);
  });

  // 19. Success: Admin Price Update and Audit Record (200)
  test("19. PATCH /api/admin/products/:id/price successfully updates price and records audit log", async () => {
    const newPrice = 299.50;

    const res = await request(app)
      .patch(`/api/admin/products/${createdProductId}/price`)
      .set("Cookie", adminCookie)
      .set("X-Requested-With", "XMLHttpRequest")
      .send({
        price: newPrice,
        variantId: createdVariantId,
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(Number(res.body.variant.price), newPrice);

    // Verify AuditLog entry for price update
    const priceAudit = await prisma.auditLog.findFirst({
      where: {
        entityType: "ProductVariant",
        entityId: createdVariantId,
        action: "PRODUCT_PRICE_UPDATED",
      },
      orderBy: { createdAt: "desc" },
    });

    assert.ok(priceAudit, "AuditLog record for price update must exist in PostgreSQL");
    assert.equal(priceAudit.actorId, adminUser.id);
    assert.equal(Number(priceAudit.metadata.newPrice), newPrice);
    assert.equal(priceAudit.metadata.actorEmail, testAdminEmail);
  });

  // 20. Storefront Consistency: Updated Price Visible without modifying stock
  test("20. Storefront consistency: GET /api/products/:slug reflects updated selling price while preserving stock", async () => {
    const prodRes = await request(app).get(`/api/products/${prodSlug}`);
    assert.equal(prodRes.status, 200);
    assert.equal(Number(prodRes.body.product.price), 299.50);
    assert.equal(prodRes.body.product.variants[0].stockQuantity, 120, "Stock quantity must be preserved");
  });
});
