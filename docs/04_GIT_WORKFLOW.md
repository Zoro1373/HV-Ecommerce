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
