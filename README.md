# Board Game Setups

Board Game Setups is a minimal React + Vite + TypeScript MVP for board game setup steps and visuals.

## Local development
```bash
npm install
npm run dev
```

## Data
- Game data lives in `public/data/games/*.json`.
- The game is chosen via `?game=cascadia` (defaults to `cascadia`).
- JSON is loaded at runtime using `import.meta.env.BASE_URL` so it works on GitHub Pages.

## Build
```bash
npm run build
npm run preview
```

## GitHub Pages setup
1. Ensure the repo is named `BoardGameSetup`.
2. `vite.config.ts` already sets `base: "/BoardGameSetup/"`.
3. In GitHub, go to Settings -> Pages and select Source: GitHub Actions.
4. Push to `main` to trigger the deploy workflow.

