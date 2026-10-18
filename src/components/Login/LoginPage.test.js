import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LoginPage from "./LoginPage";
import * as authApi from "../../services/authApi";

// Mock the authApi service to isolate frontend component behavior
jest.mock("../../services/authApi");

describe("VERTEX Redesigned LoginPage Component", () => {
  const mockOnLoginSuccess = jest.fn();
  const mockOnNavigateHome = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("1. Renders complete login card with VERTEX branding, inputs, and security badges", () => {
    render(
      <LoginPage
        onLoginSuccess={mockOnLoginSuccess}
        onNavigateHome={mockOnNavigateHome}
      />
    );

    // Brand and Heading
    expect(screen.getAllByText(/VERTEX/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: /Welcome back/i })).toBeInTheDocument();
    expect(
      screen.getByText(/Sign in to continue to your hardware store/i)
    ).toBeInTheDocument();

    // Inputs & Labels
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Remember me/i)).toBeInTheDocument();

    // Buttons & Links
    expect(
      screen.getByRole("button", { name: /Sign In →/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Forgot password\?/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Create an account/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Return to VERTEX storefront/i })
    ).toBeInTheDocument();

    // Security Notice
    expect(screen.getByText(/256-Bit SSL Encrypted/i)).toBeInTheDocument();
    expect(screen.getByText(/RFC 6238 TOTP 2FA/i)).toBeInTheDocument();
  });

  test("2. Toggles password visibility when clicking show/hide toggle button", () => {
    render(
      <LoginPage
        onLoginSuccess={mockOnLoginSuccess}
        onNavigateHome={mockOnNavigateHome}
      />
    );

    const passwordInput = screen.getByLabelText(/^Password$/i);
    const toggleButton = screen.getByRole("button", { name: /Show password/i });

    expect(passwordInput).toHaveAttribute("type", "password");

    // Click to show password
    fireEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: /Hide password/i })).toBeInTheDocument();

    // Click to hide password
    fireEvent.click(screen.getByRole("button", { name: /Hide password/i }));
    expect(passwordInput).toHaveAttribute("type", "password");
  });

  test("3. Validates required email and password fields on empty submission", () => {
    render(
      <LoginPage
        onLoginSuccess={mockOnLoginSuccess}
        onNavigateHome={mockOnNavigateHome}
      />
    );

    const submitBtn = screen.getByRole("button", { name: /Sign In →/i });

    // Submit empty form
    fireEvent.click(submitBtn);

    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent(/Please enter your email address/i);
    expect(authApi.loginUser).not.toHaveBeenCalled();

    // Fill invalid email without password
    const emailInput = screen.getByLabelText(/Email Address/i);
    fireEvent.change(emailInput, { target: { value: "invalid-email" } });
    fireEvent.click(submitBtn);

    expect(screen.getByRole("alert")).toHaveTextContent(/Please enter a valid email address/i);
  });

  test("4. Calls loginUser API with credentials and handles successful login", async () => {
    authApi.loginUser.mockResolvedValueOnce({
      success: true,
      user: {
        id: "usr-123",
        fullName: "Hardware Engineer",
        email: "engineer@vertex.in",
        role: "CUSTOMER",
      },
    });

    render(
      <LoginPage
        onLoginSuccess={mockOnLoginSuccess}
        onNavigateHome={mockOnNavigateHome}
      />
    );

    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: "engineer@vertex.in" },
    });
    fireEvent.change(screen.getByLabelText(/^Password$/i), {
      target: { value: "SecurePass123!" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Sign In →/i }));

    await waitFor(() => {
      expect(authApi.loginUser).toHaveBeenCalledWith({
        email: "engineer@vertex.in",
        password: "SecurePass123!",
      });
      expect(mockOnLoginSuccess).toHaveBeenCalledWith(
        expect.objectContaining({ email: "engineer@vertex.in" })
      );
    });
  });

  test("5. Seamlessly transitions to MFA verification when backend returns mfaRequired challenge", async () => {
    authApi.loginUser.mockResolvedValueOnce({
      success: true,
      mfaRequired: true,
      mfaChallengeToken: "raw-challenge-token-xyz",
      message: "Multi-factor authentication code required.",
    });

    render(
      <LoginPage
        onLoginSuccess={mockOnLoginSuccess}
        onNavigateHome={mockOnNavigateHome}
      />
    );

    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: "admin@vertex.in" },
    });
    fireEvent.change(screen.getByLabelText(/^Password$/i), {
      target: { value: "AdminSecret123!" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Sign In →/i }));

    // Should transition to MFA screen
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /Two-Factor Authentication/i })
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText(/6-Digit Security Code/i)
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Lost your phone\? Use a recovery code/i })
      ).toBeInTheDocument();
    });
  });

  test("6. Navigates to Forgot Password and back to Login smoothly", () => {
    render(
      <LoginPage
        onLoginSuccess={mockOnLoginSuccess}
        onNavigateHome={mockOnNavigateHome}
      />
    );

    // Click "Forgot password?"
    fireEvent.click(screen.getByRole("button", { name: /Forgot password\?/i }));

    expect(screen.getByRole("heading", { name: /Reset Password/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Account Email/i)).toBeInTheDocument();

    // Click "Back to Sign In"
    fireEvent.click(screen.getByRole("button", { name: /← Back to Sign In/i }));

    expect(screen.getByRole("heading", { name: /Welcome back/i })).toBeInTheDocument();
  });

  test("7. Navigates to Registration view with Customer and B2B tabs", () => {
    render(
      <LoginPage
        onLoginSuccess={mockOnLoginSuccess}
        onNavigateHome={mockOnNavigateHome}
      />
    );

    // Click "Create an account"
    fireEvent.click(screen.getByRole("button", { name: /Create an account/i }));

    expect(screen.getByRole("heading", { name: /Create an Account/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Makers & Engineers/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Business & Industry/i })).toBeInTheDocument();

    // Switch to B2B tab
    fireEvent.click(screen.getByRole("tab", { name: /Business & Industry/i }));
    expect(screen.getByLabelText(/Company \/ Organization/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/GSTIN/i)).toBeInTheDocument();

    // Click "Sign In instead"
    fireEvent.click(screen.getByRole("button", { name: /Sign In instead/i }));
    expect(screen.getByRole("heading", { name: /Welcome back/i })).toBeInTheDocument();
  });

  test("8. Calls onNavigateHome when clicking 'Back to Store'", () => {
    render(
      <LoginPage
        onLoginSuccess={mockOnLoginSuccess}
        onNavigateHome={mockOnNavigateHome}
      />
    );

    fireEvent.click(
      screen.getByRole("button", { name: /Return to VERTEX storefront/i })
    );
    expect(mockOnNavigateHome).toHaveBeenCalledTimes(1);
  });

  test("9. Handles long email address and long password without layout breaking", () => {
    render(
      <LoginPage
        onLoginSuccess={mockOnLoginSuccess}
        onNavigateHome={mockOnNavigateHome}
      />
    );

    const emailInput = screen.getByTestId("login-email-input");
    const passwordInput = screen.getByTestId("login-password-input");

    const longEmail = "hardware.procurement.lead.specialist.operations@vertexengineering.co.in";
    const longPassword = "SuperSecureComplexPassword123456789!@#$%^&*()_+~`";

    // Type long email
    fireEvent.change(emailInput, { target: { value: longEmail } });
    expect(emailInput).toHaveValue(longEmail);
    expect(emailInput).toHaveClass("vtx-input");

    // Type long password
    fireEvent.change(passwordInput, { target: { value: longPassword } });
    expect(passwordInput).toHaveValue(longPassword);
    expect(passwordInput).toHaveClass("vtx-input", "vtx-input-with-action");
  });

  test("10. Toggles long password visibility preserving typed value and accessible state", () => {
    render(
      <LoginPage
        onLoginSuccess={mockOnLoginSuccess}
        onNavigateHome={mockOnNavigateHome}
      />
    );

    const passwordInput = screen.getByTestId("login-password-input");
    const toggleButton = screen.getByTestId("login-password-toggle");

    const longPassword = "SuperSecureComplexPassword123456789!@#$%^&*()_+~`";
    fireEvent.change(passwordInput, { target: { value: longPassword } });

    // Initially masked
    expect(passwordInput).toHaveAttribute("type", "password");
    expect(toggleButton).toHaveAttribute("aria-label", "Show password");
    expect(toggleButton).toHaveAttribute("title", "Show password");
    expect(toggleButton.querySelector("svg")).toBeInTheDocument();

    // Click to show password
    fireEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute("type", "text");
    expect(passwordInput).toHaveValue(longPassword);
    expect(toggleButton).toHaveAttribute("aria-label", "Hide password");
    expect(toggleButton).toHaveAttribute("title", "Hide password");
    expect(toggleButton.querySelector("svg")).toBeInTheDocument();

    // Click to hide again
    fireEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute("type", "password");
    expect(passwordInput).toHaveValue(longPassword);
    expect(toggleButton).toHaveAttribute("aria-label", "Show password");
  });

  test("11. Verifies wrapper, icon aria-hidden, and keyboard focus behavior", () => {
    render(
      <LoginPage
        onLoginSuccess={mockOnLoginSuccess}
        onNavigateHome={mockOnNavigateHome}
      />
    );

    const emailInput = screen.getByTestId("login-email-input");
    const passwordInput = screen.getByTestId("login-password-input");
    const toggleButton = screen.getByTestId("login-password-toggle");

    // Verify keyboard focus
    emailInput.focus();
    expect(document.activeElement).toBe(emailInput);

    passwordInput.focus();
    expect(document.activeElement).toBe(passwordInput);

    toggleButton.focus();
    expect(document.activeElement).toBe(toggleButton);

    // Verify icons are present inside wrappers with aria-hidden="true"
    const wrappers = document.querySelectorAll(".vtx-input-wrapper");
    expect(wrappers.length).toBeGreaterThanOrEqual(2);

    wrappers.forEach((wrapper) => {
      const icon = wrapper.querySelector(".vtx-input-icon");
      if (icon) {
        expect(icon).toHaveAttribute("aria-hidden", "true");
      }
    });
  });
});
