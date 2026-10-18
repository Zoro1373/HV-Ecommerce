import { prisma } from "../config/db.js";

function createHttpError(message, code, status) {
  const err = new Error(message);
  err.code = code;
  err.status = status;
  return err;
}

/**
 * Creates a new category with slug uniqueness validation.
 */
export async function createCategory(categoryData, actorId = null) {
  const { name, slug, description, icon, tint, imageUrl, parentId } = categoryData;

  // 1. Verify slug uniqueness
  const existingCategory = await prisma.category.findUnique({
    where: { slug },
  });

  if (existingCategory) {
    throw createHttpError(
      `A category with slug '${slug}' already exists.`,
      "DUPLICATE_IDENTIFIER",
      409
    );
  }

  // 2. If parentId provided, verify parent exists
  if (parentId) {
    const parent = await prisma.category.findUnique({
      where: { id: parentId },
    });
    if (!parent) {
      throw createHttpError(
        `Parent category with ID '${parentId}' does not exist.`,
        "PARENT_CATEGORY_NOT_FOUND",
        404
      );
    }
  }

  // 3. Create category and audit record atomically
  return prisma.$transaction(async (tx) => {
    const category = await tx.category.create({
      data: {
        name,
        slug,
        description: description || null,
        icon: icon || null,
        tint: tint || null,
        imageUrl: imageUrl || null,
        parentId: parentId || null,
        isActive: true,
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    await tx.auditLog.create({
      data: {
        actorId,
        action: "CATEGORY_CREATE",
        entityType: "Category",
        entityId: category.id,
        metadata: {
          name: category.name,
          slug: category.slug,
          parentId: category.parentId,
        },
      },
    });

    return category;
  }, { maxWait: 15000, timeout: 35000 });
}

/**
 * Creates a product along with its initial variant in an atomic transaction.
 */
export async function createProduct(productData, actorId = null) {
  const {
    name,
    slug,
    description,
    categoryId,
    brand,
    hsnCode,
    gstRate,
    tag,
    imageUrl,
    sku,
    partNumber,
    variantName,
    packSize,
    dimensions,
    price,
    mrp,
    stockQuantity,
  } = productData;

  // 1. Verify category exists
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
  });

  if (!category) {
    throw createHttpError(
      `Category with ID '${categoryId}' not found.`,
      "CATEGORY_NOT_FOUND",
      404
    );
  }

  // 2. Verify product slug uniqueness
  const existingProduct = await prisma.product.findUnique({
    where: { slug },
  });

  if (existingProduct) {
    throw createHttpError(
      `A product with slug '${slug}' already exists.`,
      "DUPLICATE_IDENTIFIER",
      409
    );
  }

  // 3. Verify variant SKU uniqueness
  const existingVariant = await prisma.productVariant.findUnique({
    where: { sku },
  });

  if (existingVariant) {
    throw createHttpError(
      `A product variant with SKU '${sku}' already exists.`,
      "DUPLICATE_IDENTIFIER",
      409
    );
  }

  // 4. Atomic transaction: create product, initial variant, and audit log
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        name,
        slug,
        description: description || null,
        categoryId,
        brand: brand || null,
        hsnCode: hsnCode || null,
        gstRate,
        tag: tag || null,
        imageUrl: imageUrl || null,
        isActive: true,
        variants: {
          create: [
            {
              sku,
              partNumber: partNumber || null,
              name: variantName || name,
              packSize: packSize || null,
              dimensions: dimensions || null,
              price,
              mrp: mrp !== undefined && mrp !== null ? mrp : null,
              stockQuantity,
              isActive: true,
            },
          ],
        },
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        variants: true,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId,
        action: "PRODUCT_CREATE",
        entityType: "Product",
        entityId: product.id,
        metadata: {
          name: product.name,
          slug: product.slug,
          sku,
          price,
          initialStock: stockQuantity,
        },
      },
    });

    return product;
  }, { maxWait: 15000, timeout: 35000 });
}

/**
 * Updates stock quantity for a variant safely with audit logging in an atomic transaction.
 */
export async function updateVariantStock(variantId, { stockQuantity, reason }, actorId = null, actorEmail = null) {
  return prisma.$transaction(async (tx) => {
    // 1. Locate current variant and check existence
    const currentVariant = await tx.productVariant.findUnique({
      where: { id: variantId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!currentVariant) {
      throw createHttpError(
        `Product variant with ID '${variantId}' not found.`,
        "VARIANT_NOT_FOUND",
        404
      );
    }

    const previousStock = currentVariant.stockQuantity;
    const newStock = stockQuantity;
    const difference = newStock - previousStock;

    // 2. Perform safe update
    const updatedVariant = await tx.productVariant.update({
      where: { id: variantId },
      data: {
        stockQuantity: newStock,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    // 3. Record audit trail
    const auditRecord = await tx.auditLog.create({
      data: {
        actorId,
        action: "INVENTORY_ADJUSTMENT",
        entityType: "ProductVariant",
        entityId: variantId,
        metadata: {
          sku: currentVariant.sku,
          productName: currentVariant.product?.name,
          previousStock,
          newStock,
          difference,
          reason,
          actorEmail: actorEmail || "system",
        },
      },
    });

    return {
      variant: updatedVariant,
      difference,
      auditLog: {
        id: auditRecord.id,
        action: auditRecord.action,
        createdAt: auditRecord.createdAt,
      },
    };
  }, { maxWait: 15000, timeout: 35000 });
}
