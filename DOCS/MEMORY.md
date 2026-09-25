# Project Memory

## Verified Decisions

- The local server is Express with Vite middleware in development and static SPA serving in production.
- The production server bundle is CommonJS at `dist/server.cjs`.
- On Windows, database persistence must tolerate `EPERM` during atomic rename when `data/db.json` already exists; `server/db.ts` now retries after removing the destination and falls back to a direct write.
- `import.meta.url` cannot be used for direct-execution detection in that CommonJS bundle because esbuild empties it.
- Direct server execution is detected by the entry filename: `server.ts`, `server.js`, or `server.cjs`.
- Categories are normalized in `server/db.ts`; IDs use lowercase hyphen-separated values.
- The starter catalog currently contains 15 published products, three per default category; these are ordinary catalog records and can be managed by admins.
- Blank category names are invalid API input.
- Products resolve categories server-side through `getOrCreateCategory`.
- Product images accept external URLs and local data URLs; the admin form supports multiple values and the first image is the thumbnail.
- Express JSON and URL-encoded request limits are 50 MB so local image data can be saved through the same API in local and Firebase Functions runtimes.
- Local persistence is stored in `data/db.json`; store settings are stored in `store.config.json`.

## Validation Record

- `npm run lint`: passed.
- `npm run build`: passed.
- `npm start` followed by `GET /api/health`: passed.
- Product create/delete round-trip through the REST API: passed.
- Product price sorting and category counts: passed.
- Imported logo resolves as `image/png` from the production server: passed.
- Multiple external image URLs and a 160 KB local data image: passed.
- The build still reports a large client chunk warning. This is a performance follow-up, not a build failure.
- Firebase hosting deploys successfully on the current project plan, but Functions deployment is blocked until the project is upgraded to Blaze; hosting `/api/**` rewrites therefore return 404 while no `api` Function is deployed.

## Troubleshooting

When the app appears to build but does not listen after `npm start`, check that `dist/server.cjs` exists and that the bundled entrypoint detection includes `server.cjs`. When a category does not appear, check the API response first, then confirm `data/db.json` was writable and refresh admin data.
