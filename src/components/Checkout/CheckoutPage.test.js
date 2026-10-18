import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CheckoutPage from "./CheckoutPage";
import * as orderApi from "../../services/orderApi";

jest.mock("../../services/orderApi");

describe("CheckoutPage Component Suite", () => {
  const mockUser = {
    id: "user-123",
    email: "customer@vertex.local",
    fullName: "Jane Customer",
    phone: "+91 98765 43210",
  };

  const mockCart = {
    id: "cart-123",
    userId: "user-123",
    totalQuantity: 3,
    subtotal: 1799.00,
    items: [
      {
        id: "item-1",
        variantId: "var-1",
        quantity: 1,
        unitPrice: 1299.00,
        lineTotal: 1299.00,
        isAvailable: true,
        variant: {
          id: "var-1",
          sku: "ARD-UNO-R3",
          packSize: "1 Unit",
        },
        product: {
          id: "prod-1",
          name: "Arduino Uno R3 Microcontroller Board",
        },
      },
      {
        id: "item-2",
        variantId: "var-2",
        quantity: 2,
        unitPrice: 250.00,
        lineTotal: 500.00,
        isAvailable: true,
        variant: {
          id: "var-2",
          sku: "BOLT-HEX-M8",
          packSize: "Pack of 10",
        },
        product: {
          id: "prod-2",
          name: "Stainless Steel Hex Bolt (M8 x 30mm)",
        },
      },
    ],
  };

  const mockAddresses = [
    {
      id: "addr-1",
      userId: "user-123",
      recipientName: "Jane Customer",
      phone: "+91 98765 43210",
      line1: "123 Tech Park, Hitech City",
      line2: "Floor 4",
      city: "Hyderabad",
      state: "Telangana",
      postalCode: "500081",
      country: "India",
      isDefault: true,
    },
    {
      id: "addr-2",
      userId: "user-123",
      recipientName: "Jane Alternate",
      phone: "+91 98765 99999",
      line1: "456 Industrial Colony",
      city: "Bengaluru",
      state: "Karnataka",
      postalCode: "560001",
      country: "India",
      isDefault: false,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    orderApi.getAddresses.mockResolvedValue({ success: true, addresses: mockAddresses });
  });

  test("1. Renders authentication required card when currentUser is null", () => {
    const handleLogin = jest.fn();
    render(
      <CheckoutPage
        currentUser={null}
        cart={mockCart}
        onNavigateHome={() => {}}
        onNavigateLogin={handleLogin}
      />
    );

    expect(screen.getByTestId("checkout-auth-required")).toBeInTheDocument();
    expect(screen.getByText(/Authentication Required/i)).toBeInTheDocument();

    const loginBtn = screen.getByTestId("checkout-login-btn");
    fireEvent.click(loginBtn);
    expect(handleLogin).toHaveBeenCalledWith("/checkout");
  });

  test("2. Displays saved addresses and selects default address", async () => {
    render(
      <CheckoutPage
        currentUser={mockUser}
        cart={mockCart}
        onNavigateHome={() => {}}
        onNavigateLogin={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("address-card-addr-1")).toBeInTheDocument();
      expect(screen.getByTestId("address-card-addr-2")).toBeInTheDocument();
    });

    const defaultRadio = screen.getByDisplayValue("addr-1");
    expect(defaultRadio).toBeChecked();
  });

  test("3. Displays cart items and server-calculated totals in order summary", async () => {
    render(
      <CheckoutPage
        currentUser={mockUser}
        cart={mockCart}
        onNavigateHome={() => {}}
        onNavigateLogin={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("checkout-summary-card")).toBeInTheDocument();
      expect(screen.getByText("Arduino Uno R3 Microcontroller Board")).toBeInTheDocument();
      expect(screen.getByText("Stainless Steel Hex Bolt (M8 x 30mm)")).toBeInTheDocument();
      expect(screen.getByTestId("summary-subtotal")).toHaveTextContent("₹1,799.00");
    });
  });

  test("4. Submits order using selected address and shows confirmation screen", async () => {
    const mockCreatedOrder = {
      id: "ord-new-123",
      orderNumber: "VTX-20261018-99999",
      userId: "user-123",
      orderStatus: "PENDING",
      paymentStatus: "PENDING",
      paymentMethod: "COD",
      subtotal: 1799.00,
      taxAmount: 269.82,
      shippingFee: 0.00,
      totalAmount: 2068.82,
      shippingAddress: {
        recipientName: "Jane Customer",
        phone: "+91 98765 43210",
        line1: "123 Tech Park, Hitech City",
        line2: "Floor 4",
        city: "Hyderabad",
        state: "Telangana",
        postalCode: "500081",
        country: "India",
      },
      items: [
        {
          id: "it-1",
          sku: "ARD-UNO-R3",
          productName: "Arduino Uno R3 Microcontroller Board",
          packSize: "1 Unit",
          quantity: 1,
          unitPrice: 1299.00,
          gstRate: 18.00,
          taxAmount: 233.82,
          lineTotal: 1532.82,
        },
      ],
    };

    orderApi.placeOrder.mockResolvedValue({
      success: true,
      order: mockCreatedOrder,
    });

    const handleSuccess = jest.fn();

    render(
      <CheckoutPage
        currentUser={mockUser}
        cart={mockCart}
        onNavigateHome={() => {}}
        onNavigateLogin={() => {}}
        onOrderSuccess={handleSuccess}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("place-order-btn")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("place-order-btn"));

    await waitFor(() => {
      expect(orderApi.placeOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          addressId: "addr-1",
          paymentMethod: "COD",
        })
      );
      expect(screen.getByTestId("order-confirmation-view")).toBeInTheDocument();
      expect(screen.getByTestId("confirmed-order-number")).toHaveTextContent("VTX-20261018-99999");
      expect(screen.getByTestId("confirmed-order-status")).toHaveTextContent("PENDING");
      expect(screen.getByTestId("confirmed-payment-status")).toHaveTextContent(/PENDING \(COD\)/i);
      expect(handleSuccess).toHaveBeenCalledWith(mockCreatedOrder);
    });
  });

  test("5. Validates new address form inputs when no saved address is used", async () => {
    orderApi.getAddresses.mockResolvedValue({ success: true, addresses: [] });

    render(
      <CheckoutPage
        currentUser={mockUser}
        cart={mockCart}
        onNavigateHome={() => {}}
        onNavigateLogin={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("input-address-line1")).toBeInTheDocument();
    });

    // Clear city and postal code to trigger errors
    fireEvent.change(screen.getByTestId("input-address-city"), { target: { value: "" } });
    fireEvent.change(screen.getByTestId("input-address-postal"), { target: { value: "" } });

    fireEvent.click(screen.getByTestId("place-order-btn"));

    await waitFor(() => {
      expect(screen.getByText(/Address Line 1 must be at least 3 characters/i)).toBeInTheDocument();
      expect(screen.getByText(/City is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Postal code is required/i)).toBeInTheDocument();
      expect(orderApi.placeOrder).not.toHaveBeenCalled();
    });
  });

  test("6. Displays error banner when order placement fails with server error", async () => {
    orderApi.placeOrder.mockRejectedValue(
      new Error("Insufficient stock for Arduino Uno R3. Available: 0, Requested: 1.")
    );

    render(
      <CheckoutPage
        currentUser={mockUser}
        cart={mockCart}
        onNavigateHome={() => {}}
        onNavigateLogin={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("address-card-addr-1")).toBeInTheDocument();
      expect(screen.getByTestId("place-order-btn")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("place-order-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("checkout-error-banner")).toBeInTheDocument();
      expect(screen.getByText(/Insufficient stock for Arduino Uno R3/i)).toBeInTheDocument();
    });

    // Dismiss error banner
    fireEvent.click(screen.getByRole("button", { name: /Dismiss error/i }));
    await waitFor(() => {
      expect(screen.queryByTestId("checkout-error-banner")).not.toBeInTheDocument();
    });
  });
});
