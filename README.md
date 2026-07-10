# POS Transaction Engine — UI

React + TypeScript + Vite frontend for the POS Transaction Engine. This repo is the UI half of a
two-repo workspace — see the parent [`../CLAUDE.md`](../CLAUDE.md) for how it fits together with the
`stockapi` backend, and [`../docs/screens.md`](../docs/screens.md) for the current screen-by-screen
build status.

## Stack

- React 19 + TypeScript, built with Vite
- `react-router-dom` for routing (`src/routes.tsx`)
- CSS Modules per screen, with light/dark theme via CSS custom properties (see `src/theme.ts` and
  `EntryScreen.tsx` / `EntryScreen.module.css` for the established pattern)
- No global state/data-fetching library or UI kit — each screen owns its own fetch calls and state

## Getting started

```bash
npm install
cp .env.example .env.local   # set VITE_API_BASE_URL to your stockapi instance
npm run dev
```

The app expects `stockapi` running and reachable at `VITE_API_BASE_URL` (defaults to
`http://localhost:3000`). Routes on the API are mounted at the root (e.g. `GET /products`, not
`/api/products`) — see `../docs/api-reference.md`.

## Scripts

| Command           | Purpose                                        |
| ----------------- | ---------------------------------------------- |
| `npm run dev`     | Start the Vite dev server with HMR             |
| `npm run build`   | Type-check (`tsc -b`) and build for production |
| `npm run lint`    | Run ESLint                                     |
| `npm run preview` | Preview the production build locally           |

## Structure

```
src/
├── api/            # Typed fetch clients per resource (products, counters, inventory, ...)
├── components/     # Shared components (Modal, Pagination, ConfirmDialog, BlockedScreen, ...)
├── layouts/         # AdminLayout / CashierLayout — role-based nav shells
├── screens/        # One folder per feature area (products, counters, register, inventory, ...)
├── routes.tsx      # Route table — every nav destination is reachable, even unbuilt ones
└── theme.ts        # Light/dark theme tokens
```

Screens that don't have a working API yet render `BlockedScreen` with a reason and a doc pointer,
rather than being left out of the nav or wired to a guessed contract — see
[`../docs/screens.md`](../docs/screens.md) for what's wired, built-but-unwired, or blocked, and why.

## Working agreement

This UI is built one screen at a time against design mockups dropped into `../assets/` and whichever
`stockapi` endpoints are already implemented. Don't build ahead of the API — see the root
[`CLAUDE.md`](../CLAUDE.md) for the full working agreement.
