# Product Requirements Document

## Product

A WhatsApp-first ecommerce storefront with a customer catalog and an authenticated admin workspace for products, categories, orders, reviews, branding, and operational logs.

## Goals

- Let customers browse, search, filter, wishlist, and cart products.
- Let customers place orders through WhatsApp and look up order status.
- Let administrators manage products and categories without editing JSON by hand.
- Keep local development persistent through `data/db.json`.
- Support customer and admin Vite builds from one codebase.

## Category Requirements

- A category has a normalized `id`, a title-cased `displayName`, optional description, optional image, and a computed published product count.
- Admins can add a category from the Categories tab.
- Admins can create a category while creating a product.
- Category names must not be blank after trimming.
- Product creation must resolve the selected category through the server so `categoryId` and `categoryName` stay consistent.
- Adding a category must be reflected in the admin list and product category selector without a page reload.
- Admins can set one or more image URLs and can select one or more local image files.
- The first image is the product thumbnail; all selected images are retained in the product `images` array.
- Customer product cards use the thumbnail, while product detail views can use the retained image collection.

## Acceptance Criteria

- `npm run lint` passes.
- `npm run build` produces the client and `dist/server.cjs` without server bundling errors.
- `npm start` listens on port 3000 by default.
- `GET /api/health` returns `{ "status": "ok" }`.
- `POST /api/categories` returns HTTP 400 for a missing or whitespace-only name.
- A valid category is persisted and returned by `GET /api/categories`.

## Non-goals

- Do not add payment processing without a separate security and compliance review.
- Do not move persistence to a new database without updating the architecture and migration plan.
