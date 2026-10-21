import { prisma } from "../config/db.js";
import { formatAddress } from "../utils/orderSerializer.js";

/**
 * Lists all addresses saved by the user, default address first.
 */
export async function listAddresses(userId) {
  const addresses = await prisma.address.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });

  return addresses.map(formatAddress);
}

/**
 * Retrieves a single address by ID, verifying ownership.
 */
export async function getAddressById(userId, addressId) {
  const address = await prisma.address.findUnique({
    where: { id: addressId },
  });

  if (!address) {
    const error = new Error("Address not found.");
    error.code = "ADDRESS_NOT_FOUND";
    error.status = 404;
    throw error;
  }

  if (address.userId !== userId) {
    const error = new Error("You do not have permission to access this address.");
    error.code = "FORBIDDEN";
    error.status = 403;
    throw error;
  }

  return formatAddress(address);
}

/**
 * Creates a new address for the user.
 */
export async function createAddress(userId, data) {
  return prisma.$transaction(async (tx) => {
    // If setting as default, clear any existing default
    if (data.isDefault) {
      await tx.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const created = await tx.address.create({
      data: {
        userId,
        recipientName: data.recipientName,
        phone: data.phone,
        line1: data.line1,
        line2: data.line2 || null,
        city: data.city,
        state: data.state,
        postalCode: data.postalCode,
        country: data.country || "India",
        isDefault: Boolean(data.isDefault),
      },
    });

    return formatAddress(created);
  });
}

/**
 * Updates an address belonging to the user.
 */
export async function updateAddress(userId, addressId, data) {
  const existing = await prisma.address.findUnique({
    where: { id: addressId },
  });

  if (!existing) {
    const error = new Error("Address not found.");
    error.code = "ADDRESS_NOT_FOUND";
    error.status = 404;
    throw error;
  }

  if (existing.userId !== userId) {
    const error = new Error("You do not have permission to modify this address.");
    error.code = "FORBIDDEN";
    error.status = 403;
    throw error;
  }

  return prisma.$transaction(async (tx) => {
    if (data.isDefault) {
      await tx.address.updateMany({
        where: { userId, isDefault: true, id: { not: addressId } },
        data: { isDefault: false },
      });
    }

    const updated = await tx.address.update({
      where: { id: addressId },
      data: {
        ...(data.recipientName ? { recipientName: data.recipientName } : {}),
        ...(data.phone ? { phone: data.phone } : {}),
        ...(data.line1 ? { line1: data.line1 } : {}),
        ...(data.line2 !== undefined ? { line2: data.line2 } : {}),
        ...(data.city ? { city: data.city } : {}),
        ...(data.state ? { state: data.state } : {}),
        ...(data.postalCode ? { postalCode: data.postalCode } : {}),
        ...(data.country ? { country: data.country } : {}),
        ...(data.isDefault !== undefined ? { isDefault: data.isDefault } : {}),
      },
    });

    return formatAddress(updated);
  });
}

/**
 * Deletes an address belonging to the user.
 */
export async function deleteAddress(userId, addressId) {
  const existing = await prisma.address.findUnique({
    where: { id: addressId },
  });

  if (!existing) {
    const error = new Error("Address not found.");
    error.code = "ADDRESS_NOT_FOUND";
    error.status = 404;
    throw error;
  }

  if (existing.userId !== userId) {
    const error = new Error("You do not have permission to delete this address.");
    error.code = "FORBIDDEN";
    error.status = 403;
    throw error;
  }

  await prisma.address.delete({
    where: { id: addressId },
  });

  return { success: true };
}
