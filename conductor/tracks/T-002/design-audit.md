# Visual Design Audit (Look and Feel)
Last updated: 2026-01-27

## Current visual language
- Glassmorphism panels on a rich gradient background.
- Serif display (Fraunces) for hero titles, geometric sans (Space Grotesk) for body.
- Rounded shapes and pill buttons with soft shadows.
- Dark theme leans purple; light theme leans green.

## Inconsistencies and friction
- Radius system varies across components (12, 16, 18, 20, 22, 999) without a clear scale.
- Elevation is uneven (panel shadows vs. card shadows vs. tile shadows).
- Selected states use hard-coded purple values that clash in light mode.
- Only h1 has a defined heading style; h2/h3 use default body font.
- Button width and sizing varies by context (full-width vs auto) without a rule.
- End-user UI is glassy while admin UI is utilitarian, but not defined as a deliberate theme split.

## Recommended improvements (look + consistency)
1) Establish a token set
   - Radii: 12 / 16 / 20 / 999 (pill) and use consistently.
   - Shadows: define 2 levels (soft, strong) and map components to them.
   - Spacing: align to an 8px scale for predictable rhythm.
2) Typography scale
   - Define h2/h3/h4 in CSS and apply Fraunces for headings consistently.
   - Standardize label and helper text sizes/letter-spacing.
3) Color system
   - Replace fixed selection colors with theme tokens (accent, accent-dark, surface-selected).
   - Consider a single brand accent across light/dark to preserve identity.
4) Component surface system
   - Create a shared card style for game cards, summary tiles, and step cards.
   - Align padding and border treatments across panels, tiles, and list items.
5) Buttons and controls
   - Normalize button height and corner radius.
   - Define primary/ghost/danger plus a secondary style for subtle actions.
6) Iconography and imagery
   - Use a single icon set with consistent stroke weight.
   - Add explicit icon sizing to reduce visual jitter.
7) Motion
   - Prefer subtle color/shadow transitions over scale-down on tap.

## Mobile considerations
- Stack action buttons on small screens (avoid cramped two-column CTAs).
- Reduce transparency in light mode to keep contrast and readability.
- Ensure controls remain visually distinct when panels collapse.

## Suggested design direction (optional)
- Keep the "tabletop glass" feel, but warm it with subtle parchment/wood undertones.
- Make the game cover imagery the primary color driver; keep UI chrome quieter.

## Phased plan
- Phase 1: Token cleanup (radius, shadows, colors, typography scale).
- Phase 2: Component polish (cards, tiles, buttons, inputs).
- Phase 3: Mobile-specific refinements (stacked CTAs, spacing, readability).
