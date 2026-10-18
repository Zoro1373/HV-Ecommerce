import React, { useState, useEffect, useCallback } from "react";
import logo from "./assets/logo.png";
import LoginPage from "./components/Login/LoginPage";
import AdminLayout from "./components/Admin/AdminLayout";
import CartDrawer from "./components/Cart/CartDrawer";
import CheckoutPage from "./components/Checkout/CheckoutPage";
import { getCurrentUser, logoutUser } from "./services/authApi";
import { getCategories, getProducts } from "./services/catalogApi";
import {
  getCart,
  addItemToCart,
  updateCartItemQuantity,
  removeCartItem,
  clearCart,
  mergeGuestCart,
} from "./services/cartApi";
import {
  getStoredGuestItems,
  clearStoredGuestCart,
  formatGuestCart,
  addGuestItem,
  updateGuestItemQuantity,
  removeGuestItem,
  clearGuestCart,
} from "./utils/guestCart";
import "./App.css";

const topBarItems = [
  { icon: "✔", label: "Quality Products" },
  { icon: "📦", label: "Bulk Orders" },
  { icon: "🚚", label: "Pan India Delivery" },
  { icon: "👥", label: "Trusted by Engineers" },
  { icon: "🎧", label: "Help & Support" },
  { icon: "📋", label: "Track Order" },
];

const navItems = [
  "Home",
  "Electronics",
  "Screws & Fasteners",
  "Nuts",
  "Brands",
  "Offers",
  "Resources",
  "About",
  "Contact",
];

const fastenerTypes = [
  "Flat (Slotted)",
  "Cross (Phillips)",
  "Hex (Allen)",
  "Star (Torx)",
  "Bolts",
  "Nuts",
  "Washers",
  "Brass Inserts",
];

const nutTypes = [
  "Hex Nuts",
  "Nyloc Nuts",
  "Flanged Nyloc Nut",
  "Wing Nuts",
  "Dome Nuts",
  "Flange Nuts",
];

const brands = ["Arduino", "Raspberry Pi", "Delta", "STM", "Bosch"];

function Stars({ rating }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span className="stars" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => {
        if (i < full) return <span key={i}>★</span>;
        if (i === full && half) return <span key={i}>⯨</span>;
        return (
          <span key={i} className="star-empty">
            ★
          </span>
        );
      })}
    </span>
  );
}

