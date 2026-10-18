import React, { useState, useEffect } from "react";
import logo from "./assets/logo.png";
import LoginPage from "./components/Login/LoginPage";
import AdminLayout from "./components/Admin/AdminLayout";
import { getCurrentUser, logoutUser } from "./services/authApi";
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

const categories = [
  {
    key: "electronics",
    title: "Electronics",
    icon: "🔌",
    tint: "tint-blue",
    desc: "Microcontrollers, Motor Drives, PLC, Development Boards",
    linkLabel: "Explore Electronics",
    count: 4,
  },
  {
    key: "fasteners",
    title: "Screws & Fasteners",
    icon: "🔩",
    tint: "tint-orange",
    desc: "Flat, Phillips, Hex, Torx, Bolts, Washers, Brass Inserts",
    linkLabel: "Explore Fasteners",
    count: 8,
  },
  {
    key: "nuts",
    title: "Nut Types",
    icon: "⬡",
    tint: "tint-green",
    desc: "Hex, Nyloc, Flanged Nyloc, Wing, Dome, Flange Nuts",
    linkLabel: "Explore Nuts",
    count: 6,
  },
];

// Product data assembled from the Electronics / Screws & Fasteners / Nut Types report
const products = [
  {
    id: 1,
    name: "Arduino Uno R3 Microcontroller Board",
    type: "Microcontrollers",
    tag: "Best Seller",
    price: 1299,
    mrp: null,
    rating: 5,
    reviews: 124,
    stock: true,
    group: "Electronics",
  },
  {
    id: 2,
    name: "Motor Driver Module (L298N)",
    type: "Motor Drives",
    tag: "10% OFF",
    price: 499,
    mrp: 550,
    rating: 4.5,
    reviews: 86,
    stock: true,
    group: "Electronics",
  },
  {
    id: 3,
    name: "PLC - Delta DVP Series",
    type: "PLC",
    tag: null,
    price: 4999,
    mrp: null,
    rating: 4,
    reviews: 52,
    stock: true,
    group: "Electronics",
  },
  {
    id: 4,
    name: "Raspberry Pi 4 Development Board",
    type: "Development Boards",
    tag: null,
    price: 3599,
    mrp: null,
    rating: 5,
    reviews: 98,
    stock: true,
    group: "Electronics",
  },
  {
    id: 5,
    name: "Stainless Steel Hex Bolt (M8 x 30mm)",
    type: "Bolts",
    tag: null,
    price: 250,
    mrp: null,
    unit: "Pack of 10",
    rating: 4.5,
    reviews: 76,
    stock: true,
    group: "Fasteners",
  },
  {
    id: 6,
    name: "Nyloc Nut (M8)",
    type: "Nyloc Nuts",
    tag: null,
    price: 120,
    mrp: null,
    unit: "Pack of 20",
    rating: 4.5,
    reviews: 64,
    stock: true,
    group: "Nuts",
  },
];

const filterTabs = ["All", "Electronics", "Fasteners", "Nuts", "Offers"];

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

function ProductCard({ product }) {
  return (
    <div className="product-card">
      {product.tag && (
        <span
          className={
            "product-tag " +
            (product.tag.includes("OFF") ? "tag-discount" : "tag-best")
          }
        >
          {product.tag}
        </span>
      )}
      <div className="product-thumb">
        <span className="thumb-placeholder">{product.type[0]}</span>
      </div>
      <div className="product-body">
        <p className="product-name">{product.name}</p>
        <div className="product-price-row">
          <span className="price">₹{product.price.toLocaleString("en-IN")}</span>
          {product.mrp && (
            <span className="mrp">₹{product.mrp.toLocaleString("en-IN")}</span>
          )}
          {product.unit && <span className="unit">({product.unit})</span>}
        </div>
        <div className="product-rating-row">
          <Stars rating={product.rating} />
          <span className="review-count">({product.reviews})</span>
        </div>
        <p className="stock-line">
          <span className="stock-dot" /> In Stock
        </p>
        <button className="btn btn-outline btn-cart">🛒 Add to Cart</button>
      </div>
    </div>
  );
}

