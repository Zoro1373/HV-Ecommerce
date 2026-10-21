# Team Assignments — Six Frontend Members + One Research Member

Assign actual names in the team tracker. Each member owns the UI for the assigned area, not the underlying backend.

## Member 1 — Home Page
**Owns:** storefront landing page and homepage sections.
- Improve hero/banner, category shortcuts, featured products, promotions, and page spacing.
- Use existing product/category data sources and components.
- Ensure the homepage works on mobile and desktop.
- Coordinate shared header/footer changes with the team before editing them.

**Deliverables:** updated homepage UI, before/after screenshots, test notes.

## Member 2 — Products and Product Details
**Owns:** product listing, product cards, product detail view, and search/filter/sort UI.
- Improve product grid, image presentation, prices, badges, empty states, and loading states.
- Preserve existing search/filter behavior and API usage.
- Confirm long product names and missing images do not break layout.

**Deliverables:** updated listing/detail UI, screenshots, test notes.

## Member 3 — Cart and Wishlist
**Owns:** cart and wishlist screens and their UI controls.
- Improve item rows/cards, quantity controls, remove actions, subtotal display, and empty states.
- Preserve current cart and wishlist state management.
- Do not invent or alter price calculations; report inconsistencies.

**Deliverables:** updated cart/wishlist UI, screenshots, test notes.

## Member 4 — Checkout and Orders
**Owns:** checkout, order confirmation, order history, and tracking UI where present.
- Improve address forms, order summary, validation messages, and confirmation states.
- Keep payment/order submission logic unchanged.
- Never use real payment details in screenshots or test reports.

**Deliverables:** updated checkout/order UI, screenshots, test notes.

## Member 5 — Login, Registration, and Profile
**Owns:** authentication screens and user account/profile UI.
- Improve form layout, field labels, validation feedback, password visibility controls if already supported, and account settings.
- Preserve authentication flow, API calls, MFA behavior, and security controls.
- Do not store passwords/tokens in UI code or local notes.

**Deliverables:** updated auth/profile UI, screenshots, test notes.

## Member 6 — Admin Portal UI
**Owns:** admin layout and admin dashboard/management screens.
- Improve sidebar/navigation, dashboard cards, tables, filters, empty states, and responsive behavior.
- Work with existing admin routes and permission checks.
- Do not bypass authentication or change authorization rules to make a screen appear.

**Deliverables:** updated admin UI, screenshots, test notes.

## Member 7 — Research and QA Support
**Owns:** design research, competitor review, UI references, and cross-page QA support.
- Review a small set of relevant e-commerce interfaces.
- Recommend a coherent palette, typography, spacing, component patterns, and mobile behaviors.
- Provide links and dated notes for references; do not copy another site's branding or assets.
- Test integrated pages and log issues with steps to reproduce.
- Do not edit production code unless the coordinator explicitly assigns a small task.

**Deliverables:** `07_RESEARCH_TASKS.md` findings or a separate research report, reference links, screenshots where permitted, and a prioritized issue list.

## Shared ownership
Header, footer, global styles, routing, shared buttons, and common layout components affect multiple members. The coordinator must approve ownership before these files are edited. If two members need the same file, agree on one owner or split the work into separate commits and coordinate first.
