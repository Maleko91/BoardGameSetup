# Product: Board Game Setups
One-line: Help board game players get a clear, fast setup guide tailored to player count, expansions, and modules.

## Problem
Board game setup is often slow, error-prone, and requires flipping through rules or expansion booklets. The app reduces setup friction by turning a game selection into a clear, customized checklist.

## Target users (confirmed)
- Board game players who want a clear, fast setup guide.
- Groups/hosts who want to get to play quickly.

## Priorities (confirmed)
- Primary: setup speed and clarity.
- Secondary (later): discovery and recommendations.

## Core user journeys
1) Discover a game -> open setup page.
2) Adjust player count, expansions, and modules -> view setup checklist.
3) Sign in -> manage profile; admins manage catalog content.

## Current capabilities (as of 2026-01-27)
- Game discovery: search, sort, pagination.
- Setup checklist: conditional steps based on player count, expansions, and modules.
- Rules link when available.
- Profile: auth, profile settings, account deletion, password recovery.
- Admin console: manage games, expansions, modules, setup steps, admin users.
- Request page: placeholder ("coming soon").

## Data model (conceptual)
- Game: id, title, player range, popularity, tagline, cover image, rules URL.
- Expansion: belongs to game.
- Module: belongs to expansion or base game (null expansion).
- Step: ordered setup step with optional conditions.
- User: profile + admin flag.

## Success metrics (draft)
- Time from landing to ready-to-play checklist.
- Setup completion rate (steps viewed without drop-off).
- Repeat usage per game (returning users).

## Roadmap (draft, updated 2026-01-27)
Now (design and UX focus)
- Improve setup flow clarity and speed.
- Refine visual hierarchy and controls for player/expansion/module selection.
- Reduce friction in navigation between discovery and setup.

Quick wins
- Remember last choices per game.
- One-tap checklist export (print/share/copy).
- Empty state guidance when steps are missing.

Next
- Smart defaults + presets.
- Setup progress and time-to-table estimate.
- Player-count best-fit suggestions.

Strategic bets
- Multi-device table mode (shared setup).
- Community setup library + ratings.
- Adaptive setup assistant.

Discovery and monetization (later)
- Expansion suggestions that are on sale, with affiliate links.

## Open questions
- Which UX outcomes matter most first (speed, clarity, visual polish, mobile flow)?
- What data source will power expansion sale alerts and pricing?
- Any constraints on affiliate programs or disclosures?
