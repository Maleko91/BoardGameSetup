# BoardGameSetup — Product Roadmap

> A community-driven reference for board game setup rules, evolving into the definitive
> companion app for tabletop gaming.

---

## Vision

BoardGameSetup becomes the **default destination** people visit when they need to set up a
board game — fast, visual, and trustworthy. Over time it grows into a full companion
platform: publisher-verified content, personal game libraries, play tracking, stats,
and in-game helper tools.

---

## Current State (v1.0)

- [x] Game catalog with search, sort, and pagination
- [x] Dynamic setup instructions (player count, expansions, modules)
- [x] Step completion tracking with progress bar
- [x] Dark/light theme
- [x] User authentication (signup, login, password reset)
- [x] Admin panel with full CRUD for games, expansions, steps
- [x] Responsive mobile-first design
- [x] Supabase backend (PostgreSQL + Auth + Storage)
- [x] Deployed on GitHub Pages

---

## Execution Order

Phases are numbered in the order they should be started. Some can overlap
(noted in each phase), but the numbering reflects dependencies.

| Phase  |               Name                 |    Status   | Can overlap with |
|--------|------------------------------------|-------------|------------------|
| **1**  | Dev Environment & Vercel Migration | Not started |        —         |
| **2**  | Security Hardening                 | Not started |      Phase 3     |
| **3**  | Steps Table Restructure            | Not started |      Phase 2     |
| **4**  | Game Modes & Solo Support          | Not started |      Phase 5     |
| **5**  | User Game Library                  | Not started |      Phase 4     |
| **6**  | Asymmetric Player Setup            | Not started |      Phase 7     |
| **7**  | Content Growth                     | Not started |      Phase 6     |
| **8**  | Richer Step Types                  | Not started |        —         |
| **9**  | Growth & Discovery (SEO)           | Not started |        —         |
| **10** | Scenarios & Missions               | Not started |        —         |
| **11** | Publisher Access                   | Not started |        —         |
| **12** | Maps, Presets & Metadata           | Not started |        —         |
| **13** | Play Tracking & Stats              | Not started |        —         |
| **14** | In-Game Helper Tools               | Not started |        —         |
| **T**  | Technical Debt                     | Ongoing     |     Any phase    |

---

## Phase 1 — Dev Environment & Vercel Migration

**Status:** Not started
**Goal:** Set up a safe development environment and modern hosting before making any
schema or security changes.

### 1A · Dev Supabase Database

| # | Item | Description | Status |
|---|------|-------------|--------|
| 1.1 | Create dev Supabase project | New Supabase project (free tier allows 2 active projects). Separate URL and anon key for development | [ ] |
| 1.2 | Environment file structure | Replace single `.env.local` with: `.env.development` (dev Supabase credentials, committed as reference), `.env.production` (prod credentials, gitignored), `.env.local` (personal overrides, gitignored) | [ ] |
| 1.3 | Update `.gitignore` | Add `.env.local`, `.env.production`, `.env*.local` to `.gitignore`. Fixes the current credential exposure risk | [ ] |
| 1.4 | Vite env mode support | Vite already loads `.env.development` in `vite dev` and `.env.production` in `vite build` — verify this works and document the convention | [ ] |
| 1.5 | Schema sync scripts | Create a `supabase/` directory with migration SQL files so the same schema can be applied to both dev and prod databases | [ ] |
| 1.6 | Seed data script | SQL seed file with a handful of test games, expansions, steps, and a test admin user for the dev database | [ ] |
| 1.7 | Supabase CLI (optional) | Install `supabase` CLI for local development — runs Postgres + Auth + Storage locally via Docker | [ ] |

**File structure after setup:**
```
.env.development         # Dev Supabase URL + anon key (safe to commit — dev-only)
.env.production          # Prod Supabase credentials (GITIGNORED)
.env.local               # Personal overrides (GITIGNORED)
supabase/
├── migrations/
│   ├── 001_initial_schema.sql
│   ├── 002_rls_policies.sql
│   ├── 003_conditions_jsonb.sql
│   └── ...
└── seed.sql             # Dev test data
```

### 1B · Vercel Migration

