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
