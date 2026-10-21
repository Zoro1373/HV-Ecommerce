/**
 * VERTEX Dedicated Product Detail Page Test Suite
 * 
 * Verifies verified technical specifications table, authentic pricing & RFQ notice,
 * quantity input validation, cart integration, and wishlist toggling.
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ProductDetailPage from "./ProductDetailPage";

const samplePricedProduct = {
  id: "prod-socket-cap",
  name: "Socket Head Screw",
  slug: "socket-head-screw",
  description: "High-grade SS316 marine stainless steel socket head cap screw.",
  categoryId: "cat-fasteners",
  category: { id: "cat-fasteners", name: "Fasteners", slug: "fasteners" },
  subcategory: { id: "sub-screws-hex", name: "Screws — Hex (Allen)", slug: "screws-hex-allen" },
  brand: "VERTEX",
  specs: {
    "Drive Type": "Hex (Allen)",
    "Head Type": "Socket Head",
    "Standard": "DIN 912",
    "Material Grade": "SS316 Marine Grade",
  },
  price: 180,
  inStock: true,
  variants: [
    {
      id: "var-sc-m6",
      sku: "FAST-SC-M6-20",
      partNumber: "SS316-SC-M6",
      packSize: "Pack of 10",
      price: 180,
      stockQuantity: 150,
      inStock: true,
    },
  ],
};

const sampleQuoteProduct = {
  id: "prod-dmegc-18650",
  name: "DMEGC Cylindrical Lithium-Ion Cell 18650 – 3.65V, 2600 mAh, EV Grade",
  slug: "dmegc-18650-2600",
  description: "Automotive-grade cylindrical lithium-ion cell manufactured by DMEGC.",
  categoryId: "cat-electronics",
  category: { id: "cat-electronics", name: "Electronic Products", slug: "electronics" },
  subcategory: { id: "sub-lithium-cells", name: "Lithium-Ion Batteries / Cells", slug: "lithium-ion-batteries" },
  brand: "DMEGC",
  specs: {
    "Cell Format": "18650 Cylindrical",
    "Nominal Voltage": "3.65V",
    "Rated Capacity": "2600 mAh",
    "Grade": "EV Grade",
    "Chemistry": "Lithium-Ion",
  },
  price: null,
  inStock: true,
  variants: [
    {
      id: "var-dmegc-1",
      sku: "BATT-DMEGC-18650-2600",
      partNumber: "INR18650-26E",
      packSize: "1 Cell",
      price: null,
      stockQuantity: 800,
      inStock: true,
    },
  ],
};

const sampleRelated = [
  {
    id: "prod-pan-head",
    name: "Pan Head Screw",
    slug: "pan-head-screw",
    price: null,
  },
];

describe("VERTEX ProductDetailPage Component Suite", () => {
  beforeEach(() => {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.clear();
    }
  });

  test("1. Renders full product name, brand, SKU, and specifications table", () => {
    render(
      <ProductDetailPage
        product={samplePricedProduct}
        relatedProducts={sampleRelated}
      />
    );

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Socket Head Screw");
    expect(screen.getByText("FAST-SC-M6-20")).toBeInTheDocument();
    expect(screen.getByText("SS316 Marine Grade")).toBeInTheDocument();
    expect(screen.getByText("DIN 912")).toBeInTheDocument();
    expect(screen.getByText("Hex (Allen)")).toBeInTheDocument();
  });

  test("2. Displays verified price for priced product and handles quantity increments", () => {
    const handleAddToCart = jest.fn();

    render(
      <ProductDetailPage
        product={samplePricedProduct}
        onAddToCart={handleAddToCart}
      />
    );

    expect(screen.getByText("₹180")).toBeInTheDocument();
    expect(screen.getByText("/ Pack of 10")).toBeInTheDocument();

    const incBtn = screen.getByRole("button", { name: /Increase quantity/i });
    fireEvent.click(incBtn);

    const qtyInput = screen.getByRole("spinbutton");
    expect(qtyInput).toHaveValue(2);

    const addBtn = screen.getByRole("button", { name: /Add to Shopping Cart/i });
    fireEvent.click(addBtn);

    expect(handleAddToCart).toHaveBeenCalledWith(
      samplePricedProduct,
      samplePricedProduct.variants[0],
      2
    );
  });

  test("3. Quantity input validation rejects non-positive values", () => {
    render(
      <ProductDetailPage
        product={samplePricedProduct}
      />
    );

    const qtyInput = screen.getByRole("spinbutton");
    fireEvent.change(qtyInput, { target: { value: "0" } });

    expect(screen.getByText(/Quantity must be at least 1/i)).toBeInTheDocument();
  });

  test("4. Displays Commercial Quotation notice and RFQ trigger for unpriced products", () => {
    render(
      <ProductDetailPage
        product={sampleQuoteProduct}
      />
    );

    expect(screen.getByText("Commercial Quotation Required")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Request a Volume Quote/i })).toBeInTheDocument();
  });

  test("5. Opens and submits Request for Quote modal with reference ID", async () => {
    render(
      <ProductDetailPage
        product={sampleQuoteProduct}
      />
    );

    const rfqBtn = screen.getByRole("button", { name: /Request a Volume Quote/i });
    fireEvent.click(rfqBtn);

    expect(screen.getByRole("heading", { name: /Request a Commercial Quote/i })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: "Dr. Tech" } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: "tech@lab.org" } });
    fireEvent.change(screen.getByLabelText(/Phone/i), { target: { value: "+91 99999 88888" } });

    const submitBtn = screen.getByRole("button", { name: /Submit Quote Request/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Quote Request Submitted/i })).toBeInTheDocument();
      expect(screen.getByText(/Reference ID:/i)).toBeInTheDocument();
    });
  });

  test("6. Toggles wishlist status and updates button label", () => {
    render(
      <ProductDetailPage
        product={samplePricedProduct}
      />
    );

    const wishlistBtn = screen.getByRole("button", { name: /Save to Wishlist/i });
    fireEvent.click(wishlistBtn);

    expect(screen.getByRole("button", { name: /Wishlisted/i })).toBeInTheDocument();
  });

  test("7. Renders related components and calls onSelectRelatedProduct on click", () => {
    const handleSelectRelated = jest.fn();

    render(
      <ProductDetailPage
        product={samplePricedProduct}
        relatedProducts={sampleRelated}
        onSelectRelatedProduct={handleSelectRelated}
      />
    );

    expect(screen.getByText("Pan Head Screw")).toBeInTheDocument();
    const relatedCard = screen.getByRole("button", { name: /Pan Head Screw/i });
    fireEvent.click(relatedCard);

    expect(handleSelectRelated).toHaveBeenCalledWith(sampleRelated[0]);
  });
});
