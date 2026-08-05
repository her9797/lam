# lam-web

`lam-web` is a mobile-first QR menu web project for `lam`.

## Stack

- Next.js 16
- React 19.2
- TypeScript 5.9

## Start

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Notes

- The first version is intentionally web-only.
- The UI is optimized for QR entry on mobile browsers.
- Black and white design tokens are centralized in [`app/globals.css`](./app/globals.css).
- Source files are organized by role: `components/navigation`, `components/menu`, `components/screens`, `data`, and `services`.