| # | Item | Description | Status |
|---|------|-------------|--------|
| 1.8 | Connect repo to Vercel | Import the GitHub repo into Vercel. Configure build command (`npm run build`) and output directory (`dist`) | [ ] |
| 1.9 | Set environment variables | Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to Vercel project settings. Use production values for Production env, dev values for Preview env | [ ] |
| 1.10 | Add `vercel.json` SPA rewrite | Add rewrite rule so all routes serve `index.html` (replaces the 404.html hack) | [ ] |
| 1.11 | Remove base path | Change `base: "/BoardGameSetup/"` to `base: "/"` in `vite.config.ts` | [ ] |
| 1.12 | Remove GitHub Pages routing hacks | Delete `public/404.html`, remove redirect script from `index.html` (lines 7-25), remove hash-to-path conversion from `main.tsx` (lines 18-41) | [ ] |
| 1.13 | Update router basename | Router `basename` changes from `/BoardGameSetup/` to `/` (or remove the option entirely) | [ ] |
| 1.14 | Add security headers | Create `vercel.json` headers section with `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, CSP | [ ] |
| 1.15 | Preview deployments | Verify Vercel automatically creates preview URLs for pull requests. Configure preview env to use dev Supabase | [ ] |
| 1.16 | Custom domain (optional) | Point a custom domain to Vercel. Vercel handles HTTPS automatically | [ ] |
| 1.17 | Decommission GitHub Pages | Remove `github-pages` branch, update repo settings to disable Pages | [ ] |

**New `vercel.json`:**
```json
{
  "rewrites": [
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" }
      ]
    }
  ]
}
```

**Files to modify:**
| File | Change |
|------|--------|
| `vite.config.ts` | `base: "/"` |
| `index.html` | Remove lines 7-25 (redirect script) |
| `src/main.tsx` | Remove lines 18-41 (hash-to-path conversion) |
| `public/404.html` | Delete entirely |
| `vercel.json` | Create new |

---

## Phase 2 — Security Hardening

**Status:** Not started
**Depends on:** Phase 1 (dev database needed to test RLS policies safely)
**Can overlap with:** Phase 3

### Critical

| # | Item | Description | Status |
|---|------|-------------|--------|
| 2.1 | Supabase RLS policies | No Row Level Security policies found — all tables are unprotected at the database level. Add RLS to enforce: public read-only for games/steps/expansions, user-only access to own profile, admin-only writes. Without this, any authenticated user can modify any data via direct API calls | [ ] |
| 2.2 | Admin authorization server-side | Admin check is client-side only (`is_admin` flag queried then UI-gated). A user could bypass the UI and call Supabase directly. RLS policies must enforce admin-only writes independently of the frontend | [ ] |

### High

| # | Item | Description | Status |
|---|------|-------------|--------|
| 2.3 | Rate limiting on auth | No rate limiting on login attempts, password resets, or signup. Add Supabase Auth rate limits (configurable in dashboard) and consider edge functions for custom endpoints | [ ] |
| 2.4 | Error message sanitization | Supabase error objects (`.message`, `.details`, `.hint`) are displayed directly to users. These can leak table names, column names, and SQL details. Wrap errors in generic user-facing messages; log full details only in dev mode | [ ] |
| 2.5 | File upload validation | Admin image uploads have filename sanitization but no checks on file size, MIME type, or image dimensions. Add client-side validation (max size, allowed types: `image/png`, `image/jpeg`, `image/webp`) and configure Supabase Storage bucket policies | [ ] |

### Medium

| # | Item | Description | Status |
|---|------|-------------|--------|
| 2.6 | Content Security Policy | Add CSP header restricting scripts to self and Supabase origin, blocking inline scripts. *(Basic frame/content headers already added by 1.14)* | [ ] |
| 2.7 | Dependency auditing | No `npm audit` in CI. Add automated dependency vulnerability scanning to the CI/CD pipeline | [ ] |
| 2.8 | Supabase client hardening | Supabase client silently falls back to empty strings if env vars are missing. Add a startup check that throws immediately if configuration is absent | [ ] |

### Ongoing

| # | Item | Description | Status |
|---|------|-------------|--------|
| 2.9 | RLS policy reviews | Review and update RLS policies whenever new tables are added (user_libraries, play_sessions, publishers, etc.) | [ ] |
| 2.10 | Penetration testing | Periodic security review of auth flows, admin endpoints, and publisher scoped access (especially before Phase 11 launch) | [ ] |
| 2.11 | Secret rotation schedule | Establish a schedule for rotating Supabase anon key and any future API keys | [ ] |

**Recommended RLS policy structure for current tables:**
```sql
-- Enable RLS on all tables
alter table games enable row level security;
alter table expansions enable row level security;
alter table steps enable row level security;
alter table expansion_modules enable row level security;
alter table users enable row level security;

-- Public read access to game content
create policy "Public read games" on games for select using (true);
create policy "Public read expansions" on expansions for select using (true);
create policy "Public read steps" on steps for select using (true);
create policy "Public read modules" on expansion_modules for select using (true);

-- Admin-only write access to game content
create policy "Admin insert games" on games for insert
  with check (exists (select 1 from users where id = auth.uid() and is_admin = true));
create policy "Admin update games" on games for update
  using (exists (select 1 from users where id = auth.uid() and is_admin = true));
