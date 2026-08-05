# lam-web

`lam-web` is the customer-facing mobile web for the `lam` QR menu project.

It is built as a mobile-first Next.js application so guests can scan a QR code and immediately browse the bar menu, requests, and event information in a fast browser flow.

## Tech Stack

- Next.js `16.3.0`
- React `19.2.0`
- React DOM `19.2.0`
- TypeScript `5.9.2`
- ESLint `9.34.0`
- `eslint-config-next` `16.3.0`
- `@types/node` `24.3.0`
- `@types/react` `19.2.2`
- `@types/react-dom` `19.2.2`

## Scripts

```bash
npm install
npm run dev
npm run build
npm run start
npm run lint
```

## Routes

- `/`: home screen
- `/menu`: menu landing screen
- `/menu/[category]`: menu category detail screen
- `/requests`: guest request guide screen
- `/events`: notice and event screen

## Project Structure

```text
lam-web
├─ app
├─ components
│  ├─ menu
│  ├─ navigation
│  └─ screens
├─ data
├─ services
├─ public
└─ README.md
```

## Implementation Notes

- Uses the App Router in Next.js
- Shared UI is split by role for easier maintenance
- Mock menu content is stored in `data/menu-data.ts`
- Menu lookup and selection logic lives in `services/menu-service.ts`
- Global visual tokens and layout styles are centralized in `app/globals.css`
- The UI is tuned for QR-entry mobile browsing rather than desktop-first layout

## Local Development

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

## Verification

Verified with:

- `npm run build`
- `npm run lint`
