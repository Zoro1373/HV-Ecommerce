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
