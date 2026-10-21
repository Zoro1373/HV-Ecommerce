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
