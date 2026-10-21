# VERTEX E-Commerce Project Specification

## 1. Project overview
VERTEX is an e-commerce storefront for electronics, screws and fasteners, nuts, and related engineering components. The current React frontend includes a utility bar, header and search, navigation, hero section, category cards, featured products, fastener/nut reference lists, bulk-order banner, newsletter area, brand list, and footer.

## 2. Preserve the existing UI
- Keep the current VERTEX brand and supplied logo.
- Preserve the existing navy, orange, green, and white visual theme.
- Preserve responsive behavior and existing page content unless a change is necessary to connect a real feature.
- Avoid replacing the current frontend with a generated template.
- Product cards currently show placeholder thumbnails and sample ratings/review counts. Do not present sample ratings as verified customer reviews.

## 3. User roles
### Guest
- Browse active categories and products.
- Search, filter, sort, and paginate products.
- Maintain a temporary guest cart.
- Register or log in.
- Submit newsletter subscription and bulk quote requests where appropriate.

### Customer
- All guest capabilities.
- Manage profile, addresses, and personal cart.
- Merge guest cart after successful login.
- Place orders and view their own order history.
- Submit and review their own permitted account data.

### Admin
- Manage products, categories, and inventory.
- View and manage orders and permitted order status transitions.
- View customer accounts with least-privilege access.
- Manage bulk quote requests.
- View basic sales and low-stock reports.
- All admin operations must be protected by backend authorization, not just hidden UI controls.

## 4. Core features
1. Authentication: register, login, logout, current user, profile update, change password, and a safe password-reset flow.
2. Product catalog: product detail, category browsing, search, filters, sorting, pagination, active/inactive status, SKU, pack size, price, and stock.
3. Cart: add, read, update quantity, remove, validate stock, and merge guest cart.
4. Checkout: validate address, recalculate totals on server, create order transactionally, and handle inventory safely.
5. Orders: order confirmation, customer order history, order details, and controlled status transitions.
6. Bulk orders: store quote requests and allow admins to manage them.
7. Newsletter: validate and persist subscriptions; do not claim emails were sent without a configured provider.
8. Admin: protected product/category/order/quote management and basic reports.
9. Documentation: setup guide, environment variables, API reference, migrations, seed instructions, and tests.

## 5. Existing sample catalog
The current frontend contains these sample products. Preserve their available names and price data when seeding:
- Arduino Uno R3 Microcontroller Board — ₹1,299
- Motor Driver Module (L298N) — ₹499; displayed MRP ₹550
- PLC - Delta DVP Series — ₹4,999
- Raspberry Pi 4 Development Board — ₹3,599
- Stainless Steel Hex Bolt (M8 x 30mm) — ₹250 per pack of 10
- Nyloc Nut (M8) — ₹120 per pack of 20

The current frontend also displays categories:
- Electronics
- Screws & Fasteners
- Nut Types

The displayed stock, ratings, review counts, and discounts are sample frontend data. Keep only fields that are explicitly supplied and label/demo-seed sample values appropriately. Do not invent additional product records or verified reviews.

## 6. Order and payment scope
For the initial version, implement a working COD or pending-payment flow. Online payments should remain unconfirmed until a real provider is configured and its server-verified webhook/callback succeeds. Never trust a frontend-only “payment successful” message.

Tax, shipping, GST, discounts, and payment behavior must be configurable and documented. Do not silently invent production tax rates or shipping fees.

## 7. Quality requirements
- Responsive UI and accessible form labels.
- Loading, empty, success, and error states.
- Server-side validation and safe error responses.
- No cross-customer data access.
- Concurrency-safe inventory changes.
- Automated tests for authentication, authorization, catalog, cart, orders, and quote/newsletter forms.
- Honest reporting of commands, test results, and external configuration requirements.
