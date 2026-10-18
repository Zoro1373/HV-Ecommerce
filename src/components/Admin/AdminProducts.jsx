import React, { useState, useEffect, useCallback } from "react";
import {
  getAdminProducts,
  getAdminCategories,
  createAdminProduct,
} from "../../services/adminApi";

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalItems: 0, totalPages: 1 });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSort, setSelectedSort] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);

  // Modals & Inspection
  const [inspectingProduct, setInspectingProduct] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalMessage, setModalMessage] = useState(null);

  // New Product Form State
  const [newProduct, setNewProduct] = useState({
    name: "",
    slug: "",
    categoryId: "",
    brand: "VERTEX",
    hsnCode: "8542",
    gstRate: "18.00",
    tag: "",
    description: "",
    sku: "",
    partNumber: "",
    price: "",
    stockQuantity: "50",
  });

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getAdminProducts({
        q: searchQuery,
        category: selectedCategory,
        sort: selectedSort,
        page: currentPage,
        limit: 10,
      });

      if (res?.products) {
        setProducts(res.products);
        setPagination(res.pagination || { page: 1, limit: 10, totalItems: res.products.length, totalPages: 1 });
      }
    } catch (err) {
      setError(err.message || "Failed to load products from catalog API.");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedCategory, selectedSort, currentPage]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    async function loadCats() {
      try {
        const catRes = await getAdminCategories();
        if (catRes?.categories) {
          setCategories(catRes.categories);
          if (catRes.categories.length > 0 && !newProduct.categoryId) {
            setNewProduct((prev) => ({ ...prev, categoryId: catRes.categories[0].id }));
          }
        }
      } catch (e) {
        // Ignored
      }
    }
    loadCats();
  }, [newProduct.categoryId]);

  const handleNameChange = (e) => {
    const name = e.target.value;
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");

    setNewProduct((prev) => ({
      ...prev,
      name,
      slug: prev.slug === "" || prev.slug === prev.name.toLowerCase().replace(/\s+/g, "-") ? slug : prev.slug,
      sku: prev.sku === "" ? `VTX-${slug.slice(0, 8).toUpperCase()}` : prev.sku,
    }));
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    setModalMessage(null);

    if (!newProduct.name.trim() || !newProduct.sku.trim() || !newProduct.price) {
      setModalMessage({
        type: "error",
        text: "Please provide a product name, variant SKU, and unit price.",
      });
      return;
    }

    try {
      setModalSubmitting(true);
      const res = await createAdminProduct({
        ...newProduct,
        price: parseFloat(newProduct.price),
        stockQuantity: parseInt(newProduct.stockQuantity, 10) || 0,
        gstRate: parseFloat(newProduct.gstRate) || 18.0,
      });

      setModalMessage({
        type: "success",
        text: `Product '${res?.product?.name || newProduct.name}' registered successfully!`,
      });

      // Reload products from database to verify persistence
      await loadProducts();

      setTimeout(() => {
        setIsAddModalOpen(false);
        setNewProduct({
          name: "",
          slug: "",
          categoryId: categories[0]?.id || "",
          brand: "VERTEX",
          hsnCode: "8542",
          gstRate: "18.00",
          tag: "",
          description: "",
          sku: "",
          partNumber: "",
          price: "",
          stockQuantity: "50",
        });
        setModalMessage(null);
      }, 1200);
    } catch (err) {
      setModalMessage({
        type: err.status === 404 ? "warning" : "error",
        text: err.status === 404
          ? "Notice: The backend product creation endpoint (POST /api/admin/products) is scheduled for Phase 4/6 catalog mutation. Form validated successfully on the client."
          : err.message,
      });
    } finally {
      setModalSubmitting(false);
    }
  };

  return (
    <div className="adm-products-view">
      <div className="adm-page-header">
        <div className="adm-page-title-group">
          <h1>Product Catalog Management</h1>
          <p className="adm-page-subtitle">
            Search, filter, inspect specifications, and manage industrial electronics &amp; hardware products.
          </p>
        </div>
        <div className="adm-page-actions">
          <button
            type="button"
            className="adm-btn adm-btn-primary"
            onClick={() => setIsAddModalOpen(true)}
          >
            + Add New Product
          </button>
        </div>
      </div>

      {error && (
        <div className="adm-notice-banner adm-notice-warning" role="alert">
          <span className="adm-notice-icon">⚠️</span>
          <div>
            <strong>Catalog Notice:</strong> {error}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="adm-filter-bar">
        <div className="adm-search-input-wrap">
          <span className="adm-search-icon" aria-hidden="true">
            🔍
          </span>
          <input
            type="text"
            className="adm-search-input"
            placeholder="Search by name, SKU, or brand..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            aria-label="Search products"
          />
        </div>

        <div className="adm-filter-group">
          <select
            className="adm-select"
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setCurrentPage(1);
            }}
            aria-label="Filter by category"
          >
            <option value="">All Categories ({categories.length})</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            className="adm-select"
            value={selectedSort}
            onChange={(e) => {
              setSelectedSort(e.target.value);
              setCurrentPage(1);
            }}
            aria-label="Sort products"
          >
            <option value="newest">Newest First</option>
            <option value="name_asc">Name (A–Z)</option>
            <option value="name_desc">Name (Z–A)</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      {loading ? (
        <div className="adm-loading-screen" role="status">
          <span className="adm-spinner adm-spinner-dark" aria-hidden="true" />
          <p>Loading products from PostgreSQL catalog...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="adm-empty-state">
          <div className="adm-empty-icon" aria-hidden="true">
            📦
          </div>
          <h3 className="adm-empty-title">No Products Found</h3>
          <p className="adm-empty-desc">
            No active products matched the search query or category filter. Try clearing the filter or search criteria.
          </p>
          <button
            type="button"
            className="adm-btn adm-btn-secondary"
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("");
              setSelectedSort("newest");
            }}
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="adm-card" style={{ padding: 0 }}>
          <div className="adm-table-container">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Product Name / Slug</th>
                  <th>Category</th>
                  <th>Brand</th>
                  <th>HSN / Tax</th>
                  <th>Price Range</th>
                  <th>Variants</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const variants = p.variants || [];
                  const minPrice = variants.length > 0
                    ? Math.min(...variants.map((v) => Number(v.price) || 0))
                    : p.price || 0;

                  return (
                    <tr key={p.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: "var(--adm-text-primary)" }}>
                          {p.name}
                        </div>
                        <div style={{ fontSize: "0.76rem", color: "var(--adm-text-muted)" }}>
                          <code>{p.slug}</code>
                        </div>
                      </td>
                      <td>
                        <span className="adm-badge adm-badge-info">
                          {p.category?.name || "Uncategorized"}
                        </span>
                      </td>
                      <td>{p.brand || "VERTEX"}</td>
                      <td>
                        <div style={{ fontSize: "0.82rem" }}>HSN: {p.hsnCode || "8542"}</div>
                        <div style={{ fontSize: "0.74rem", color: "var(--adm-text-secondary)" }}>
                          GST: {p.gstRate || 18}%
                        </div>
                      </td>
                      <td>
                        <strong>₹{Number(minPrice).toLocaleString("en-IN")}</strong>
                      </td>
                      <td>
                        <span className="adm-badge adm-badge-neutral">
                          {variants.length} SKU{variants.length !== 1 ? "s" : ""}
                        </span>
                      </td>
                      <td>
                        <span className="adm-badge adm-badge-success">
                          Active
                        </span>
                      </td>
                      <td>
                        <div className="adm-table-actions">
                          <button
                            type="button"
                            className="adm-btn adm-btn-secondary adm-btn-sm"
                            onClick={() => setInspectingProduct(p)}
                          >
                            Inspect
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="adm-pagination">
            <span>
              Showing {products.length} of {pagination.totalItems || products.length} products
            </span>
            <div className="adm-pagination-btns">
              <button
                type="button"
                className="adm-btn adm-btn-secondary adm-btn-sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              >
                &larr; Previous
              </button>
              <span style={{ margin: "0 8px", fontWeight: 600 }}>
                Page {pagination.page || currentPage} of {pagination.totalPages || 1}
              </span>
              <button
                type="button"
                className="adm-btn adm-btn-secondary adm-btn-sm"
                disabled={currentPage >= (pagination.totalPages || 1)}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                Next &rarr;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inspect Product Modal */}
      {inspectingProduct && (
        <div className="adm-modal-backdrop" onClick={() => setInspectingProduct(null)}>
          <div
            className="adm-modal"
            style={{ maxWidth: 760 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="inspect-product-title"
          >
            <div className="adm-modal-header">
              <h2 id="inspect-product-title" className="adm-modal-title">
                {inspectingProduct.name}
              </h2>
              <button
                type="button"
                className="adm-modal-close"
                onClick={() => setInspectingProduct(null)}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>
            <div className="adm-modal-body">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                <div>
                  <span className="adm-label">Product ID (UUID)</span>
                  <code style={{ fontSize: "0.78rem" }}>{inspectingProduct.id}</code>
                </div>
                <div>
                  <span className="adm-label">URL Slug</span>
                  <code style={{ fontSize: "0.78rem" }}>{inspectingProduct.slug}</code>
                </div>
                <div>
                  <span className="adm-label">Category</span>
                  <div style={{ fontWeight: 600 }}>{inspectingProduct.category?.name || "General"}</div>
                </div>
                <div>
                  <span className="adm-label">Brand &amp; Tag</span>
                  <div>{inspectingProduct.brand || "VERTEX"} {inspectingProduct.tag && `(${inspectingProduct.tag})`}</div>
                </div>
              </div>

              {inspectingProduct.description && (
                <div style={{ marginBottom: 20 }}>
                  <span className="adm-label">Description</span>
                  <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--adm-text-secondary)" }}>
                    {inspectingProduct.description}
                  </p>
                </div>
              )}

              <span className="adm-label">Product Variants &amp; Stock Telemetry</span>
              <div className="adm-table-container" style={{ marginTop: 8 }}>
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Variant Name / Pack</th>
                      <th>Price (₹)</th>
                      <th>Available Units</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(inspectingProduct.variants || []).map((v) => (
                      <tr key={v.id}>
                        <td>
                          <code>{v.sku}</code>
                        </td>
                        <td>
                          {v.name || v.packSize || "Standard"}
                          {v.dimensions && ` (${v.dimensions})`}
                        </td>
                        <td>₹{Number(v.price).toLocaleString("en-IN")}</td>
                        <td>
                          <strong>{v.stockQuantity}</strong>
                        </td>
                        <td>
                          <span
                            className={`adm-badge ${
                              v.stockQuantity > 50
                                ? "adm-badge-success"
                                : v.stockQuantity > 0
                                ? "adm-badge-warning"
                                : "adm-badge-danger"
                            }`}
                          >
                            {v.stockQuantity > 50
                              ? "In Stock"
                              : v.stockQuantity > 0
                              ? "Low Stock"
                              : "Out of Stock"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="adm-modal-footer">
              <button
                type="button"
                className="adm-btn adm-btn-secondary"
                onClick={() => setInspectingProduct(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Product Modal */}
      {isAddModalOpen && (
        <div className="adm-modal-backdrop" onClick={() => setIsAddModalOpen(false)}>
          <div
            className="adm-modal"
            style={{ maxWidth: 680 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="add-product-title"
          >
            <div className="adm-modal-header">
              <h2 id="add-product-title" className="adm-modal-title">
                Add New Industrial Hardware Product
              </h2>
              <button
                type="button"
                className="adm-modal-close"
                onClick={() => setIsAddModalOpen(false)}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCreateProduct}>
              <div className="adm-modal-body">
                {modalMessage && (
                  <div
                    className={`adm-notice-banner ${
                      modalMessage.type === "success"
                        ? "adm-notice-info"
                        : "adm-notice-warning"
                    }`}
                    role="alert"
                  >
                    <span className="adm-notice-icon">
                      {modalMessage.type === "success" ? "✓" : "⚠️"}
                    </span>
                    <div>{modalMessage.text}</div>
                  </div>
                )}

                <div className="adm-form-row">
                  <div className="adm-form-group">
                    <label className="adm-label" htmlFor="prod-name">
                      Product Name *
                    </label>
                    <input
                      id="prod-name"
                      type="text"
                      className="adm-input"
                      placeholder="e.g. Arduino Nano RP2040 Connect"
                      value={newProduct.name}
                      onChange={handleNameChange}
                      required
                    />
                  </div>
                  <div className="adm-form-group">
                    <label className="adm-label" htmlFor="prod-slug">
                      URL Slug *
                    </label>
                    <input
                      id="prod-slug"
                      type="text"
                      className="adm-input"
                      value={newProduct.slug}
                      onChange={(e) => setNewProduct({ ...newProduct, slug: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="adm-form-row">
                  <div className="adm-form-group">
                    <label className="adm-label" htmlFor="prod-cat">
                      Category *
                    </label>
                    <select
                      id="prod-cat"
                      className="adm-select"
                      style={{ width: "100%" }}
                      value={newProduct.categoryId}
                      onChange={(e) => setNewProduct({ ...newProduct, categoryId: e.target.value })}
                      required
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="adm-form-group">
                    <label className="adm-label" htmlFor="prod-brand">
                      Brand / Manufacturer
                    </label>
                    <input
                      id="prod-brand"
                      type="text"
                      className="adm-input"
                      value={newProduct.brand}
                      onChange={(e) => setNewProduct({ ...newProduct, brand: e.target.value })}
                    />
                  </div>
                </div>

                <div className="adm-form-row">
                  <div className="adm-form-group">
                    <label className="adm-label" htmlFor="prod-hsn">
                      HSN Code
                    </label>
                    <input
                      id="prod-hsn"
                      type="text"
                      className="adm-input"
                      placeholder="8542 / 7318"
                      value={newProduct.hsnCode}
                      onChange={(e) => setNewProduct({ ...newProduct, hsnCode: e.target.value })}
                    />
                  </div>
                  <div className="adm-form-group">
                    <label className="adm-label" htmlFor="prod-gst">
                      GST Rate (%)
                    </label>
                    <input
                      id="prod-gst"
                      type="number"
                      step="0.01"
                      className="adm-input"
                      value={newProduct.gstRate}
                      onChange={(e) => setNewProduct({ ...newProduct, gstRate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="adm-form-group">
                  <label className="adm-label" htmlFor="prod-desc">
                    Technical Description
                  </label>
                  <textarea
                    id="prod-desc"
                    className="adm-textarea"
                    rows="2"
                    placeholder="Provide hardware specifications, pinout features, or bolt specs..."
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                  />
                </div>

                <h4 style={{ margin: "16px 0 10px", fontSize: "0.95rem", color: "var(--adm-text-primary)" }}>
                  Primary Variant &amp; Inventory Specifications
                </h4>

                <div className="adm-form-row">
                  <div className="adm-form-group">
                    <label className="adm-label" htmlFor="var-sku">
                      Primary SKU *
                    </label>
                    <input
                      id="var-sku"
                      type="text"
                      className="adm-input"
                      placeholder="ELEC-NANO-RP2040"
                      value={newProduct.sku}
                      onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                      required
                    />
                  </div>
                  <div className="adm-form-group">
                    <label className="adm-label" htmlFor="var-part">
                      Part Number
                    </label>
                    <input
                      id="var-part"
                      type="text"
                      className="adm-input"
                      placeholder="ABX00053"
                      value={newProduct.partNumber}
                      onChange={(e) => setNewProduct({ ...newProduct, partNumber: e.target.value })}
                    />
                  </div>
                </div>

                <div className="adm-form-row">
                  <div className="adm-form-group">
                    <label className="adm-label" htmlFor="var-price">
                      Unit Price (₹) *
                    </label>
                    <input
                      id="var-price"
                      type="number"
                      min="0"
                      step="0.01"
                      className="adm-input"
                      placeholder="1499.00"
                      value={newProduct.price}
                      onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                      required
                    />
                  </div>
                  <div className="adm-form-group">
                    <label className="adm-label" htmlFor="var-stock">
                      Initial Stock Quantity *
                    </label>
                    <input
                      id="var-stock"
                      type="number"
                      min="0"
                      className="adm-input"
                      value={newProduct.stockQuantity}
                      onChange={(e) => setNewProduct({ ...newProduct, stockQuantity: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="adm-modal-footer">
                <button
                  type="button"
                  className="adm-btn adm-btn-secondary"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="adm-btn adm-btn-primary"
                  disabled={modalSubmitting}
                >
                  {modalSubmitting ? (
                    <>
                      <span className="adm-spinner" aria-hidden="true" /> Saving...
                    </>
                  ) : (
                    "Save & Register Product"
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
