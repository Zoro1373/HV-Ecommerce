import { prisma } from "../config/db.js";

function createHttpError(message, code, status) {
  const err = new Error(message);
  err.code = code;
  err.status = status;
  return err;
}

/**
 * Serializes QuoteRequest database record to client JSON format,
 * safely converting Prisma Decimal fields to JavaScript Numbers.
 */
export function formatQuote(quote) {
  if (!quote) return null;

  return {
    id: quote.id,
    userId: quote.userId || null,
    contactName: quote.contactName,
    email: quote.email,
    phone: quote.phone,
    companyName: quote.companyName || null,
    gstin: quote.gstin || null,
    productDetails: quote.productDetails,
    quantity: quote.quantity,
    message: quote.message || null,
    status: quote.status,
    adminNotes: quote.adminNotes || null,
    quotedAmount: quote.quotedAmount !== null && quote.quotedAmount !== undefined
      ? Number(quote.quotedAmount)
      : null,
    createdAt: quote.createdAt,
    updatedAt: quote.updatedAt,
    user: quote.user
      ? {
          id: quote.user.id,
          fullName: quote.user.fullName,
          email: quote.user.email,
          companyName: quote.user.companyName || null,
          role: quote.user.role,
        }
      : null,
  };
}

/**
 * Creates and persists a customer or commercial Request for Quote (RFQ).
 * Automatically associates authenticated user session if available.
 */
export async function createQuote(data, userId = null) {
  const contactName = data.contactName.trim();
  const email = data.email.trim().toLowerCase();
  const phone = data.phone.trim();
  const companyName = data.companyName ? data.companyName.trim() : null;
  const gstin = data.gstin ? data.gstin.trim() : null;
  const productDetails = data.productDetails.trim();
  const quantity = Number(data.quantity);
  const message = data.message ? data.message.trim() : null;

  const quote = await prisma.quoteRequest.create({
    data: {
      userId: userId || null,
      contactName,
      email,
      phone,
      companyName,
      gstin,
      productDetails,
      quantity,
      message,
      status: "PENDING",
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          companyName: true,
          role: true,
        },
      },
    },
  });

  return formatQuote(quote);
}

/**
 * Lists all quote requests across the system with pagination, search,
 * and status filtering for administrator inspection.
 */
export async function getAdminQuotes(queryParams = {}) {
  const page = Math.max(1, parseInt(queryParams.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(queryParams.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const status = queryParams.status ? queryParams.status.trim() : null;
  const search = (queryParams.search || queryParams.q || "").trim();

  const where = {};

  if (status) {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { contactName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
      { companyName: { contains: search, mode: "insensitive" } },
      { productDetails: { contains: search, mode: "insensitive" } },
      { gstin: { contains: search, mode: "insensitive" } },
    ];
  }

  const [totalItems, quotes] = await prisma.$transaction([
    prisma.quoteRequest.count({ where }),
    prisma.quoteRequest.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            companyName: true,
            role: true,
          },
        },
      },
    }),
  ], { maxWait: 15000, timeout: 35000 });

  return {
    quotes: quotes.map(formatQuote),
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
 * Retrieves a single quote request by its UUID.
 */
export async function getAdminQuoteById(id) {
  const trimmedId = (id || "").trim();
  if (!trimmedId) {
    throw createHttpError("Quote ID is required.", "INVALID_QUOTE_ID", 400);
  }

  const quote = await prisma.quoteRequest.findUnique({
    where: { id: trimmedId },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          companyName: true,
          role: true,
        },
      },
    },
  });

  if (!quote) {
    throw createHttpError(`Quote request with ID '${trimmedId}' not found.`, "QUOTE_NOT_FOUND", 404);
  }

  return formatQuote(quote);
}

/**
 * Updates quote status, admin notes, or pricing proposal with audit logging.
 */
export async function updateAdminQuote(id, updateData, actorId = null, actorEmail = null) {
  const trimmedId = (id || "").trim();
  if (!trimmedId) {
    throw createHttpError("Quote ID is required.", "INVALID_QUOTE_ID", 400);
  }

  const existingQuote = await prisma.quoteRequest.findUnique({
    where: { id: trimmedId },
  });

  if (!existingQuote) {
    throw createHttpError(`Quote request with ID '${trimmedId}' not found.`, "QUOTE_NOT_FOUND", 404);
  }

  const dataToUpdate = {};
  if (updateData.status !== undefined) {
    dataToUpdate.status = updateData.status;
  }
  if (updateData.adminNotes !== undefined) {
    dataToUpdate.adminNotes = updateData.adminNotes ? updateData.adminNotes.trim() : null;
  }
  if (updateData.quotedAmount !== undefined) {
    dataToUpdate.quotedAmount = updateData.quotedAmount !== null ? updateData.quotedAmount : null;
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.quoteRequest.update({
      where: { id: trimmedId },
      data: dataToUpdate,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            companyName: true,
            role: true,
          },
        },
      },
    });

    const auditLog = await tx.auditLog.create({
      data: {
        actorId,
        action: updateData.status && updateData.status !== existingQuote.status
          ? "QUOTE_STATUS_UPDATE"
          : "QUOTE_UPDATE",
        entityType: "QuoteRequest",
        entityId: trimmedId,
        metadata: {
          previousStatus: existingQuote.status,
          newStatus: updated.status,
          quotedAmount: updated.quotedAmount ? Number(updated.quotedAmount) : null,
          adminNotes: updated.adminNotes,
          actorEmail,
        },
      },
    });

    return {
      quote: formatQuote(updated),
      auditLog: {
        id: auditLog.id,
        action: auditLog.action,
        createdAt: auditLog.createdAt,
      },
    };
  }, { maxWait: 15000, timeout: 35000 });

  return result;
}
