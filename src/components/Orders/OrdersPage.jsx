import React, { useState, useEffect, useCallback, useMemo } from "react";
import { getOrders, cancelOrder } from "../../services/orderApi";
import "./OrdersPage.css";

const CANCELLABLE_STATUSES = ["PENDING", "CONFIRMED"];

function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

function getStatusBadge(status) {
  const norm = (status || "").toUpperCase();
  switch (norm) {
    case "PENDING":
      return {
        label: "Pending",
        icon: "⏳",
        className: "vtx-status-badge status-pending",
        description: "Awaiting warehouse verification",
      };
    case "CONFIRMED":
      return {
        label: "Confirmed",
        icon: "✔",
        className: "vtx-status-badge status-confirmed",
        description: "Confirmed and queued for dispatch",
      };
    case "PROCESSING":
      return {
        label: "Processing",
        icon: "⚙️",
        className: "vtx-status-badge status-processing",
        description: "Being packed in engineering facility",
      };
    case "SHIPPED":
      return {
        label: "Shipped",
        icon: "🚚",
        className: "vtx-status-badge status-shipped",
        description: "In transit with logistics carrier",
      };
    case "DELIVERED":
      return {
        label: "Delivered",
        icon: "📦",
        className: "vtx-status-badge status-delivered",
        description: "Successfully delivered to destination",
      };
    case "CANCELLED":
      return {
        label: "Cancelled",
        icon: "✕",
        className: "vtx-status-badge status-cancelled",
        description: "Order cancelled and stock restored",
      };
    default:
      return {
        label: status || "Unknown",
        icon: "•",
        className: "vtx-status-badge",
        description: "",
      };
  }
}

