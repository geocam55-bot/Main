-- ProSpaces: Fix stubborn Deck > Treated > Beams default that does not persist
--
-- HOW TO USE:
-- 1) Replace the values in the params CTE:
--    - org_id: your organization UUID
--    - desired_inventory_item_id: inventory.id you want as default for Beams
-- 2) Run this script in Supabase SQL Editor.
-- 3) Re-open Project Wizard Settings and verify Deck > Treated > Beams.
--
-- This script is safe and scoped:
-- - Backs up affected rows to a temp table
-- - Deletes only rows matching normalized key (org + deck + treated + beams)
-- - Inserts one canonical row
-- - Shows before/after diagnostics

begin;

-- === Parameters ===
with params as (
  select
    '00000000-0000-0000-0000-000000000000'::text as org_id,
    '00000000-0000-0000-0000-000000000000'::uuid as desired_inventory_item_id,
    'deck'::text as planner_type,
    'treated'::text as material_type,
    'beams'::text as material_category
)

-- Preview rows that currently collide with this logical key.
select
  p.id,
  p.organization_id,
  p.planner_type,
  coalesce(p.material_type, 'default') as material_type,
  p.material_category,
  p.inventory_item_id,
  p.updated_at,
  p.created_at
from project_wizard_defaults p
cross join params x
where p.organization_id = x.org_id
  and lower(p.planner_type) = lower(x.planner_type)
  and lower(coalesce(p.material_type, 'default')) = lower(x.material_type)
  and lower(p.material_category) = lower(x.material_category)
order by p.updated_at desc nulls last, p.created_at desc nulls last, p.id desc;

-- Backup affected rows for recovery within this SQL session.
drop table if exists _pws_fix_backup;

create temp table _pws_fix_backup as
with params as (
  select
    '00000000-0000-0000-0000-000000000000'::text as org_id,
    'deck'::text as planner_type,
    'treated'::text as material_type,
    'beams'::text as material_category
)
select p.*
from project_wizard_defaults p
cross join params x
where p.organization_id = x.org_id
  and lower(p.planner_type) = lower(x.planner_type)
  and lower(coalesce(p.material_type, 'default')) = lower(x.material_type)
  and lower(p.material_category) = lower(x.material_category);

-- Remove all variants of this logical key (case/null normalized).
with params as (
  select
    '00000000-0000-0000-0000-000000000000'::text as org_id,
    'deck'::text as planner_type,
    'treated'::text as material_type,
    'beams'::text as material_category
)
delete from project_wizard_defaults p
using params x
where p.organization_id = x.org_id
  and lower(p.planner_type) = lower(x.planner_type)
  and lower(coalesce(p.material_type, 'default')) = lower(x.material_type)
  and lower(p.material_category) = lower(x.material_category);

-- Insert one canonical row for this key.
with params as (
  select
    '00000000-0000-0000-0000-000000000000'::text as org_id,
    '00000000-0000-0000-0000-000000000000'::uuid as desired_inventory_item_id,
    'deck'::text as planner_type,
    'treated'::text as material_type,
    'Beams'::text as canonical_material_category
)
insert into project_wizard_defaults (
  organization_id,
  planner_type,
  material_type,
  material_category,
  inventory_item_id,
  updated_at
)
select
  x.org_id,
  x.planner_type,
  x.material_type,
  x.canonical_material_category,
  x.desired_inventory_item_id,
  now()
from params x;

commit;

-- Verify final persisted row for this key.
with params as (
  select
    '00000000-0000-0000-0000-000000000000'::text as org_id,
    'deck'::text as planner_type,
    'treated'::text as material_type,
    'beams'::text as material_category
)
select
  p.id,
  p.organization_id,
  p.planner_type,
  coalesce(p.material_type, 'default') as material_type,
  p.material_category,
  p.inventory_item_id,
  p.updated_at,
  p.created_at
from project_wizard_defaults p
cross join params x
where p.organization_id = x.org_id
  and lower(p.planner_type) = lower(x.planner_type)
  and lower(coalesce(p.material_type, 'default')) = lower(x.material_type)
  and lower(p.material_category) = lower(x.material_category)
order by p.updated_at desc nulls last, p.created_at desc nulls last, p.id desc;

-- Optional: if you need to restore rows from backup in this session:
-- insert into project_wizard_defaults
-- select * from _pws_fix_backup;
