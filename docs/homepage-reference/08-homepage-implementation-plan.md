# 08 — Homepage Implementation Plan

**Status**: **ALL PHASES COMPLETED AND VERIFIED (Phases 1–8)**.

Based on verified VERTEX facts in [07](07-vertex-codebase-audit.md), reference observations in [01](01-homepage-section-inventory.md), and final validation in [09](09-homepage-acceptance-test-checklist.md).

## Strategy
Maintained CRA, custom view-state routing, `App.jsx` handlers, `catalogApi.js`, cart/wishlist/auth and backend services intact without regression. Extracted presentational homepage sections into modular, unit-tested components under `src/components/Home/`, fed by clean props from `App.jsx`. Reused `ProductCard` with compact responsive styling. Added zero unvetted external dependencies.

## Component Implementation Map
| Reference section | VERTEX Component | File Location | Data Source | Status |
|---|---|---|---|---|
| Announcement bar (promos) | `AnnouncementBar` | `src/components/Home/AnnouncementBar.jsx` | Configurable promos, promo copy button, auto-rotate | **Complete (Passed)** |
| Header + nav + mega menu | Shared header + `MegaMenu` | `src/components/Home/MegaMenu.jsx` | `getCategories()` hierarchy | **Complete (Passed)** |
| Hero slideshow | `HeroSlider` | `src/components/Home/HeroSlider.jsx` | VERTEX assets, dual engineering hardware card, swipe/keyboard/pause | **Complete (Passed)** |
| Shipping & Guarantee strip | `ShippingInfoStrip` | `src/components/Home/ShippingInfoStrip.jsx` | 4 policy cards opening `PolicyModal` | **Complete (Passed)** |
| Shop by category (image tiles) | `CategoryTiles` | `src/components/Home/CategoryTiles.jsx` | `getCategories()`, fallback initials/emojis, skeletons | **Complete (Passed)** |
| Product collection rails | `ProductRail` | `src/components/Home/ProductRail.jsx` | `getProducts()`, horizontal scroll rail, compact `ProductCard` | **Complete (Passed)** |
| Commercial bulk inquiry CTA | `BulkInquirySection` | `src/components/Home/BulkInquirySection.jsx` | Reuses `QuoteModal` with commercial B2B perks | **Complete (Passed)** |
| Value propositions bar | `ValueProps` | `src/components/Home/ValueProps.jsx` | Authentic VERTEX engineering value props | **Complete (Passed)** |
| Interactive policy modal | `PolicyModal` | `src/components/Home/PolicyModal.jsx` | Accessible tabbed dialog for Shipping, COD, Tax, Returns | **Complete (Passed)** |
| 24/7 floating support desk | `FloatingSupport` | `src/components/Home/FloatingSupport.jsx` | Direct WhatsApp, phone, email, and live status | **Complete (Passed)** |
| Comprehensive site footer | `SiteFooter` | `src/components/Home/SiteFooter.jsx` | Verified links, newsletter form, policy dialog openers | **Complete (Passed)** |

---

## Phase Execution Summary
| # | Phase | Scope | Result |
|---|---|---|---|
| 1 | Baseline Audit | Inspected repo, entry points, catalog/cart services, baseline tests | **Completed** |
| 2 | Design Tokens & Assets | Established design tokens in `App.css`, prepared image assets | **Completed** |
| 3 | Header & Navigation | Integrated announcement bar, responsive nav bar, `MegaMenu` | **Completed** |
| 4 | Hero Slideshow & Motion | Built `HeroSlider` with pause on hover/focus, keyboard arrows, touch swipe | **Completed** |
| 5 | Category Tiles & Rails | Built `CategoryTiles` with skeletons/error retry & `ProductRail` collections | **Completed** |
| 6 | Informational & Footer | Built `ShippingInfoStrip`, `ValueProps`, `BulkInquirySection`, `SiteFooter`, `PolicyModal`, `FloatingSupport` | **Completed** |
| 7 | Responsive & Accessibility | Refined breakpoints (960, 840, 640, 500, 380px), reduced-motion, focus rings, ARIA labels | **Completed** |
| 8 | Final Validation & Differences | Full viewport captures (1440/820/390px), test suite (19/19 suites, 147/147 tests), production build | **Completed** |

---

## Verification & Regressions
- **Unit & Integration Tests**: 19 passed, 147 tests passed (0 failures).
- **Production Build**: `npm run build` completed with code 0 (151.23 kB JS, 25.12 kB CSS).
- **Core Routes Tested**: Home, Category Filter, Product Detail, Search, Cart Drawer, Wishlist Drawer, Quote Modal, Checkout Page, Login Page, and Admin Portal.
