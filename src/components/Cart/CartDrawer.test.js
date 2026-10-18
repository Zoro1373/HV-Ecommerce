import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CartDrawer from './CartDrawer';

describe('CartDrawer Component', () => {
  const mockCart = {
    id: 'cart-123',
    userId: 'user-123',
    totalQuantity: 3,
    subtotal: 1799.00,
    items: [
      {
        id: 'item-1',
        variantId: 'var-1',
        quantity: 1,
        unitPrice: 1299.00,
        lineTotal: 1299.00,
        isAvailable: true,
        variant: {
          id: 'var-1',
          sku: 'ARD-UNO-R3',
          packSize: '1 Unit',
          stockQuantity: 10,
        },
        product: {
          id: 'prod-1',
          name: 'Arduino Uno R3 Microcontroller Board',
          imageUrl: 'https://images.vertex.local/arduino.jpg',
        },
      },
      {
        id: 'item-2',
        variantId: 'var-2',
        quantity: 2,
        unitPrice: 250.00,
        lineTotal: 500.00,
        isAvailable: true,
        variant: {
          id: 'var-2',
          sku: 'BOLT-HEX-M8',
          packSize: 'Pack of 10',
          stockQuantity: 20,
        },
        product: {
          id: 'prod-2',
          name: 'Stainless Steel Hex Bolt (M8 x 30mm)',
          imageUrl: null,
        },
      },
    ],
  };

  test('does not render when isOpen is false', () => {
    const { container } = render(
      <CartDrawer isOpen={false} onClose={() => {}} cart={mockCart} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  test('renders cart drawer with items, subtotal, and item count when open', () => {
    render(
      <CartDrawer
        isOpen={true}
        onClose={() => {}}
        cart={mockCart}
        currentUser={{ id: 'user-123', email: 'test@vertex.in' }}
      />
    );

    expect(screen.getByRole('dialog', { name: /Shopping Cart/i })).toBeInTheDocument();
    expect(screen.getByTestId('drawer-cart-count')).toHaveTextContent('3 items');
    expect(screen.getByText('Arduino Uno R3 Microcontroller Board')).toBeInTheDocument();
    expect(screen.getByText('Stainless Steel Hex Bolt (M8 x 30mm)')).toBeInTheDocument();
    expect(screen.getByTestId('cart-subtotal')).toHaveTextContent('₹1,799.00');
  });

  test('calls onClose when close button or backdrop is clicked', () => {
    const handleClose = jest.fn();
    render(
      <CartDrawer isOpen={true} onClose={handleClose} cart={mockCart} />
    );

    const closeBtn = screen.getByTestId('cart-close-btn');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    const overlay = screen.getByTestId('cart-overlay');
    fireEvent.click(overlay);
    expect(handleClose).toHaveBeenCalledTimes(2);
  });

  test('calls onClose on Escape key press', () => {
    const handleClose = jest.fn();
    render(
      <CartDrawer isOpen={true} onClose={handleClose} cart={mockCart} />
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  test('calls onUpdateQuantity when [+] or [-] is clicked', () => {
    const handleUpdate = jest.fn();
    render(
      <CartDrawer
        isOpen={true}
        onClose={() => {}}
        cart={mockCart}
        onUpdateQuantity={handleUpdate}
      />
    );

    // Increase item 1 quantity (from 1 to 2)
    const incBtn = screen.getByTestId('qty-inc-item-1');
    fireEvent.click(incBtn);
    expect(handleUpdate).toHaveBeenCalledWith('item-1', 2);

    // Decrease item 2 quantity (from 2 to 1)
    const decBtn = screen.getByTestId('qty-dec-item-2');
    fireEvent.click(decBtn);
    expect(handleUpdate).toHaveBeenCalledWith('item-2', 1);
  });

  test('calls onRemoveItem when delete button is clicked', () => {
    const handleRemove = jest.fn();
    render(
      <CartDrawer
        isOpen={true}
        onClose={() => {}}
        cart={mockCart}
        onRemoveItem={handleRemove}
      />
    );

    const removeBtn = screen.getByTestId('remove-item-item-1');
    fireEvent.click(removeBtn);
    expect(handleRemove).toHaveBeenCalledWith('item-1');
  });

  test('calls onClearCart when Clear Cart button is clicked', () => {
    const handleClear = jest.fn();
    render(
      <CartDrawer
        isOpen={true}
        onClose={() => {}}
        cart={mockCart}
        onClearCart={handleClear}
      />
    );

    const clearBtn = screen.getByTestId('clear-cart-btn');
    fireEvent.click(clearBtn);
    expect(handleClear).toHaveBeenCalledTimes(1);
  });

  test('renders empty cart state when cart has no items', () => {
    render(
      <CartDrawer
        isOpen={true}
        onClose={() => {}}
        cart={{ items: [], totalQuantity: 0, subtotal: 0 }}
      />
    );

    expect(screen.getByTestId('cart-empty-state')).toBeInTheDocument();
    expect(screen.getByText(/Your cart is empty/i)).toBeInTheDocument();
    expect(screen.queryByTestId('clear-cart-btn')).not.toBeInTheDocument();
  });

  test('renders guest banner when currentUser is null and cart is not empty', () => {
    const handleLogin = jest.fn();
    render(
      <CartDrawer
        isOpen={true}
        onClose={() => {}}
        cart={mockCart}
        currentUser={null}
        onNavigateLogin={handleLogin}
      />
    );

    expect(screen.getByTestId('guest-cart-banner')).toBeInTheDocument();
    const loginLink = screen.getByRole('button', { name: /Sign In/i });
    fireEvent.click(loginLink);
    expect(handleLogin).toHaveBeenCalledTimes(1);
  });

  test('renders error banner and allows dismissing error', () => {
    const handleDismiss = jest.fn();
    render(
      <CartDrawer
        isOpen={true}
        onClose={() => {}}
        cart={mockCart}
        cartError="Maximum available stock reached"
        onClearError={handleDismiss}
      />
    );

    expect(screen.getByTestId('cart-error-banner')).toHaveTextContent('Maximum available stock reached');
    const dismissBtn = screen.getByRole('button', { name: /Dismiss error/i });
    fireEvent.click(dismissBtn);
    expect(handleDismiss).toHaveBeenCalledTimes(1);
  });
});
