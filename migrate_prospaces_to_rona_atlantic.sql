-- Migration Script: Move all ProSpaces tenant data and references to rona_atlantic tenant safely

BEGIN;

-- 1. Ensure rona_atlantic tenant exists in tenants table
INSERT INTO tenants (id, name, code, description, "logoBadge", "regionalFocus", "primaryColor")
VALUES (
  'rona_atlantic',
  'RONA Atlantic Logistics',
  'RONA',
  'Corporate logistics tracking for RONA distributor and dealer stores in Atlantic Canada.',
  '🏢',
  'Atlantic Canada (Dartmouth, Tantallon, Halifax, PEI)',
  'blue'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  description = EXCLUDED.description;

-- 2. Migrate users from prospaces (and dev/prod variants) to rona_atlantic
DO $$
BEGIN
  IF to_regclass('public.users') IS NOT NULL THEN
    UPDATE users
    SET 
      "tenantId" = 'rona_atlantic',
      email = REPLACE(email, '@prospaces.com', '@ronaatlantic.ca')
    WHERE "tenantId" IN ('prospaces', 'prospaces-dev', 'prospaces-prod', 'agfydicwfv8u0rqr5apc');

    UPDATE users
    SET email = REPLACE(email, '@prospaces.com', '@ronaatlantic.ca')
    WHERE email ILIKE '%@prospaces.com%';
  END IF;
END $$;

-- 3. Migrate branches to rona_atlantic
DO $$
BEGIN
  IF to_regclass('public.branches') IS NOT NULL THEN
    UPDATE branches
    SET 
      "tenantId" = 'rona_atlantic',
      name = REPLACE(name, 'ProSpaces - ', 'RONA - ')
    WHERE "tenantId" IN ('prospaces', 'prospaces-dev', 'prospaces-prod', 'agfydicwfv8u0rqr5apc');
  END IF;
END $$;

-- 4. Migrate trucks to rona_atlantic
DO $$
BEGIN
  IF to_regclass('public.trucks') IS NOT NULL THEN
    UPDATE trucks
    SET "tenantId" = 'rona_atlantic'
    WHERE "tenantId" IN ('prospaces', 'prospaces-dev', 'prospaces-prod', 'agfydicwfv8u0rqr5apc');
  END IF;
END $$;

-- 5. Migrate deliveries to rona_atlantic
DO $$
BEGIN
  IF to_regclass('public.deliveries') IS NOT NULL THEN
    UPDATE deliveries
    SET "tenantId" = 'rona_atlantic'
    WHERE "tenantId" IN ('prospaces', 'prospaces-dev', 'prospaces-prod', 'agfydicwfv8u0rqr5apc');
  END IF;
END $$;

-- 6. Safely migrate optional GPS tracking and setup tables if they exist
DO $$
BEGIN
  IF to_regclass('public.gps_units_setup') IS NOT NULL THEN
    EXECUTE 'UPDATE gps_units_setup SET "tenantId" = ''rona_atlantic'' WHERE "tenantId" IN (''prospaces'', ''prospaces-dev'', ''prospaces-prod'', ''agfydicwfv8u0rqr5apc'')';
  END IF;

  IF to_regclass('public.gps_unit_setup') IS NOT NULL THEN
    EXECUTE 'UPDATE gps_unit_setup SET "tenantId" = ''rona_atlantic'' WHERE "tenantId" IN (''prospaces'', ''prospaces-dev'', ''prospaces-prod'', ''agfydicwfv8u0rqr5apc'')';
  END IF;

  IF to_regclass('public.gps_tracking_history') IS NOT NULL THEN
    EXECUTE 'UPDATE gps_tracking_history SET "tenantId" = ''rona_atlantic'' WHERE "tenantId" IN (''prospaces'', ''prospaces-dev'', ''prospaces-prod'', ''agfydicwfv8u0rqr5apc'')';
  END IF;
END $$;

-- 7. Delete old prospaces tenant row so no orphan prospaces tenant remains
DELETE FROM tenants WHERE id IN ('prospaces', 'prospaces-dev', 'prospaces-prod', 'agfydicwfv8u0rqr5apc');

COMMIT;
