# VERTEX E-Commerce — Combined Frontend Documentation
# VERTEX E-Commerce — Frontend Collaboration Pack

Welcome to the shared frontend phase of VERTEX E-Commerce. This pack gives all six frontend members and one research member a common plan.

## Start here
1. Read `01_PROJECT_OVERVIEW.md`.
2. Read `02_TEAM_ASSIGNMENTS.md` and work only on your assigned area.
3. Read `03_FRONTEND_STANDARDS.md` before changing UI.
4. Follow `04_GIT_WORKFLOW.md` for branches, commits, and integration.
5. Use `05_INTEGRATION_AND_BACKEND_SAFETY.md` to protect the existing backend.
6. Use `06_TESTING_CHECKLIST.md` before asking to merge.
7. Member 7 should follow `07_RESEARCH_TASKS.md`.
8. Track work in `08_TASK_TRACKER.md` and record decisions in `09_DECISIONS_AND_ISSUES.md`.

## Project safety
- Work in the existing repository. Do not start a replacement project.
- Do not delete or rename existing files just because a different structure is suggested here.
- Do not change backend routes, authentication, Prisma schema, database settings, Neon configuration, environment variables, or API contracts during this frontend-only phase unless the team lead explicitly approves it.
- Never commit `.env`, credentials, API keys, database URLs, tokens, or other secrets.
- Before editing, inspect the current components and use the existing app conventions.
- These documents describe responsibilities and standards, not a claim that every listed page or file already exists.

## Suggested coordination
Choose one team coordinator to review pull requests and resolve conflicts. This can be a frontend member; the coordinator should not rewrite another member's work without discussing it first.

## Project status
The existing VERTEX project and its actual file structure are the source of truth. Adapt this pack to the codebase rather than forcing the codebase to match a proposed structure.


---


<!-- Source file: 01_PROJECT_OVERVIEW.md -->

# Project Overview

## Goal
Improve the user-facing storefront and admin portal UI of the existing VERTEX E-Commerce project while preserving working functionality and backend integrations.

## Scope for this phase
- Improve visual consistency, layout, responsive behavior, accessibility, and usability.
- Work on the pages assigned in `02_TEAM_ASSIGNMENTS.md`.
- Reuse existing components, routes, API functions, data models, and dependencies wherever possible.
- Identify broken functionality and report it with reproduction steps instead of silently changing backend behavior.

## Out of scope unless approved
- Replacing the backend or creating a second project.
- Changing Neon/database configuration, Prisma schema/migrations, authentication rules, API contracts, payment logic, or deployment settings.
- Adding new dependencies without team approval.
- Committing secrets or production data.

## Workflow
1. Pull the latest shared branch.
2. Read the current implementation before editing.
3. Create a feature branch.
4. Make small, focused UI changes.
5. Run the checks available in the repository.
6. Review the changed files and screenshots.
7. Open a pull request or ask the coordinator to review.
8. Resolve feedback and merge only after approval.

## Definition of done
A task is done when its UI matches the agreed design, works at desktop and mobile widths, preserves existing behavior, has no known console/build errors introduced by the change, and has been reviewed by another member.


---


<!-- Source file: 02_TEAM_ASSIGNMENTS.md -->

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


---


<!-- Source file: 03_FRONTEND_STANDARDS.md -->

# Frontend Standards

## First inspect; then edit
- Confirm the actual framework, package manager, routes, and component conventions from the existing repository.
- Reuse existing libraries and components where possible.
- Do not create duplicate pages/components when a current implementation already exists.
- Do not rename files or restructure directories without agreement.

## Visual consistency
Agree on the following before major styling changes:
- Primary, secondary, background, surface, text, border, success, warning, and error colors.
- Typography scale and font weights.
- Spacing scale and container widths.
- Border radius, shadows, button sizes, input styles, and focus states.
- Product card image ratios and responsive grid breakpoints.

Use existing project design tokens if available. If there are none, propose shared CSS variables or theme values and get agreement before introducing them.

## Responsive behavior
Test at a narrow mobile width, a tablet width, and a desktop width. Avoid horizontal overflow. Tables should have a deliberate mobile treatment such as a responsive layout or horizontal scrolling. Buttons and form fields should be usable with touch.

## Accessibility
- Use semantic headings, buttons, labels, and form controls.
- Associate labels with inputs.
- Ensure keyboard focus is visible.
- Provide meaningful alternative text for informative images; use empty alt text for decorative images.
- Do not communicate status using color alone.
- Maintain readable contrast and reasonable touch target sizes.

## UI states
Where relevant, include loading, success, error, empty, and disabled states. Avoid fake success messages if an API request failed. Do not hardcode real user, order, or payment data.

## Code quality
- Follow the existing formatting and naming conventions.
- Keep components focused and avoid unnecessary duplication.
- Avoid adding packages unless the coordinator approves.
- Remove temporary debugging output before merging.
- Do not silence errors simply to make the UI look successful.

