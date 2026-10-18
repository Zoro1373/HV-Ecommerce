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

describe("Cart Backend Phase 2: Persistent Shopping Cart Test Suite", () => {
  const timestamp = Date.now();
  const testCustomerEmail1 = `test.cart.user1.${timestamp}@vertex.local`;
  const testCustomerEmail2 = `test.cart.user2.${timestamp}@vertex.local`;
  const testPassword = "CustomerSecurePass123!";

  let user1 = null;
  let user2 = null;
  let cookieUser1 = "";
  let cookieUser2 = "";

  // Test product fixtures
  let testCategoryId = "";
  let testProductId = "";
  let testVariantId1 = "";
  let testVariantId2 = "";
  let testInactiveVariantId = "";

  before(async () => {
    const passwordHash = await hashPassword(testPassword);

    // 1. Create two separate test customer users
    user1 = await prisma.user.create({
      data: {
        email: testCustomerEmail1,
        fullName: "Test Cart Customer 1",
        passwordHash,
        role: "CUSTOMER",
        isActive: true,
      },
    });

    const token1 = generateSessionToken();
    await prisma.session.create({
      data: {
        userId: user1.id,
        tokenHash: hashToken(token1),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    cookieUser1 = `vertex_session=${token1}`;

    user2 = await prisma.user.create({
      data: {
        email: testCustomerEmail2,
        fullName: "Test Cart Customer 2",
        passwordHash,
        role: "CUSTOMER",
        isActive: true,
      },
    });

    const token2 = generateSessionToken();
    await prisma.session.create({
      data: {
        userId: user2.id,
        tokenHash: hashToken(token2),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    cookieUser2 = `vertex_session=${token2}`;

    // 2. Create Category and Product fixtures
    const category = await prisma.category.create({
      data: {
        name: `Cart Test Category ${timestamp}`,
        slug: `cart-test-cat-${timestamp}`,
      },
    });
    testCategoryId = category.id;

    const product = await prisma.product.create({
      data: {
        name: `Cart Test Microcontroller ${timestamp}`,
        slug: `cart-test-prod-${timestamp}`,
        categoryId: category.id,
        brand: "VertexTech",
      },
    });
    testProductId = product.id;

    // Active variant with stock = 20
    const variant1 = await prisma.productVariant.create({
      data: {
        productId: product.id,
        sku: `CART-SKU-1-${timestamp}`,
        name: "Standard Pack",
        price: 150.0,
        stockQuantity: 20,
        isActive: true,
      },
    });
    testVariantId1 = variant1.id;

    // Active variant with stock = 10
    const variant2 = await prisma.productVariant.create({
      data: {
        productId: product.id,
        sku: `CART-SKU-2-${timestamp}`,
        name: "Bulk Pack",
        price: 500.0,
        stockQuantity: 10,
        isActive: true,
      },
    });
    testVariantId2 = variant2.id;

    // Inactive variant
    const inactiveVariant = await prisma.productVariant.create({
      data: {
        productId: product.id,
        sku: `CART-SKU-INACT-${timestamp}`,
        name: "Discontinued Pack",
        price: 200.0,
        stockQuantity: 5,
        isActive: false,
      },
    });
    testInactiveVariantId = inactiveVariant.id;
  });

  after(async () => {
    // Cleanup test data
    if (user1) {
      await prisma.user.delete({ where: { id: user1.id } }).catch(() => {});
    }
    if (user2) {
      await prisma.user.delete({ where: { id: user2.id } }).catch(() => {});
    }
    if (testProductId) {
      await prisma.product.delete({ where: { id: testProductId } }).catch(() => {});
    }
    if (testCategoryId) {
      await prisma.category.delete({ where: { id: testCategoryId } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  test("1. GET /api/cart requires authentication", async () => {
    const res = await request(app).get("/api/cart");
    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, "UNAUTHORIZED");
  });

  test("2. GET /api/cart returns empty cart for new customer", async () => {
    const res = await request(app)
      .get("/api/cart")
      .set("Cookie", cookieUser1);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.cart.itemCount, 0);
    assert.equal(res.body.cart.totalQuantity, 0);
    assert.equal(res.body.cart.subtotal, 0);
    assert.deepEqual(res.body.cart.items, []);
  });

  test("3. POST /api/cart/items adds product variant with server-derived price", async () => {
    const res = await request(app)
      .post("/api/cart/items")
      .set("Cookie", cookieUser1)
      .set("X-Requested-With", "XMLHttpRequest")
      .send({
        variantId: testVariantId1,
        quantity: 2,
        price: 0.01, // Client attempts to forge price; server must ignore
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.cart.itemCount, 1);
    assert.equal(res.body.cart.totalQuantity, 2);
    assert.equal(res.body.cart.subtotal, 300.0); // 2 * 150.00
    assert.equal(res.body.cart.items[0].unitPrice, 150.0);
    assert.equal(res.body.cart.items[0].lineTotal, 300.0);
    assert.equal(res.body.cart.items[0].variantId, testVariantId1);
  });

  test("4. POST /api/cart/items rejects non-existent variant ID with 404", async () => {
    const res = await request(app)
      .post("/api/cart/items")
      .set("Cookie", cookieUser1)
      .set("X-Requested-With", "XMLHttpRequest")
      .send({
        variantId: "00000000-0000-0000-0000-000000000000",
        quantity: 1,
      });

    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, "VARIANT_NOT_FOUND");
  });

  test("5. POST /api/cart/items rejects invalid or negative quantity with 400", async () => {
    const res = await request(app)
      .post("/api/cart/items")
      .set("Cookie", cookieUser1)
      .set("X-Requested-With", "XMLHttpRequest")
      .send({
        variantId: testVariantId1,
        quantity: -2,
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, "VALIDATION_ERROR");
  });

  test("6. POST /api/cart/items rejects malformed variantId with 400", async () => {
    const res = await request(app)
      .post("/api/cart/items")
      .set("Cookie", cookieUser1)
      .set("X-Requested-With", "XMLHttpRequest")
      .send({
        variantId: "not-a-uuid",
        quantity: 1,
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, "VALIDATION_ERROR");
  });

  test("7. POST /api/cart/items rejects quantity exceeding available stock", async () => {
    const res = await request(app)
      .post("/api/cart/items")
      .set("Cookie", cookieUser1)
      .set("X-Requested-With", "XMLHttpRequest")
      .send({
        variantId: testVariantId1,
        quantity: 999, // Stock is 20
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, "INSUFFICIENT_STOCK");
  });

  test("8. POST /api/cart/items rejects inactive variant", async () => {
    const res = await request(app)
      .post("/api/cart/items")
      .set("Cookie", cookieUser1)
      .set("X-Requested-With", "XMLHttpRequest")
      .send({
        variantId: testInactiveVariantId,
        quantity: 1,
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, "INACTIVE_PRODUCT_OR_VARIANT");
  });

  test("9. Adding an item already in cart increments quantity safely", async () => {
    const res = await request(app)
      .post("/api/cart/items")
      .set("Cookie", cookieUser1)
      .set("X-Requested-With", "XMLHttpRequest")
      .send({
        variantId: testVariantId1,
        quantity: 3, // Was 2, should become 5
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.cart.itemCount, 1);
    assert.equal(res.body.cart.totalQuantity, 5);
    assert.equal(res.body.cart.subtotal, 750.0); // 5 * 150.00
    assert.equal(res.body.cart.items[0].quantity, 5);
  });

  test("10. PATCH /api/cart/items/:itemId updates item quantity", async () => {
    const cartRes = await request(app).get("/api/cart").set("Cookie", cookieUser1);
    const itemId = cartRes.body.cart.items[0].id;

    const res = await request(app)
      .patch(`/api/cart/items/${itemId}`)
      .set("Cookie", cookieUser1)
      .set("X-Requested-With", "XMLHttpRequest")
      .send({ quantity: 4 });

    assert.equal(res.status, 200);
    assert.equal(res.body.cart.totalQuantity, 4);
    assert.equal(res.body.cart.subtotal, 600.0);
    assert.equal(res.body.cart.items[0].quantity, 4);
  });

  test("11. PATCH /api/cart/items/:itemId rejects quantity exceeding stock", async () => {
    const cartRes = await request(app).get("/api/cart").set("Cookie", cookieUser1);
    const itemId = cartRes.body.cart.items[0].id;

    const res = await request(app)
      .patch(`/api/cart/items/${itemId}`)
      .set("Cookie", cookieUser1)
      .set("X-Requested-With", "XMLHttpRequest")
      .send({ quantity: 50 }); // stock is 20

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, "INSUFFICIENT_STOCK");
  });

  test("12. Ownership Isolation: User cannot modify another user's cart item", async () => {
    // Get user1's item ID
    const cart1Res = await request(app).get("/api/cart").set("Cookie", cookieUser1);
    const user1ItemId = cart1Res.body.cart.items[0].id;

    // User2 attempts to update User1's item
    const res = await request(app)
      .patch(`/api/cart/items/${user1ItemId}`)
      .set("Cookie", cookieUser2)
      .set("X-Requested-With", "XMLHttpRequest")
      .send({ quantity: 1 });

    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, "ITEM_NOT_FOUND");
  });

  test("13. Ownership Isolation: User cannot delete another user's cart item", async () => {
    const cart1Res = await request(app).get("/api/cart").set("Cookie", cookieUser1);
    const user1ItemId = cart1Res.body.cart.items[0].id;

    // User2 attempts to delete User1's item
    const res = await request(app)
      .delete(`/api/cart/items/${user1ItemId}`)
      .set("Cookie", cookieUser2)
      .set("X-Requested-With", "XMLHttpRequest");

    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, "ITEM_NOT_FOUND");
  });

  test("14. DELETE /api/cart/items/:itemId removes item", async () => {
    const cartRes = await request(app).get("/api/cart").set("Cookie", cookieUser1);
    const itemId = cartRes.body.cart.items[0].id;

    const res = await request(app)
      .delete(`/api/cart/items/${itemId}`)
      .set("Cookie", cookieUser1)
      .set("X-Requested-With", "XMLHttpRequest");

    assert.equal(res.status, 200);
    assert.equal(res.body.cart.itemCount, 0);
    assert.equal(res.body.cart.totalQuantity, 0);
    assert.equal(res.body.cart.subtotal, 0);
  });

  test("15. DELETE /api/cart clears the entire cart", async () => {
    // Add two items
    await request(app)
      .post("/api/cart/items")
      .set("Cookie", cookieUser1)
      .set("X-Requested-With", "XMLHttpRequest")
      .send({ variantId: testVariantId1, quantity: 2 });

    await request(app)
      .post("/api/cart/items")
      .set("Cookie", cookieUser1)
      .set("X-Requested-With", "XMLHttpRequest")
      .send({ variantId: testVariantId2, quantity: 1 });

    const beforeClear = await request(app).get("/api/cart").set("Cookie", cookieUser1);
    assert.equal(beforeClear.body.cart.itemCount, 2);

    const clearRes = await request(app)
      .delete("/api/cart")
      .set("Cookie", cookieUser1)
      .set("X-Requested-With", "XMLHttpRequest");

    assert.equal(clearRes.status, 200);
    assert.equal(clearRes.body.cart.itemCount, 0);
    assert.equal(clearRes.body.cart.totalQuantity, 0);
  });

  test("16. POST /api/cart/merge merges guest cart items into user cart safely", async () => {
    // User 1 currently has empty cart. Merge 2 guest items.
    const res = await request(app)
      .post("/api/cart/merge")
      .set("Cookie", cookieUser1)
      .set("X-Requested-With", "XMLHttpRequest")
      .send({
        items: [
          { variantId: testVariantId1, quantity: 3 },
          { variantId: testVariantId2, quantity: 2 },
        ],
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.cart.itemCount, 2);
    assert.equal(res.body.cart.totalQuantity, 5);
    // Subtotal: (3 * 150) + (2 * 500) = 450 + 1000 = 1450
    assert.equal(res.body.cart.subtotal, 1450.0);

    // Merge again with overlapping item to verify quantity combination policy
    const mergeAgain = await request(app)
      .post("/api/cart/merge")
      .set("Cookie", cookieUser1)
      .set("X-Requested-With", "XMLHttpRequest")
      .send({
        items: [
          { variantId: testVariantId1, quantity: 2 }, // Was 3, becomes 5
        ],
      });

    assert.equal(mergeAgain.status, 200);
    assert.equal(mergeAgain.body.cart.totalQuantity, 7);
  });

  test("17. POST /api/cart/merge skips invalid or inactive variants without failing valid items", async () => {
    await request(app).delete("/api/cart").set("Cookie", cookieUser1).set("X-Requested-With", "XMLHttpRequest");

    const res = await request(app)
      .post("/api/cart/merge")
      .set("Cookie", cookieUser1)
      .set("X-Requested-With", "XMLHttpRequest")
      .send({
        items: [
          { variantId: testVariantId1, quantity: 2 },
          { variantId: testInactiveVariantId, quantity: 1 }, // Inactive, should be skipped
          { variantId: "00000000-0000-0000-0000-000000000000", quantity: 1 }, // Non-existent, should be skipped
        ],
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.cart.itemCount, 1);
    assert.equal(res.body.cart.totalQuantity, 2);
    assert.equal(res.body.cart.items[0].variantId, testVariantId1);
  });

  test("18. Adding items to cart does NOT decrement database inventory stock", async () => {
    const variantBefore = await prisma.productVariant.findUnique({
      where: { id: testVariantId1 },
    });
    const initialStock = variantBefore.stockQuantity;

    // Add 5 units to cart
    await request(app)
      .post("/api/cart/items")
      .set("Cookie", cookieUser2)
      .set("X-Requested-With", "XMLHttpRequest")
      .send({ variantId: testVariantId1, quantity: 5 });

    const variantAfter = await prisma.productVariant.findUnique({
      where: { id: testVariantId1 },
    });

    assert.equal(
      variantAfter.stockQuantity,
      initialStock,
      "Inventory stock must remain untouched when items are merely added to cart"
    );
  });

  test("19. State-changing cart requests enforce CSRF protection", async () => {
    const res = await request(app)
      .post("/api/cart/items")
      .set("Cookie", cookieUser1)
      .set("Origin", "https://malicious-attacker.com")
      .send({ variantId: testVariantId1, quantity: 1 });

    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, "CSRF_ERROR");
  });
});