export default function OrdersPage({
  currentUser,
  onNavigateHome,
  onNavigateLogin,
}) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Cancellation Modal State
  const [selectedOrderToCancel, setSelectedOrderToCancel] = useState(null);
  const [cancellationReason, setCancellationReason] = useState("");
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);
  const [cancelModalError, setCancelModalError] = useState(null);

  const fetchOrders = useCallback(async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await getOrders();
      if (res && res.orders && Array.isArray(res.orders)) {
        setOrders(res.orders);
      } else {
        setOrders([]);
      }
    } catch (err) {
      setError(err.message || "Failed to load your orders. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Handle Escape key to close cancellation modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && selectedOrderToCancel && !isSubmittingCancel) {
        setSelectedOrderToCancel(null);
        setCancellationReason("");
        setCancelModalError(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedOrderToCancel, isSubmittingCancel]);

  const handleOpenCancelModal = (order) => {
    setSelectedOrderToCancel(order);
    setCancellationReason("");
    setCancelModalError(null);
  };

  const handleCloseCancelModal = () => {
    if (isSubmittingCancel) return;
    setSelectedOrderToCancel(null);
    setCancellationReason("");
    setCancelModalError(null);
  };

  const handleConfirmCancel = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!selectedOrderToCancel || isSubmittingCancel) return;

    setIsSubmittingCancel(true);
    setCancelModalError(null);

    const orderIdToCancel = selectedOrderToCancel.id || selectedOrderToCancel.orderNumber;
    const orderNumber = selectedOrderToCancel.orderNumber;

    try {
      const res = await cancelOrder(orderIdToCancel, {
        reason: cancellationReason.trim() || undefined,
      });

      if (res.success) {
        setSuccessMessage(`Order #${orderNumber} has been successfully cancelled.`);
        setSelectedOrderToCancel(null);
        setCancellationReason("");
        // Re-fetch orders list to ensure authoritative server state
        await fetchOrders();
      } else {
        setCancelModalError(res.message || "Failed to cancel order.");
      }
    } catch (err) {
      setCancelModalError(err.message || "An error occurred while cancelling your order.");
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  // Filtered orders computation
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const rawStatus = (order.orderStatus || order.status || "").toUpperCase();

      // Status Filter matching
      if (statusFilter === "ACTIVE") {
        if (!["PENDING", "CONFIRMED", "PROCESSING"].includes(rawStatus)) {
          return false;
        }
      } else if (statusFilter === "DELIVERED") {
        if (rawStatus !== "DELIVERED") return false;
      } else if (statusFilter === "CANCELLED") {
        if (rawStatus !== "CANCELLED") return false;
      }

      // Search Query matching
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchesNumber = (order.orderNumber || "").toLowerCase().includes(query);
        const matchesItem = (order.items || []).some(
          (it) =>
            (it.productName || it.product?.name || "").toLowerCase().includes(query) ||
            (it.sku || it.variant?.sku || "").toLowerCase().includes(query)
        );
        const matchesRecipient = (order.shippingAddress?.recipientName || "")
          .toLowerCase()
          .includes(query);

        if (!matchesNumber && !matchesItem && !matchesRecipient) {
          return false;
        }
      }

      return true;
    });
  }, [orders, statusFilter, searchQuery]);

  // Order counts for summary pills
  const counts = useMemo(() => {
    const total = orders.length;
    let active = 0;
    let delivered = 0;
    let cancelled = 0;

    orders.forEach((o) => {
      const st = (o.orderStatus || o.status || "").toUpperCase();
      if (["PENDING", "CONFIRMED", "PROCESSING"].includes(st)) active++;
      else if (st === "DELIVERED") delivered++;
      else if (st === "CANCELLED") cancelled++;
    });

    return { total, active, delivered, cancelled };
  }, [orders]);

  // 1. Unauthenticated View
  if (!currentUser) {
    return (
      <div className="vtx-orders-container" data-testid="orders-auth-required">
        <div className="vtx-orders-header">
          {onNavigateHome && (
            <button
              type="button"
              className="vtx-orders-back-link"
              onClick={onNavigateHome}
              data-testid="orders-back-btn"
            >
              <span aria-hidden="true">←</span> Back to Shopping
            </button>
          )}
          <h1>My Orders</h1>
        </div>

        <div className="vtx-orders-auth-card">
          <div className="vtx-orders-auth-icon-wrap" aria-hidden="true">
            <span className="vtx-orders-auth-icon">🔒</span>
          </div>
          <h2>Authentication Required</h2>
          <p>
            Please sign in to your VERTEX account to view your order history, track component shipments, and manage online cancellations.
          </p>
          <div className="vtx-auth-card-perks">
            <div className="vtx-auth-perk-item">
              <span className="vtx-perk-icon" aria-hidden="true">📦</span>
              <span>Real-time component order tracking</span>
            </div>
            <div className="vtx-auth-perk-item">
              <span className="vtx-perk-icon" aria-hidden="true">⚡</span>
              <span>Fast one-click pending order cancellations</span>
            </div>
            <div className="vtx-auth-perk-item">
              <span className="vtx-perk-icon" aria-hidden="true">🧾</span>
              <span>Automated GST tax invoices &amp; packing slips</span>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary vtx-auth-login-btn"
            onClick={() => onNavigateLogin && onNavigateLogin("/orders")}
            data-testid="orders-login-btn"
          >
            Sign In to View Orders →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="vtx-orders-container" data-testid="orders-page">
      <div className="vtx-orders-header">
        <div className="vtx-orders-header-top">
          {onNavigateHome && (
            <button
              type="button"
              className="vtx-orders-back-link"
              onClick={onNavigateHome}
              data-testid="orders-back-btn"
              title="Return to VERTEX storefront"
            >
              <span aria-hidden="true">←</span> Back to Storefront
            </button>
          )}
          <span className="vtx-customer-session-pill">
            <span aria-hidden="true">👤</span> {currentUser.fullName || currentUser.email}
          </span>
        </div>

        <div className="vtx-orders-title-row">
          <div>
            <h1>Order History</h1>
            <p className="vtx-orders-tagline">
              Track component shipments, review invoices, and manage online cancellations.
            </p>
          </div>

          {!loading && orders.length > 0 && (
            <div className="vtx-order-summary-metric" aria-label={`${orders.length} total orders recorded`}>
              <span className="vtx-metric-number">{orders.length}</span>
              <span className="vtx-metric-label">{orders.length === 1 ? "Order Placed" : "Orders Placed"}</span>
            </div>
          )}
        </div>
      </div>

      {/* Success Alert */}
      {successMessage && (
        <div
          className="vtx-orders-alert alert-success"
          role="status"
          aria-live="polite"
          data-testid="orders-success-alert"
        >
          <span className="vtx-orders-alert-icon" aria-hidden="true">✔</span>
          <div className="vtx-orders-alert-content">
            <strong>Order Cancelled</strong>
            <p>{successMessage}</p>
          </div>
          <button
            type="button"
            className="vtx-orders-alert-close"
            onClick={() => setSuccessMessage(null)}
            aria-label="Dismiss message"
          >
            ✕
          </button>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div
          className="vtx-orders-alert alert-error"
          role="alert"
          aria-live="assertive"
          data-testid="orders-error-alert"
        >
          <span className="vtx-orders-alert-icon" aria-hidden="true">⚠️</span>
          <div className="vtx-orders-alert-content">
            <strong>Unable to Load Orders</strong>
            <p>{error}</p>
          </div>
          <button
            type="button"
            className="btn btn-secondary vtx-retry-btn"
            onClick={fetchOrders}
            data-testid="retry-orders-btn"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading State with Perceived Performance Skeleton */}
      {loading ? (
        <div className="vtx-orders-loading" data-testid="orders-loading">
          <div className="vtx-orders-spinner" aria-hidden="true" />
          <p>Loading your orders...</p>
          <div className="vtx-orders-skeletons" aria-hidden="true">
            <div className="vtx-skeleton-card">
              <div className="vtx-skeleton-header" />
              <div className="vtx-skeleton-body">
                <div className="vtx-skeleton-line w-75" />
                <div className="vtx-skeleton-line w-50" />
                <div className="vtx-skeleton-line w-90" />
              </div>
            </div>
            <div className="vtx-skeleton-card">
              <div className="vtx-skeleton-header" />
              <div className="vtx-skeleton-body">
                <div className="vtx-skeleton-line w-60" />
                <div className="vtx-skeleton-line w-40" />
              </div>
            </div>
          </div>
        </div>
      ) : orders.length === 0 && !error ? (
        /* Empty State */
        <div className="vtx-orders-empty" data-testid="orders-empty">
          <div className="vtx-orders-empty-icon-wrap" aria-hidden="true">
            <span className="vtx-orders-empty-icon">📦</span>
          </div>
          <h2>No Orders Placed Yet</h2>
          <p>
            You haven't placed any orders with VERTEX yet. Explore our precision fasteners and electronics catalog to start your project.
          </p>
          {onNavigateHome && (
            <button
              type="button"
              className="btn btn-primary vtx-empty-cta-btn"
              onClick={onNavigateHome}
              data-testid="orders-browse-catalog-btn"
            >
              Explore Components →
            </button>
          )}
          <div className="vtx-empty-features-grid">
            <div className="vtx-empty-feature">
              <span className="vtx-empty-feat-icon" aria-hidden="true">🚚</span>
              <strong>Pan-India Logistics</strong>
              <span>Fast, safe dispatch with verified tracking</span>
            </div>
            <div className="vtx-empty-feature">
              <span className="vtx-empty-feat-icon" aria-hidden="true">⚡</span>
              <strong>Precision Hardware</strong>
              <span>Industrial fasteners &amp; genuine dev boards</span>
            </div>
            <div className="vtx-empty-feature">
              <span className="vtx-empty-feat-icon" aria-hidden="true">🛡️</span>
              <strong>Safe Cancellations</strong>
              <span>Free self-service cancel before fulfillment</span>
            </div>
          </div>
        </div>
      ) : (
        /* Orders View with Filter Controls */
        <>
          {orders.length > 1 && (
            <div className="vtx-orders-filter-bar">
              <div className="vtx-filter-pills" role="tablist" aria-label="Filter orders by status">
                <button
                  type="button"
                  className={`vtx-filter-pill ${statusFilter === "ALL" ? "is-active" : ""}`}
                  onClick={() => setStatusFilter("ALL")}
                  role="tab"
                  aria-selected={statusFilter === "ALL"}
                >
                  All Orders <span className="vtx-pill-count">{counts.total}</span>
                </button>
                <button
                  type="button"
                  className={`vtx-filter-pill ${statusFilter === "ACTIVE" ? "is-active" : ""}`}
                  onClick={() => setStatusFilter("ACTIVE")}
                  role="tab"
                  aria-selected={statusFilter === "ACTIVE"}
                >
                  Active / Pending <span className="vtx-pill-count">{counts.active}</span>
                </button>
                <button
                  type="button"
                  className={`vtx-filter-pill ${statusFilter === "DELIVERED" ? "is-active" : ""}`}
                  onClick={() => setStatusFilter("DELIVERED")}
                  role="tab"
                  aria-selected={statusFilter === "DELIVERED"}
                >
                  Delivered <span className="vtx-pill-count">{counts.delivered}</span>
                </button>
                <button
                  type="button"
                  className={`vtx-filter-pill ${statusFilter === "CANCELLED" ? "is-active" : ""}`}
                  onClick={() => setStatusFilter("CANCELLED")}
                  role="tab"
                  aria-selected={statusFilter === "CANCELLED"}
                >
                  Cancelled <span className="vtx-pill-count">{counts.cancelled}</span>
                </button>
              </div>

              <div className="vtx-order-search-wrap">
                <input
                  type="search"
                  className="vtx-order-search-input"
                  placeholder="Search order #, SKU, or product..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Filter orders by keyword"
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="vtx-search-clear-btn"
                    onClick={() => setSearchQuery("")}
                    aria-label="Clear order search"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          )}

          {filteredOrders.length === 0 ? (
            <div className="vtx-no-filter-match">
              <p>No orders match the selected filter criteria.</p>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setStatusFilter("ALL");
                  setSearchQuery("");
                }}
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="vtx-orders-list">
              {filteredOrders.map((order) => {
                const currentStatus = order.orderStatus || order.status || "UNKNOWN";
                const badge = getStatusBadge(currentStatus);
                const isCancellable = CANCELLABLE_STATUSES.includes(currentStatus.toUpperCase());
                const items = order.items || [];
                const subtotal = Number(order.subtotal || 0);
                const taxAmount = Number(order.taxAmount || order.taxTotal || 0);
                const shippingFee = Number(order.shippingFee || 0);
                const totalAmount = Number(order.totalAmount || 0);

                return (
                  <article
                    key={order.id || order.orderNumber}
                    className="vtx-order-card"
                    data-testid={`order-card-${order.orderNumber}`}
                    aria-labelledby={`order-heading-${order.orderNumber}`}
                  >
                    <header className="vtx-order-card-header">
                      <div className="vtx-order-meta-group">
                        <div className="vtx-order-meta-col">
                          <span className="vtx-order-meta-label">Order Number</span>
                          <span
                            id={`order-heading-${order.orderNumber}`}
                            className="vtx-order-number-val"
                          >
                            {order.orderNumber}
                          </span>
                        </div>

                        <div className="vtx-order-meta-col">
                          <span className="vtx-order-meta-label">Date Placed</span>
                          <span className="vtx-order-date-val">{formatDate(order.createdAt)}</span>
                        </div>

                        <div className="vtx-order-meta-col">
                          <span className="vtx-order-meta-label">Total Amount</span>
                          <strong className="vtx-order-total-val">
                            ₹{totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </strong>
                        </div>

                        <div className="vtx-order-meta-col">
                          <span className="vtx-order-meta-label">Status</span>
                          <span
                            className={badge.className}
                            data-testid={`order-status-${order.orderNumber}`}
                            title={badge.description}
                          >
                            <span className="vtx-status-icon" aria-hidden="true">{badge.icon}</span>
                            <span>{badge.label}</span>
                          </span>
                        </div>
                      </div>

                      <div className="vtx-order-header-actions">
                        {isCancellable && (
                          <button
                            type="button"
                            className="btn-cancel-order"
                            onClick={() => handleOpenCancelModal(order)}
                            data-testid={`cancel-order-btn-${order.orderNumber}`}
                            aria-label={`Cancel Order ${order.orderNumber}`}
                          >
                            <span aria-hidden="true">✕</span> Cancel Order
                          </button>
                        )}
                      </div>
                    </header>

                    <div className="vtx-order-card-body">
                      <div className="vtx-order-details-grid">
                        {/* Items Section */}
                        <div className="vtx-order-items-section">
                          <div className="vtx-section-header-row">
                            <h3>Ordered Items ({items.length})</h3>
                            <span className="vtx-items-count-badge">
                              {items.reduce((acc, it) => acc + (it.quantity || 1), 0)} units total
                            </span>
                          </div>

                          <div className="vtx-order-items-table">
                            <div className="vtx-items-table-header">
                              <span>Product</span>
                              <span>Unit Price</span>
                              <span>Qty</span>
                              <span>Total</span>
                            </div>
                            {items.map((item, idx) => {
                              const prodName =
                                item.productName || item.product?.name || item.name || "Item";
                              const sku = item.sku || item.variant?.sku || "N/A";
                              const packSize = item.packSize || item.variant?.packSize;
                              const quantity = item.quantity || 1;
                              const unitPrice = Number(item.unitPrice || 0);
                              const lineTotal = Number(item.lineTotal || unitPrice * quantity);

                              return (
                                <div
                                  key={item.id || item.variantId || idx}
                                  className="vtx-items-table-row"
                                  data-testid={`order-item-row-${order.orderNumber}-${idx}`}
                                >
                                  <div className="vtx-item-desc-cell">
                                    <div className="vtx-item-name">{prodName}</div>
                                    <div className="vtx-item-meta">
                                      <span className="vtx-item-sku">SKU: {sku}</span>
                                      {packSize && (
                                        <span className="vtx-item-pack">({packSize})</span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="vtx-item-num vtx-unit-price-cell">
                                    <span className="vtx-mobile-col-label">Price: </span>
                                    ₹{unitPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                  </div>
                                  <div className="vtx-item-num vtx-qty-cell">
                                    <span className="vtx-mobile-col-label">Qty: </span>
                                    <strong>× {quantity}</strong>
                                  </div>
                                  <div className="vtx-item-num vtx-line-total-cell">
                                    <span className="vtx-mobile-col-label">Line Total: </span>
                                    <strong>₹{lineTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Order Summary & Address Section */}
                        <div className="vtx-order-summary-section">
                          <h3>Summary</h3>
                          <div className="vtx-order-summary-box">
                            <div className="vtx-summary-row">
                              <span>Subtotal:</span>
                              <span>₹{subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="vtx-summary-row">
                              <span>Tax (GST 18%):</span>
                              <span>₹{taxAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="vtx-summary-row">
                              <span>Shipping:</span>
                              <span className={shippingFee === 0 ? "vtx-free-shipping" : ""}>
                                {shippingFee === 0 ? "FREE" : `₹${shippingFee.toFixed(2)}`}
                              </span>
                            </div>
                            <div className="vtx-summary-row total-row">
                              <span>Total Paid / Due:</span>
                              <span className="vtx-summary-grand-total">
                                ₹{totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                            {order.paymentMethod && (
                              <div className="vtx-summary-payment-method">
                                <span className="vtx-payment-label">Payment:</span>
                                <span>
                                  {order.paymentMethod === "COD" ? "Cash on Delivery" : order.paymentMethod}
                                  {order.paymentStatus ? ` • ${order.paymentStatus}` : ""}
                                </span>
                              </div>
                            )}
                          </div>

                          {order.shippingAddress && (
                            <div className="vtx-shipping-snippet">
                              <div className="vtx-shipping-title">
                                <span aria-hidden="true">📍</span> Delivery Address
                              </div>
                              <p className="vtx-recipient-name">
                                <strong>{order.shippingAddress.recipientName}</strong>
                              </p>
                              <p className="vtx-address-line">
                                {order.shippingAddress.line1} {order.shippingAddress.line2 || ""}
                              </p>
                              <p className="vtx-address-line">
                                {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.postalCode}
                              </p>
                              {order.shippingAddress.phone && (
                                <p className="vtx-address-phone">
                                  <span aria-hidden="true">📞</span> {order.shippingAddress.phone}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {order.notes && (
                        <div className="vtx-order-notes-box" data-testid={`order-notes-${order.orderNumber}`}>
                          <span className="vtx-notes-icon" aria-hidden="true">📝</span>
                          <div>
                            <strong>Notes:</strong> {order.notes}
                          </div>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Confirmation Modal for Order Cancellation */}
      {selectedOrderToCancel && (
        <div
          className="vtx-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-modal-title"
          data-testid="cancel-confirm-modal"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseCancelModal();
          }}
        >
          <div className="vtx-cancel-modal">
            <div className="vtx-cancel-modal-header">
              <div className="vtx-cancel-modal-icon-wrap" aria-hidden="true">
                <span className="vtx-cancel-modal-icon">⚠️</span>
              </div>
              <div>
                <h3 id="cancel-modal-title">
                  Cancel Order #{selectedOrderToCancel.orderNumber}
                </h3>
                <span className="vtx-cancel-modal-sub">Authoritative Customer Action</span>
              </div>
            </div>

            <p className="vtx-cancel-modal-intro">
              Are you sure you want to cancel this order? This will stop fulfillment and release all reserved components back to catalog inventory.
            </p>

            <div className="vtx-cancel-modal-notice" role="note">
              <span aria-hidden="true">ℹ️</span>
              <span>
                <strong>Inventory &amp; Dispatch Safeguard:</strong> Once confirmed, this action cannot be undone. No charges will be processed.
              </span>
            </div>

            {cancelModalError && (
              <div
                className="vtx-orders-alert alert-error"
                role="alert"
                aria-live="assertive"
                data-testid="cancel-modal-error"
                style={{ marginBottom: "16px" }}
              >
                <div className="vtx-orders-alert-content">
                  <p>{cancelModalError}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleConfirmCancel}>
              <div className="vtx-cancel-field">
                <label htmlFor="cancel-reason-select">
                  Reason for Cancellation (Optional)
                </label>
                <select
                  id="cancel-reason-select"
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  disabled={isSubmittingCancel}
                  data-testid="cancel-reason-select"
                  autoFocus
                >
                  <option value="">Select a reason...</option>
                  <option value="Ordered by mistake">Ordered by mistake</option>
                  <option value="Found a better price / alternative">Found a better price / alternative</option>
                  <option value="Need to change shipping address or items">Need to change shipping address or items</option>
                  <option value="Project timeline or requirements changed">Project timeline or requirements changed</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="vtx-cancel-modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary vtx-modal-cancel-btn"
                  onClick={handleCloseCancelModal}
                  disabled={isSubmittingCancel}
                  data-testid="cancel-dismiss-btn"
                >
                  Keep Order
                </button>
                <button
                  type="submit"
                  className="btn btn-danger vtx-modal-confirm-btn"
                  disabled={isSubmittingCancel}
                  data-testid="confirm-cancel-btn"
                >
                  {isSubmittingCancel ? (
                    <>
                      <span className="vtx-btn-spinner" aria-hidden="true" />
                      <span>Cancelling...</span>
                    </>
                  ) : (
                    "Confirm Cancellation"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
