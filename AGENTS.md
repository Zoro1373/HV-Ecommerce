# VERTEX Project Instructions for AI Coding Agents

## Mission
Build a reliable full-stack e-commerce application for VERTEX, an electronics and fasteners store, by extending the existing React frontend. Implement the backend, PostgreSQL database, authentication, product catalog, cart, orders, bulk quote requests, and newsletter features.

## Non-negotiable rules
1. Inspect the existing repository, `package.json`, source files, and current UI before editing.
2. Preserve the current VERTEX branding, logo, navy/orange/green color palette, layout, responsive behavior, and existing working interactions.
3. Do not replace React with another frontend framework.
4. Do not delete or rewrite files unnecessarily. Prefer small, reviewable changes.
5. Never use mock authentication, hardcoded credentials, an in-memory database, or browser `localStorage` as the authoritative authentication system.
6. Never trust prices, totals, stock, roles, or permissions supplied by the browser.
7. Never commit real secrets or `.env` files.
8. Do not claim a feature, migration, build, or test works unless it has actually been run and verified.
9. If a required external service (database, email provider, payment gateway) is not configured, document the exact missing configuration and keep the application safe.
10. Ask before destructive database resets, deleting user data, or replacing major project configuration.

## Preferred stack
- Existing React frontend; preserve the project's current build tool (Create React App or Vite).
- Node.js + Express backend.
- PostgreSQL database.
- Prisma ORM and migrations.
- JavaScript ES modules unless the existing project already uses TypeScript.
- Server-side request validation with Zod or an equivalent library.
- bcrypt/bcryptjs for password hashing.
- Cookie-based authentication using appropriately protected HttpOnly cookies. If JWTs are used, keep them in HttpOnly cookies and implement logout/revocation strategy and CSRF protection appropriate to the design.
- Helmet, rate limiting, strict CORS, and structured error handling.
- Vitest/Jest and Supertest for tests, selected to fit the existing setup.

## Architecture
Keep the frontend and backend clearly separated. Prefer modular routes, controllers, services, validators, middleware, and database access. Do not put all backend logic in one file.

Possible backend structure:
`server/src/{config,controllers,services,routes,middleware,validators,utils}` plus `server/src/app.js` and `server/src/server.js`, `server/prisma/schema.prisma`, `server/prisma/seed.js`, and `server/tests/`.

Adapt this structure to the existing repository rather than blindly moving files.

## Implementation order
1. Inspect repository and summarize the integration plan.
2. Establish backend startup, environment validation, PostgreSQL connection, Prisma schema, migrations, and seed data.
3. Implement registration, login, logout, current-user endpoint, password change/reset design, and role authorization.
4. Implement catalog and category APIs.
5. Implement persistent carts and guest-cart merge.
6. Implement addresses, checkout, orders, and concurrency-safe inventory changes.
7. Implement newsletter and bulk quote requests.
8. Integrate existing React components with APIs while preserving UI.
9. Add tests, OpenAPI documentation, setup docs, and run build/tests.

At each phase, report changed files, commands run, actual results, and remaining blockers. Fix introduced failures before moving on.

## Security and correctness
- Validate all inputs on the server.
- Use parameterized ORM queries.
- Hash passwords; never log or return passwords, hashes, reset tokens, or secrets.
- Apply authorization and resource-ownership checks on every protected resource.
- Ensure only admins can use admin APIs.
- Do not allow public admin registration. Bootstrap the first admin through a documented controlled procedure.
- Configure cookie security, SameSite, CORS, and CSRF controls coherently for the actual deployment.
- Rate-limit login and password-reset endpoints.
- Use database transactions and concurrency-safe stock reservation/decrement.
- Calculate all totals on the server using decimal-safe monetary types.
- Do not store card numbers or CVVs.
- Avoid leaking stack traces or database internals in production responses.

## Done means
A feature is complete only when the code is implemented, relevant tests have been run, environment requirements are documented, and failures/limitations are honestly reported.
