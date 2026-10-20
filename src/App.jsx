import React, { useState, useEffect, useCallback } from "react";
import logo from "./assets/logo.png";
import arduinoImg from "./assets/hardware/arduino.jpg";
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
import { isMockApiEnabled, setMockMode } from "./mock/mockConfig";
import { MOCK_USERS } from "./mock/mockData";
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

function ProductCard({ product, onAddToCart, onViewDetails, isAdding = false }) {
  const [imgError, setImgError] = useState(false);
  const primaryVariant = product.variants?.[0];
  const unitLabel = primaryVariant?.packSize || product.unit || null;
  const ratingValue = product.rating || 5;
  const reviewCount = product.reviews || (product.variants?.length ? 24 : 12);
  const inStock = product.inStock !== false && primaryVariant?.stockQuantity !== 0;
  const skuCode = primaryVariant?.sku || product.sku || (product.slug ? `VTX-${product.slug.toUpperCase()}` : "VTX-GEN-SKU");

  return (
    <div className="product-card vtx-reveal" data-testid={`product-card-${product.id || product.slug}`}>
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
        <div className="product-sku" title={`SKU: ${skuCode}`}>
          <span className="sku-label">SKU:</span> <code className="sku-code">{skuCode}</code>
        </div>
        <p className="product-name" title={product.name}>{product.name}</p>
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
        <div className="product-actions-row">
          {onViewDetails && (
            <button
              type="button"
              className="btn btn-outline btn-specs"
              onClick={() => onViewDetails(product)}
              title="View Technical Specs"
            >
              Specs
            </button>
          )}
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
    </div>
  );
}