function ProductCard({ product, onAddToCart, isAdding = false }) {
  const [imgError, setImgError] = useState(false);
  const primaryVariant = product.variants?.[0];
  const unitLabel = primaryVariant?.packSize || product.unit || null;
  const ratingValue = product.rating || 5;
  const reviewCount = product.reviews || (product.variants?.length ? 24 : 12);
  const inStock = product.inStock !== false && primaryVariant?.stockQuantity !== 0;

  return (
    <div className="product-card" data-testid={`product-card-${product.id || product.slug}`}>
      {product.tag && (
        <span
          className={
            "product-tag " +
            (product.tag.toLowerCase().includes("off") ? "tag-discount" : "tag-best")
          }
        >
          {product.tag}
        </span>
      )}
      <div className="product-thumb">
        {product.imageUrl && !imgError ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="product-image"
            onError={() => setImgError(true)}
          />
        ) : (
          <span className="thumb-placeholder">
            {product.name ? product.name[0].toUpperCase() : "P"}
          </span>
        )}
      </div>
      <div className="product-body">
        <p className="product-name">{product.name}</p>
        <div className="product-price-row">
          <span className="price">₹{Number(product.price || 0).toLocaleString("en-IN")}</span>
          {product.mrp && Number(product.mrp) > Number(product.price) && (
            <span className="mrp">₹{Number(product.mrp).toLocaleString("en-IN")}</span>
          )}
          {unitLabel && <span className="unit">({unitLabel})</span>}
        </div>
        <div className="product-rating-row">
          <Stars rating={ratingValue} />
          <span className="review-count">({reviewCount})</span>
        </div>
        <p className={"stock-line" + (!inStock ? " stock-out" : "")}>
          <span className={"stock-dot" + (!inStock ? " stock-out" : "")} />{" "}
          {inStock ? "In Stock" : "Out of Stock"}
        </p>
        <button
          type="button"
          className="btn btn-outline btn-cart"
          onClick={() => onAddToCart && onAddToCart(product, primaryVariant)}
          disabled={!inStock || isAdding}
          data-testid={`add-to-cart-${product.id || product.slug}`}
        >
          {isAdding ? "Adding..." : "🛒 Add to Cart"}
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [currentView, setCurrentView] = useState(() => {
    if (typeof window !== "undefined") {
      if (window.location.pathname.startsWith("/admin")) return "admin";
      if (window.location.pathname === "/login") return "login";
      if (window.location.pathname === "/checkout") return "checkout";
    }
    return "home";
  });
  const [adminSection, setAdminSection] = useState(() => {
    if (typeof window !== "undefined" && window.location.pathname.startsWith("/admin/")) {
      return window.location.pathname.replace("/admin/", "").split("/")[0] || "dashboard";
    }
    return "dashboard";
  });
  const [currentUser, setCurrentUser] = useState(null);
  const [flashMessage, setFlashMessage] = useState(null);

  // Storefront Shopping Cart state
  const [cart, setCart] = useState(() => formatGuestCart(getStoredGuestItems()));
  const [cartOpen, setCartOpen] = useState(false);
  const [cartLoading, setCartLoading] = useState(false);
  const [cartError, setCartError] = useState(null);
  const [pendingCartAction, setPendingCartAction] = useState(null);

  // Storefront Catalog state
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState(null);

  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState(null);
  const [pagination, setPagination] = useState({ totalItems: 0, page: 1, limit: 12, totalPages: 1 });

  // Search & Filtering state
  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isOffersOnly, setIsOffersOnly] = useState(false);

  // Newsletter state
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    // Check initial authentication status via secure HttpOnly cookie
    getCurrentUser()
      .then(async (res) => {
        if (res?.user) {
          setCurrentUser(res.user);
          try {
            const cartRes = await getCart();
            if (cartRes?.cart) setCart(cartRes.cart);
          } catch (e) {
            console.error("Failed to load authenticated cart:", e);
          }
        }
      })
      .catch(() => {
        // Unauthenticated visitor
      });

    // Handle browser back/forward buttons
    const handlePopState = () => {
      if (window.location.pathname.startsWith("/admin")) {
        const sec = window.location.pathname.replace("/admin/", "").split("/")[0] || "dashboard";
        setAdminSection(sec);
        setCurrentView("admin");
      } else if (window.location.pathname === "/login") {
        setCurrentView("login");
      } else if (window.location.pathname === "/checkout") {
        setCurrentView("checkout");
      } else {
        setCurrentView("home");
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      setCategoriesLoading(true);
      setCategoriesError(null);
      const res = await getCategories();
      setCategories(res.categories || []);
    } catch (err) {
      setCategoriesError(err.message || "Failed to load categories from VERTEX catalog.");
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    try {
      setProductsLoading(true);
      setProductsError(null);
      const params = {
        limit: 12,
      };
      if (activeSearch) params.q = activeSearch;
      if (selectedCategory && selectedCategory !== "all") params.category = selectedCategory;

      const res = await getProducts(params);
      setProducts(res.products || []);
      if (res.pagination) {
        setPagination(res.pagination);
      }
    } catch (err) {
      setProductsError(err.message || "Failed to load products from VERTEX catalog.");
    } finally {
      setProductsLoading(false);
    }
  }, [activeSearch, selectedCategory]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const navigate = (view, section = "dashboard", redirectParam = null) => {
    setCurrentView(view);
    let targetPath = "/";
    if (view === "login") {
      targetPath = redirectParam ? `/login?redirect=${encodeURIComponent(redirectParam)}` : "/login";
    }
    if (view === "checkout") {
      targetPath = "/checkout";
    }
    if (view === "admin") {
      setAdminSection(section);
      targetPath = section === "dashboard" ? "/admin" : `/admin/${section}`;
    }
    if (typeof window !== "undefined" && window.location.pathname + window.location.search !== targetPath) {
      window.history.pushState(null, "", targetPath);
    }
    if (typeof window !== "undefined" && typeof window.scrollTo === "function") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleLoginSuccess = async (user) => {
    setCurrentUser(user);

    // Merge guest cart items into authenticated user cart upon login
    const guestItems = getStoredGuestItems();
    if (guestItems.length > 0) {
      try {
        setCartLoading(true);
        const itemsToMerge = guestItems.map((it) => ({
          variantId: it.variantId,
          quantity: it.quantity,
        }));
        const res = await mergeGuestCart(itemsToMerge);
        clearStoredGuestCart();
        if (res?.cart) {
          setCart(res.cart);
        }
        setFlashMessage(`Welcome back, ${user.fullName || user.email}! Your guest cart items have been merged.`);
      } catch (mergeErr) {
        console.error("Cart merge error:", mergeErr);
        try {
          const cartRes = await getCart();
          if (cartRes?.cart) setCart(cartRes.cart);
        } catch (e) {
          // Ignored
        }
        setFlashMessage(`Welcome back, ${user.fullName || user.email}!`);
      } finally {
        setCartLoading(false);
      }
    } else {
      try {
        setCartLoading(true);
        const cartRes = await getCart();
        if (cartRes?.cart) setCart(cartRes.cart);
      } catch (err) {
        console.error("Failed to fetch cart on login:", err);
      } finally {
        setCartLoading(false);
      }
      setFlashMessage(`Welcome back, ${user.fullName || user.email}!`);
    }

    // Check if there was an intended redirect destination before login
    let redirectDestination = null;
    if (typeof window !== "undefined" && window.location.search) {
      const searchParams = new URLSearchParams(window.location.search);
      redirectDestination = searchParams.get("redirect");
    }

    if (user.role === "ADMIN") {
      if (redirectDestination && redirectDestination.startsWith("/admin")) {
        const section = redirectDestination.replace("/admin", "").replace(/^\//, "").split("/")[0] || "dashboard";
        navigate("admin", section);
      } else {
        navigate("admin", "dashboard");
      }
    } else if (redirectDestination === "/checkout") {
      navigate("checkout");
    } else {
      navigate("home");
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (e) {
      // Ignored
    }
    setCurrentUser(null);
    clearStoredGuestCart();
    setCart(formatGuestCart([]));
    setFlashMessage("You have been signed out successfully.");
  };

  // Cart operations
  const handleAddToCart = async (product, variant) => {
    const targetVariant = variant || product?.variants?.[0];
    if (!targetVariant) {
      setCartError("Unable to add product: no purchasable variant found.");
      return;
    }

    setPendingCartAction({ type: "add", id: targetVariant.id });
    setCartError(null);

    try {
      if (currentUser) {
        const res = await addItemToCart({ variantId: targetVariant.id, quantity: 1 });
        if (res?.cart) {
          setCart(res.cart);
        }
      } else {
        const updatedCart = addGuestItem(product, targetVariant, 1);
        setCart(updatedCart);
      }
      setFlashMessage(`Added "${product.name}" to your cart.`);
    } catch (err) {
      setCartError(err.message || "Failed to add item to cart.");
    } finally {
      setPendingCartAction(null);
    }
  };

  const handleUpdateQuantity = async (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      return handleRemoveItem(itemId);
    }

    setPendingCartAction({ type: "update", id: itemId });
    setCartError(null);

    try {
      if (currentUser) {
        const res = await updateCartItemQuantity(itemId, newQuantity);
        if (res?.cart) {
          setCart(res.cart);
        }
      } else {
        const updatedCart = updateGuestItemQuantity(itemId, newQuantity);
        setCart(updatedCart);
      }
    } catch (err) {
      setCartError(err.message || "Failed to update item quantity.");
    } finally {
      setPendingCartAction(null);
    }
  };

  const handleRemoveItem = async (itemId) => {
    setPendingCartAction({ type: "remove", id: itemId });
    setCartError(null);

    try {
      if (currentUser) {
        const res = await removeCartItem(itemId);
        if (res?.cart) {
          setCart(res.cart);
        }
      } else {
        const updatedCart = removeGuestItem(itemId);
        setCart(updatedCart);
      }
    } catch (err) {
      setCartError(err.message || "Failed to remove item from cart.");
    } finally {
      setPendingCartAction(null);
    }
  };

  const handleClearCart = async () => {
    setPendingCartAction({ type: "clear" });
    setCartError(null);

    try {
      if (currentUser) {
        const res = await clearCart();
        if (res?.cart) {
          setCart(res.cart);
        }
      } else {
        const updatedCart = clearGuestCart();
        setCart(updatedCart);
      }
    } catch (err) {
      setCartError(err.message || "Failed to clear cart.");
    } finally {
      setPendingCartAction(null);
    }
  };

  const handleProceedToCheckout = () => {
    setCartOpen(false);
    if (currentUser) {
      navigate("checkout");
    } else {
      navigate("login", null, "/checkout");
    }
  };

  const handleOrderSuccess = (order) => {
    // Re-fetch cart from API to ensure it reflects the cleared cart state in UI
    getCart()
      .then((res) => {
        if (res?.cart) setCart(res.cart);
      })
      .catch(() => {
        setCart(formatGuestCart([]));
      });
    setFlashMessage(`Order #${order.orderNumber} placed successfully!`);
  };

  const handleSearchSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const query = searchInput.trim();
    setActiveSearch(query);
    setIsOffersOnly(false);
    const prodSection = document.getElementById("featured-products");
    if (prodSection && typeof prodSection.scrollIntoView === "function") {
      prodSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleClearAllFilters = () => {
    setSearchInput("");
    setActiveSearch("");
    setSelectedCategory("all");
    setIsOffersOnly(false);
  };

  const handleCategorySelect = (categorySlug) => {
    setSelectedCategory(categorySlug);
    setIsOffersOnly(false);
    const prodSection = document.getElementById("featured-products");
    if (prodSection && typeof prodSection.scrollIntoView === "function") {
      prodSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleTabClick = (tabKey) => {
    if (tabKey === "all") {
      setSelectedCategory("all");
      setIsOffersOnly(false);
    } else if (tabKey === "offers") {
      setIsOffersOnly(true);
    } else {
      setSelectedCategory(tabKey);
      setIsOffersOnly(false);
    }
  };

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email.trim()) setSubscribed(true);
  };

  if (currentView === "admin") {
    return (
      <AdminLayout
        currentUser={currentUser}
        onNavigateHome={() => navigate("home")}
        onNavigateLogin={(destination) => navigate("login", null, destination || "/admin")}
        initialSection={adminSection}
      />
    );
  }

  if (currentView === "login") {
    return (
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
        onNavigateHome={() => navigate("home")}
      />
    );
  }

  if (currentView === "checkout") {
    return (
      <div className="page">
        {/* Top utility bar */}
        <div className="top-bar">
          <div className="top-bar-inner">
            {topBarItems.map((item) => (
              <span className="top-bar-item" key={item.label}>
                <span className="top-bar-icon" aria-hidden="true">
                  {item.icon}
                </span>
                {item.label}
              </span>
            ))}
          </div>
        </div>

        {/* Header */}
        <header className="header">
          <div className="header-inner">
            <div
              className="brand"
              onClick={() => {
                navigate("home");
                handleClearAllFilters();
              }}
              style={{ cursor: "pointer" }}
            >
              <img src={logo} alt="HV Vertex logo" className="brand-logo" />
              <div className="brand-text">
                <span className="brand-name">VERTEX</span>
                <span className="brand-tagline">BUILD BETTER TOGETHER</span>
              </div>
            </div>

            <div className="header-actions">
              {currentUser ? (
                <div className="header-user-menu">
                  <span className="header-action header-user-profile" title={`Signed in as ${currentUser.email}`}>
                    <span aria-hidden="true">👤</span>
                    <span className="user-name">{currentUser.fullName?.split(" ")[0] || currentUser.email}</span>
                  </span>
                  <button
                    type="button"
                    className="btn-logout"
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="header-action header-action-btn"
                  onClick={() => navigate("login", null, "/checkout")}
                >
                  <span aria-hidden="true">👤</span> Login / Register
                </button>
              )}
            </div>
          </div>
        </header>

        <CheckoutPage
          currentUser={currentUser}
          cart={cart}
          onNavigateHome={() => navigate("home")}
          onNavigateLogin={(destination) => navigate("login", null, destination || "/checkout")}
          onOrderSuccess={handleOrderSuccess}
        />

        {/* Footer */}
        <footer className="footer">
          <div className="footer-bottom">
            <p>© {new Date().getFullYear()} VERTEX. All rights reserved.</p>
          </div>
        </footer>
      </div>
    );
  }

  // Filter tabs built from live categories
  const categoryTabs = categories.length > 0
    ? categories.map((c) => ({ key: c.slug, label: c.name }))
    : [
        { key: "electronics", label: "Electronics" },
        { key: "fasteners", label: "Fasteners" },
        { key: "nuts", label: "Nuts" },
      ];

  const filterTabs = [
    { key: "all", label: "All" },
    ...categoryTabs,
    { key: "offers", label: "Offers" },
  ];

  // Client-side offers filter fallback (reports gap where backend lacks offers query param)
  const visibleProducts = isOffersOnly
    ? products.filter((p) => p.tag || (p.mrp && Number(p.mrp) > Number(p.price)))
    : products;

  return (
    <div className="page">
      {/* Flash status banner */}
      {flashMessage && (
        <div className="vtx-flash-banner" role="status">
          <span>{flashMessage}</span>
          <button
            type="button"
            className="vtx-flash-close"
            onClick={() => setFlashMessage(null)}
            aria-label="Dismiss message"
          >
            ×
          </button>
        </div>
      )}

      {/* Top utility bar */}
      <div className="top-bar">
        <div className="top-bar-inner">
          {topBarItems.map((item) => (
            <span className="top-bar-item" key={item.label}>
              <span className="top-bar-icon" aria-hidden="true">
                {item.icon}
              </span>
              {item.label}
            </span>
          ))}
        </div>
      </div>

      {/* Header */}
      <header className="header">
        <div className="header-inner">
          <div
            className="brand"
            onClick={() => {
              navigate("home");
              handleClearAllFilters();
            }}
            style={{ cursor: "pointer" }}
          >
            <img src={logo} alt="HV Vertex logo" className="brand-logo" />
            <div className="brand-text">
              <span className="brand-name">VERTEX</span>
              <span className="brand-tagline">BUILD BETTER TOGETHER</span>
            </div>
          </div>

          <form
            onSubmit={handleSearchSubmit}
            className="search-bar"
            role="search"
          >
            <input
              type="text"
              placeholder="Search for electronics, screws, nuts, part numbers..."
              aria-label="Search products"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <button type="submit" aria-label="Search">🔍</button>
          </form>

          <div className="header-actions">
            {currentUser ? (
              <div className="header-user-menu">
                <span className="header-action header-user-profile" title={`Signed in as ${currentUser.email}`}>
                  <span aria-hidden="true">👤</span>
                  <span className="user-name">{currentUser.fullName?.split(" ")[0] || currentUser.email}</span>
                  {currentUser.role && currentUser.role !== "CUSTOMER" && (
                    <span className="user-role-badge">{currentUser.role}</span>
                  )}
                </span>
                {currentUser.role === "ADMIN" && (
                  <button
                    type="button"
                    className="btn-admin-console"
                    onClick={() => navigate("admin")}
                    title="Open VERTEX Admin Console"
                  >
                    ⚙️ Admin Console
                  </button>
                )}
                <button
                  type="button"
                  className="btn-logout"
                  onClick={handleLogout}
                  title="Sign out of your account"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="header-action header-action-btn"
                onClick={() => navigate("login")}
              >
                <span aria-hidden="true">👤</span> Login / Register
              </button>
            )}
            <button
              type="button"
              className="header-action cart-action"
              onClick={() => setCartOpen(true)}
              aria-label={`Shopping cart with ${cart?.totalQuantity || 0} items`}
              data-testid="cart-button"
            >
              <span aria-hidden="true">🛒</span> Cart
              <span className="cart-badge" data-testid="cart-badge">
                {cart?.totalQuantity || 0}
              </span>
            </button>
          </div>
        </div>

        <nav className="nav-bar" aria-label="Main store navigation">
          {navItems.map((item, i) => {
            const handleNavClick = (e) => {
              e.preventDefault();
              if (item === "Home") {
                handleClearAllFilters();
              } else if (item === "Electronics") {
                handleCategorySelect("electronics");
              } else if (item === "Screws & Fasteners") {
                handleCategorySelect("fasteners");
              } else if (item === "Nuts") {
                handleCategorySelect("nuts");
              } else if (item === "Offers") {
                setIsOffersOnly(true);
                const prodSection = document.getElementById("featured-products");
                if (prodSection && typeof prodSection.scrollIntoView === "function") {
                  prodSection.scrollIntoView({ behavior: "smooth" });
                }
              }
            };

            const isNavActive =
              (item === "Home" && selectedCategory === "all" && !isOffersOnly && !activeSearch) ||
              (item === "Electronics" && selectedCategory === "electronics" && !isOffersOnly) ||
              (item === "Screws & Fasteners" && selectedCategory === "fasteners" && !isOffersOnly) ||
              (item === "Nuts" && selectedCategory === "nuts" && !isOffersOnly) ||
              (item === "Offers" && isOffersOnly);

            return (
              <button
                type="button"
                key={item}
                className={"nav-link" + (isNavActive ? " active" : "")}
                onClick={handleNavClick}
              >
                {item}
              </button>
            );
          })}
        </nav>
      </header>

      {/* Hero */}
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-copy">
            <h1>
              Small Components.
              <br />
              <span className="hero-accent">Big Possibilities.</span>
            </h1>
            <p className="hero-sub">
              Electronics &amp; Fasteners for a Smarter Tomorrow
            </p>
            <ul className="hero-features">
              <li>⚙️ Wide Range of Products</li>
              <li>💎 Assured Quality</li>
              <li>🚚 Fast &amp; Reliable Delivery</li>
              <li>🎧 Expert Support</li>
            </ul>
            <div className="hero-ctas">
              <button
                className="btn btn-primary"
                onClick={() => handleCategorySelect("electronics")}
              >
                Shop Electronics →
              </button>
              <button
                className="btn btn-outline-light"
                onClick={() => handleCategorySelect("fasteners")}
              >
                Shop Fasteners →
              </button>
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="hero-art-glow" />
            <span className="hero-art-emoji">🔧</span>
          </div>
        </div>
      </section>

      {/* Shop by category */}
      <section className="section" id="shop-categories">
        <div className="section-head">
          <h2>Shop by Category</h2>
          <button
            type="button"
            onClick={() => handleCategorySelect("all")}
            className="link-arrow"
          >
            View All Categories →
          </button>
        </div>

        {categoriesLoading ? (
          <div className="category-grid" role="status" aria-label="Loading categories">
            {[1, 2, 3].map((n) => (
              <div className="category-card-skeleton" key={n}>
                <div className="skeleton-line" style={{ width: "32px", height: "32px", borderRadius: "50%" }} />
                <div className="skeleton-line skeleton-title" />
                <div className="skeleton-line" style={{ width: "90%" }} />
                <div className="skeleton-line" style={{ width: "60%" }} />
              </div>
            ))}
          </div>
        ) : categoriesError ? (
          <div className="catalog-error-state" role="alert">
            <div className="error-icon" aria-hidden="true">⚠️</div>
            <h3>Unable to Load Categories</h3>
            <p>{categoriesError}</p>
            <button
              type="button"
              className="btn-retry"
              onClick={loadCategories}
            >
              ↻ Retry
            </button>
          </div>
        ) : (
          <div className="category-grid">
            {categories.map((cat, idx) => {
              const tint = cat.tint || ["tint-blue", "tint-orange", "tint-green"][idx % 3];
              const icon = cat.icon || (cat.slug?.includes("elect") ? "🔌" : cat.slug?.includes("fast") ? "🔩" : cat.slug?.includes("nut") ? "⬡" : "📦");
              const subCountText = cat.children && cat.children.length > 0
                ? `${cat.children.length} Subcategories`
                : cat.productsCount !== undefined
                ? `${cat.productsCount} Products`
                : "Verified Catalog";

              return (
                <div className={"category-card " + tint} key={cat.id || cat.slug}>
                  <div className="category-icon">{icon}</div>
                  <h3>{cat.name}</h3>
                  <p>{cat.description || "High-precision components engineered for industrial & prototyping applications."}</p>
                  <div className="category-foot">
                    <button
                      type="button"
                      className="link-text"
                      onClick={() => handleCategorySelect(cat.slug)}
                    >
                      Explore {cat.name} →
                    </button>
                    <span>{subCountText}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Featured products */}
      <section className="section" id="featured-products">
        <div className="section-head">
          <div style={{ display: "flex", alignItems: "baseline", gap: "12px", flexWrap: "wrap" }}>
            <h2>Featured Products</h2>
            {!productsLoading && !productsError && (
              <span className="catalog-count-badge">
                ({pagination.totalItems > 0 ? pagination.totalItems : visibleProducts.length}{" "}
                {(pagination.totalItems || visibleProducts.length) === 1 ? "product" : "products"})
              </span>
            )}
          </div>
          <div className="filter-tabs" role="tablist" aria-label="Category filter tabs">
            {filterTabs.map((tab) => {
              const isActive =
                (tab.key === "all" && selectedCategory === "all" && !isOffersOnly) ||
                (tab.key === "offers" && isOffersOnly) ||
                (!isOffersOnly && selectedCategory === tab.key);

              return (
                <button
                  key={tab.key}
                  role="tab"
                  aria-selected={isActive}
                  className={"filter-tab" + (isActive ? " active" : "")}
                  onClick={() => handleTabClick(tab.key)}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={handleClearAllFilters}
            className="link-arrow"
          >
            View All →
          </button>
        </div>

        {/* Active search filter banner */}
        {activeSearch && (
          <div className="search-active-bar" role="status">
            <span className="search-active-label">
              Search results for: <span className="search-active-term">"{activeSearch}"</span>
            </span>
            <button
              type="button"
              className="btn-clear-search"
              onClick={() => {
                setActiveSearch("");
                setSearchInput("");
              }}
            >
              ✕ Clear Search
            </button>
          </div>
        )}

        {/* Loading state */}
        {productsLoading ? (
          <div className="product-grid" role="status" aria-label="Loading products">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div className="product-card-skeleton" key={n}>
                <div className="skeleton-thumb" />
                <div className="skeleton-body">
                  <div className="skeleton-line skeleton-title" />
                  <div className="skeleton-line skeleton-price" />
                  <div className="skeleton-line skeleton-btn" />
                </div>
              </div>
            ))}
          </div>
        ) : productsError ? (
          <div className="catalog-error-state" role="alert">
            <div className="error-icon" aria-hidden="true">⚠️</div>
            <h3>Unable to Load Products</h3>
            <p>{productsError}</p>
            <button
              type="button"
              className="btn-retry"
              onClick={loadProducts}
            >
              ↻ Retry
            </button>
          </div>
        ) : visibleProducts.length === 0 ? (
          <div className="catalog-empty-state" role="status">
            <div className="empty-state-icon" aria-hidden="true">🔍</div>
            <h3>No products found</h3>
            <p>
              {activeSearch
                ? `We couldn't find any products matching "${activeSearch}".`
                : isOffersOnly
                ? "There are currently no products with active discounts or offers in the selected catalog."
                : selectedCategory !== "all"
                ? "No products are currently available in this category."
                : "No products are currently available in the catalog."}
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleClearAllFilters}
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <div className="product-grid">
            {visibleProducts.map((p) => (
              <ProductCard
                product={p}
                key={p.id || p.slug}
                onAddToCart={handleAddToCart}
                isAdding={pendingCartAction?.id === p.variants?.[0]?.id}
              />
            ))}
          </div>
        )}
      </section>

      {/* Reference lists: fastener & nut types, pulled from the product report */}
      <section className="section reference-section">
        <div className="reference-grid">
          <div className="reference-card">
            <h3>Screws &amp; Fasteners — Types</h3>
            <ul>
              {fastenerTypes.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
          <div className="reference-card">
            <h3>Nut Types</h3>
            <ul>
              {nutTypes.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Bulk orders banner */}
      <section className="bulk-banner">
        <div className="bulk-copy">
          <h3>
            Bulk Orders
            <br />
            Better Prices
          </h3>
          <p>
            Get special pricing for bulk orders. Ideal for industries,
            educational institutions and makers.
          </p>
          <button className="btn btn-primary">Request a Quote →</button>
        </div>
        <div className="bulk-perks">
          <div>
            <span>💎</span>
            <p>Genuine Products</p>
          </div>
          <div>
            <span>🚚</span>
            <p>Pan India Delivery</p>
          </div>
          <div>
            <span>🛡️</span>
            <p>Secure Payments</p>
          </div>
          <div>
            <span>🎧</span>
            <p>Dedicated Support</p>
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="newsletter">
        <div className="newsletter-inner">
          <h3>Stay Updated on New Arrivals &amp; Tech Guides</h3>
          <p>
            Get product updates, technical datasheets and exclusive offers
            delivered to your inbox.
          </p>
          {subscribed ? (
            <p className="newsletter-success">
              ✓ Thank you for subscribing to VERTEX updates!
            </p>
          ) : (
            <form className="newsletter-form" onSubmit={handleSubscribe}>
              <input
                type="email"
                placeholder="Enter your work email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-label="Work email address"
                required
              />
              <button className="btn btn-primary" type="submit">
                Subscribe
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Brands strip */}
      <section className="brands-strip">
        <div className="brands-inner">
          <span className="brands-label">Featured Brands</span>
          <div className="brand-tags">
            {brands.map((b) => (
              <span className="brand-tag" key={b}>
                {b}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-col">
            <div className="brand footer-brand">
              <img src={logo} alt="HV Vertex logo" className="brand-logo" />
              <div className="brand-text">
                <span className="brand-name">VERTEX</span>
                <span className="brand-tagline">BUILD BETTER TOGETHER</span>
              </div>
            </div>
            <p className="footer-about">
              VERTEX is an online store for engineering components, fasteners
              and electronics. Serving makers, industries and institutions
              across India.
            </p>
          </div>

          <div className="footer-col">
            <h4>Quick Links</h4>
            <ul>
              {navItems.slice(0, 5).map((item) => (
                <li key={item}>
                  <button type="button" className="footer-link-btn" onClick={(e) => e.preventDefault()}>
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer-col">
            <h4>Support</h4>
            <ul>
              <li>
                <button type="button" className="footer-link-btn" onClick={(e) => e.preventDefault()}>
                  Help Center
                </button>
              </li>
              <li>
                <button type="button" className="footer-link-btn" onClick={(e) => e.preventDefault()}>
                  Track Order
                </button>
              </li>
              <li>
                <button type="button" className="footer-link-btn" onClick={(e) => e.preventDefault()}>
                  Shipping Policy
                </button>
              </li>
              <li>
                <button type="button" className="footer-link-btn" onClick={(e) => e.preventDefault()}>
                  Returns &amp; Refunds
                </button>
              </li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Contact</h4>
            <p>📍 Hyderabad, Telangana, India</p>
            <p>✉️ support@vertex.in</p>
            <p>📞 +91 98765 43210</p>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} VERTEX. All rights reserved.</p>
        </div>
      </footer>

      {/* Shopping Cart Drawer */}
      <CartDrawer
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        loading={cartLoading}
        pendingAction={pendingCartAction}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onClearCart={handleClearCart}
        cartError={cartError}
        onClearError={() => setCartError(null)}
        onNavigateLogin={() => navigate("login", null, "/")}
        onProceedToCheckout={handleProceedToCheckout}
        currentUser={currentUser}
      />
    </div>
  );
}
