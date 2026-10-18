import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App.jsx';
import * as authApi from './services/authApi';
import * as adminApi from './services/adminApi';

jest.mock('./services/authApi');
jest.mock('./services/adminApi');

describe('VERTEX Unified Login & Role-Based Routing Suite', () => {
  const mockAdminUser = {
    id: 'admin-uuid-1',
    fullName: 'Chief Engineer',
    email: 'admin@vertex.local',
    role: 'ADMIN',
    mfaEnabled: true,
  };

  const mockCustomerUser = {
    id: 'cust-uuid-1',
    fullName: 'Jane Customer',
    email: 'customer@vertex.local',
    role: 'CUSTOMER',
    mfaEnabled: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    window.history.pushState({}, '', '/');

    // Default: unauthenticated visitor
    authApi.getCurrentUser.mockResolvedValue({ user: null });
    authApi.logoutUser.mockResolvedValue({ success: true });

    adminApi.verifyAdminAuthorization.mockResolvedValue({
      status: 'AUTHORIZED',
      user: mockAdminUser,
    });
    adminApi.getSystemHealth.mockResolvedValue({
      status: 'UP',
      database: { connected: true, type: 'PostgreSQL' },
    });
    adminApi.getAdminProducts.mockResolvedValue({ products: [], pagination: { totalItems: 0 } });
    adminApi.getAdminCategories.mockResolvedValue({ categories: [] });
  });

  test('1. Renders VERTEX storefront header and brand tagline', async () => {
    render(<App />);
    expect(screen.getAllByText(/VERTEX/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/BUILD BETTER TOGETHER/i).length).toBeGreaterThan(0);
  });

  test('2. Storefront Login/Register button opens shared login page', async () => {
    render(<App />);
    const loginBtn = screen.getByRole('button', { name: /Login \/ Register/i });
    fireEvent.click(loginBtn);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Welcome back/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    });
  });

  test('3. Admin signs in through the shared login page and reaches /admin', async () => {
    authApi.loginUser.mockResolvedValue({
      success: true,
      user: mockAdminUser,
    });

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Login \/ Register/i }));

    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'admin@vertex.local' } });
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'AdminPass123!' } });
    fireEvent.click(screen.getByRole('button', { name: /Sign In →/i }));

    await waitFor(() => {
      expect(screen.getByText(/ADMIN CONSOLE/i)).toBeInTheDocument();
      expect(window.location.pathname).toBe('/admin');
    });
  });

  test('4. Customer signs in through the same login page and reaches the storefront', async () => {
    authApi.loginUser.mockResolvedValue({
      success: true,
      user: mockCustomerUser,
    });

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Login \/ Register/i }));

    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'customer@vertex.local' } });
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'CustomerPass123!' } });
    fireEvent.click(screen.getByRole('button', { name: /Sign In →/i }));

    await waitFor(() => {
      expect(screen.getByText(/Welcome back, Jane Customer!/i)).toBeInTheDocument();
      expect(window.location.pathname).toBe('/');
      expect(screen.queryByLabelText(/Admin Navigation/i)).not.toBeInTheDocument();
      expect(screen.queryByText('ADMIN CONSOLE')).not.toBeInTheDocument();
    });
  });

  test('5. MFA works within the same shared login flow before routing admin to /admin', async () => {
    authApi.loginUser.mockResolvedValue({
      mfaRequired: true,
      mfaChallengeToken: 'test-challenge-token-123',
    });
    authApi.verifyMfaLogin.mockResolvedValue({
      success: true,
      user: mockAdminUser,
    });

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Login \/ Register/i }));

    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'admin@vertex.local' } });
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'AdminPass123!' } });
    fireEvent.click(screen.getByRole('button', { name: /Sign In →/i }));

    // MFA challenge view within the same card
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Two-Factor Authentication/i })).toBeInTheDocument();
    });

    const mfaInput = screen.getByLabelText(/6-Digit Security Code/i);
    fireEvent.change(mfaInput, { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: /Verify & Continue →/i }));

    await waitFor(() => {
      expect(screen.getByText('ADMIN CONSOLE')).toBeInTheDocument();
      expect(window.location.pathname).toBe('/admin');
    });
  });

  test('6. Direct navigation to /admin while logged out redirects to shared login page preserving destination', async () => {
    window.history.pushState({}, '', '/admin/inventory');
    const err401 = new Error('Authentication required');
    err401.status = 401;
    adminApi.verifyAdminAuthorization.mockRejectedValue(err401);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Welcome back/i })).toBeInTheDocument();
      expect(window.location.pathname).toBe('/login');
      expect(window.location.search).toContain('redirect=%2Fadmin');
    });
  });

  test('7. Authenticated customer attempting to access /admin sees access-denied screen', async () => {
    window.history.pushState({}, '', '/admin');
    const err403 = new Error('Access denied. Insufficient permissions.');
    err403.status = 403;
    adminApi.verifyAdminAuthorization.mockRejectedValue(err403);
    authApi.getCurrentUser.mockResolvedValue({ user: mockCustomerUser });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Admin Access Restricted/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Return to Storefront/i })).toBeInTheDocument();
    });
  });

  test('8. Refreshing /admin with an existing valid admin session preserves admin access directly', async () => {
    window.history.pushState({}, '', '/admin');
    authApi.getCurrentUser.mockResolvedValue({ user: mockAdminUser });
    adminApi.verifyAdminAuthorization.mockResolvedValue({
      status: 'AUTHORIZED',
      user: mockAdminUser,
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/ADMIN CONSOLE/i)).toBeInTheDocument();
      expect(window.location.pathname).toBe('/admin');
    });
  });
});
