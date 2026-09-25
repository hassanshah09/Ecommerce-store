# Engineering Rules

## Code

- Keep TypeScript strict in behavior even though the current compiler config is permissive.
- Reuse existing types from `src/types.ts`; do not duplicate Product, Category, or Order shapes.
- Keep API calls in `src/services/api.ts` and server behavior in `server/api.ts` and `server/db.ts`.
- Preserve the existing customer/admin build split.
- Prefer small, local changes over unrelated refactors.

## Categories and Products

- Normalize category names at the server boundary.
- Reject blank category names with HTTP 400.
- Use the canonical category returned by the server for product relationships.
- Compare category filters by normalized `categoryId`.
- Keep product counts computed from published products.

## API

- Validate required request fields before mutating data.
- Return JSON errors with a useful `error` message.
- Use appropriate status codes: 201 for creation, 400 for invalid input, 404 for missing resources, and 500 for unexpected failures.
- Do not expose secrets, credentials, or private configuration in client bundles.

## Data and Operations

- Do not edit `data/db.json` manually during normal feature work.
- Do not commit generated `dist` output unless the deployment process explicitly requires it.
- Run `npm run lint` and `npm run build` before merging.
- Smoke test `GET /api/health` after a server or deployment change.
- Keep documentation synchronized when an API contract, data shape, command, or runtime decision changes.
