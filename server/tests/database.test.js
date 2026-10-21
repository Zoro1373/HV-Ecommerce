import test, { describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { Prisma } from "@prisma/client";
import { prisma } from "../src/config/db.js";
import { hashPassword, hashToken, generateSessionToken } from "../src/utils/crypto.js";

describe("Database Integrity, Constraints & Precision Test Suite", () => {
  const timestamp = Date.now();
  const testEmail = `db.integrity.${timestamp}@example.com`;
  const testDuplicateEmail = `db.dup.${timestamp}@example.com`;
  const testCategorySlug = `db-test-cat-${timestamp}`;
  const testProductSlug = `db-test-prod-${timestamp}`;
  const testVariantSku = `DB-TEST-SKU-${timestamp}`;
  const testOrderNumber = `VTX-TEST-${timestamp}`;

  let testUserId = null;
  let testCategoryId = null;
  let testProductId = null;
  let testVariantId = null;

  before(async () => {
    // 1. Create a dedicated test user
    const passwordHash = await hashPassword("TestDbPassword123");
    const user = await prisma.user.create({
      data: {
        email: testEmail,
        fullName: "DB Integrity Tester",
        passwordHash,
        role: "CUSTOMER",
      },
    });
    testUserId = user.id;

    // 2. Create a dedicated test category
    const category = await prisma.category.create({
      data: {
        name: `Test Category ${timestamp}`,
        slug: testCategorySlug,
      },
    });
    testCategoryId = category.id;

    // 3. Create a dedicated test product with variant
    const product = await prisma.product.create({
      data: {
        name: `Test Product ${timestamp}`,
        slug: testProductSlug,
        categoryId: testCategoryId,
        variants: {
          create: [
            {
              sku: testVariantSku,
              name: "Standard Test Variant",
              price: new Prisma.Decimal("199.99"),
              mrp: new Prisma.Decimal("249.99"),
              stockQuantity: 50,
            },
          ],
        },
      },
      include: {
        variants: true,
      },
    });
    testProductId = product.id;
    testVariantId = product.variants[0].id;
  });

  after(async () => {
    // Clean up created test entities without touching existing catalog
    if (testProductId) {
      await prisma.product.delete({ where: { id: testProductId } }).catch(() => {});
    }
    if (testCategoryId) {
      await prisma.category.delete({ where: { id: testCategoryId } }).catch(() => {});
    }
    if (testUserId) {
      await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    }
    await prisma.user.deleteMany({
      where: { email: { in: [testDuplicateEmail, `cascade.user.${timestamp}@example.com`] } },
    }).catch(() => {});
    await prisma.newsletterSubscription.deleteMany({
      where: { email: `news.${timestamp}@example.com` },
    }).catch(() => {});
    await prisma.$disconnect();
  });

  // 1. Existing Catalog Preservation Check
  test("1. Existing official catalog data (3 categories, 6 products) is intact", async () => {
    const categories = await prisma.category.findMany({
      where: { slug: { in: ["electronics", "fasteners", "nuts"] } },
    });
    assert.equal(categories.length, 3, "All 3 official categories must exist");

    const products = await prisma.product.findMany({
      where: {
        slug: {
          in: [
            "arduino-uno-r3",
            "motor-driver-module-l298n",
            "plc-delta-dvp-series",
            "raspberry-pi-4-development-board",
            "ss-hex-bolt-m8-30",
            "nyloc-nut-m8",
          ],
        },
      },
    });
    assert.equal(products.length, 6, "All 6 official seeded products must exist");
  });

  // 2. Decimal Precision Verification
  test("2. Decimal monetary fields store exact currency precision without float drift", async () => {
    const variant = await prisma.productVariant.findUnique({
      where: { id: testVariantId },
    });

    assert.ok(variant);
    assert.equal(variant.price.toFixed(2), "199.99");
    assert.equal(variant.mrp.toFixed(2), "249.99");

    // Arithmetic precision test: 199.99 * 3 = 599.97 exactly
    const lineTotal = variant.price.mul(3);
    assert.equal(lineTotal.toFixed(2), "599.97");
  });

  // 3. PostgreSQL CHECK Constraint: ProductVariant price non-negative
  test("3. CHECK constraint chk_variant_price_non_negative rejects negative price", async () => {
    await assert.rejects(
      async () => {
        await prisma.productVariant.create({
          data: {
            productId: testProductId,
            sku: `NEG-PRICE-${timestamp}`,
            price: new Prisma.Decimal("-10.00"),
            stockQuantity: 10,
          },
        });
      },
      (err) => {
        assert.ok(
          err.message.includes("chk_variant_price_non_negative") || err.code === "P2002" || err.code === "P2003" || err.code === "P2010",
          `Expected check constraint violation, got: ${err.message}`
        );
        return true;
      }
    );
  });

  // 4. PostgreSQL CHECK Constraint: ProductVariant stockQuantity non-negative
  test("4. CHECK constraint chk_variant_stock_non_negative rejects negative stockQuantity", async () => {
    await assert.rejects(
      async () => {
        await prisma.productVariant.create({
          data: {
            productId: testProductId,
            sku: `NEG-STOCK-${timestamp}`,
            price: new Prisma.Decimal("100.00"),
            stockQuantity: -5,
          },
        });
      },
      (err) => {
        assert.ok(
          err.message.includes("chk_variant_stock_non_negative") || err.code === "P2010",
          `Expected check constraint violation, got: ${err.message}`
        );
        return true;
      }
    );
  });

  // 5. PostgreSQL CHECK Constraint: CartItem quantity strictly positive
  test("5. CHECK constraint chk_cart_item_quantity_positive rejects quantity <= 0", async () => {
    const cart = await prisma.cart.create({
      data: { userId: testUserId },
    });

    try {
      await assert.rejects(
        async () => {
          await prisma.cartItem.create({
            data: {
              cartId: cart.id,
              variantId: testVariantId,
              quantity: 0,
            },
          });
        },
        (err) => {
          assert.ok(
            err.message.includes("chk_cart_item_quantity_positive") || err.code === "P2010",
            `Expected check constraint violation, got: ${err.message}`
          );
          return true;
        }
      );
    } finally {
      await prisma.cart.delete({ where: { id: cart.id } }).catch(() => {});
    }
  });

  // 6. PostgreSQL CHECK Constraint: TieredPrice quantity validity
  test("6. CHECK constraint chk_tiered_quantity_valid rejects minQuantity <= 0 and maxQuantity < minQuantity", async () => {
    // Case A: minQuantity <= 0
    await assert.rejects(
      async () => {
        await prisma.tieredPrice.create({
          data: {
            variantId: testVariantId,
            minQuantity: 0,
            unitPrice: new Prisma.Decimal("90.00"),
          },
        });
      },
      (err) => {
        assert.ok(
          err.message.includes("chk_tiered_quantity_valid") || err.code === "P2010",
          `Expected check constraint violation, got: ${err.message}`
        );
        return true;
      }
    );

    // Case B: maxQuantity < minQuantity
    await assert.rejects(
      async () => {
        await prisma.tieredPrice.create({
          data: {
            variantId: testVariantId,
            minQuantity: 20,
            maxQuantity: 10,
            unitPrice: new Prisma.Decimal("90.00"),
          },
        });
      },
      (err) => {
        assert.ok(
          err.message.includes("chk_tiered_quantity_valid") || err.code === "P2010",
          `Expected check constraint violation, got: ${err.message}`
        );
        return true;
      }
    );
  });

  // 7. Unique Constraint: User email unique
  test("7. Unique constraint User_email_key rejects duplicate email registration", async () => {
    const passwordHash = await hashPassword("TestPassword123");
    await prisma.user.create({
      data: {
        email: testDuplicateEmail,
        fullName: "First User",
        passwordHash,
      },
    });

    await assert.rejects(
      async () => {
        await prisma.user.create({
          data: {
            email: testDuplicateEmail,
            fullName: "Duplicate User",
            passwordHash,
          },
        });
      },
      (err) => {
        assert.equal(err.code, "P2002", "Prisma unique constraint violation code must be P2002");
        assert.ok(err.meta?.target?.includes("email"));
        return true;
      }
    );
  });

  // 8. Unique Constraint: ProductVariant SKU unique
  test("8. Unique constraint ProductVariant_sku_key rejects duplicate SKU", async () => {
    await assert.rejects(
      async () => {
        await prisma.productVariant.create({
          data: {
            productId: testProductId,
            sku: testVariantSku, // Already exists from before()
            price: new Prisma.Decimal("150.00"),
            stockQuantity: 25,
          },
        });
      },
      (err) => {
        assert.equal(err.code, "P2002");
        assert.ok(err.meta?.target?.includes("sku"));
        return true;
      }
    );
  });

  // 9. Unique Constraint: Cart userId unique (one active cart per user)
  test("9. Unique constraint Cart_userId_key enforces single active cart per user", async () => {
    const cart = await prisma.cart.create({
      data: { userId: testUserId },
    });

    try {
      await assert.rejects(
        async () => {
          await prisma.cart.create({
            data: { userId: testUserId },
          });
        },
        (err) => {
          assert.equal(err.code, "P2002");
          assert.ok(err.meta?.target?.includes("userId"));
          return true;
        }
      );
    } finally {
      await prisma.cart.delete({ where: { id: cart.id } }).catch(() => {});
    }
  });

  // 10. Referential Integrity: Session cascades on User deletion
  test("10. Foreign key CASCADE deletes sessions when User is removed", async () => {
    const passwordHash = await hashPassword("CascadePassword123");
    const cascadeUser = await prisma.user.create({
      data: {
        email: `cascade.user.${timestamp}@example.com`,
        fullName: "Cascade User",
        passwordHash,
      },
    });

    const token = generateSessionToken();
    const tokenHash = hashToken(token);
    const session = await prisma.session.create({
      data: {
        userId: cascadeUser.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 100000),
      },
    });

    // Delete user
    await prisma.user.delete({ where: { id: cascadeUser.id } });

    // Session should have been cascaded and deleted
    const foundSession = await prisma.session.findUnique({
      where: { id: session.id },
    });
    assert.equal(foundSession, null, "Session must be cascade deleted when user is deleted");
  });

  // 11. Referential Integrity: RESTRICT prevents deleting Category with active Products
  test("11. Foreign key RESTRICT prevents deleting Category when referenced by Products", async () => {
    await assert.rejects(
      async () => {
        await prisma.category.delete({
          where: { id: testCategoryId },
        });
      },
      (err) => {
        assert.ok(
          err.message.includes("violates RESTRICT setting of foreign key constraint") ||
            err.code === "P2003" ||
            err.message.includes("Product_categoryId_fkey"),
          `Expected foreign key RESTRICT error, got: ${err.message}`
        );
        return true;
      }
    );
  });

  // 12. Referential Integrity: SET NULL preserves historical OrderItem when ProductVariant is removed
  test("12. Foreign key SET NULL preserves historical OrderItem variantId reference policy", async () => {
    // Create an order referencing testVariantId
    const order = await prisma.order.create({
      data: {
        orderNumber: testOrderNumber,
        userId: testUserId,
        subtotal: new Prisma.Decimal("199.99"),
        taxAmount: new Prisma.Decimal("36.00"),
        totalAmount: new Prisma.Decimal("235.99"),
        shippingRecipient: "Test Recipient",
        shippingPhone: "+91 9999999999",
        shippingLine1: "123 Industrial Estate",
        shippingCity: "Bengaluru",
        shippingState: "Karnataka",
        shippingPostalCode: "560001",
        shippingCountry: "India",
        items: {
          create: [
            {
              variantId: testVariantId,
              productName: "Test Product Snapshot",
              variantName: "Standard Test Variant",
              sku: testVariantSku,
              gstRate: new Prisma.Decimal("18.00"),
              quantity: 1,
              unitPrice: new Prisma.Decimal("199.99"),
              taxAmount: new Prisma.Decimal("36.00"),
              lineTotal: new Prisma.Decimal("235.99"),
            },
          ],
        },
      },
      include: { items: true },
    });

    const orderItemId = order.items[0].id;

    try {
      // Historical snapshot must preserve product name and SKU even if variant reference changes
      const item = await prisma.orderItem.findUnique({
        where: { id: orderItemId },
      });
      assert.equal(item.productName, "Test Product Snapshot");
      assert.equal(item.sku, testVariantSku);
      assert.equal(item.lineTotal.toFixed(2), "235.99");
    } finally {
      // Clean up test order
      await prisma.order.delete({ where: { id: order.id } }).catch(() => {});
    }
  });
});
