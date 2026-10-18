import React, { useState, useEffect } from "react";
import { getAddresses, placeOrder } from "../../services/orderApi";
import "./CheckoutPage.css";

export default function CheckoutPage({
  currentUser,
  cart,
  onNavigateHome,
  onNavigateLogin,
  onOrderSuccess,
}) {
  const [addresses, setAddresses] = useState([]);
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);

  // New address form state
  const [newAddress, setNewAddress] = useState({
    recipientName: currentUser?.fullName || "",
    phone: currentUser?.phone || "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "India",
    isDefault: true,
  });
  const [formErrors, setFormErrors] = useState({});

  // Checkout submission state
  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [notes, setNotes] = useState("");
  const [placingOrder, setPlacingOrder] = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);

  // Post-order confirmation state
  const [confirmedOrder, setConfirmedOrder] = useState(null);

  // Fetch saved addresses on mount if user is authenticated
  useEffect(() => {
    if (!currentUser) return;

    let isMounted = true;
    setAddressesLoading(true);

    getAddresses()
      .then((res) => {
        if (!isMounted) return;
        const addrs = res.addresses || [];
        setAddresses(addrs);
        if (addrs.length > 0) {
          const defaultAddr = addrs.find((a) => a.isDefault) || addrs[0];
          setSelectedAddressId(defaultAddr.id);
          setShowNewAddressForm(false);
        } else {
          setShowNewAddressForm(true);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error("Failed to load saved addresses:", err);
        setShowNewAddressForm(true);
      })
      .finally(() => {
        if (isMounted) setAddressesLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  // Client validation for new address
  const validateNewAddress = () => {
    const errors = {};
    if (!newAddress.recipientName.trim()) {
      errors.recipientName = "Recipient name is required.";
    }
    if (!newAddress.phone.trim()) {
      errors.phone = "Phone number is required.";
    } else if (!/^[0-9+\s()-]{10,20}$/.test(newAddress.phone.trim())) {
      errors.phone = "Enter a valid phone number (10-20 digits).";
    }
    if (!newAddress.line1.trim() || newAddress.line1.trim().length < 3) {
      errors.line1 = "Address Line 1 must be at least 3 characters.";
    }
    if (!newAddress.city.trim()) {
      errors.city = "City is required.";
    }
    if (!newAddress.state.trim()) {
      errors.state = "State is required.";
    }
    if (!newAddress.postalCode.trim() || newAddress.postalCode.trim().length < 3) {
      errors.postalCode = "Postal code is required.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePlaceOrder = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setCheckoutError(null);

    if (!currentUser) {
      onNavigateLogin("/checkout");
      return;
    }

    if (!cart?.items || cart.items.length === 0) {
      setCheckoutError("Your cart is empty. Please add items before checking out.");
      return;
    }

    let payload = {
      paymentMethod,
      notes: notes.trim() || null,
      idempotencyKey: `vtx-checkout-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
    };

    if (showNewAddressForm) {
      if (!validateNewAddress()) {
        return;
      }
      payload.shippingAddress = {
        recipientName: newAddress.recipientName.trim(),
        phone: newAddress.phone.trim(),
        line1: newAddress.line1.trim(),
        line2: newAddress.line2?.trim() || null,
        city: newAddress.city.trim(),
        state: newAddress.state.trim(),
        postalCode: newAddress.postalCode.trim(),
        country: newAddress.country || "India",
      };
    } else {
      if (!selectedAddressId) {
        setCheckoutError("Please select a delivery address.");
        return;
      }
      payload.addressId = selectedAddressId;
    }

    setPlacingOrder(true);
    try {
      const res = await placeOrder(payload);
      if (res.success && res.order) {
        setConfirmedOrder(res.order);
        if (onOrderSuccess) {
          onOrderSuccess(res.order);
        }
      } else {
        setCheckoutError(res.message || "Failed to place order.");
      }
    } catch (err) {
      setCheckoutError(err.message || "An unexpected error occurred while placing your order.");
    } finally {
      setPlacingOrder(false);
    }
  };

  // If user is not logged in, prompt to log in
  if (!currentUser) {
    return (
      <div className="vtx-checkout-container" data-testid="checkout-auth-required">
        <div className="vtx-checkout-auth-card">
          <div className="vtx-checkout-auth-icon" aria-hidden="true">🔒</div>
          <h2>Authentication Required</h2>
          <p>You must be signed in to your VERTEX account to complete checkout and place an order.</p>
          <div className="vtx-checkout-auth-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => onNavigateLogin("/checkout")}
              data-testid="checkout-login-btn"
            >
              Sign In to Continue →
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={onNavigateHome}
            >
              Return to Catalog
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Confirmation view when order has succeeded
  if (confirmedOrder) {
    return (
      <div className="vtx-checkout-container" data-testid="order-confirmation-view">
        <div className="vtx-confirmation-card">
          <div className="vtx-confirmation-header">
            <div className="vtx-confirmation-icon" aria-hidden="true">✔</div>
            <h2>Order Placed Successfully!</h2>
            <p className="vtx-confirmation-sub">
              Thank you for choosing VERTEX. Your order has been recorded in the database.
            </p>
          </div>

          <div className="vtx-confirmation-meta">
            <div className="vtx-meta-item">
              <span className="vtx-meta-label">Order Number:</span>
              <strong className="vtx-meta-val" data-testid="confirmed-order-number">
                {confirmedOrder.orderNumber}
              </strong>
            </div>
            <div className="vtx-meta-item">
              <span className="vtx-meta-label">Order Status:</span>
              <span className="vtx-status-badge status-pending" data-testid="confirmed-order-status">
                {confirmedOrder.orderStatus}
              </span>
            </div>
            <div className="vtx-meta-item">
              <span className="vtx-meta-label">Payment Status:</span>
              <span className="vtx-status-badge status-pending" data-testid="confirmed-payment-status">
                {confirmedOrder.paymentStatus} ({confirmedOrder.paymentMethod})
              </span>
            </div>
          </div>

          <div className="vtx-confirmation-notice">
            <span aria-hidden="true">ℹ️</span>
            <span>
              <strong>Payment Boundary Notice:</strong> Payment gateway integration is slated for Phase 4.
              This order will remain pending until payment is verified upon delivery.
            </span>
          </div>

          <div className="vtx-confirmation-section">
            <h3>Delivery Address</h3>
            <div className="vtx-confirmed-address">
              <p><strong>{confirmedOrder.shippingAddress?.recipientName}</strong></p>
              <p>{confirmedOrder.shippingAddress?.line1} {confirmedOrder.shippingAddress?.line2 || ""}</p>
              <p>{confirmedOrder.shippingAddress?.city}, {confirmedOrder.shippingAddress?.state} - {confirmedOrder.shippingAddress?.postalCode}</p>
              <p>Phone: {confirmedOrder.shippingAddress?.phone}</p>
            </div>
          </div>

          <div className="vtx-confirmation-section">
            <h3>Items in this Order</h3>
            <div className="vtx-confirmed-items-table">
              <div className="vtx-table-header">
                <span>Product</span>
                <span>Qty</span>
                <span>Unit Price</span>
                <span>GST Tax</span>
                <span>Line Total</span>
              </div>
              {confirmedOrder.items?.map((it) => (
                <div key={it.id || it.sku} className="vtx-table-row" data-testid={`order-item-${it.sku}`}>
                  <div>
                    <strong>{it.productName}</strong>
                    {it.packSize && <span className="vtx-table-sub"> ({it.packSize})</span>}
                    <div className="vtx-table-sku">SKU: {it.sku}</div>
                  </div>
                  <div>{it.quantity}</div>
                  <div>₹{Number(it.unitPrice).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
                  <div>₹{Number(it.taxAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })} ({it.gstRate}%)</div>
                  <div><strong>₹{Number(it.lineTotal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong></div>
                </div>
              ))}
            </div>

            <div className="vtx-confirmed-totals">
              <div className="vtx-totals-row">
                <span>Items Subtotal:</span>
                <span>₹{Number(confirmedOrder.subtotal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="vtx-totals-row">
                <span>GST Tax (Goods &amp; Services):</span>
                <span>₹{Number(confirmedOrder.taxAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="vtx-totals-row">
                <span>Shipping Fee:</span>
                <span>{confirmedOrder.shippingFee === 0 ? "FREE" : `₹${Number(confirmedOrder.shippingFee).toFixed(2)}`}</span>
              </div>
              <div className="vtx-totals-row vtx-grand-total">
                <span>Total Amount:</span>
                <span data-testid="confirmed-total-amount">₹{Number(confirmedOrder.totalAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          <div className="vtx-confirmation-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={onNavigateHome}
              data-testid="continue-shopping-btn"
            >
              Continue Shopping →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Subtotal & Estimated Tax from cart
  const cartSubtotal = Number(cart?.subtotal || 0);
  const estimatedGst = Number((cartSubtotal * 0.18).toFixed(2));
  const estimatedTotal = Number((cartSubtotal + estimatedGst).toFixed(2));

  return (
    <div className="vtx-checkout-container" data-testid="checkout-page">
      <div className="vtx-checkout-header">
        <button
          type="button"
          className="vtx-checkout-back-link"
          onClick={onNavigateHome}
        >
          ← Return to Store
        </button>
        <h1>Secure Checkout</h1>
        <p className="vtx-checkout-tagline">Review items, provide delivery address, and place your order.</p>
      </div>

      {checkoutError && (
        <div className="vtx-checkout-alert vtx-alert-error" role="alert" data-testid="checkout-error-banner">
          <span className="vtx-alert-icon" aria-hidden="true">⚠️</span>
          <div className="vtx-alert-content">
            <strong>Order Failed</strong>
            <p>{checkoutError}</p>
          </div>
          <button
            type="button"
            className="vtx-alert-close"
            onClick={() => setCheckoutError(null)}
            aria-label="Dismiss error"
          >
            ✕
          </button>
        </div>
      )}

      <div className="vtx-checkout-grid">
        {/* Left Column: Delivery Address & Payment Method */}
        <div className="vtx-checkout-main">
          {/* Section 1: Delivery Address */}
          <section className="vtx-checkout-card" data-testid="checkout-address-section">
            <div className="vtx-card-head">
              <h2>1. Delivery Address</h2>
              {addresses.length > 0 && !showNewAddressForm && (
                <button
                  type="button"
                  className="vtx-btn-link"
                  onClick={() => setShowNewAddressForm(true)}
                  data-testid="btn-add-new-address"
                >
                  + Add New Address
                </button>
              )}
            </div>

            {addressesLoading ? (
              <p className="vtx-loading-text">Loading saved addresses...</p>
            ) : !showNewAddressForm && addresses.length > 0 ? (
              <div className="vtx-address-picker">
                {addresses.map((addr) => {
                  const isSelected = selectedAddressId === addr.id;
                  return (
                    <label
                      key={addr.id}
                      className={`vtx-address-card ${isSelected ? "selected" : ""}`}
                      data-testid={`address-card-${addr.id}`}
                    >
                      <input
                        type="radio"
                        name="selectedAddress"
                        value={addr.id}
                        checked={isSelected}
                        onChange={() => setSelectedAddressId(addr.id)}
                      />
                      <div className="vtx-address-details">
                        <strong>{addr.recipientName} {addr.isDefault && <span className="vtx-badge-default">Default</span>}</strong>
                        <p>{addr.line1} {addr.line2 || ""}</p>
                        <p>{addr.city}, {addr.state} - {addr.postalCode}</p>
                        <p className="vtx-phone-line">📞 {addr.phone}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            ) : (
              <form className="vtx-address-form" onSubmit={(e) => e.preventDefault()}>
                {addresses.length > 0 && (
                  <button
                    type="button"
                    className="vtx-btn-link vtx-cancel-new-addr"
                    onClick={() => {
                      setShowNewAddressForm(false);
                      setFormErrors({});
                    }}
                  >
                    ← Select from saved addresses
                  </button>
                )}
                <div className="vtx-form-row">
                  <div className="vtx-form-group">
                    <label htmlFor="recipientName">Recipient Name *</label>
                    <input
                      id="recipientName"
                      type="text"
                      className={`vtx-input ${formErrors.recipientName ? "error" : ""}`}
                      value={newAddress.recipientName}
                      onChange={(e) => setNewAddress({ ...newAddress, recipientName: e.target.value })}
                      placeholder="e.g. Jane Engineer"
                      data-testid="input-recipient-name"
                    />
                    {formErrors.recipientName && <span className="vtx-field-error">{formErrors.recipientName}</span>}
                  </div>
                  <div className="vtx-form-group">
                    <label htmlFor="recipientPhone">Phone Number *</label>
                    <input
                      id="recipientPhone"
                      type="tel"
                      className={`vtx-input ${formErrors.phone ? "error" : ""}`}
                      value={newAddress.phone}
                      onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                      data-testid="input-recipient-phone"
                    />
                    {formErrors.phone && <span className="vtx-field-error">{formErrors.phone}</span>}
                  </div>
                </div>

                <div className="vtx-form-group">
                  <label htmlFor="addressLine1">Address Line 1 (Street / Building) *</label>
                  <input
                    id="addressLine1"
                    type="text"
                    className={`vtx-input ${formErrors.line1 ? "error" : ""}`}
                    value={newAddress.line1}
                    onChange={(e) => setNewAddress({ ...newAddress, line1: e.target.value })}
                    placeholder="Flat 4B, Silicon Heights"
                    data-testid="input-address-line1"
                  />
                  {formErrors.line1 && <span className="vtx-field-error">{formErrors.line1}</span>}
                </div>

                <div className="vtx-form-group">
                  <label htmlFor="addressLine2">Address Line 2 (Landmark, Suite, optional)</label>
                  <input
                    id="addressLine2"
                    type="text"
                    className="vtx-input"
                    value={newAddress.line2}
                    onChange={(e) => setNewAddress({ ...newAddress, line2: e.target.value })}
                    placeholder="Near Electronic Complex"
                  />
                </div>

                <div className="vtx-form-row three-col">
                  <div className="vtx-form-group">
                    <label htmlFor="addressCity">City *</label>
                    <input
                      id="addressCity"
                      type="text"
                      className={`vtx-input ${formErrors.city ? "error" : ""}`}
                      value={newAddress.city}
                      onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                      placeholder="Hyderabad"
                      data-testid="input-address-city"
                    />
                    {formErrors.city && <span className="vtx-field-error">{formErrors.city}</span>}
                  </div>
                  <div className="vtx-form-group">
                    <label htmlFor="addressState">State *</label>
                    <input
                      id="addressState"
                      type="text"
                      className={`vtx-input ${formErrors.state ? "error" : ""}`}
                      value={newAddress.state}
                      onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                      placeholder="Telangana"
                      data-testid="input-address-state"
                    />
                    {formErrors.state && <span className="vtx-field-error">{formErrors.state}</span>}
                  </div>
                  <div className="vtx-form-group">
                    <label htmlFor="addressPostalCode">PIN / Postal Code *</label>
                    <input
                      id="addressPostalCode"
                      type="text"
                      className={`vtx-input ${formErrors.postalCode ? "error" : ""}`}
                      value={newAddress.postalCode}
                      onChange={(e) => setNewAddress({ ...newAddress, postalCode: e.target.value })}
                      placeholder="500081"
                      data-testid="input-address-postal"
                    />
                    {formErrors.postalCode && <span className="vtx-field-error">{formErrors.postalCode}</span>}
                  </div>
                </div>
              </form>
            )}
          </section>

          {/* Section 2: Payment Method */}
          <section className="vtx-checkout-card" data-testid="checkout-payment-section">
            <h2>2. Payment Method</h2>
            <div className="vtx-payment-options">
              <label className="vtx-payment-option selected" data-testid="payment-cod-option">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="COD"
                  checked={paymentMethod === "COD"}
                  onChange={() => setPaymentMethod("COD")}
                />
                <div className="vtx-payment-text">
                  <strong>💵 Cash on Delivery (COD) / Pay on Delivery</strong>
                  <p>Pay when your components arrive at your doorstep or facility.</p>
                </div>
              </label>

              <label className="vtx-payment-option disabled" title="Online payments will be available in Phase 4">
                <input type="radio" name="paymentMethod" disabled />
                <div className="vtx-payment-text">
                  <strong>💳 Online Cards / UPI / NetBanking (Coming Soon)</strong>
                  <p>Integrated payment gateway processing is planned for Phase 4.</p>
                </div>
              </label>
            </div>

            <div className="vtx-payment-boundary-note">
              <span aria-hidden="true">🛡️</span>
              <p>
                <strong>Security Boundary:</strong> Orders are recorded with <em>PENDING</em> payment status.
                VERTEX does not simulate payments or trust client assertions of payment completion.
              </p>
            </div>
          </section>

          {/* Section 3: Delivery Notes */}
          <section className="vtx-checkout-card">
            <h2>3. Order Notes (Optional)</h2>
            <textarea
              className="vtx-textarea"
              rows="2"
              placeholder="Any special handling or gate delivery instructions..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              data-testid="input-order-notes"
            />
          </section>
        </div>

        {/* Right Column: Order Summary & Place Order */}
        <aside className="vtx-checkout-sidebar">
          <div className="vtx-summary-card" data-testid="checkout-summary-card">
            <h3>Order Summary</h3>
            <span className="vtx-summary-count">{cart?.totalQuantity || 0} items</span>

            <div className="vtx-summary-items-list">
              {cart?.items?.map((item) => (
                <div key={item.id} className="vtx-summary-item" data-testid={`summary-item-${item.id}`}>
                  <div className="vtx-summary-item-info">
                    <strong>{item.product?.name || "Product"}</strong>
                    {item.variant?.packSize && <span className="vtx-summary-pack">Pack: {item.variant.packSize}</span>}
                    <span className="vtx-summary-qty">Qty: {item.quantity} × ₹{Number(item.unitPrice).toLocaleString("en-IN")}</span>
                  </div>
                  <span className="vtx-summary-item-total">
                    ₹{Number(item.lineTotal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>

            <div className="vtx-summary-totals">
              <div className="vtx-summary-row">
                <span>Items Subtotal:</span>
                <span data-testid="summary-subtotal">₹{cartSubtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="vtx-summary-row">
                <span>Estimated GST (18%):</span>
                <span data-testid="summary-tax">₹{estimatedGst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="vtx-summary-row">
                <span>Shipping:</span>
                <span className="vtx-free-shipping">FREE</span>
              </div>
              <div className="vtx-summary-row vtx-summary-grand">
                <span>Total Amount:</span>
                <span data-testid="summary-grand-total">₹{estimatedTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-primary vtx-btn-place-order"
              onClick={handlePlaceOrder}
              disabled={placingOrder || !cart?.items || cart.items.length === 0}
              data-testid="place-order-btn"
            >
              {placingOrder ? (
                <span className="vtx-btn-spinner-content">
                  <span className="vtx-spinner" aria-hidden="true" />
                  Placing Order...
                </span>
              ) : (
                "Place Order →"
              )}
            </button>

            <p className="vtx-checkout-reassurance">
              🔒 Server-verified pricing &amp; atomic stock reservation.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
