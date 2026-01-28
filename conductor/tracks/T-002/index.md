# T-002 Design/UX Focus Brief
Last updated: 2026-01-27

## Intent
Improve setup speed and clarity by refining the UX of discovery and setup flows. This brief captures the current focus and serves as the reference for design decisions.

## Goals
- Reduce time to reach a usable setup checklist.
- Make player count, expansion, and module choices obvious and fast.
- Keep the checklist scannable and action-oriented.
- Preserve accessibility and mobile usability.

## Non-goals (for now)
- New features beyond UX improvements.
- Discovery-driven monetization (affiliate links) until a later track.
- Real-time collaboration or community content.

## Primary screens in scope
- Home (discovery): search, sort, pagination, game cards.
- Game setup: player count, expansion selection, modules, steps list.
- Shell layout: navigation, theme toggle, header and footer.

## UX hypotheses to validate
- Fewer taps to reach the checklist will increase completion.
- Cleaner visual hierarchy in the summary panel reduces decision friction.
- Clear empty states reduce drop-off when data is missing.

## Known UX constraints
- Data is driven by Supabase and may be incomplete (missing steps/expansions).
- The app supports light/dark themes via data-theme.
- Icons are loaded from public assets.

## Acceptance signals
- Users can reach a setup checklist in under 30 seconds on mobile.
- Player count and expansion toggles are understood without explanation.
- Empty states guide the next action (e.g., request missing content).

## References
- ux-audit.md
- design-audit.md

## Notes
- Discovery remains important but secondary to setup speed.
- Use existing component structure; prefer layout and content adjustments before re-architecture.
