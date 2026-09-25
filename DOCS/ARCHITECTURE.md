# Architecture

## Runtime

- `server.ts` starts Express and mounts the API at `/api`.
- In development, Express mounts Vite middleware.
- In production, Express serves the built `dist` SPA and falls back to `index.html`.
- `src/App.tsx` owns the customer shell, routing state, catalog state, cart, wishlist, and modal workflows.
- `src/components/admin/AdminDashboard.tsx` owns admin data loading and management UI.

## Data Flow

```text
Browser
  -> React UI
  -> src/services/api.ts
  -> Express /api routes
  -> server/db.ts
  -> data/db.json
```

Firebase is used by the client for authentication, analytics, and hosted configuration subscription. The local API remains the source for catalog, orders, reviews, logs, and local configuration.

## Category Flow

1. Admin submits a category name.
2. `src/services/api.ts` sends `POST /api/categories`.
3. `server/api.ts` validates the request.
4. `server/db.ts` normalizes the name and persists the category.
5. The response updates the admin category state.
6. Product creation sends the selected display name; the server resolves or creates the canonical category and writes both category fields to the product.

## Persistence

- Local data file: `data/db.json`.
- Store configuration file: `store.config.json`.
- The database module creates its data directory when needed and commits updates atomically.
- Serverless deployments use `/tmp/ecommerce-data` when `FIREBASE_CONFIG` is present; durable persistence must be supplied by the deployment environment before relying on it for production data.

## Build and Deployment

- `npm run dev`: Vite development server through Express.
- `npm run build`: default client build plus bundled CommonJS server.
- `npm run build:customer`: customer output in `dist/customer`.
- `npm run build:admin`: admin output in `dist/admin`.
- `npm start`: runs `dist/server.cjs`.

The server entrypoint detects the actual bundled filename instead of relying on `import.meta.url`, which is unavailable in the CommonJS output.
