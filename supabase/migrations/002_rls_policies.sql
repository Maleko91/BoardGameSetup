-- Phase 2.1 & 2.2: Row Level Security policies
-- Enforces authorization at the database level so that
-- even direct API calls respect access rules.

-- ============================================================
-- Enable RLS on every table
-- ============================================================
alter table games enable row level security;
alter table expansions enable row level security;
alter table steps enable row level security;
alter table expansion_modules enable row level security;
alter table users enable row level security;

-- ============================================================
-- Helper: check whether the current user is an admin
-- ============================================================
-- Using a function avoids repeating the sub-select in every policy
-- and makes it easy to change the admin-check logic later.
create or replace function is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from users where id = auth.uid() and is_admin = true
  );
$$;

-- ============================================================
-- games
-- ============================================================
drop policy if exists "Public read games" on games;
drop policy if exists "Admin insert games" on games;
drop policy if exists "Admin update games" on games;
drop policy if exists "Admin delete games" on games;

create policy "Public read games"
  on games for select
  using (true);

create policy "Admin insert games"
  on games for insert
  with check (is_admin());

create policy "Admin update games"
  on games for update
  using (is_admin());

create policy "Admin delete games"
  on games for delete
  using (is_admin());

-- ============================================================
-- expansions
-- ============================================================
drop policy if exists "Public read expansions" on expansions;
drop policy if exists "Admin insert expansions" on expansions;
drop policy if exists "Admin update expansions" on expansions;
drop policy if exists "Admin delete expansions" on expansions;

create policy "Public read expansions"
  on expansions for select
  using (true);

create policy "Admin insert expansions"
  on expansions for insert
  with check (is_admin());

create policy "Admin update expansions"
  on expansions for update
  using (is_admin());

create policy "Admin delete expansions"
  on expansions for delete
  using (is_admin());

-- ============================================================
-- steps
-- ============================================================
drop policy if exists "Public read steps" on steps;
drop policy if exists "Admin insert steps" on steps;
drop policy if exists "Admin update steps" on steps;
drop policy if exists "Admin delete steps" on steps;

create policy "Public read steps"
  on steps for select
  using (true);

create policy "Admin insert steps"
  on steps for insert
  with check (is_admin());

create policy "Admin update steps"
  on steps for update
  using (is_admin());

create policy "Admin delete steps"
  on steps for delete
  using (is_admin());

-- ============================================================
-- expansion_modules
-- ============================================================
drop policy if exists "Public read modules" on expansion_modules;
drop policy if exists "Admin insert modules" on expansion_modules;
drop policy if exists "Admin update modules" on expansion_modules;
drop policy if exists "Admin delete modules" on expansion_modules;

create policy "Public read modules"
  on expansion_modules for select
  using (true);

create policy "Admin insert modules"
  on expansion_modules for insert
  with check (is_admin());

create policy "Admin update modules"
  on expansion_modules for update
  using (is_admin());

create policy "Admin delete modules"
  on expansion_modules for delete
  using (is_admin());

-- ============================================================
-- users
-- ============================================================
-- Everyone can read their own profile row
drop policy if exists "Users read own profile" on users;
drop policy if exists "Users update own profile" on users;
drop policy if exists "Admin manage users" on users;
drop policy if exists "Users insert own profile" on users;

create policy "Users read own profile"
  on users for select
  using (id = auth.uid() or is_admin());

-- Users can update their own profile, but cannot promote themselves
create policy "Users update own profile"
  on users for update
  using (id = auth.uid())
  with check (id = auth.uid() and is_admin = (select u.is_admin from users u where u.id = auth.uid()));

-- Admins can manage all user rows (promote/demote, delete, etc.)
create policy "Admin manage users"
  on users for all
  using (is_admin());

-- Allow new user rows to be inserted during signup
-- (the signup trigger runs as service role, but if using client-side
-- insert we need this policy)
create policy "Users insert own profile"
  on users for insert
  with check (id = auth.uid());
