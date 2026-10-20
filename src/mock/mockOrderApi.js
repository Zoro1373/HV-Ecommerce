/**
 * VERTEX Mock Order & Address API Service
 * 
 * Provides simulated checkout, order placement, and address book management.
 * Explicitly labels all mock orders and operations as simulated development mode.
 */

import { MOCK_ADDRESSES, MOCK_ORDERS } from "./mockData";
import { clearCart } from "./mockCartApi";

const ADDRESS_STORAGE_KEY = "vertex_mock_addresses";
const ORDERS_STORAGE_KEY = "vertex_mock_orders";

function getStoredAddresses() {
  if (typeof window === "undefined" || !window.localStorage) return [...MOCK_ADDRESSES];
  try {
    const raw = window.localStorage.getItem(ADDRESS_STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(ADDRESS_STORAGE_KEY, JSON.stringify(MOCK_ADDRESSES));
      return [...MOCK_ADDRESSES];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [...MOCK_ADDRESSES];
  } catch {
    return [...MOCK_ADDRESSES];
  }
}

function saveStoredAddresses(addresses) {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(ADDRESS_STORAGE_KEY, JSON.stringify(addresses));
  } catch {
    // Ignore
  }
}

function getStoredOrders() {
  if (typeof window === "undefined" || !window.localStorage) return [...MOCK_ORDERS];
  try {
    const raw = window.localStorage.getItem(ORDERS_STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(MOCK_ORDERS));
      return [...MOCK_ORDERS];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [...MOCK_ORDERS];
  } catch {
    return [...MOCK_ORDERS];
  }
}

function saveStoredOrders(orders) {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
  } catch {
    // Ignore
  }
}

export async function getAddresses() {
  await new Promise((r) => setTimeout(r, 40));
  const addresses = getStoredAddresses();
  return {
    success: true,
    addresses,
  };
}

export async function saveAddress(addressData) {
  await new Promise((r) => setTimeout(r, 50));
  const addresses = getStoredAddresses();
  const isDefault = addressData.isDefault || addresses.length === 0;

  if (isDefault) {
    addresses.forEach((a) => (a.isDefault = false));
  }

  const newAddress = {
    id: `mock-addr-${Date.now()}`,
    userId: "mock-user-customer-1",
    recipientName: addressData.recipientName || "Valued Customer",
    phone: addressData.phone || "+91 98765 43210",
    line1: addressData.line1 || "",
    line2: addressData.line2 || "",
    city: addressData.city || "",
    state: addressData.state || "",
    postalCode: addressData.postalCode || "",
    country: addressData.country || "India",
    isDefault,
    createdAt: new Date().toISOString(),
  };

  addresses.push(newAddress);
  saveStoredAddresses(addresses);

  return {
    success: true,
    address: newAddress,
  };
}

export async function deleteAddress(addressId) {
  await new Promise((r) => setTimeout(r, 40));
  let addresses = getStoredAddresses();
  addresses = addresses.filter((a) => a.id !== addressId);
  saveStoredAddresses(addresses);
  return {
    success: true,
    message: "Address deleted successfully.",
  };
}

export async function placeOrder({
  addressId,
  shippingAddress,
  paymentMethod = "COD",
  notes = "",
  idempotencyKey,
}) {
  await new Promise((r) => setTimeout(r, 100));

  // Determine delivery address
  let targetAddress = shippingAddress;
  if (!targetAddress && addressId) {
    const addresses = getStoredAddresses();
    targetAddress = addresses.find((a) => a.id === addressId);
  }
  if (!targetAddress) {
    targetAddress = {
      recipientName: "Demo Developer (Mock)",
      phone: "+91 98765 43210",
      line1: "Sample Engineering Lab, Tech Park",
      city: "Bengaluru",
      state: "Karnataka",
      postalCode: "560100",
      country: "India",
    };
  }

  // Clear mock cart upon successful order
  await clearCart();

  const mockOrderNumber = `MOCK-${Math.floor(100000 + Math.random() * 900000)}`;
  const order = {
    id: `mock-order-${Date.now()}`,
    orderNumber: mockOrderNumber,
    userId: "mock-user-customer-1",
    status: "PROCESSING",
    paymentMethod,
    paymentStatus: "PENDING (Mock Dev Mode)",
    subtotal: 1299.0,
    shippingFee: 0.0,
    taxTotal: 233.82,
    totalAmount: 1532.82,
    notes: `[MOCK DEV MODE - SIMULATED ORDER] ${notes || ""}`.trim(),
    createdAt: new Date().toISOString(),
    shippingAddress: targetAddress,
    items: [],
    idempotencyKey: idempotencyKey || null,
  };

  const orders = getStoredOrders();
  orders.unshift(order);
  saveStoredOrders(orders);

  return {
    success: true,
    order,
  };
}

export async function getOrders() {
  await new Promise((r) => setTimeout(r, 40));
  const orders = getStoredOrders();
  return {
    success: true,
    orders,
  };
}

export async function getOrderById(orderIdentifier) {
  await new Promise((r) => setTimeout(r, 40));
  const orders = getStoredOrders();
  const order = orders.find(
    (o) => o.id === orderIdentifier || o.orderNumber === orderIdentifier
  );

  if (!order) {
    const error = new Error(`Order "${orderIdentifier}" not found.`);
    error.status = 404;
    error.code = "ORDER_NOT_FOUND";
    throw error;
  }

  return {
    success: true,
    order,
  };
}