create policy "Admin delete games" on games for delete
  using (exists (select 1 from users where id = auth.uid() and is_admin = true));

-- Users can only read/update their own profile
create policy "Users read own profile" on users for select
  using (id = auth.uid());
create policy "Users update own profile" on users for update
  using (id = auth.uid())
  with check (id = auth.uid() and is_admin = is_admin);  -- prevent self-promotion

-- Admin can manage all users
create policy "Admin manage users" on users for all
  using (exists (select 1 from users where id = auth.uid() and is_admin = true));
```

---

## Phase 3 — Steps Table Restructure

**Status:** Not started
**Depends on:** Phase 1 (run migrations on dev database first)
**Can overlap with:** Phase 2

**Goal:** Consolidate the 6 flat condition columns into a single JSONB `conditions` column
before adding new condition types in later phases. This prevents the steps table from
growing to 20+ mostly-null columns.

**Why JSONB:** All step filtering happens client-side in `useMemo` — we never filter
conditions in SQL. JSONB keeps queries simple (one column to read) and makes adding new
condition types trivial (just add JSON keys, no `ALTER TABLE`).

| # | Item | Description | Status |
|---|------|-------------|--------|
| 3.1 | Add `conditions` JSONB column | Add `conditions jsonb default '{}'` to the `steps` table | [ ] |
| 3.2 | Migrate existing data | SQL script to merge `player_counts`, `include_expansions`, `exclude_expansions`, `include_modules`, `exclude_modules`, `require_no_expansions` into the JSONB column | [ ] |
| 3.3 | Add cleanup trigger | Postgres trigger that removes orphaned IDs from `conditions` when an expansion, module, mode, role, scenario, or map is deleted. Solves the current orphaning risk | [ ] |
| 3.4 | Update GameSetupPage queries | Read `conditions` instead of individual columns. Simplifies the 30-line mapping to `const conditions = step.conditions ?? {}` | [ ] |
| 3.5 | Update AdminApp step editor | Step form reads/writes conditions from the JSONB column. Checkbox matrix UI stays the same, just backed by a JSON object instead of CSV strings | [ ] |
| 3.6 | Update TypeScript types | `GameSetupStepRow` drops individual condition fields, gains `conditions: StepCondition \| null` | [ ] |
| 3.7 | Drop legacy columns | After verifying migration, drop the 6 old condition columns from the steps table | [ ] |
| 3.8 | Add step metadata columns | Add `step_type`, `parent_step_id`, `phase`, `parallel_group` as regular columns (these are step properties, not filter conditions, so they stay as columns) | [ ] |

**Migration SQL:**
```sql
-- Add JSONB column
alter table steps add column conditions jsonb default '{}';

-- Migrate existing data
update steps set conditions = jsonb_strip_nulls(jsonb_build_object(
  'playerCounts',        to_jsonb(coalesce(player_counts, '{}'::int[])),
  'includeExpansions',   to_jsonb(coalesce(include_expansions, '{}'::text[])),
  'excludeExpansions',   to_jsonb(coalesce(exclude_expansions, '{}'::text[])),
  'includeModules',      to_jsonb(coalesce(include_modules, '{}'::text[])),
  'excludeModules',      to_jsonb(coalesce(exclude_modules, '{}'::text[])),
  'requireNoExpansions', coalesce(require_no_expansions, false)
));

-- Remove empty arrays from conditions (keep JSONB clean)
update steps set conditions = (
  select jsonb_object_agg(key, value)
  from jsonb_each(conditions)
  where value != '[]'::jsonb and value != 'false'::jsonb
)
where conditions != '{}'::jsonb;

-- Add step metadata columns
alter table steps add column step_type text default 'standard';
alter table steps add column parent_step_id uuid references steps(id) on delete cascade;
alter table steps add column phase text default 'board_setup';
alter table steps add column parallel_group text;

-- Add GIN index for future server-side filtering if needed
create index idx_steps_conditions on steps using gin (conditions);

-- Cleanup trigger (runs when expansions/modules are deleted)
create or replace function cleanup_step_conditions()
returns trigger as $$
begin
  update steps
  set conditions = (
    select jsonb_object_agg(
      key,
      case
        when jsonb_typeof(value) = 'array'
        then (select coalesce(jsonb_agg(elem), '[]'::jsonb)
              from jsonb_array_elements(value) as elem
              where elem::text != to_jsonb(OLD.id::text)::text)
        else value
      end
    )
    from jsonb_each(conditions)
  )
  where conditions::text like '%' || OLD.id::text || '%';
  return OLD;
end;
$$ language plpgsql;

create trigger trg_expansion_delete_cleanup
  after delete on expansions for each row
  execute function cleanup_step_conditions();

create trigger trg_module_delete_cleanup
  after delete on expansion_modules for each row
  execute function cleanup_step_conditions();