export default function App() {
  const [currentView, setCurrentView] = useState(() => {
    if (typeof window !== "undefined") {
      if (window.location.pathname.startsWith("/admin")) return "admin";
      if (window.location.pathname === "/login") return "login";
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
  const [activeFilter, setActiveFilter] = useState("All");
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    // Check initial authentication status via secure HttpOnly cookie
    getCurrentUser()
      .then((res) => {
        if (res?.user) {
          setCurrentUser(res.user);
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
      } else {
        setCurrentView("home");
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = (view, section = "dashboard", redirectParam = null) => {
    setCurrentView(view);
    let targetPath = "/";
    if (view === "login") {
      targetPath = redirectParam ? `/login?redirect=${encodeURIComponent(redirectParam)}` : "/login";
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

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    setFlashMessage(`Welcome back, ${user.fullName || user.email}!`);

    // Check if there was an intended redirect destination before login
    let redirectDestination = null;
    if (typeof window !== "undefined" && window.location.search) {
      const searchParams = new URLSearchParams(window.location.search);
      redirectDestination = searchParams.get("redirect");
    }

    // Role-based redirection enforcing strict server-returned roles:
    // ADMIN: route to /admin (or the specific preserved /admin/:section if valid)
    // CUSTOMER / B2B: route to customer storefront
    if (user.role === "ADMIN") {
      if (redirectDestination && redirectDestination.startsWith("/admin")) {
        const section = redirectDestination.replace("/admin", "").replace(/^\//, "").split("/")[0] || "dashboard";
        navigate("admin", section);
      } else {
        navigate("admin", "dashboard");
      }
    } else {
      // Non-admin roles (CUSTOMER / B2B) are strictly routed to the storefront
      // Even if a non-admin attempted to visit /admin, they are routed to home
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
    setFlashMessage("You have been signed out successfully.");
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

  const visibleProducts =
    activeFilter === "All"
      ? products
      : products.filter((p) => p.group === activeFilter);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email.trim()) setSubscribed(true);
  };

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
          <div className="brand" onClick={() => navigate("home")} style={{ cursor: "pointer" }}>
            <img src={logo} alt="HV Vertex logo" className="brand-logo" />
            <div className="brand-text">
              <span className="brand-name">VERTEX</span>
              <span className="brand-tagline">BUILD BETTER TOGETHER</span>
            </div>
          </div>

          <div className="search-bar">
            <input
              type="text"
              placeholder="Search for electronics, screws, nuts, part numbers..."
              aria-label="Search products"
            />
            <button aria-label="Search">🔍</button>
          </div>

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
            <span className="header-action cart-action">
              <span aria-hidden="true">🛒</span> Cart
              <span className="cart-badge">0</span>
            </span>
          </div>
        </div>

        <nav className="nav-bar">
          {navItems.map((item, i) => (
            <button
              type="button"
              key={item}
              className={"nav-link" + (i === 0 ? " active" : "")}
              onClick={(e) => e.preventDefault()}
            >
              {item}
            </button>
          ))}
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
              <button className="btn btn-primary">Shop Electronics →</button>
              <button className="btn btn-outline-light">
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
      <section className="section">
        <div className="section-head">
          <h2>Shop by Category</h2>
          <button type="button" onClick={(e) => e.preventDefault()} className="link-arrow">
            View All Categories →
          </button>
        </div>
        <div className="category-grid">
          {categories.map((cat) => (
            <div className={"category-card " + cat.tint} key={cat.key}>
              <div className="category-icon">{cat.icon}</div>
              <h3>{cat.title}</h3>
              <p>{cat.desc}</p>
              <div className="category-foot">
                <button type="button" className="link-text" onClick={(e) => e.preventDefault()}>
                  {cat.linkLabel} →
                </button>
                <span>{cat.count} Subcategories</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured products */}
      <section className="section">
        <div className="section-head">
          <h2>Featured Products</h2>
          <div className="filter-tabs">
            {filterTabs.map((tab) => (
              <button
                key={tab}
                className={
                  "filter-tab" + (activeFilter === tab ? " active" : "")
                }
                onClick={() => setActiveFilter(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
          <button type="button" onClick={(e) => e.preventDefault()} className="link-arrow">
            View All →
          </button>
        </div>
        <div className="product-grid">
          {visibleProducts.map((p) => (
            <ProductCard product={p} key={p.id} />
          ))}
        </div>
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
        <div className="bulk-art" aria-hidden="true">
          From Ideas to Real-World Innovations
        </div>
      </section>

      {/* Newsletter + brands */}
      <section className="newsletter-row">
        <form className="newsletter" onSubmit={handleSubscribe}>
          <span className="newsletter-icon">✉️</span>
          <div>
            <h4>Join Our Newsletter</h4>
            <p>Get the latest updates, offers and new arrivals.</p>
          </div>
          <input
            type="email"
            placeholder="Enter your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button type="submit" className="btn btn-primary">
            {subscribed ? "Subscribed ✓" : "Subscribe"}
          </button>
        </form>
        <div className="brands">
          <div className="brands-head">
            <h4>Our Trusted Brands</h4>
            <button type="button" className="link-arrow" onClick={(e) => e.preventDefault()}>
              View All →
            </button>
          </div>
          <div className="brand-chips">
            {brands.map((b) => (
              <span className="brand-chip" key={b}>
                {b}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="brand footer-brand-logo">
              <img src={logo} alt="HV Vertex logo" className="brand-logo" />
              <div className="brand-text">
                <span className="brand-name">VERTEX</span>
                <span className="brand-tagline">BUILD BETTER TOGETHER</span>
              </div>
            </div>
            <p>
              Your trusted partner for electronics and fasteners. Quality
              components for professionals, makers and industries.
            </p>
            <div className="social-row">
              <span>📷</span>
              <span>📘</span>
              <span>▶️</span>
              <span>💼</span>
            </div>
          </div>

          <div>
            <h5>Quick Links</h5>
            <ul>
              <li>Home</li>
              <li>Electronics</li>
              <li>Screws &amp; Fasteners</li>
              <li>Nut Types</li>
              <li>Offers</li>
            </ul>
          </div>

          <div>
            <h5>Customer Service</h5>
            <ul>
              <li>Track Order</li>
              <li>Shipping Policy</li>
              <li>Returns &amp; Refunds</li>
              <li>FAQ</li>
              <li>Contact Us</li>
            </ul>
          </div>

          <div>
            <h5>Company</h5>
            <ul>
              <li>About Us</li>
              <li>Careers</li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate("admin")}
                  style={{
                    background: "none",
                    border: "none",
                    color: "inherit",
                    cursor: "pointer",
                    padding: 0,
                    font: "inherit",
                  }}
                  title="Open Admin Console"
                >
                  Admin Console
                </button>
              </li>
              <li>Terms &amp; Conditions</li>
              <li>Privacy Policy</li>
            </ul>
          </div>

          <div>
            <h5>Need Help?</h5>
            <ul className="contact-list">
              <li>📞 +91 98765 43210</li>
              <li>✉️ support@vertex.in</li>
              <li>🕒 Mon – Sat, 9:00 AM – 6:00 PM</li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 Vertex. All rights reserved.</span>
          <span>Engineered Today. Built for Tomorrow.</span>
        </div>
      </footer>
    </div>
  );
}
