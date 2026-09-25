# Delivery Tasks

## Completed

- [x] Add category API and admin category form.
- [x] Allow category creation from the product form.
- [x] Reject blank category names at the API boundary.
- [x] Normalize repeated whitespace in category names.
- [x] Fix production CommonJS server startup detection.
- [x] Verify TypeScript with `npm run lint`.
- [x] Verify production output with `npm run build`.
- [x] Verify `GET /api/health` after `npm start`.
- [x] Provide 15 realistic starter products across Shoes, Electronics, Watches, Accessories, and Apparel.
- [x] Fix product edit image URL precedence and imported logo serving.
- [x] Make Firebase predeploy rebuild customer and admin hosting outputs after the server bundle.

## Next

- [ ] Add automated API tests for category validation, duplicate names, and persistence.
- [ ] Add an admin error banner instead of browser `alert()` for category operations.
- [ ] Add a category edit/delete policy before exposing destructive UI.
- [ ] Add deployment-specific durable storage validation for serverless environments.
- [ ] Upgrade Firebase project `ecomerce-c938e` to Blaze so the `api` Function can deploy.
- [ ] Reduce the main client chunk with route or feature-level code splitting.
- [ ] Move starter catalog seed data into an explicit staging-only fixture command before production deployment.

## Definition Of Done

- Behavior is implemented at the owning boundary.
- Existing public types and API contracts remain compatible unless documented.
- Lint and build pass.
- A focused runtime check covers the changed workflow.
- Relevant documentation is updated.