-- After verification: Drop legacy columns
-- alter table steps drop column player_counts;
-- alter table steps drop column include_expansions;
-- alter table steps drop column exclude_expansions;
-- alter table steps drop column include_modules;
-- alter table steps drop column exclude_modules;
-- alter table steps drop column require_no_expansions;
```

**Before / After comparison:**
```
BEFORE (current steps table):          AFTER (restructured):
─────────────────────────────          ─────────────────────────
id                                     id
game_id                                game_id
step_order                             step_order
text                                   text
visual_asset                           visual_asset
visual_animation                       visual_animation
player_counts         ─┐               conditions (jsonb)  ← all conditions in one column
include_expansions     │               step_type           ← new
exclude_expansions     ├─ consolidated  parent_step_id      ← new
include_modules        │               phase               ← new
exclude_modules        │               parallel_group      ← new
require_no_expansions ─┘
```

---

## Phase 4 — Game Modes & Solo Support

**Status:** Not started
**Depends on:** Phase 3 (JSONB conditions column must exist)
**Can overlap with:** Phase 5

**Goal:** Add a first-class game mode concept (Solo, Co-op, Competitive, Team, Campaign)
using a hybrid approach — modes for major gameplay shifts, modules for smaller variants.

| # | Feature | Description | Status |
|---|---------|-------------|--------|
| 4.1 | Game modes table | New `game_modes` table: id, game_id, name, slug, description, is_default. Examples: "Solo", "Competitive", "Cooperative", "Team", "Campaign" | [ ] |
| 4.2 | Mode selection UI | Mode picker on game setup page (above player count). Selecting "Solo" could hide or lock the player count selector | [ ] |
| 4.3 | Step conditions for modes | Extend `StepCondition` with `includeModes` / `excludeModes` arrays so steps can be mode-dependent | [ ] |
| 4.4 | Mode-specific player counts | Some modes override valid player counts (Solo always = 1, Team requires even numbers). Add optional `min_players` / `max_players` overrides per mode | [ ] |
| 4.5 | Mode-specific components | Some modes add/remove components (Solo adds Automa deck). Allow modes to auto-select or require certain modules | [ ] |
| 4.6 | Admin: mode management | CRUD for modes in admin panel, conditional step editor updated to reference modes | [ ] |

**Database changes:**
```sql
create table game_modes (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references games(id) on delete cascade,
  name text not null,                    -- "Solo", "Cooperative", "Campaign"
  slug text not null,                    -- "solo", "cooperative", "campaign"
  description text,
  is_default boolean default false,      -- one mode can be the default
  min_players int,                       -- null = inherit from game
  max_players int,                       -- null = inherit from game
  auto_modules text[],                   -- modules auto-selected in this mode
  sort_order int default 0
);

-- Add cleanup trigger for modes
create trigger trg_mode_delete_cleanup
  after delete on game_modes for each row
  execute function cleanup_step_conditions();

-- Steps reference modes via the JSONB conditions column:
--   conditions.includeModes: ["mode-id-1"]
--   conditions.excludeModes: ["mode-id-2"]
-- No ALTER TABLE needed.
```

---

## Phase 5 — User Game Library

**Status:** Not started
**Depends on:** Phase 1 (Supabase dev database + Vercel)
**Can overlap with:** Phase 4

**Goal:** Give users a reason to create an account and keep coming back.

| # | Feature | Description | Status |
|---|---------|-------------|--------|
| 5.1 | My Library page | New `/library` route showing the user's saved games in a grid | [ ] |
| 5.2 | Add to Library action | "Add to Library" button on game cards and game setup page | [ ] |
| 5.3 | Library persistence | `user_libraries` table in Supabase (user_id, game_id, added_at) | [ ] |
| 5.4 | Quick-access from Library | Clicking a library game goes straight to setup with last-used player count/expansions remembered | [ ] |
| 5.5 | Library sorting & filtering | Sort by recently added, alphabetical, most played; filter by player count | [ ] |
| 5.6 | Remove from Library | Swipe-to-remove on mobile, icon button on desktop | [ ] |
| 5.7 | Guest bookmark fallback | localStorage-based library for non-authenticated users, with merge prompt on signup | [ ] |

**Database changes:**
```sql
create table user_libraries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  game_id uuid references games(id) on delete cascade,
  added_at timestamptz default now(),
  last_player_count int,
  last_expansions text[],
  unique(user_id, game_id)
);
```

---

## Phase 6 — Asymmetric Player Setup

**Status:** Not started
**Depends on:** Phase 3 (JSONB conditions column)
**Can overlap with:** Phase 7

**Goal:** Support games where each player picks a faction, character, or spirit with
unique setup steps (Root, Scythe, Spirit Island, etc.).

| # | Feature | Description | Status |
|---|---------|-------------|--------|
| 6.1 | Factions/roles table | New `game_roles` table: id, game_id, name, description, image, setup steps linked to role. Represents spirits, factions, characters, civilizations, etc. | [ ] |
| 6.2 | Role-specific steps | Steps can be conditioned on `includeRoles` / `excludeRoles` — e.g., "As the Marquise de Cat, place 25 warriors in your supply" | [ ] |
| 6.3 | Role selection UI | Each player selects their role on the setup page. Show shared setup steps + per-player role steps below | [ ] |
| 6.4 | Role availability rules | Some roles are restricted by player count or mode (e.g., Vagabond only in 3+ player Root). Add optional `min_players` / `max_players` per role | [ ] |
| 6.5 | Role-expansion linking | Some roles come from expansions (e.g., Root Underworld adds 2 factions). Link roles to expansion_id so they appear/hide correctly | [ ] |
| 6.6 | Recommended roles for new players | Flag certain roles as beginner-friendly so the UI can suggest them | [ ] |

**Database changes:**
```sql
create table game_roles (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references games(id) on delete cascade,
  expansion_id uuid references expansions(id) on delete set null,  -- null = base game
  name text not null,                    -- "Marquise de Cat", "Eyrie Dynasties"
  description text,
  image_url text,
  min_players int,                       -- null = always available
  max_players int,
  is_beginner_friendly boolean default false,
  sort_order int default 0
);

