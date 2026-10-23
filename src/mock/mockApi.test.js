import { isMockApiEnabled, setMockMode } from "./mockConfig";
import * as mockCatalogApi from "./mockCatalogApi";
import * as mockCartApi from "./mockCartApi";
import * as mockAuthApi from "./mockAuthApi";
import * as mockOrderApi from "./mockOrderApi";
import * as mockAdminApi from "./mockAdminApi";

describe("VERTEX Frontend-Only Development Mock Mode Suite", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    if (typeof window !== "undefined") {
      window.sessionStorage.clear();
      window.localStorage.clear();
    }
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("1. Strict Security Guard & Configuration", () => {
    test("Strict Production Guard: ALWAYS returns false in production regardless of flags", () => {
      process.env.NODE_ENV = "production";
      process.env.REACT_APP_USE_MOCK_API = "true";
      window.sessionStorage.setItem("vertex_mock_mode", "true");

      expect(isMockApiEnabled()).toBe(false);
    });

    test("Non-production: returns true when REACT_APP_USE_MOCK_API is true", () => {
      process.env.NODE_ENV = "development";
      process.env.REACT_APP_USE_MOCK_API = "true";

      expect(isMockApiEnabled()).toBe(true);
    });

    test("Non-production: respects setMockMode sessionStorage override", () => {
      process.env.NODE_ENV = "development";
      delete process.env.REACT_APP_USE_MOCK_API;

      expect(isMockApiEnabled()).toBe(false);
      setMockMode(true);
      expect(isMockApiEnabled()).toBe(true);
      setMockMode(false);
      expect(isMockApiEnabled()).toBe(false);
    });
  });

  describe("2. Mock Catalog API", () => {
    test("getCategories returns realistic categories", async () => {
      const res = await mockCatalogApi.getCategories();
      expect(res.success).toBe(true);
      expect(res.categories.length).toBeGreaterThanOrEqual(4);
      expect(res.categories.some((c) => c.slug === "electronics")).toBe(true);
      expect(res.categories.some((c) => c.slug === "fasteners")).toBe(true);
    });

    test("getCategoryBySlug returns category and associated products", async () => {
      const res = await mockCatalogApi.getCategoryBySlug("electronics");
      expect(res.success).toBe(true);
      expect(res.category.slug).toBe("electronics");
      expect(res.products.length).toBeGreaterThan(0);
      expect(res.products.every((p) => p.categoryId === "cat-electronics" || p.category?.slug === "electronics")).toBe(true);
    });

    test("getProducts filters by search query", async () => {
      const res = await mockCatalogApi.getProducts({ q: "arduino" });
      expect(res.success).toBe(true);
      expect(res.products.length).toBeGreaterThanOrEqual(1);
      expect(res.products[0].name.toLowerCase()).toContain("arduino");
    });

    test("getProducts sorts correctly by price", async () => {
      const ascRes = await mockCatalogApi.getProducts({ sort: "price_asc", limit: 10 });
      for (let i = 0; i < ascRes.products.length - 1; i++) {
        expect(Number(ascRes.products[i].price)).toBeLessThanOrEqual(Number(ascRes.products[i + 1].price));
      }

      const descRes = await mockCatalogApi.getProducts({ sort: "price_desc", limit: 10 });
      for (let i = 0; i < descRes.products.length - 1; i++) {
        expect(Number(descRes.products[i].price)).toBeGreaterThanOrEqual(Number(descRes.products[i + 1].price));
      }
    });

    test("getProductBySlug returns product with purchasable variants", async () => {
      const res = await mockCatalogApi.getProductBySlug("arduino-uno-r3");
      expect(res.success).toBe(true);
      expect(res.product.slug).toBe("arduino-uno-r3");
      expect(res.product.variants.length).toBeGreaterThan(0);
      expect(res.product.variants[0].sku).toBe("ELEC-ARD-UNO-R3");
    });
  });

  describe("3. Mock Persistent Cart API", () => {
    test("Supports adding, updating quantity, and removing items with accurate math", async () => {
      // 1. Initial cart is empty
      const initial = await mockCartApi.getCart();
      expect(initial.cart.itemCount).toBe(0);
      expect(initial.cart.subtotal).toBe(0);

      // 2. Add an item
      const added = await mockCartApi.addItemToCart({ variantId: "var-ard-uno-r3", quantity: 2 });
      expect(added.success).toBe(true);
      expect(added.cart.itemCount).toBe(1);
      expect(added.cart.totalQuantity).toBe(2);
      expect(added.cart.subtotal).toBe(2598.0); // 1299 * 2

      // 3. Update quantity
      const itemId = added.cart.items[0].id;
      const updated = await mockCartApi.updateCartItemQuantity(itemId, 3);
      expect(updated.cart.totalQuantity).toBe(3);
      expect(updated.cart.subtotal).toBe(3897.0); // 1299 * 3

      // 4. Remove item
      const removed = await mockCartApi.removeCartItem(itemId);
      expect(removed.cart.itemCount).toBe(0);
      expect(removed.cart.subtotal).toBe(0);

      // 5. Clear cart
      await mockCartApi.addItemToCart({ variantId: "var-ard-uno-r3", quantity: 1 });
      const cleared = await mockCartApi.clearCart();
      expect(cleared.cart.itemCount).toBe(0);
    });
  });

  describe("4. Mock Simulated Authentication API", () => {
    test("Simulates customer and admin logins with appropriate roles", async () => {
      // 1. Customer login
      const custRes = await mockAuthApi.loginUser({
        email: "customer@vertex.local",
        password: "Password123!",
      });
      expect(custRes.success).toBe(true);
      expect(custRes.user.role).toBe("CUSTOMER");
      expect(custRes.user.email).toBe("customer@vertex.local");

      const meCust = await mockAuthApi.getCurrentUser();
      expect(meCust.user.role).toBe("CUSTOMER");

      // 2. Admin login
      const adminRes = await mockAuthApi.loginUser({
        email: "admin@vertex.local",
        password: "AdminPassword123!",
      });
      expect(adminRes.success).toBe(true);
      expect(adminRes.user.role).toBe("ADMIN");

      const adminCheck = await mockAuthApi.verifyAdminAccess();
      expect(adminCheck.authorized).toBe(true);

      // 3. Logout
      await mockAuthApi.logoutUser();
      await expect(mockAuthApi.getCurrentUser()).rejects.toThrow("Not authenticated");
    });
  });

  describe("5. Mock Simulated Checkout & Address API", () => {
    test("Saves addresses and places clearly-labeled simulated orders", async () => {
      // 1. Get addresses
      const addrRes = await mockOrderApi.getAddresses();
      expect(addrRes.addresses.length).toBeGreaterThan(0);

      // 2. Save a new address
      const newAddrRes = await mockOrderApi.saveAddress({
        recipientName: "Test Developer",
        line1: "123 Tech Avenue",
        city: "Bengaluru",
        state: "Karnataka",
        postalCode: "560001",
        isDefault: false,
      });
      expect(newAddrRes.success).toBe(true);
      expect(newAddrRes.address.recipientName).toBe("Test Developer");

      // 3. Place order
      const orderRes = await mockOrderApi.placeOrder({
        addressId: newAddrRes.address.id,
        paymentMethod: "COD",
        notes: "Dev test order",
      });

      expect(orderRes.success).toBe(true);
      expect(orderRes.order.orderNumber).toMatch(/^MOCK-\d+$/);
      expect(orderRes.order.status).toBe("PENDING");
      expect(orderRes.order.orderStatus).toBe("PENDING");
      expect(orderRes.order.paymentStatus).toContain("Mock Dev Mode");
      expect(orderRes.order.notes).toContain("MOCK DEV MODE");

      // 4. Cart should be cleared after order
      const cartAfterOrder = await mockCartApi.getCart();
      expect(cartAfterOrder.cart.itemCount).toBe(0);

      // 5. Customer can list their orders
      const listRes = await mockOrderApi.getOrders();
      expect(listRes.success).toBe(true);
      expect(listRes.orders.some((o) => o.orderNumber === orderRes.order.orderNumber)).toBe(true);

      // 6. Customer can fetch order by id or orderNumber
      const singleRes = await mockOrderApi.getOrderById(orderRes.order.orderNumber);
      expect(singleRes.success).toBe(true);
      expect(singleRes.order.id).toBe(orderRes.order.id);

      // 7. Customer can cancel an eligible PENDING order
      const cancelRes = await mockOrderApi.cancelOrder(orderRes.order.id, {
        reason: "Ordered wrong variant by accident",
      });
      expect(cancelRes.success).toBe(true);
      expect(cancelRes.order.status).toBe("CANCELLED");
      expect(cancelRes.order.orderStatus).toBe("CANCELLED");
      expect(cancelRes.order.notes).toContain("Ordered wrong variant by accident");

      // 8. Cannot cancel already cancelled order
      await expect(mockOrderApi.cancelOrder(orderRes.order.id)).rejects.toMatchObject({
        code: "ORDER_ALREADY_CANCELLED",
      });

      // 9. Cannot cancel non-cancellable order (e.g. PROCESSING mock-order-1)
      await expect(mockOrderApi.cancelOrder("mock-order-1")).rejects.toMatchObject({
        code: "ORDER_NOT_CANCELLABLE",
      });

      // 10. 404 for non-existent order
      await expect(mockOrderApi.cancelOrder("UNKNOWN_ORD_9999")).rejects.toMatchObject({
        code: "ORDER_NOT_FOUND",
      });
    });
  });

  describe("6. Mock Admin API", () => {
    test("Provides health check and admin portal metrics", async () => {
      const health = await mockAdminApi.getSystemHealth();
      expect(health.status).toBe("UP");
      expect(health.database.connected).toBe(true);
      expect(health.database.type).toContain("Mock Dev Mode");

      const auth = await mockAdminApi.verifyAdminAuthorization();
      expect(auth.authorized).toBe(true);
      expect(auth.user.role).toBe("ADMIN");

      const orders = await mockAdminApi.getAdminOrders();
      expect(orders.isImplemented).toBe(true);
      expect(orders.orders.length).toBeGreaterThanOrEqual(1);
    });

    test("verifyAdminAuthorization strictly throws 403 Forbidden if simulated user is CUSTOMER", async () => {
      window.localStorage.setItem(
        "vertex_mock_user",
        JSON.stringify({ id: "cust-1", email: "cust@example.com", role: "CUSTOMER" })
      );

      await expect(mockAdminApi.verifyAdminAuthorization()).rejects.toMatchObject({
        status: 403,
        code: "FORBIDDEN",
        message: expect.stringContaining("Admin privileges required"),
      });
    });

    test("verifyAdminAuthorization succeeds and returns admin session when ADMIN is simulated", async () => {
      window.localStorage.setItem(
        "vertex_mock_user",
        JSON.stringify({ id: "adm-1", email: "admin@vertex.local", role: "ADMIN" })
      );

      const auth = await mockAdminApi.verifyAdminAuthorization();
      expect(auth.authorized).toBe(true);
      expect(auth.user.role).toBe("ADMIN");
      expect(auth.user.email).toBe("admin@vertex.local");
    });

    test("getAdminOrderById retrieves single order by UUID or orderNumber", async () => {
      const byId = await mockAdminApi.getAdminOrderById("mock-order-1");
      expect(byId.success).toBe(true);
      expect(byId.order.id).toBe("mock-order-1");
      expect(byId.order.orderNumber).toBe("MOCK-100482");
      expect(byId.order.items.length).toBeGreaterThan(0);

      const byNumber = await mockAdminApi.getAdminOrderById("MOCK-100482");
      expect(byNumber.success).toBe(true);
      expect(byNumber.order.id).toBe("mock-order-1");
    });

    test("getAdminOrderById throws 404 for unknown order identifier", async () => {
      await expect(mockAdminApi.getAdminOrderById("NON_EXISTENT_ORD")).rejects.toMatchObject({
        status: 404,
        code: "ORDER_NOT_FOUND",
      });
    });

    test("submitMockQuote submits quote and lists in admin quotes", async () => {
      const res = await mockAdminApi.submitMockQuote({
        contactName: "Sunita Rao",
        email: "sunita@aerotech.in",
        phone: "+91 9988776655",
        companyName: "AeroTech Components",
        productDetails: "Stainless Steel Hex Bolt (M8 x 50mm)",
        quantity: 250,
      });
      expect(res.success).toBe(true);
      expect(res.quote.contactName).toBe("Sunita Rao");

      const list = await mockAdminApi.getAdminQuotes();
      expect(list.quotes.some((q) => q.email === "sunita@aerotech.in")).toBe(true);

      const single = await mockAdminApi.getAdminQuoteById(res.quote.id);
      expect(single.quote.contactName).toBe("Sunita Rao");

      const updated = await mockAdminApi.updateAdminQuote(res.quote.id, {
        status: "QUOTED",
        quotedAmount: 18500,
      });
      expect(updated.quote.status).toBe("QUOTED");
      expect(updated.quote.quotedAmount).toBe(18500);
    });

    test("getAdminNewsletter returns subscriber list", async () => {
      const subs = await mockAdminApi.getAdminNewsletter();
      expect(subs.success).toBe(true);
      expect(subs.subscriptions.length).toBeGreaterThan(0);
    });

    test("getAdminCustomerDetails returns full customer profile and 404 for unknown", async () => {
      const details = await mockAdminApi.getAdminCustomerDetails("mock-user-customer-1");
      expect(details.success).toBe(true);
      expect(details.customer.email).toBe("customer@vertex.local");
      expect(details.customer.addresses.length).toBeGreaterThan(0);
      expect(details.customer.metrics).toBeDefined();

      await expect(mockAdminApi.getAdminCustomerDetails("NON_EXISTENT_CUST")).rejects.toMatchObject({
        status: 404,
        code: "CUSTOMER_NOT_FOUND",
      });
    });
  });
});

