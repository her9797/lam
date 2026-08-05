# lam

`lam` is a monorepo for a mobile-first QR menu service designed for the bar `lam`.

Customers scan a QR code and open a lightweight mobile web experience where they can browse menu categories, check requests, and review notices or events without installing an app.

## Repository Structure

```text
lam
├─ lam-web   # Next.js customer-facing mobile web
├─ lam-api   # Go API scaffold
├─ .gitignore
└─ README.md
```

## Tech Stack

### Frontend

- Next.js `16.3.0`
- React `19.2.0`
- React DOM `19.2.0`
- TypeScript `5.9.2`
- ESLint `9.34.0`
- `eslint-config-next` `16.3.0`
- `@types/node` `24.3.0`
- `@types/react` `19.2.2`
- `@types/react-dom` `19.2.2`

### Backend

- Go `1.26`
- Standard library `net/http`

## What Is Implemented

- QR-entry mobile web optimized for narrow viewports
- Home screen with top-level navigation for `메뉴`, `요청사항`, `이벤트`
- Menu detail flows with subcategory navigation
- Mock data-driven menu rendering
- Floating utility actions such as home and scroll-top buttons
- Minimal API scaffold for future menu and store-facing endpoints

## Monorepo Apps

### `lam-web`

Customer-facing frontend for the QR menu experience.

- App Router-based Next.js structure
- Shared component directories for navigation, screens, and menu cards
- Centralized mock menu data and service layer
- Black and white visual system tuned for a bar-style mobile layout

### `lam-api`

Initial backend scaffold intended to grow into the menu/content API.

- HTTP server bootstrap in `cmd/server`
- Simple config loader in `internal/config`
- API routing and mocked menu response in `internal/httpapi`

## Local Development

### Web

```bash
cd lam-web
npm install
npm run dev
```

Default local URL:

```text
http://localhost:3000
```

### API

```bash
cd lam-api
go run ./cmd/server
```

Default local URL:

```text
http://localhost:8080
```

## Verification

The current repository was checked with:

- `lam-web`: `npm run build`
- `lam-web`: `npm run lint`
- `lam-api`: `go build ./...`

## Notes

- The current API is still based on mocked data.
- The current project is intentionally web-first rather than app-first.
- The Go module path still uses a temporary placeholder and can be updated later when the final repository/module path is fixed.
