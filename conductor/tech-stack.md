# Tech Stack

## Frontend
- React 18 + TypeScript.
- Vite build system.
- React Router v7.
- Styling: global CSS in src/index.css, theme via data-theme attribute.

## Backend / Services
- Supabase (auth, database, storage).
- Supabase JS client in src/lib/supabase.ts.

## Data (inferred from code)
- Tables: games, expansions, expansion_modules, steps, users.
- RPC: delete_account.
- Storage bucket: "Card images" for cover art.

## Tooling
- Testing: Vitest + Testing Library + jsdom.
- Build: tsc -b && vite build.

## Environment
- .env.local
  - VITE_SUPABASE_URL
  - VITE_SUPABASE_ANON_KEY

## Key files
- src/main.tsx: app boot + router.
- src/App.tsx: shell layout and nav.
- src/pages/*: main screens.
- src/AdminApp.tsx: admin console.
- src/context/SessionContext.tsx: auth session state.
- src/lib/theme.ts: theme persistence.
