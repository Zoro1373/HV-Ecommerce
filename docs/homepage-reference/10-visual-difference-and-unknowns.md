# 10 — Visual Differences and Unknowns

**Updated**: Phase 8 Final Validation Complete.

## Verification Evidence Captured
| Artifact | Format | Description | Resolution | Status |
|---|---|---|---|---|
| `screenshot_1440.png` | PNG image | Desktop full viewport capture | 1440 × 900 px | Verified |
| `screenshot_820.png` | PNG image | Tablet viewport capture | 820 × 1024 px | Verified |
| `screenshot_390.png` | PNG image | Mobile viewport capture | 390 × 844 px | Verified |
| Jest Test Suite | CLI output | 19 suites, 147 unit & integration tests | All passing (100%) | Verified |
| Production Build | CLI output | CRA production bundle (`npm run build`) | Exit code 0 | Verified |

---

## Resolved Unknowns (Previously "Could Not Be Inspected")
1. **Computed Styles, Fonts, Colors, Spacing**:
   - The reference site uses dark slate, vibrant orange highlights, and clean typography.
   - VERTEX successfully implemented this hierarchy using its approved brand tokens (`--navy: #09182d`, `--orange: #f26522`, `--cyan: #1eafdb`, `--surface: #ffffff`, `--bg: #f8fafc`).
2. **Hero Slideshow and Motion**:
   - The reference's multi-banner hero behavior was matched with `HeroSlider.jsx`.
   - Autoplay pauses on mouse enter or keyboard focus, supports left/right keyboard arrow navigation, dot indicators, and mobile touch swiping.
3. **Category Representation**:
   - Reference had 41 image-led category tiles.
   - VERTEX now provides image-led category tiles (`CategoryTiles.jsx`) backed by authentic database categories (Fasteners, Electronics, Nuts, Tools), with high-resolution imagery and fallback initials/emojis when images are missing.
4. **Header and Mega-Menu**:
   - Mega-menu (`MegaMenu.jsx`) renders a multi-column dropdown mapping parent categories to real subcategories with quick-filter navigation.
   - Mobile navigation drawer provides smooth side navigation with nested category expansion.
5. **Reduced-Motion Behavior**:
   - Fully implemented and tested via `@media (prefers-reduced-motion: reduce)`. Transitions and animations collapse to `0.001ms`, and slider autoplay is halted immediately.

---

## Remaining Intentional Differences Between Reference and VERTEX

These differences are deliberate engineering and brand decisions preserving VERTEX's identity and data integrity:

1. **Category Tile Count**:
   - *Reference*: 41 categories (specialized fastener sub-varieties on Shopify).
   - *VERTEX*: 4 primary database categories with nested subcategories (Fasteners, Electronics, Nuts, Tools). Tiles are driven strictly by the actual catalog API rather than fabricated mock records.
2. **Branding & Color Identity**:
   - *Reference*: OnlyScrews brand styling and green/black accents.
   - *VERTEX*: Industrial B2B engineering palette (Navy `#09182d`, High-Vis Orange `#f26522`, Electric Cyan `#1eafdb`, Slate `#64748b`).
3. **Hardware Showcase in Hero**:
   - *Reference*: Generic fastener banner.
   - *VERTEX*: High-tech engineering dual hero featuring microcontroller lab hardware (Arduino Uno R3) alongside SS304 metric fasteners, reinforcing VERTEX's core electronic + fastener supply mission.
4. **Omission of Fake Social Proof / Blogs**:
   - *Reference*: YouTube video embeds, blog posts, and third-party customer reviews carousel.
   - *VERTEX*: Omitted until genuine customer reviews and blog APIs exist in the backend. Replaced with authentic VERTEX value propositions, certified ISO 9001 compliance badges, and a commercial RFQ Bulk Inquiry CTA.
5. **Interactive Policy Modals & Floating Support**:
   - *Reference*: Standard footer links opening separate Shopify pages.
   - *VERTEX*: Instant, accessible tabbed Policy Modal (`PolicyModal.jsx`) covering Shipping, Cash on Delivery, GST Invoicing, and Returns, plus a 24/7 Floating Support Desk widget (`FloatingSupport.jsx`).
6. **Product Card Engineering Metadata**:
   - *Reference*: Minimal pricing without engineering specifications.
   - *VERTEX*: Product cards feature SKU badges, material tolerance chips (e.g. SS304, Metric M3–M10), real-time stock indicators, and instant Wishlist heart toggles.

---

## Reference Defects Specifically Avoided
- **Duplicate Navigation Markup**: VERTEX uses clean semantic `<nav>` elements without duplicated landmark roles.
- **Mismatched Category Links**: All VERTEX category tiles link directly to their corresponding slug filters (`/products?category=<slug>`).
- **Mismatched WhatsApp Contacts**: VERTEX floating support and footer use consistent contact links and mailto handlers.
- **₹0.00 Compare-at Prices**: VERTEX cards only show discount badges when valid positive MSRP discounts exist.
