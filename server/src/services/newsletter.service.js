import { prisma } from "../config/db.js";

function createHttpError(message, code, status) {
  const err = new Error(message);
  err.code = code;
  err.status = status;
  return err;
}

/**
 * Subscribes an email to the VERTEX newsletter idempotently.
 * Never leaks existing subscriber identity or internal database IDs.
 */
export async function subscribeNewsletter(email) {
  const normalizedEmail = (email || "").trim().toLowerCase();

  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    throw createHttpError("Please provide a valid email address.", "INVALID_EMAIL", 400);
  }

  const existing = await prisma.newsletterSubscription.findUnique({
    where: { email: normalizedEmail },
  });

  if (existing) {
    if (!existing.isActive) {
      // Reactivate previously unsubscribed account
      await prisma.newsletterSubscription.update({
        where: { id: existing.id },
        data: { isActive: true },
      });
    }
    // Return standard success without exposing whether it was already registered
    return {
      success: true,
      message: "Thank you for subscribing to VERTEX updates.",
    };
  }

  await prisma.newsletterSubscription.create({
    data: {
      email: normalizedEmail,
      isActive: true,
    },
  });

  return {
    success: true,
    message: "Thank you for subscribing to VERTEX updates.",
  };
}

/**
 * Lists newsletter subscriptions for administrative audit and export.
 */
export async function getAdminNewsletterSubscriptions(queryParams = {}) {
  const page = Math.max(1, parseInt(queryParams.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(queryParams.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const search = (queryParams.search || "").trim();
  const isActiveFilter = queryParams.isActive;

  const where = {};

  if (search) {
    where.email = { contains: search, mode: "insensitive" };
  }

  if (isActiveFilter === "true") {
    where.isActive = true;
  } else if (isActiveFilter === "false") {
    where.isActive = false;
  }

  const [totalItems, subscriptions] = await prisma.$transaction([
    prisma.newsletterSubscription.count({ where }),
    prisma.newsletterSubscription.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
  ], { maxWait: 15000, timeout: 35000 });

  return {
    subscriptions: subscriptions.map((s) => ({
      id: s.id,
      email: s.email,
      isActive: s.isActive,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    })),
    pagination: {
      page,
      limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit) || 1,
      hasNextPage: page * limit < totalItems,
      hasPrevPage: page > 1,
    },
  };
}

/**
 * Updates newsletter subscriber status (e.g., unsubscribe on user request).
 */
export async function updateAdminNewsletterSubscription(id, updateData) {
  const trimmedId = (id || "").trim();
  if (!trimmedId) {
    throw createHttpError("Subscription ID is required.", "INVALID_SUBSCRIPTION_ID", 400);
  }

  const existing = await prisma.newsletterSubscription.findUnique({
    where: { id: trimmedId },
  });

  if (!existing) {
    throw createHttpError(`Subscription with ID '${trimmedId}' not found.`, "SUBSCRIPTION_NOT_FOUND", 404);
  }

  const updated = await prisma.newsletterSubscription.update({
    where: { id: trimmedId },
    data: {
      isActive: updateData.isActive !== undefined ? Boolean(updateData.isActive) : existing.isActive,
    },
  });

  return {
    id: updated.id,
    email: updated.email,
    isActive: updated.isActive,
    updatedAt: updated.updatedAt,
  };
}
