# 10x Analysis: BoardGameSetup UX
Session 1 | Date: 2026-01-26

## Current Value
BoardGameSetup helps users find a game, then configure player count, expansions, and modules to get a tailored setup checklist. Discovery includes search, sort, and pagination. The setup page pulls steps, expansions, and modules from the catalog, with a rules link when available. (Evidence: src/pages/HomePage.tsx, src/pages/GameSetupPage.tsx)

## The Question
What would make this 10x more valuable?

---

## Massive Opportunities

### 1. Adaptive Setup Assistant (Context-Aware Flow)
**What**: Turn the setup page into a guided assistant that adapts steps based on player count, expansions, module choices, and time-to-play goals, with progress, time estimates, and optional visuals per step.
**Why 10x**: It shifts from a static checklist to a smart, guided setup experience that feels personalized and reduces friction.
**Unlocks**: Time-based recommendations, quick-start modes, and per-player roles during setup.
**Effort**: High
**Risk**: Requires richer step metadata and content curation.
**Score**: [STRONG]

### 2. Multi-Device Table Mode (Shared Setup)
**What**: Create a shared session that multiple players can join to see the same setup state, vote on expansions/modules, and assign setup tasks.
**Why 10x**: Board games are inherently social; shared setup turns the app into a table companion instead of a solo tool.
**Unlocks**: Real-time collaboration, role-based setup, and shared checklists.
**Effort**: High
**Risk**: Needs real-time sync and session management.
**Score**: [MUST]

### 3. Community Setup Library + Ratings
**What**: Let users publish and rate setup variants, house rules, and expansion mixes with player-count tags.
**Why 10x**: Creates a compounding content moat and social proof that reduces decision fatigue.
**Unlocks**: Trend-based recommendations and game discovery based on community setups.
**Effort**: Very High
**Risk**: Content moderation and quality control.
**Score**: [STRONG]

---

## Medium Opportunities

### 1. Smart Defaults + Presets
**What**: Save presets per game (player count + expansions + modules) and auto-suggest the last-used or best-rated combo.
**Why 10x**: Reduces repeated setup work, especially for frequent groups.
**Impact**: Faster setup for repeat play.
**Effort**: Medium
**Score**: [MUST]

### 2. Setup Progress + Time-to-Table
**What**: Add a setup progress bar, estimated minutes, and a clear "Ready to Play" state.
**Why 10x**: Reduces anxiety and gives a clear endpoint.
**Impact**: More confidence and less drift during setup.
**Effort**: Medium
**Score**: [STRONG]

### 3. Player-Count Best-Fit Suggestions
**What**: Highlight "best at X players" and recommend expansions/modules tuned for the current player count.
**Why 10x**: Players often debate what is best for their group; this removes guesswork.
**Impact**: Better game nights, fewer "wrong choices".
**Effort**: Medium
**Score**: [STRONG]

### 4. Quick Rules + Turn Summary Cards
**What**: Provide a short, scannable rules summary and turn structure next to the setup steps.
**Why 10x**: Bridges the gap between setup and play without hunting for rules.
**Impact**: Reduces friction post-setup.
**Effort**: Medium
**Score**: [MAYBE]

### 5. Discovery Filters Beyond Search/Sort
**What**: Add filters for length, weight/complexity, theme, and "best with X players".
**Why 10x**: Helps users pick the right game faster.
**Impact**: Better discovery flow and reduced bounce.
**Effort**: Medium
**Score**: [STRONG]

---

## Small Gems

### 1. One-Tap "Setup Checklist" Export
**What**: Allow print/share/copy of the setup list.
**Why powerful**: Makes the app useful even when the phone is put away.
**Effort**: Low
**Score**: [STRONG]

### 2. Remember Last Choices
**What**: Persist last player count + expansions + modules per game.
**Why powerful**: Eliminates repeat setup decisions.
**Effort**: Low
**Score**: [MUST]

### 3. Step Highlighting for Player Roles
**What**: Label steps by "Dealer", "Setup Captain", etc.
**Why powerful**: Instantly clarifies who does what.
**Effort**: Low
**Score**: [MAYBE]

### 4. Inline Rules Link Per Step
**What**: Add quick links or tooltips to relevant rules sections when available.
**Why powerful**: Cuts context switching.
**Effort**: Low
**Score**: [MAYBE]

### 5. "Empty State" Guidance
**What**: When no steps exist, show a helpful hint and link to request missing setup content.
**Why powerful**: Turns dead ends into engagement.
**Effort**: Low
**Score**: [STRONG]

---

## Recommended Priority

### Do Now (Quick wins)
1. Remember last choices per game -- reduces repeat setup work immediately. (Evidence: setup choices already exist in src/pages/GameSetupPage.tsx)
2. One-tap setup checklist export -- extends usefulness beyond the screen.
3. Empty state guidance -- improves dead-end UX when steps are missing.

### Do Next (High leverage)
1. Smart defaults + presets -- fastest path to "start playing".
2. Setup progress + time-to-table -- confidence and clarity during setup.
3. Player-count best-fit suggestions -- reduces the biggest decision point.

### Explore (Strategic bets)
1. Multi-device table mode -- collaboration becomes the core experience.
2. Community setup library + ratings -- compounding content and differentiation.
3. Adaptive setup assistant -- turns checklist into guidance.

---

## Questions

### Answered
- **Q**: What does the product do today? **A**: Game discovery and personalized setup checklist based on expansions/modules/player count. (Evidence: src/pages/HomePage.tsx, src/pages/GameSetupPage.tsx)

### Blockers
- **Q**: Who is the primary audience? (Casual groups, hobbyists, families, game stores?)
- **Q**: Is the priority faster setup or better game discovery?
- **Q**: Do you want this to be a social companion during play or just a solo setup tool?
- **Q**: Are you willing to collect community content (moderation/quality risk)?

## Next Steps
- [ ] Confirm target audience and top UX pain points.
- [ ] Decide if collaborative table mode is in scope.
- [ ] Define required metadata to power smart defaults and player-count recommendations.