create trigger trg_role_delete_cleanup
  after delete on game_roles for each row
  execute function cleanup_step_conditions();
```

---

## Phase 7 — Content Growth

**Status:** Not started
**Depends on:** Phase 2 (RLS policies for user-submitted content)
**Can overlap with:** Phase 6

**Goal:** Rapidly expand the game catalog to reach critical mass and become a useful reference.

| # | Feature | Description | Status |
|---|---------|-------------|--------|
| 7.1 | Game request form | Replace placeholder `/request` page with a working submission form (game name, BGG link, upvote system) | [ ] |
| 7.2 | Community upvoting | Users can upvote requested games; most-requested surface to the top | [ ] |
| 7.3 | Full rules section | New "Rules" tab on game page alongside "Setup" — structured rules content (objective, turn flow, end conditions) | [ ] |
| 7.4 | Scoring conditions | Dedicated scoring reference section per game (point categories, tie-breakers, final scoring steps) | [ ] |
| 7.5 | Bulk import tooling | Admin tool to import game metadata from BoardGameGeek API or CSV for faster catalog growth | [ ] |
| 7.6 | Content quality flags | Users can report incorrect or missing steps; flagged content surfaces in admin dashboard | [ ] |
| 7.7 | Version history | Track edits to game setup steps with timestamps and author, enabling rollback | [ ] |

**Database changes:**
```sql
create table game_requests (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  bgg_url text,
  requested_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create table game_request_votes (
  request_id uuid references game_requests(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  primary key (request_id, user_id)
);

create table game_rules (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references games(id) on delete cascade,
  section text not null,       -- 'objective', 'turn_flow', 'end_conditions', 'scoring'
  content_md text not null,    -- Markdown content
  sort_order int default 0
);
```

---

## Phase 8 — Richer Step Types

**Status:** Not started
**Depends on:** Phase 3 (step metadata columns must exist)

**Goal:** Move beyond plain-text steps to support sub-steps, per-player actions, optional
steps, and step categories.

| # | Feature | Description | Status |
|---|---------|-------------|--------|
| 8.1 | Step type field | Use `step_type` column: `standard` (default), `per_player`, `optional`, `recommended`, `parallel` | [ ] |
| 8.2 | Sub-steps / nesting | Use `parent_step_id` for nested steps. "Set up the market" → sub-steps (a), (b), (c) | [ ] |
| 8.3 | Per-player steps | Steps flagged as `per_player` render once per player with context ("Player 1: take 5 coins"). Can use `{player_count}` template variables in text | [ ] |
| 8.4 | Optional / recommended steps | Steps flagged `optional` or `recommended` render with a distinct visual style. Users can skip them without affecting completion % | [ ] |
| 8.5 | Step phases | Use `phase` field: `board_setup`, `player_setup`, `round_prep`, `teardown`. Group steps visually by phase on the setup page | [ ] |
| 8.6 | Template variables in step text | Support `{player_count}`, `{mode}`, `{role_name}` placeholders that resolve dynamically. E.g., "Deal {player_count + 2} cards to the market" | [ ] |
| 8.7 | Parallel step groups | Steps in the same `parallel_group` can be done simultaneously — render side-by-side or with a "these can be done at the same time" indicator | [ ] |

**Database changes:**
```sql
-- step_type, parent_step_id, phase, and parallel_group are already added
-- in Phase 3 (item 3.8) as regular columns on the steps table.

-- Template variables are step content, not filter conditions, so they
-- get their own column:
alter table steps add column template_variables jsonb;
  -- e.g., {"coins_per_player": 5} for use in text templates
```

---

## Phase 9 — Growth & Discovery (SEO)

**Status:** Not started
**Depends on:** Phase 1 (Vercel must be live)

**Goal:** Make BoardGameSetup findable, shareable, and the top search result for
"[game name] setup."

| # | Feature | Description | Status |
|---|---------|-------------|--------|
| 9.1 | Server-side rendering | SSR or SSG for game pages so search engines index setup content properly. Evaluate Next.js migration or Vite SSR plugin | [ ] |
| 9.2 | SEO meta tags | Dynamic `<title>`, `<meta description>`, Open Graph tags per game page | [ ] |
| 9.3 | Structured data (JSON-LD) | Schema.org `HowTo` markup for setup steps — enables rich snippets in Google | [ ] |
| 9.4 | Sitemap generation | Auto-generated sitemap.xml from the game catalog for search engine crawling | [ ] |
| 9.5 | Social sharing | Share buttons and preview cards for game setup pages (Twitter, Facebook, Reddit) | [ ] |
| 9.6 | Game page URL slugs | SEO-friendly URLs: `/game/catan` instead of `/game/uuid` | [ ] |
| 9.7 | Landing page refresh | New marketing-oriented home page with value proposition, popular games, and call-to-action | [ ] |
| 9.8 | PWA support | Service worker for offline access to saved library games and previously viewed setups | [ ] |

---

## Phase 10 — Scenarios & Missions

**Status:** Not started
**Depends on:** Phase 3 (JSONB conditions column)

**Goal:** Support games with scenario books where each scenario has unique setup, story,
and components (Gloomhaven, Arkham Horror LCG, Pandemic Legacy).

> **Performance note:** Scenario-heavy games can have hundreds of scenarios. Unlike other
> conditions (player count, expansions, modes) which are filtered client-side, scenarios
> should be filtered **server-side** in the Supabase query to avoid loading all scenarios'
> steps at once.

| # | Feature | Description | Status |
|---|---------|-------------|--------|
| 10.1 | Scenarios table | New `game_scenarios` table: id, game_id, name, number, description, story_text, difficulty, estimated_duration | [ ] |
| 10.2 | Scenario-specific steps | Steps can be conditioned on `includeScenarios` / `excludeScenarios` | [ ] |
| 10.3 | Scenario selection UI | Scenario picker on game setup page for games that have scenarios. Shows scenario number, name, and difficulty | [ ] |
| 10.4 | Scenario component list | Each scenario lists required components so players can verify they have everything before starting setup | [ ] |
| 10.5 | Scenario-expansion linking | Some scenarios require specific expansions. Warn users if they haven't selected the required expansion | [ ] |
| 10.6 | Scenario spoiler protection | Story text and scenario details hidden behind a "reveal" toggle to prevent spoilers for campaign games | [ ] |

**Database changes:**
```sql
create table game_scenarios (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references games(id) on delete cascade,
  name text not null,
  scenario_number int,                   -- for ordered scenarios in campaigns
  description text,
  story_text text,                       -- spoiler-protected narrative text
  difficulty text,                       -- "easy", "medium", "hard" or numeric
  estimated_minutes int,
  required_expansion_ids text[],         -- expansions needed for this scenario
  sort_order int default 0
);

create table scenario_components (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid references game_scenarios(id) on delete cascade,
  component_name text not null,
  quantity int default 1,
  notes text
);

create trigger trg_scenario_delete_cleanup
  after delete on game_scenarios for each row
  execute function cleanup_step_conditions();
```

---

## Phase 11 — Publisher Access

**Status:** Not started
**Depends on:** Phase 2 (RLS policies), Phase 7 (content management patterns)

**Goal:** Let board game publishers manage and verify their own game content through an
invite-only system with Publisher entities linked to games.

| # | Feature | Description | Status |
|---|---------|-------------|--------|
| 11.1 | Publisher entity model | `publishers` table with name, logo, website, contact info | [ ] |
| 11.2 | Publisher-Game linking | `publisher_games` join table associating publishers with their games | [ ] |
| 11.3 | Publisher user roles | `publisher_members` table granting users moderation access scoped to a publisher's games | [ ] |
| 11.4 | Invite system | Admin generates invite links; recipients sign up and are auto-assigned to their publisher entity | [ ] |
| 11.5 | Publisher dashboard | Dedicated `/publisher` area showing only their games, with edit access to setup steps and rules | [ ] |
| 11.6 | Edit review queue | Optional: publisher edits go through admin approval before going live (configurable per publisher) | [ ] |
| 11.7 | Verified badge | "Verified by Publisher" badge on game pages where the publisher actively maintains content | [ ] |
| 11.8 | Publisher analytics | Publishers see view counts, library-adds, and request volume for their games | [ ] |
| 11.9 | RLS policies | Supabase Row Level Security ensuring publishers can only modify their own games | [ ] |

**Database changes:**
```sql
create table publishers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  website text,
  created_at timestamptz default now()
);

create table publisher_games (
  publisher_id uuid references publishers(id) on delete cascade,
  game_id uuid references games(id) on delete cascade,
  primary key (publisher_id, game_id)
);

create table publisher_members (
  id uuid primary key default gen_random_uuid(),
  publisher_id uuid references publishers(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null default 'editor',  -- 'editor' | 'admin'
  invited_by uuid references auth.users(id),
  created_at timestamptz default now(),
  unique(publisher_id, user_id)
);

create table publisher_invites (
  id uuid primary key default gen_random_uuid(),
  publisher_id uuid references publishers(id) on delete cascade,
  email text not null,
  token text unique not null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_by uuid references auth.users(id)
);
```

---

## Phase 12 — Maps, Presets & Metadata

**Status:** Not started
**Depends on:** Phase 3 (JSONB conditions column), Phase 4 (game modes)

**Goal:** Round out the data model with board/map variants, difficulty presets, edition
support, teardown steps, and estimated setup time.

| # | Feature | Description | Status |
|---|---------|-------------|--------|
| 12.1 | Board/map variants | New `game_maps` table for games with selectable maps or board configurations. Steps can be conditioned on map choice | [ ] |
| 12.2 | Difficulty / length presets | New `game_presets` table: "Beginner setup", "Short game", "Hard difficulty". Each preset auto-selects modes, modules, and maps | [ ] |
| 12.3 | Component editions | Add optional `edition` field to games for games with different component sets across editions (1st ed, 2nd ed, KS, deluxe) | [ ] |
| 12.4 | Teardown/pack-up steps | Support `phase: 'teardown'` steps that render in a separate "Pack Up" section at the bottom of the setup page | [ ] |
| 12.5 | Estimated setup time | Per-game estimated setup duration (in minutes), adjustable by player count and complexity selections | [ ] |

**Database changes:**
```sql
create table game_maps (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references games(id) on delete cascade,
  name text not null,
  description text,
  image_url text,
  min_players int,
  max_players int,
  sort_order int default 0
);

create table game_presets (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references games(id) on delete cascade,
  name text not null,                    -- "Beginner Setup", "Short Game"
  description text,
  auto_mode_id uuid references game_modes(id),
  auto_modules text[],
  auto_map_id uuid references game_maps(id),
  sort_order int default 0
);

create trigger trg_map_delete_cleanup
  after delete on game_maps for each row
  execute function cleanup_step_conditions();

alter table games add column edition text;
alter table games add column estimated_setup_minutes int;
```

---

## Phase 13 — Play Tracking & Stats

**Status:** Not started
**Depends on:** Phase 5 (user library)

**Goal:** Turn BoardGameSetup into a personal gaming journal with rich statistics.
Uses a hybrid approach — manual logging with optional in-app session timer.

| # | Feature | Description | Status |
|---|---------|-------------|--------|
| 13.1 | Log a play | Form to record: game, date, players (names/accounts), duration, winner(s), scores | [ ] |
| 13.2 | Play history | Chronological list of all logged plays with filters (by game, date range, player) | [ ] |
| 13.3 | Session timer | Optional in-app timer users can start/stop during a game session (hybrid approach) | [ ] |
| 13.4 | Player profiles | Named players (linked to accounts or just names) for tracking across sessions | [ ] |
| 13.5 | Game stats dashboard | Per-game stats: total plays, avg duration, win rates per player, score trends | [ ] |
| 13.6 | Yearly overview | Annual summary: most played games, total play time, games discovered, win streaks | [ ] |
| 13.7 | Global stats page | Personal `/stats` page with aggregate data, charts, and highlights | [ ] |
| 13.8 | Score calculator | Game-specific scoring helpers where final scoring is complex (e.g., Terraforming Mars, Wingspan) | [ ] |
| 13.9 | Play groups | Create named groups of players for regular game nights; group-level stats | [ ] |

**Database changes:**
```sql
create table play_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  game_id uuid references games(id),
  played_at timestamptz default now(),
  duration_minutes int,
  notes text,
  created_at timestamptz default now()
);

create table play_session_players (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references play_sessions(id) on delete cascade,
  player_name text not null,
  linked_user_id uuid references auth.users(id),
  score numeric,
  is_winner boolean default false,
  placement int
);

create table play_groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);

