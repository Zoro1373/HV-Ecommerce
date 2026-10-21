# Proposed Frontend Organization (Reference Only)

**Important:** This is a conceptual example, not an instruction to restructure the existing repository. Keep the current VERTEX structure unless the coordinator approves changes after inspecting it.

A possible organization for a React-style storefront could be:

```text
src/
  components/
    common/
    layout/
    products/
    cart/
    forms/
  pages/
    Home/
    Products/
    Cart/
    Checkout/
    Orders/
    Auth/
    Profile/
    Admin/
  services/          # Reuse existing API/service layer
  hooks/             # Reuse existing state/data hooks
  styles/            # Use existing global styles/theme
  utils/             # Reuse existing utilities
```

The actual project may use a different structure, router, framework, or naming convention. Before creating anything:
1. Inspect the repository and current route/component structure.
2. Search for existing components and service modules.
3. Reuse existing conventions.
4. Ask before moving files, renaming routes, adding dependencies, or editing shared global files.

The backend/server directory should remain untouched during a frontend-only task unless a specific change is approved.