## Shared component policy
Changes to app-wide header/footer, navigation, theme/global CSS, routing, shared API utilities, and global layout must be coordinated. Tell the team which files you plan to edit before starting.


---


<!-- Source file: 04_GIT_WORKFLOW.md -->

# Git and Collaboration Workflow

## Before starting
1. Confirm the repository and default branch with the coordinator.
2. Save or commit any existing personal changes before switching branches.
3. Pull the latest approved shared branch.
4. Check `git status` so you do not overwrite another person's work.

## Branch naming
Use a descriptive branch based on the repository's conventions, for example:
- `feature/home-ui`
- `feature/product-pages-ui`
- `feature/cart-wishlist-ui`
- `feature/checkout-orders-ui`
- `feature/auth-profile-ui`
- `feature/admin-ui`
- `docs/frontend-research`

Do not push directly to the shared/default branch unless the coordinator explicitly asks you to.

## Commit guidance
Make small commits with clear messages, such as:
- `Improve homepage responsive layout`
- `Style product cards and empty state`
- `Document mobile UI findings`

Never include `.env` files, credentials, API keys, database URLs, tokens, private user data, or generated files that the project normally excludes.

## Before requesting review
- Inspect `git diff` and ensure only intended files changed.
- Run the repository's existing lint/build/test commands when available.
- Test the assigned page at mobile and desktop widths.
- Include a short summary, files changed, checks run, known limitations, and screenshots where useful.
- Mention shared files or API behavior that may be affected.

## Merge rules
- Coordinator reviews overlapping files and shared styling changes.
- Resolve conflicts with the affected member; do not blindly accept one side.
- Pull the latest base branch before final integration.
- Do not force-push shared branches or rewrite another member's commits without agreement.
- After merge, run the integrated app and check the affected flows.

## If you only have a phone
Do not attempt risky edits to large source files through the GitHub web editor. You can do research, review screenshots, write documentation, track issues, and comment on pull requests. If code edits are needed, coordinate with a laptop member or use an approved cloud development environment.


---


<!-- Source file: 05_INTEGRATION_AND_BACKEND_SAFETY.md -->

# Integration and Backend Safety

## Non-negotiable rule
This is a frontend UI phase on the existing VERTEX project. Preserve the current backend and database setup.

## Do not change without explicit approval
- API route names, request/response formats, or authentication headers.
- Prisma schema, migrations, database connection configuration, or Neon settings.
- `.env` and `.env.example` secrets/configuration beyond a specifically approved change.
- Login/session/MFA behavior, role checks, admin permissions, payment/order submission, or authorization rules.
- Deployment configuration or package versions.

## Safe UI integration
- Reuse existing API service modules and route helpers.
- Use the existing response fields and loading/error handling.
- Do not hardcode fake product/order data into production flows.
- If an endpoint is unavailable, record the issue and coordinate; do not silently replace real API calls with mock responses.
- If a visual change requires a new data field, document the requirement and ask the backend owner before implementation.

## Environment and secrets
- Never paste secrets into issues, screenshots, chat messages, source files, or commits.
- Never commit `.env`.
- If a credential was exposed, notify the project owner and rotate it using the provider's official process.
- Use approved test accounts and non-sensitive sample data.

## Integration checklist
- [ ] App starts using the repository's documented command.
- [ ] Existing routes still work.
- [ ] Login and logout behavior remain intact.
- [ ] Admin authorization remains enforced.
- [ ] Product data still comes from the current data/API layer.
- [ ] Cart, checkout, and order flows have not been unintentionally broken.
- [ ] No database/backend files changed unexpectedly.
- [ ] No secrets appear in the diff.
- [ ] Console and network errors are reviewed.


---


<!-- Source file: 06_TESTING_CHECKLIST.md -->

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


---


<!-- Source file: 07_RESEARCH_TASKS.md -->

# Member 7 — Research and Documentation Plan

## Objective
Provide evidence-based UI recommendations to the six frontend members and support quality checks after integration.

## Research tasks
1. Review 3–5 relevant e-commerce storefronts and, if possible, 2 admin dashboard examples.
2. Record the URL, date reviewed, useful interaction patterns, and what should or should not be adapted.
3. Propose a shared color palette, typography hierarchy, spacing scale, button styles, form patterns, product-card treatment, and mobile navigation behavior.
4. Identify accessibility and mobile usability improvements.
5. Review integrated pages and file actionable issues.

## Research report template
For each reference, record:
- **Name and URL:**
- **Date reviewed:**
- **What works well:**
- **Relevant pattern:**
- **How VERTEX could adapt it:**
- **Risks or accessibility concerns:**

## Prioritize findings
- **P0 — Critical:** blocks a core user flow, exposes sensitive information, or breaks access control.
- **P1 — High:** major usability defect or broken primary interaction.
- **P2 — Medium:** confusing layout, responsive defect, or inconsistent component.
- **P3 — Low:** minor visual polish.