create table play_group_members (
  group_id uuid references play_groups(id) on delete cascade,
  player_name text not null,
  linked_user_id uuid references auth.users(id),
  primary key (group_id, player_name)
);
```

---

## Phase 14 — In-Game Helper Tools

**Status:** Not started
**Depends on:** Phase 5 (user accounts for saving preferences)

**Goal:** Provide useful utilities that players reach for during gameplay.

| # | Feature | Description | Status |
|---|---------|-------------|--------|
| 14.1 | Virtual dice roller | Configurable dice (d4, d6, d8, d10, d12, d20, custom) with roll animations | [ ] |
| 14.2 | Game timer / round timer | Customizable countdown and count-up timers for timed games or turn limits | [ ] |
| 14.3 | Turn order randomizer | Random player order generator with optional weighted/seeded modes | [ ] |
| 14.4 | Score pad | In-game score tracker with per-player columns, auto-totaling | [ ] |
| 14.5 | First player selector | Fun animated random selector for who goes first | [ ] |
| 14.6 | Life/resource counter | Increment/decrement counters for health, resources, currency (configurable per game) | [ ] |
| 14.7 | Game-specific tools | Custom tools tied to specific games (e.g., Catan resource tracker, Ticket to Ride route calculator) | [ ] |
| 14.8 | Tool launcher | Quick-access toolbar on game page linking to relevant tools for that game | [ ] |

---

## Technical Debt (Ongoing)

**Status:** Ongoing — address alongside any phase

| # | Item | Description | Status |
|---|------|-------------|--------|
| T.1 | Break up AdminApp.tsx | Split 91KB admin file into smaller feature modules | [ ] |
| T.2 | State management | Evaluate React Context vs. Zustand/Jotai as app complexity grows | [ ] |
| T.3 | API layer abstraction | Create a service layer between components and Supabase for testability | [ ] |
| T.4 | E2E testing | Add Playwright or Cypress tests for critical user flows | [ ] |
| T.5 | CI/CD pipeline | GitHub Actions for automated testing, building, and deployment | [ ] |
| T.6 | Error monitoring | Integrate Sentry or similar for production error tracking | [ ] |
| T.7 | Performance monitoring | Core Web Vitals tracking, bundle size monitoring | [ ] |
| T.8 | Accessibility audit | WCAG 2.1 AA compliance audit and fixes | [ ] |
| T.9 | Design system | Extract reusable components into a consistent design system / component library | [ ] |

---

## Updated Types (After Phases 3-12)

The `StepCondition` type maps directly to the JSONB `conditions` column — no
transformation needed:

```typescript
export type StepCondition = {
  // Existing (migrated from flat columns into JSONB in Phase 3)
  playerCounts?: number[];
  includeExpansions?: string[];
  excludeExpansions?: string[];
  includeModules?: string[];
  excludeModules?: string[];
  requireNoExpansions?: boolean;
  // Phase 4: Modes
  includeModes?: string[];
  excludeModes?: string[];
  // Phase 6: Roles
  includeRoles?: string[];
  excludeRoles?: string[];
  // Phase 10: Scenarios
  includeScenarios?: string[];
  excludeScenarios?: string[];
  // Phase 12: Maps
  includeMaps?: string[];
  excludeMaps?: string[];
};

