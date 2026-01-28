# BoardGameSetup - Context Index
Last updated: 2026-01-27

## What this is
Living context for the project. Update these docs when product, stack, or workflow changes.

## Where things are
- src/main.tsx: router, app boot, theme init, session provider
- src/App.tsx: shell + nav + footer
- src/components/ShellLayout.tsx: layout, nav, theme toggle
- src/pages/HomePage.tsx: game discovery (search, sort, pagination)
- src/pages/GameSetupPage.tsx: setup checklist builder
- src/pages/ProfilePage.tsx: auth, profile management, admin access
- src/AdminApp.tsx: admin console for games, expansions, modules, steps, admins
- src/lib/supabase.ts: Supabase client wiring
- src/context/SessionContext.tsx: auth/session state
- src/types/game.ts: shared data types
- src/index.css: global styles + theme tokens
- public/: static assets
- src/__tests__/: UI and component tests (vitest/testing-library)
- src/test/: fixtures and Supabase mocks

## Context artifacts
- product.md
- product-guidelines.md
- tech-stack.md
- workflow.md
- tracks.md

## Design/UX references
- tracks/T-002/index.md
- tracks/T-002/ux-audit.md
- tracks/T-002/design-audit.md

## Update cadence
- After shipping a feature: update product.md and tracks.md
- After adding or changing dependencies: update tech-stack.md
- After changing team workflow or quality gates: update workflow.md
