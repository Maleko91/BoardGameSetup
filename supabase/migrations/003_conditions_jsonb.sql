-- Phase 3.1: Add conditions JSONB column
-- Phase 3.2: Migrate existing data from flat columns
-- Phase 3.3: Add cleanup trigger for orphaned condition IDs
-- Phase 3.8: Add step metadata columns

-- ============================================================
-- 3.1  Add JSONB column
-- ============================================================
alter table steps add column conditions jsonb default '{}';

-- ============================================================
-- 3.8  Add step metadata columns
-- ============================================================
alter table steps add column step_type text default 'standard';
alter table steps add column parent_step_id uuid references steps(id) on delete cascade;
alter table steps add column phase text default 'board_setup';
alter table steps add column parallel_group text;

-- ============================================================
-- 3.2  Migrate existing condition data into JSONB
-- ============================================================
-- First pass: build the JSONB object from existing columns
update steps set conditions = jsonb_strip_nulls(jsonb_build_object(
  'playerCounts',       to_jsonb(coalesce(player_counts, '{}'::int[])),
  'includeExpansions',  to_jsonb(coalesce(include_expansions, '{}'::text[])),
  'excludeExpansions',  to_jsonb(coalesce(exclude_expansions, '{}'::text[])),
  'includeModules',     to_jsonb(coalesce(include_modules, '{}'::text[])),
  'excludeModules',     to_jsonb(coalesce(exclude_modules, '{}'::text[])),
  'requireNoExpansions', coalesce(require_no_expansions, false)
));

-- Second pass: remove empty arrays and false booleans to keep JSONB clean
update steps set conditions = (
  select coalesce(
    jsonb_object_agg(key, value),
    '{}'::jsonb
  )
  from jsonb_each(conditions)
  where value != '[]'::jsonb and value != 'false'::jsonb
)
where conditions != '{}'::jsonb;

-- ============================================================
-- GIN index for potential future server-side filtering
-- ============================================================
create index idx_steps_conditions on steps using gin (conditions);

-- ============================================================
-- 3.3  Cleanup trigger — removes orphaned IDs from conditions
--      when an expansion or module is deleted
-- ============================================================
create or replace function cleanup_step_conditions()
returns trigger as $$
begin
  update steps
  set conditions = (
    select coalesce(
      jsonb_object_agg(
        key,
        case
          when jsonb_typeof(value) = 'array'
          then (select coalesce(jsonb_agg(elem), '[]'::jsonb)
                from jsonb_array_elements(value) as elem
                where elem::text != to_jsonb(OLD.id::text)::text)
          else value
        end
      ),
      '{}'::jsonb
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

-- ============================================================
-- 3.7  Drop legacy columns (after verification)
-- ============================================================
alter table steps drop column player_counts;
alter table steps drop column include_expansions;
alter table steps drop column exclude_expansions;
alter table steps drop column include_modules;
alter table steps drop column exclude_modules;
alter table steps drop column require_no_expansions;