## QA issue template
- **Issue ID:**
- **Page/area:**
- **Priority:**
- **Device/browser:**
- **Steps to reproduce:**
- **Expected result:**
- **Actual result:**
- **Screenshot/video (without personal data):**
- **Suggested owner:**

## Research boundaries
- Use public references and properly licensed assets.
- Do not copy a competitor's logo, text, or proprietary imagery.
- Do not collect personal information or use real customer data.
- Make recommendations; do not change the app's code unless explicitly assigned.


---


<!-- Source file: 08_TASK_TRACKER.md -->

# Frontend Task Tracker

Update this file as work progresses. Replace `Unassigned` with team members' names.

| Workstream | Owner | Status | Branch / PR | Evidence / notes |
|---|---|---|---|---|
| Home page | Member 1 — Unassigned | Not started | — | — |
| Products and product details | Member 2 — Unassigned | Not started | — | — |
| Cart and wishlist | Member 3 — Unassigned | Not started | — | — |
| Checkout and orders | Member 4 — Unassigned | Not started | — | — |
| Login, registration, profile | Member 5 — Unassigned | Not started | — | — |
| Admin portal UI | Member 6 — Unassigned | Not started | — | — |
| Research and QA | Member 7 — Unassigned | Not started | — | — |
| Shared design system decision | Coordinator + all | Not started | — | — |
| Integrated responsive QA | Member 7 + page owners | Not started | — | — |

## Status values
- Not started
- In progress
- Blocked
- In review
- Done

## Weekly check-in
- **Completed:**
- **Next:**
- **Blocked by:**
- **Files likely to overlap:**
- **Decision needed from coordinator:**


---


<!-- Source file: 09_DECISIONS_AND_ISSUES.md -->

# Decisions and Issues Log

Record shared decisions here so members do not unknowingly make conflicting changes.

## Decision template
### DEC-001 — Short title
- **Date:**
- **Decision owner:**
- **Context:**
- **Decision:**
- **Affected files/pages:**
- **Members who need to know:**

## Issue template
### ISSUE-001 — Short title
- **Date reported:**
- **Reporter:**
- **Affected page/flow:**
- **Priority:** P0 / P1 / P2 / P3
- **Steps to reproduce:**
- **Expected result:**
- **Actual result:**
- **Evidence:**
- **Assigned owner:**
- **Status:** Open / In progress / Blocked / Resolved

## Initial decisions to confirm
- [ ] Who is the coordinator and final reviewer?
- [ ] Which branch is the shared integration branch?
- [ ] What are the agreed colors, fonts, spacing, and component styles?
- [ ] Who owns shared header/footer/global CSS?
- [ ] What commands are used to run and test the existing project?
- [ ] Which screens are currently implemented versus planned?


---


<!-- Source file: 10_HANDOFF_TEMPLATE.md -->

# Member Handoff Template

Copy this template when handing completed work to the coordinator.

## Summary
Describe the UI changes in 2–5 bullets.

## Assigned area
Page/component:

## Files changed
List the exact files and why they changed.

## Existing behavior preserved
Mention routes, API calls, state, and user flows checked.

## Validation performed
- [ ] App runs
- [ ] Relevant flow tested
- [ ] Mobile layout checked
- [ ] Desktop layout checked
- [ ] Console checked
- [ ] Existing project checks run where available
- [ ] No secrets included

## Screenshots
Attach screenshots with test/personal data removed.

## Known issues
List anything incomplete or blocked.

## Review request
State what you want the reviewer to focus on.


---


<!-- Source file: 11_PROPOSED_FILE_STRUCTURE.md -->

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


---


<!-- Source file: 12_RELEASE_AND_MERGE_CHECKLIST.md -->

# Final Integration and Release Checklist

## Before merging each member's work
- [ ] Member describes changes and files.
- [ ] Diff contains only intended changes.
- [ ] No `.env`, tokens, passwords, or database credentials are included.
- [ ] Existing app checks run where available.
- [ ] Assigned pages tested on mobile and desktop.
- [ ] Shared files reviewed for conflicts.
- [ ] Reviewer approved the change.

## After all six frontend workstreams are integrated
- [ ] Install/run using the repository's documented process.
- [ ] Confirm storefront navigation and product data.
- [ ] Confirm cart and checkout UI flows.
- [ ] Confirm login/profile behavior.
- [ ] Confirm admin UI and authorization behavior.
- [ ] Confirm responsive behavior across all main pages.
- [ ] Review console/network errors.
- [ ] Confirm no unintended backend/database/configuration changes.
- [ ] Record known issues and final screenshots.
- [ ] Tag or mark the approved version according to the team's existing release process.

## Do not deploy automatically
Merging UI work does not automatically mean it is ready for production. Follow the project's existing review, staging, and deployment process.
