/**
 * VERTEX Product Catalogue & Listing Page Test Suite
 * 
 * Verifies catalog rendering, hierarchical categories, subcategories,
 * multi-facet filters, keyword search, sorting, grid/list toggle,
 * and commercial RFQ quote triggers.
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ProductListPage from "./ProductListPage";

const mockCategories = [
  {
    id: "cat-electronics",
    name: "Electronic Products",
    slug: "electronics",
    children: [
      { id: "sub-lithium-cells", name: "Lithium-Ion Batteries / Cells", slug: "lithium-ion-batteries" },
      { id: "sub-hvnex-mcu", name: "HVNEX — Microcontroller Boards", slug: "hvnex-microcontrollers" },
    ],
  },
  {
    id: "cat-fasteners",
    name: "Fasteners",
    slug: "fasteners",
    children: [
      { id: "sub-screws-cross", name: "Screws — Cross (Phillips)", slug: "screws-cross-phillips" },
      { id: "sub-screws-hex", name: "Screws — Hex (Allen)", slug: "screws-hex-allen" },
    ],
  },
];

const mockProducts = [
  {
    id: "prod-dmegc-18650",
    name: "DMEGC Cylindrical Lithium-Ion Cell 18650 – 3.65V, 2600 mAh, EV Grade",
    slug: "dmegc-18650-2600",
    categoryId: "cat-electronics",
    category: { id: "cat-electronics", name: "Electronic Products", slug: "electronics" },
    subcategory: { id: "sub-lithium-cells", name: "Lithium-Ion Batteries / Cells", slug: "lithium-ion-batteries" },
    brand: "DMEGC",
    specs: { "Cell Format": "18650", "Nominal Voltage": "3.65V", "Rated Capacity": "2600 mAh", "Grade": "EV Grade" },
    price: null,
    inStock: true,
    variants: [{ id: "var-1", sku: "BATT-DMEGC-18650-2600", price: null, stockQuantity: 500 }],
  },
  {
    id: "prod-pan-head",
    name: "Pan Head Screw",
    slug: "pan-head-screw",
    categoryId: "cat-fasteners",
    category: { id: "cat-fasteners", name: "Fasteners", slug: "fasteners" },
    subcategory: { id: "sub-screws-cross", name: "Screws — Cross (Phillips)", slug: "screws-cross-phillips" },
    brand: "VERTEX",
    specs: { "Drive Type": "Cross (Phillips)", "Head Type": "Pan Head" },
    price: null,
    inStock: true,
    variants: [{ id: "var-2", sku: "FAST-PH-PAN", price: null, stockQuantity: 300 }],
  },
  {
    id: "prod-socket-cap",
    name: "Socket Head Screw",
    slug: "socket-head-screw",
    categoryId: "cat-fasteners",
    category: { id: "cat-fasteners", name: "Fasteners", slug: "fasteners" },
    subcategory: { id: "sub-screws-hex", name: "Screws — Hex (Allen)", slug: "screws-hex-allen" },
    brand: "VERTEX",
    specs: { "Drive Type": "Hex (Allen)", "Head Type": "Socket Head" },
    price: 180,
    inStock: true,
    variants: [{ id: "var-3", sku: "FAST-SC-M6", price: 180, stockQuantity: 150 }],
  },
];

describe("VERTEX ProductListPage Component Suite", () => {
  test("1. Renders catalogue title, breadcrumbs, and total product count", () => {
    render(
      <ProductListPage
        categories={mockCategories}
        products={mockProducts}
      />
    );

    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Products Found")).toBeInTheDocument();
    expect(screen.getByText("DMEGC Cylindrical Lithium-Ion Cell 18650 – 3.65V, 2600 mAh, EV Grade")).toBeInTheDocument();
    expect(screen.getByText("Pan Head Screw")).toBeInTheDocument();
    expect(screen.getByText("Socket Head Screw")).toBeInTheDocument();
  });

  test("2. Filters catalogue by parent category", () => {
    render(
      <ProductListPage
        categories={mockCategories}
        products={mockProducts}
      />
    );

    const fastenersChip = screen.getByRole("button", { name: /Fasteners/i });
    fireEvent.click(fastenersChip);

    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Pan Head Screw")).toBeInTheDocument();
    expect(screen.getByText("Socket Head Screw")).toBeInTheDocument();
    expect(screen.queryByText(/DMEGC Cylindrical/i)).not.toBeInTheDocument();
  });

  test("3. Filters catalogue by subcategory", () => {
    render(
      <ProductListPage
        categories={mockCategories}
        products={mockProducts}
        initialCategory="fasteners"
      />
    );

    const hexPill = screen.getByRole("button", { name: "Screws — Hex (Allen)" });
    fireEvent.click(hexPill);

    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("Product Found")).toBeInTheDocument();
    expect(screen.getByText("Socket Head Screw")).toBeInTheDocument();
    expect(screen.queryByText("Pan Head Screw")).not.toBeInTheDocument();
  });

  test("4. Keyword search filters results across product names and specifications", () => {
    render(
      <ProductListPage
        categories={mockCategories}
        products={mockProducts}
      />
    );

    const searchInput = screen.getByPlaceholderText(/Search specs, part numbers/i);
    fireEvent.change(searchInput, { target: { value: "2600 mAh" } });
    fireEvent.submit(searchInput.closest("form"));

    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText(/DMEGC Cylindrical/i)).toBeInTheDocument();
    expect(screen.queryByText("Pan Head Screw")).not.toBeInTheDocument();
  });

  test("5. Clear All Filters resets search and categories", () => {
    render(
      <ProductListPage
        categories={mockCategories}
        products={mockProducts}
        initialCategory="electronics"
      />
    );

    expect(screen.getByText("1")).toBeInTheDocument();
    const clearLink = screen.getByText("Clear All");
    fireEvent.click(clearLink);

    expect(screen.getByText("3")).toBeInTheDocument();
  });

  test("6. View mode switcher toggles between Grid and List view", () => {
    const { container } = render(
      <ProductListPage
        categories={mockCategories}
        products={mockProducts}
      />
    );

    const listBtn = screen.getByTitle("List View (Technical Specs Table)");
    fireEvent.click(listBtn);

    expect(container.querySelector(".product-list-view")).toBeInTheDocument();
  });

  test("7. Displays authentic Price for priced products and Quote on Request for unpriced products", () => {
    render(
      <ProductListPage
        categories={mockCategories}
        products={mockProducts}
      />
    );

    expect(screen.getByText("₹180")).toBeInTheDocument();
    expect(screen.getAllByText("Quote on Request").length).toBeGreaterThanOrEqual(1);
  });

  test("8. Clicking Request Quote opens the RFQ modal", () => {
    render(
      <ProductListPage
        categories={mockCategories}
        products={mockProducts}
      />
    );

    const rfqBtns = screen.getAllByRole("button", { name: /Request Quote/i });
    fireEvent.click(rfqBtns[0]);

    expect(screen.getByRole("heading", { name: /Request a Commercial Quote/i })).toBeInTheDocument();
  });
});