function MockDevBanner({ currentUser, currentView, onSimulateUser, onToggleMock, onNavigate }) {
  if (!isMockApiEnabled()) return null;

  return (
    <aside className="mock-dev-banner" data-testid="mock-dev-banner" aria-label="Development mock API indicator">
      <div className="mock-dev-banner-left">
        <span className="mock-dev-tag">⚡ Mock Dev Mode</span>
        <span className="mock-dev-desc">
          Neon DB &amp; Backend Bypassed • Local UI Development Active
        </span>
      </div>
      <div className="mock-dev-controls">
        <span className="mock-dev-label">Simulate:</span>
        <button
          type="button"
          className={`mock-dev-btn ${!currentUser ? "is-active" : ""}`}
          onClick={() => onSimulateUser(null)}
          title="Simulate Guest Visitor session"
        >
          Guest
        </button>
        <button
          type="button"
          className={`mock-dev-btn ${currentUser?.role === "CUSTOMER" ? "is-active" : ""}`}
          onClick={() => onSimulateUser("customer")}
          title="Simulate Customer session"
        >
          Customer
        </button>
        <button
          type="button"
          className={`mock-dev-btn ${currentUser?.role === "ADMIN" ? "is-active" : ""}`}
          onClick={() => onSimulateUser("admin")}
          title="Simulate Admin session and open Admin Portal directly"
          data-testid="mock-admin-btn"
        >
          Admin
        </button>
        {currentView === "admin" && (
          <button
            type="button"
            className="mock-dev-btn mock-dev-btn-storefront"
            onClick={() => onNavigate && onNavigate("home")}
            title="Return to Customer Storefront"
          >
            ← Storefront
          </button>
        )}
        <button
          type="button"
          className="mock-dev-btn mock-dev-btn-toggle"
          onClick={onToggleMock}
          title="Disable mock mode and switch to Real Backend"
        >
          Disable Mock
        </button>
      </div>
    </aside>
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Newsletter state
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  // Technical Product Specification Modal state
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Micro-interaction: Animated cart badge on item addition
  const [cartBadgeBumped, setCartBadgeBumped] = useState(false);

  // Close mobile drawer on Escape key and lock body scroll
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    if (mobileMenuOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

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
      setMobileMenuOpen(false);
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

  // Scroll-triggered reveals with fail-safe visibility and prefers-reduced-motion check
  useEffect(() => {
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      return;
    }

    try {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      if (mediaQuery.matches) {
        return;
      }
    } catch (e) {
      // Ignore if matchMedia is unsupported
    }

    const observerCallback = (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-revealed");
          observer.unobserve(entry.target);
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, {
      root: null,
      rootMargin: "0px 0px -40px 0px",
      threshold: 0.1,
    });

    // Mark document container so CSS reveal rules engage
    const pageEl = document.querySelector(".page");
    if (pageEl) {
      pageEl.classList.add("vtx-observer-ready");
    }

    // Observe reveal targets
    const elements = document.querySelectorAll(".vtx-reveal:not(.is-revealed)");
    elements.forEach((el) => observer.observe(el));

    // Fail-safe timeout: ensure all content becomes visible even if observer fails or stalls
    const safetyTimer = setTimeout(() => {
      document.querySelectorAll(".vtx-reveal:not(.is-revealed)").forEach((el) => {
        el.classList.add("is-revealed");
      });
    }, 1200);

    return () => {
      observer.disconnect();
      clearTimeout(safetyTimer);
    };
  }, [products, categories, currentView]);

  const navigate = (view, section = "dashboard", redirectParam = null) => {
    setMobileMenuOpen(false);
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
      setCartBadgeBumped(true);
      setTimeout(() => setCartBadgeBumped(false), 550);
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

  const handleExploreProducts = () => {
    handleClearAllFilters();
    const prodSection = document.getElementById("featured-products");
    if (prodSection && typeof prodSection.scrollIntoView === "function") {
      prodSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleScrollToCategories = () => {
    const catSection = document.getElementById("shop-categories");
    if (catSection && typeof catSection.scrollIntoView === "function") {
      catSection.scrollIntoView({ behavior: "smooth" });
    }
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

  const handleSimulateUser = (role) => {
    if (!role) {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem("vertex_mock_user");
      }
      setCurrentUser(null);
      setCart(formatGuestCart(getStoredGuestItems()));
      setFlashMessage("Simulated session: Guest visitor");
      if (currentView === "admin") {
        navigate("home");
      }
    } else if (role === "admin") {
      const admin = { ...MOCK_USERS.admin };
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem("vertex_mock_user", JSON.stringify(admin));
      }
      setCurrentUser(admin);
      setFlashMessage("Simulated session: Chief Engineer (ADMIN) • Opening Admin Portal");
      navigate("admin", "dashboard");
    } else if (role === "customer") {
      const cust = { ...MOCK_USERS.customer };
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem("vertex_mock_user", JSON.stringify(cust));
      }
      setCurrentUser(cust);
      setFlashMessage("Simulated session: Jane Customer (CUSTOMER)");
      if (currentView === "admin") {
        navigate("home");
      }
    }
  };

  const handleToggleMockMode = () => {
    setMockMode(false);
    if (typeof window !== "undefined") {
      window.location.href = window.location.pathname;
    }
  };

  if (currentView === "admin") {
    return (
      <>
        <MockDevBanner
          currentUser={currentUser}
          currentView={currentView}
          onSimulateUser={handleSimulateUser}
          onToggleMock={handleToggleMockMode}
          onNavigate={navigate}
        />
        <AdminLayout
          currentUser={currentUser}
          onNavigateHome={() => navigate("home")}
          onNavigateLogin={(destination) => navigate("login", null, destination || "/admin")}
          initialSection={adminSection}
        />
      </>
    );
  }

  if (currentView === "login") {
    return (
      <>
        <MockDevBanner
          currentUser={currentUser}
          currentView={currentView}
          onSimulateUser={handleSimulateUser}
          onToggleMock={handleToggleMockMode}
          onNavigate={navigate}
        />
        <LoginPage
          onLoginSuccess={handleLoginSuccess}
          onNavigateHome={() => navigate("home")}
        />
      </>
    );
  }

  if (currentView === "checkout") {
    return (
      <div className="page">
        <MockDevBanner
          currentUser={currentUser}
          currentView={currentView}
          onSimulateUser={handleSimulateUser}
          onToggleMock={handleToggleMockMode}
          onNavigate={navigate}
        />
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
      <MockDevBanner
        currentUser={currentUser}
        currentView={currentView}
        onSimulateUser={handleSimulateUser}
        onToggleMock={handleToggleMockMode}
        onNavigate={navigate}
      />
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
          <div className="top-bar-features">
            {topBarItems.map((item) => (
              <span className="top-bar-item" key={item.label}>
                <span className="top-bar-icon" aria-hidden="true">
                  {item.icon}
                </span>
                {item.label}
              </span>
            ))}
          </div>
          <div className="top-bar-badge" aria-hidden="true">
            <span>⚡ Certified Hardware &amp; Fasteners</span>
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="header">
        <div className="header-inner">
          {/* Mobile hamburger menu button */}
          <button
            type="button"
            className={`vtx-hamburger-btn ${mobileMenuOpen ? "is-open" : ""}`}
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav-drawer"
          >
            <span className="vtx-hamburger-line" aria-hidden="true" />
            <span className="vtx-hamburger-line" aria-hidden="true" />
            <span className="vtx-hamburger-line" aria-hidden="true" />
          </button>

          <div
            className="brand"
            onClick={() => {
              navigate("home");
              handleClearAllFilters();
              setMobileMenuOpen(false);
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
            <span className="search-icon-prefix" aria-hidden="true">🔍</span>
            <input
              type="text"
              placeholder="Search for electronics, screws, nuts, part numbers..."
              aria-label="Search products"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            {searchInput && (
              <button
                type="button"
                className="btn-search-clear"
                onClick={() => {
                  setSearchInput("");
                  setActiveSearch("");
                }}
                aria-label="Clear"
              >
                ✕
              </button>
            )}
            <button type="submit" aria-label="Search" className="btn-search-submit">
              Search
            </button>
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
              <span
                className={`cart-badge${cartBadgeBumped ? " is-bumped" : ""}`}
                data-testid="cart-badge"
              >
                {cart?.totalQuantity || 0}
              </span>
            </button>
          </div>
        </div>

        {/* Desktop Navigation bar */}
        <nav className="nav-bar" aria-label="Main store navigation">
          <div className="nav-bar-inner">
            {navItems.map((item) => {
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
          </div>
        </nav>
      </header>

      {/* Mobile Navigation Drawer & Backdrop */}
      {mobileMenuOpen && (
        <>
          <div
            className="vtx-mobile-nav-backdrop"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div
            id="mobile-nav-drawer"
            className="vtx-mobile-nav-drawer is-open"
            aria-label="Mobile Navigation"
            role="region"
          >
            <div className="vtx-mobile-nav-header">
              <div className="vtx-mobile-brand">
                <span className="brand-name">VERTEX</span>
                <span className="brand-tagline">ENGINEERING STORE</span>
              </div>
              <button
                type="button"
                className="vtx-mobile-nav-close"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>

            <div className="vtx-mobile-nav-content">
              <div className="vtx-mobile-nav-section">
                <span className="vtx-mobile-nav-title">Catalog Navigation</span>
                <div className="vtx-mobile-nav-links">
                  {navItems.map((item) => {
                    const isNavActive =
                      (item === "Home" && selectedCategory === "all" && !isOffersOnly && !activeSearch) ||
                      (item === "Electronics" && selectedCategory === "electronics" && !isOffersOnly) ||
                      (item === "Screws & Fasteners" && selectedCategory === "fasteners" && !isOffersOnly) ||
                      (item === "Nuts" && selectedCategory === "nuts" && !isOffersOnly) ||
                      (item === "Offers" && isOffersOnly);

                    const handleMobileNavClick = (e) => {
                      e.preventDefault();
                      setMobileMenuOpen(false);
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

                    return (
                      <button
                        type="button"
                        key={`mobile-${item}`}
                        className={`vtx-mobile-nav-link ${isNavActive ? "active" : ""}`}
                        onClick={handleMobileNavClick}
                      >
                        <span>{item}</span>
                        <span aria-hidden="true" style={{ opacity: 0.5, fontSize: "0.85rem" }}>→</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="vtx-mobile-nav-footer">
                {currentUser ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--text-dark)" }}>
                      👤 Signed in as {currentUser.fullName || currentUser.email}
                    </div>
                    {currentUser.role === "ADMIN" && (
                      <button
                        type="button"
                        className="btn-admin-console"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          navigate("admin");
                        }}
                        style={{ width: "100%", justifyContent: "center", padding: "8px" }}
                      >
                        ⚙️ Open Admin Console
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn-logout"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        handleLogout();
                      }}
                      style={{ width: "100%", padding: "8px" }}
                    >
                      Logout
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate("login");
                    }}
                    style={{ width: "100%" }}
                  >
                    👤 Sign In / Register
                  </button>
                )}
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", textAlign: "center", marginTop: "8px" }}>
                  Pan-India Delivery • Verified Hardware Components
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Hero */}
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-copy">
            <div className="hero-badge">
              <span>⚡ Industrial Components &amp; Precision Fasteners</span>
            </div>
            <h1>
              Precision Electronics &amp; Hardware Fasteners
              <br />
              <span className="hero-accent">Built for Engineering &amp; B2B Supply</span>
            </h1>
            <p className="hero-sub">
              Source factory-tested microcontrollers, industrial automation modules, SS304 metric fasteners, and lab components with transparent volume pricing and pan-India dispatch.
            </p>
            <div className="hero-ctas">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleExploreProducts}
              >
                Explore Products ↓
              </button>
              <button
                type="button"
                className="btn btn-outline-light"
                onClick={() => handleCategorySelect("electronics")}
              >
                Shop Electronics →
              </button>
              <button
                type="button"
                className="btn btn-outline-light"
                onClick={handleScrollToCategories}
              >
                Browse Categories ↓
              </button>
            </div>
            <div className="hero-perks-row">
              <span className="hero-perk-item">✓ Factory Verified Sourcing</span>
              <span className="hero-perk-item">✓ SS304 Precision Tolerances</span>
              <span className="hero-perk-item">✓ GST Tax Invoicing</span>
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="hero-card-preview">
              <div className="hero-preview-header">
                <span className="hero-pill-category">Hardware Showcase</span>
                <span className="hero-pill-status">● Ready to Dispatch</span>
              </div>
              <div className="hero-preview-img-wrap">
                <img src={arduinoImg} alt="Industrial Microcontroller" className="hero-preview-img" />
              </div>
              <div className="hero-preview-body">
                <div className="hero-preview-title">Arduino Uno R3 &amp; SS304 Metric Hardware</div>
                <div className="hero-preview-sku">SKU: ELEC-ARD-UNO-R3 • SS304 M3-M10</div>
                <div className="hero-preview-footer">
                  <span className="hero-preview-price">Verified B2B Direct Sourcing</span>
                  <span className="hero-preview-tag">ISO 9001 Compliant</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Value Propositions */}
      <section className="vtx-values-bar" aria-label="Why choose VERTEX">
        <div className="vtx-values-inner">
          <div className="vtx-value-card vtx-reveal vtx-stagger-1">
            <div className="vtx-value-icon" aria-hidden="true">🔌</div>
            <div className="vtx-value-content">
              <h3 className="vtx-value-title">Industrial Component Selection</h3>
              <p className="vtx-value-desc">
                Factory-tested microcontrollers, motor drivers, PLCs, and development boards for production and lab prototypes.
              </p>
            </div>
          </div>
          <div className="vtx-value-card vtx-reveal vtx-stagger-2">
            <div className="vtx-value-icon" aria-hidden="true">🔩</div>
            <div className="vtx-value-content">
              <h3 className="vtx-value-title">Technical Specifications</h3>
              <p className="vtx-value-desc">
                Standard metric pitches, SS304 tensile tolerance, and documented pack sizes for every fastener SKU.
              </p>
            </div>
          </div>
          <div className="vtx-value-card vtx-reveal vtx-stagger-3">
            <div className="vtx-value-icon" aria-hidden="true">📦</div>
            <div className="vtx-value-content">
              <h3 className="vtx-value-title">Bulk Purchasing Options</h3>
              <p className="vtx-value-desc">
                Volume-tiered pricing and direct quote requests for workshops, educational institutions, and OEMs.
              </p>
            </div>
          </div>
          <div className="vtx-value-card vtx-reveal vtx-stagger-4">
            <div className="vtx-value-icon" aria-hidden="true">🚚</div>
            <div className="vtx-value-content">
              <h3 className="vtx-value-title">Order Visibility &amp; Support</h3>
              <p className="vtx-value-desc">
                Transparent shipment dispatch, GST-compliant tax invoices, and dedicated technical inquiry assistance.
              </p>
            </div>
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
                <div className={`category-card ${tint} vtx-reveal vtx-stagger-${(idx % 3) + 1}`} key={cat.id || cat.slug}>
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
                onViewDetails={setSelectedProduct}
                isAdding={pendingCartAction?.id === p.variants?.[0]?.id}
              />
            ))}
          </div>
        )}
      </section>

      {/* Reference lists: fastener & nut types, pulled from the product report */}
      <section className="section reference-section">
        <div className="reference-grid">
          <div className="reference-card vtx-reveal vtx-stagger-1">
            <h3>Screws &amp; Fasteners — Types</h3>
            <ul>
              {fastenerTypes.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
          <div className="reference-card vtx-reveal vtx-stagger-2">
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
      <section className="bulk-banner vtx-reveal">
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

      {/* Product Technical Specifications Modal */}
      {selectedProduct && (
        <div
          className="vtx-modal-backdrop"
          onClick={() => setSelectedProduct(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="product-spec-title"
        >
          <div className="vtx-modal" onClick={(e) => e.stopPropagation()}>
            <div className="vtx-modal-header">
              <div>
                <span className="vtx-modal-badge">{selectedProduct.category?.name || "Hardware Component"}</span>
                <h3 id="product-spec-title" className="vtx-modal-title">{selectedProduct.name}</h3>
              </div>
              <button
                type="button"
                className="vtx-modal-close"
                onClick={() => setSelectedProduct(null)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>
            <div className="vtx-modal-body">
              <div className="vtx-spec-grid">
                <div className="vtx-spec-thumb">
                  {selectedProduct.imageUrl ? (
                    <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="vtx-spec-img" />
                  ) : (
                    <div className="vtx-spec-placeholder">
                      {selectedProduct.name ? selectedProduct.name[0].toUpperCase() : "P"}
                    </div>
                  )}
                </div>
                <div className="vtx-spec-details">
                  <div className="vtx-spec-line">
                    <strong>SKU Code:</strong>{" "}
                    <code>{selectedProduct.variants?.[0]?.sku || selectedProduct.sku || "VTX-GEN-SKU"}</code>
                  </div>
                  <div className="vtx-spec-line">
                    <strong>Price:</strong>{" "}
                    <span className="vtx-spec-price">₹{Number(selectedProduct.price || 0).toLocaleString("en-IN")}</span>
                    {selectedProduct.variants?.[0]?.packSize && (
                      <span className="vtx-spec-unit"> / {selectedProduct.variants[0].packSize}</span>
                    )}
                  </div>
                  <div className="vtx-spec-line">
                    <strong>Stock Status:</strong>{" "}
                    <span className={selectedProduct.inStock !== false ? "vtx-stock-active" : "vtx-stock-out"}>
                      {selectedProduct.inStock !== false ? "● In Stock (Warehouse Ready)" : "○ Backorder / Out of Stock"}
                    </span>
                  </div>
                  <p className="vtx-spec-desc">
                    {selectedProduct.description ||
                      "Certified industrial engineering component designed for high-reliability circuit automation, robotics assemblies, and precision mechanical fixtures."}
                  </p>
                </div>
              </div>
            </div>
            <div className="vtx-modal-footer">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setSelectedProduct(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  handleAddToCart(selectedProduct, selectedProduct.variants?.[0]);
                  setSelectedProduct(null);
                }}
                disabled={selectedProduct.inStock === false}
              >
                🛒 Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}

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
