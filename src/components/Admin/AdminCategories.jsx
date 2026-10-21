import React, { useState, useEffect, useCallback } from "react";
import {
  getAdminCategories,
  getAdminCategoryDetails,
  createAdminCategory,
} from "../../services/adminApi";

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Category inspection drawer
  const [selectedCategorySlug, setSelectedCategorySlug] = useState(null);
  const [inspectData, setInspectData] = useState(null);
  const [inspectLoading, setInspectLoading] = useState(false);

  // Add Category modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalMessage, setModalMessage] = useState(null);

  const [newCategory, setNewCategory] = useState({
    name: "",
    slug: "",
    description: "",
    icon: "⚙️",
    tint: "tint-blue",
    parentId: "",
  });

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getAdminCategories();
      if (res?.categories) {
        setCategories(res.categories);
      }
    } catch (err) {
      setError(err.message || "Failed to load categories from API.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleInspectCategory = async (slug) => {
    try {
      setSelectedCategorySlug(slug);
      setInspectLoading(true);
      const res = await getAdminCategoryDetails(slug);
      setInspectData(res);
    } catch (err) {
      setInspectData({ error: err.message });
    } finally {
      setInspectLoading(false);
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    setModalMessage(null);

    if (!newCategory.name.trim() || !newCategory.slug.trim()) {
      setModalMessage({
        type: "error",
        text: "Please provide both category name and URL slug.",
      });
      return;
    }

    try {
      setModalSubmitting(true);
      const res = await createAdminCategory(newCategory);
      setModalMessage({
        type: "success",
        text: `Category '${res?.category?.name || newCategory.name}' created successfully!`,
      });

      // Reload categories from database to verify persistence
      await loadCategories();

      setTimeout(() => {
        setIsAddModalOpen(false);
        setNewCategory({
          name: "",
          slug: "",
          description: "",
          icon: "⚙️",
          tint: "tint-blue",
          parentId: "",
        });
        setModalMessage(null);
      }, 1200);
    } catch (err) {
      setModalMessage({
        type: err.status === 404 ? "warning" : "error",
        text: err.status === 404
          ? "Notice: Category creation endpoint (POST /api/admin/categories) is scheduled for Phase 4 admin catalog mutation. Form validated successfully on the client."
          : err.message,
      });
    } finally {
      setModalSubmitting(false);
    }
  };

  return (
    <div className="adm-categories-view">
      <div className="adm-page-header">
        <div className="adm-page-title-group">
          <h1>Category Hierarchy Management</h1>
          <p className="adm-page-subtitle">
            Configure product classification, parent-child hierarchies, and catalog taxonomy.
          </p>
        </div>
        <div className="adm-page-actions">
          <button
            type="button"
            className="adm-btn adm-btn-primary"
            onClick={() => setIsAddModalOpen(true)}
          >
            + Add Category
          </button>
        </div>
      </div>

      {error && (
        <div className="adm-notice-banner adm-notice-warning" role="alert">
          <span className="adm-notice-icon">⚠️</span>
          <div>
            <strong>Category Error:</strong> {error}
          </div>
        </div>
      )}

      {loading ? (
        <div className="adm-loading-screen" role="status">
          <span className="adm-spinner adm-spinner-dark" aria-hidden="true" />
          <p>Loading categories from PostgreSQL...</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
          {categories.map((cat) => (
            <div key={cat.id} className="adm-card" style={{ marginBottom: 0 }}>
              <div className="adm-card-header">
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: "1.4rem" }}>{cat.icon || "📁"}</span>
                  <div>
                    <h3 className="adm-card-title">{cat.name}</h3>
                    <code style={{ fontSize: "0.74rem", color: "var(--adm-text-muted)" }}>
                      /{cat.slug}
                    </code>
                  </div>
                </div>
                <span className="adm-badge adm-badge-success">Active</span>
              </div>
              <div className="adm-card-body">
                <p style={{ margin: "0 0 16px", fontSize: "0.86rem", color: "var(--adm-text-secondary)", minHeight: 40 }}>
                  {cat.description || "No description provided."}
                </p>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.82rem" }}>
                  <span style={{ fontWeight: 600, color: "var(--adm-text-primary)" }}>
                    📦 {cat.productsCount || 0} Products
                  </span>
                  <button
                    type="button"
                    className="adm-btn adm-btn-secondary adm-btn-sm"
                    onClick={() => handleInspectCategory(cat.slug)}
                  >
                    Inspect Products →
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Inspect Category Products Modal */}
      {selectedCategorySlug && (
        <div className="adm-modal-backdrop" onClick={() => setSelectedCategorySlug(null)}>
          <div
            className="adm-modal"
            style={{ maxWidth: 740 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="inspect-cat-title"
          >
            <div className="adm-modal-header">
              <h2 id="inspect-cat-title" className="adm-modal-title">
                Category: {inspectData?.category?.name || selectedCategorySlug}
              </h2>
              <button
                type="button"
                className="adm-modal-close"
                onClick={() => setSelectedCategorySlug(null)}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>
            <div className="adm-modal-body">
              {inspectLoading ? (
                <div className="adm-loading-screen" style={{ minHeight: 180 }}>
                  <span className="adm-spinner adm-spinner-dark" aria-hidden="true" />
                  <p>Fetching associated products...</p>
                </div>
              ) : inspectData?.error ? (
                <div className="adm-notice-banner adm-notice-warning">
                  ⚠️ {inspectData.error}
                </div>
              ) : (
                <>
                  <p style={{ marginTop: 0, color: "var(--adm-text-secondary)", fontSize: "0.88rem" }}>
                    {inspectData?.category?.description}
                  </p>
                  <span className="adm-label">
                    Active Catalog Products ({inspectData?.products?.length || 0})
                  </span>
                  <div className="adm-table-container" style={{ marginTop: 8 }}>
                    <table className="adm-table">
                      <thead>
                        <tr>
                          <th>Product Name</th>
                          <th>Slug</th>
                          <th>Brand</th>
                          <th>Variants</th>
                          <th>Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(inspectData?.products || []).map((p) => (
                          <tr key={p.id}>
                            <td>
                              <strong>{p.name}</strong>
                            </td>
                            <td>
                              <code>{p.slug}</code>
                            </td>
                            <td>{p.brand || "VERTEX"}</td>
                            <td>{p.variants?.length || 1} SKU(s)</td>
                            <td>₹{Number(p.price || 0).toLocaleString("en-IN")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
            <div className="adm-modal-footer">
              <button
                type="button"
                className="adm-btn adm-btn-secondary"
                onClick={() => setSelectedCategorySlug(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {isAddModalOpen && (
        <div className="adm-modal-backdrop" onClick={() => setIsAddModalOpen(false)}>
          <div
            className="adm-modal"
            style={{ maxWidth: 540 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="add-cat-title"
          >
            <div className="adm-modal-header">
              <h2 id="add-cat-title" className="adm-modal-title">
                Add New Category
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
            <form onSubmit={handleCreateCategory}>
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

                <div className="adm-form-group">
                  <label className="adm-label" htmlFor="cat-name">
                    Category Name *
                  </label>
                  <input
                    id="cat-name"
                    type="text"
                    className="adm-input"
                    placeholder="e.g. Sensors & Modules"
                    value={newCategory.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      const slug = name
                        .toLowerCase()
                        .trim()
                        .replace(/[^\w\s-]/g, "")
                        .replace(/[\s_-]+/g, "-");
                      setNewCategory({ ...newCategory, name, slug });
                    }}
                    required
                  />
                </div>

                <div className="adm-form-group">
                  <label className="adm-label" htmlFor="cat-slug">
                    URL Slug *
                  </label>
                  <input
                    id="cat-slug"
                    type="text"
                    className="adm-input"
                    value={newCategory.slug}
                    onChange={(e) => setNewCategory({ ...newCategory, slug: e.target.value })}
                    required
                  />
                </div>

                <div className="adm-form-row">
                  <div className="adm-form-group">
                    <label className="adm-label" htmlFor="cat-icon">
                      Emoji / Icon
                    </label>
                    <input
                      id="cat-icon"
                      type="text"
                      className="adm-input"
                      value={newCategory.icon}
                      onChange={(e) => setNewCategory({ ...newCategory, icon: e.target.value })}
                    />
                  </div>
                  <div className="adm-form-group">
                    <label className="adm-label" htmlFor="cat-tint">
                      Color Tint Class
                    </label>
                    <select
                      id="cat-tint"
                      className="adm-select"
                      style={{ width: "100%" }}
                      value={newCategory.tint}
                      onChange={(e) => setNewCategory({ ...newCategory, tint: e.target.value })}
                    >
                      <option value="tint-blue">Blue Tint (Electronics)</option>
                      <option value="tint-orange">Orange Tint (Fasteners)</option>
                      <option value="tint-green">Green Tint (Nuts)</option>
                    </select>
                  </div>
                </div>

                <div className="adm-form-group">
                  <label className="adm-label" htmlFor="cat-desc">
                    Description
                  </label>
                  <textarea
                    id="cat-desc"
                    className="adm-textarea"
                    rows="2"
                    placeholder="Brief description of products in this category..."
                    value={newCategory.description}
                    onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                  />
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
                  {modalSubmitting ? "Creating..." : "Create Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