// Step row after Phase 3 restructure
export type GameSetupStepRow = {
  step_order: number;
  text: string;
  visual_asset: string | null;
  visual_animation: string | null;
  conditions: StepCondition | null;      // ← replaces 6 individual columns
  step_type: string;                     // 'standard' | 'per_player' | 'optional' | ...
  parent_step_id: string | null;
  phase: string;                         // 'board_setup' | 'player_setup' | ...
  parallel_group: string | null;
  template_variables: Record<string, unknown> | null;
};
```

**What this simplifies in GameSetupPage:**

```typescript
// BEFORE: 30 lines of mapping individual columns → StepCondition
const when: StepCondition = {};
if (step.player_counts?.length) when.playerCounts = step.player_counts;
if (step.include_expansions?.length) when.includeExpansions = step.include_expansions;
// ... 6 more fields, each with a null check

// AFTER: direct read from JSONB
const when: StepCondition = step.conditions ?? {};
```

---

## How to Use This Roadmap

- **Status tracking:** Replace `[ ]` with `[x]` as items are completed, update phase
  status in the Execution Order table
- **Phase order:** Phases are numbered by execution order — dependencies are explicit
- **Overlap:** Some phases can run in parallel (noted in "Can overlap with")
- **Tech debt:** Address alongside any phase as needed
- **Feature branches:** Each numbered item (e.g., 3.1, 5.4) can map to a GitHub issue
  and feature branch

---

*Last updated: 2026-01-31*
