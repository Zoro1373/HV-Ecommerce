import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AdminLayout from "./AdminLayout";
import * as adminApi from "../../services/adminApi";
import * as authApi from "../../services/authApi";

// Mock adminApi and authApi
jest.mock("../../services/adminApi");
jest.mock("../../services/authApi");

describe("VERTEX Admin Portal Suite", () => {
  const mockAdminUser = {
    id: "admin-uuid-1",
    fullName: "Chief Engineer",
    email: "admin@vertex.local",
    role: "ADMIN",
    mfaEnabled: true,
  };

  const mockCategories = [
    {
      id: "cat-1",
      name: "Electronics",
      slug: "electronics",
      icon: "🔌",
      productsCount: 4,
      description: "Microcontrollers and PLCs",
    },
    {
      id: "cat-2",
      name: "Screws & Fasteners",
      slug: "fasteners",
      icon: "🔩",
      productsCount: 1,
      description: "Hex bolts and screws",
    },
  ];

  const mockProducts = [
    {
      id: "prod-1",
      name: "Arduino Uno R3 Microcontroller Board",
      slug: "arduino-uno-r3",
      brand: "Arduino",
      hsnCode: "8542",
      gstRate: 18,
      category: { id: "cat-1", name: "Electronics", slug: "electronics" },
      price: 1299,
      variants: [
        {
          id: "var-1",
          sku: "ELEC-ARD-UNO-R3",
          partNumber: "A000066",
          name: "Standard Unit",
          price: 1299,
          stockQuantity: 50,
        },
      ],
    },
    {
      id: "prod-2",
      name: "Stainless Steel Hex Bolt (M8 x 30mm)",
      slug: "ss-hex-bolt-m8-30",
      brand: "VERTEX",
      hsnCode: "7318",
      gstRate: 18,
      category: { id: "cat-2", name: "Screws & Fasteners", slug: "fasteners" },
      price: 250,
      variants: [
        {
          id: "var-2",
          sku: "FAST-HEX-M8-30-P10",
          partNumber: "SS304-HEX-M8-30",
          name: "Pack of 10",
          price: 250,
          stockQuantity: 200,
        },
      ],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    adminApi.verifyAdminAuthorization.mockResolvedValue({
      status: "AUTHORIZED",
      user: mockAdminUser,
    });
    adminApi.getSystemHealth.mockResolvedValue({
      status: "UP",
      database: { connected: true, type: "PostgreSQL" },
    });
    adminApi.getAdminProducts.mockResolvedValue({
      products: mockProducts,
      pagination: { totalItems: 2, page: 1, totalPages: 1 },
    });
    adminApi.getAdminCategories.mockResolvedValue({
      categories: mockCategories,
    });
    adminApi.getAdminOrders.mockResolvedValue({
      isImplemented: false,
      orders: [],
    });
    adminApi.getAdminCustomers.mockResolvedValue({
      isImplemented: false,
      customers: [],
    });
    adminApi.getAdminAuditLogs.mockResolvedValue({
      isImplemented: false,
      logs: [],
    });
    authApi.getCurrentUser.mockResolvedValue({
      user: mockAdminUser,
    });
  });

  test("1. Verifies server-side authorization and displays loading state", async () => {
    adminApi.verifyAdminAuthorization.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ user: mockAdminUser }), 100))
    );

    render(<AdminLayout onNavigateHome={jest.fn()} onNavigateLogin={jest.fn()} />);

    expect(screen.getByText(/Verifying Admin Authorization/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/ADMIN CONSOLE/i)).toBeInTheDocument();
    });
  });

  test("2. Automatically redirects unauthenticated visitor to shared login page preserving destination", async () => {
    const error = new Error("Authentication required");
    error.status = 401;
    adminApi.verifyAdminAuthorization.mockRejectedValue(error);

    const mockNavigateLogin = jest.fn();
    render(<AdminLayout onNavigateHome={jest.fn()} onNavigateLogin={mockNavigateLogin} />);

    await waitFor(() => {
      expect(mockNavigateLogin).toHaveBeenCalledWith(expect.stringContaining("/admin"));
    });
  });

  test("3. Displays 403 Forbidden screen when user is logged in as non-admin", async () => {
    const error = new Error("Access denied. Insufficient permissions.");
    error.status = 403;
    adminApi.verifyAdminAuthorization.mockRejectedValue(error);

    render(<AdminLayout onNavigateHome={jest.fn()} onNavigateLogin={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Admin Access Restricted/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Switch to Admin Account/i })).toBeInTheDocument();
    });
  });

  test("4. Renders Dashboard with live metrics, system health, and low-stock alerts", async () => {
    render(<AdminLayout onNavigateHome={jest.fn()} onNavigateLogin={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Admin Overview/i)).toBeInTheDocument();
    });

    // Check KPI cards
    expect(screen.getByText(/Active Products/i)).toBeInTheDocument();
    expect(screen.getByText(/Total SKUs in Stock/i)).toBeInTheDocument();
    expect(screen.getByText(/PostgreSQL 18.6 Live/i)).toBeInTheDocument();

    // Check Low Stock telemetry item (Arduino Uno R3 has stock 50 <= 50)
    expect(screen.getByText(/Low Stock Telemetry/i)).toBeInTheDocument();
    expect(screen.getByText(/ELEC-ARD-UNO-R3/i)).toBeInTheDocument();
  });

  test("5. Navigates to Products section and allows inspecting product specifications", async () => {
    render(<AdminLayout onNavigateHome={jest.fn()} onNavigateLogin={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Admin Overview/i)).toBeInTheDocument();
    });

    // Click 'Products' in sidebar
    fireEvent.click(screen.getByTitle("Products"));

    await waitFor(() => {
      expect(screen.getByText(/Product Catalog Management/i)).toBeInTheDocument();
      expect(screen.getByText(/Arduino Uno R3 Microcontroller Board/i)).toBeInTheDocument();
      expect(screen.getByText(/Stainless Steel Hex Bolt/i)).toBeInTheDocument();
    });

    // Click 'Inspect' on first product
    const inspectBtns = screen.getAllByRole("button", { name: /Inspect/i });
    fireEvent.click(inspectBtns[0]);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText(/Product ID \(UUID\)/i)).toBeInTheDocument();
      expect(screen.getByText(/ELEC-ARD-UNO-R3/i)).toBeInTheDocument();
    });

    // Close modal
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  test("6. Navigates to Inventory section and displays variant SKU table with adjust modal", async () => {
    render(<AdminLayout onNavigateHome={jest.fn()} onNavigateLogin={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Admin Overview/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle("Inventory"));

    await waitFor(() => {
      expect(screen.getByText(/Inventory Telemetry & Stock Control/i)).toBeInTheDocument();
      expect(screen.getByText(/ELEC-ARD-UNO-R3/i)).toBeInTheDocument();
      expect(screen.getByText(/FAST-HEX-M8-30-P10/i)).toBeInTheDocument();
    });

    // Click 'Adjust Stock'
    const adjustBtns = screen.getAllByRole("button", { name: /Adjust Stock/i });
    fireEvent.click(adjustBtns[0]);

    await waitFor(() => {
      expect(screen.getByText(/Adjust Inventory Stock: ELEC-ARD-UNO-R3/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/New Stock Quantity/i)).toBeInTheDocument();
    });

    // Close adjust modal
    fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));
  });

  test("7. Navigates to Categories, Orders, and Settings sections smoothly", async () => {
    render(<AdminLayout onNavigateHome={jest.fn()} onNavigateLogin={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Admin Overview/i)).toBeInTheDocument();
    });

    // Categories
    fireEvent.click(screen.getByTitle("Categories"));
    await waitFor(() => {
      expect(screen.getByText(/Category Hierarchy Management/i)).toBeInTheDocument();
    });

    // Orders
    fireEvent.click(screen.getByTitle("Orders"));
    await waitFor(() => {
      expect(screen.getByText(/Orders & Fulfillment Management/i)).toBeInTheDocument();
      expect(screen.getByText(/Phase 6 Engineering Roadmap Status/i)).toBeInTheDocument();
    });

    // Settings
    fireEvent.click(screen.getByTitle("Settings"));
    await waitFor(() => {
      expect(screen.getByText(/System Configuration & Store Settings/i)).toBeInTheDocument();
      expect(screen.getByText(/Neon Serverless PostgreSQL/i)).toBeInTheDocument();
    });
  });

  test("8. Triggers storefront return navigation and logout handlers", async () => {
    const mockNavigateHome = jest.fn();
    const mockNavigateLogin = jest.fn();
    authApi.logoutUser.mockResolvedValue({ success: true });

    render(
      <AdminLayout
        onNavigateHome={mockNavigateHome}
        onNavigateLogin={mockNavigateLogin}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Admin Overview/i)).toBeInTheDocument();
    });

    // Click 'Storefront ↗'
    fireEvent.click(screen.getByTitle("View customer storefront"));
    expect(mockNavigateHome).toHaveBeenCalled();

    // Click 'Sign Out'
    fireEvent.click(screen.getByRole("button", { name: /Sign Out/i }));
    await waitFor(() => {
      expect(authApi.logoutUser).toHaveBeenCalled();
      expect(mockNavigateLogin).toHaveBeenCalled();
    });
  });
});
