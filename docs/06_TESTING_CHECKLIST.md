# Frontend Testing Checklist

Run only commands that exist in the project's package scripts. Check `package.json` and the README before choosing commands.

## General
- [ ] App starts successfully.
- [ ] No new build, lint, or type errors.
- [ ] No new uncaught browser console errors.
- [ ] Links and navigation work.
- [ ] Layout has no unintended horizontal overflow.
- [ ] Loading, error, and empty states are understandable.
- [ ] Buttons and forms provide clear feedback.
- [ ] Keyboard focus is visible and fields have labels.
- [ ] Mobile, tablet, and desktop layouts are checked.

## Member 1 — Home
- [ ] Banner and category links work.
- [ ] Product sections display current data.
- [ ] Page remains readable on mobile.
- [ ] Images do not stretch or break the layout.

## Member 2 — Products
- [ ] Product listing and detail navigation work.
- [ ] Search/filter/sort behavior remains intact where implemented.
- [ ] Missing image and long title cases are handled.
- [ ] Price and stock labels use existing data.

## Member 3 — Cart/Wishlist
- [ ] Add/remove and quantity controls work.
- [ ] Totals remain consistent with existing application logic.
- [ ] Empty states display correctly.
- [ ] Cart state survives the expected navigation/reload behavior.

## Member 4 — Checkout/Orders
- [ ] Required fields show validation.
- [ ] Order summary matches current cart data.
- [ ] Error and success states reflect actual results.
- [ ] No real payment or personal details appear in test evidence.

## Member 5 — Login/Profile
- [ ] Login/register validation works.
- [ ] Error messages are clear but do not expose sensitive internals.
- [ ] Existing session/logout behavior remains intact.
- [ ] Profile settings use existing permissions and API logic.

## Member 6 — Admin
- [ ] Admin routes remain protected.
- [ ] Sidebar links and active states work.
- [ ] Tables/forms work at desktop and mobile sizes.
- [ ] Existing product/order/user management actions still behave as expected.
- [ ] Unauthorized users cannot gain access through UI changes.

## Integration sign-off
- [ ] A second member reviewed the changes.
- [ ] Screenshots or a short recording are attached if useful.
- [ ] Known issues are documented.
- [ ] Coordinator approved the merge.
