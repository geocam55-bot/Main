-- Comprehensive Row Level Security (RLS) Configuration for ProSpaces CRM
-- Ensures RLS is enabled on all tables in public schema with appropriate policies

-- 1. Enable RLS on all tables in public schema
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
  END LOOP;
END $$;

-- 2. Contacts Policies
DROP POLICY IF EXISTS "Allow read on contacts" ON public.contacts;
DROP POLICY IF EXISTS "Allow all for authenticated on contacts" ON public.contacts;
DROP POLICY IF EXISTS "org_select_contacts" ON public.contacts;
DROP POLICY IF EXISTS "org_insert_contacts" ON public.contacts;
DROP POLICY IF EXISTS "org_update_contacts" ON public.contacts;
DROP POLICY IF EXISTS "org_delete_contacts" ON public.contacts;

CREATE POLICY "org_select_contacts" ON public.contacts
  FOR SELECT
  TO public
  USING (
    auth.role() = 'authenticated' OR 
    organization_id = get_current_user_org() OR 
    get_current_user_role() = 'super_admin' OR
    auth.uid() IS NULL
  );

CREATE POLICY "org_insert_contacts" ON public.contacts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = get_current_user_org() OR 
    get_current_user_role() IN ('admin', 'super_admin') OR
    get_current_user_org() IS NULL
  );

CREATE POLICY "org_update_contacts" ON public.contacts
  FOR UPDATE
  TO authenticated
  USING (
    organization_id = get_current_user_org() OR 
    get_current_user_role() IN ('admin', 'super_admin') OR
    owner_id = auth.uid()
  )
  WITH CHECK (
    organization_id = get_current_user_org() OR 
    get_current_user_role() IN ('admin', 'super_admin') OR
    owner_id = auth.uid()
  );

CREATE POLICY "org_delete_contacts" ON public.contacts
  FOR DELETE
  TO authenticated
  USING (
    organization_id = get_current_user_org() OR 
    get_current_user_role() IN ('admin', 'super_admin')
  );

-- 3. Inventory Policies
DROP POLICY IF EXISTS "Allow read on inventory" ON public.inventory;
DROP POLICY IF EXISTS "Allow all for authenticated on inventory" ON public.inventory;
DROP POLICY IF EXISTS "org_select_inventory" ON public.inventory;
DROP POLICY IF EXISTS "org_insert_inventory" ON public.inventory;
DROP POLICY IF EXISTS "org_update_inventory" ON public.inventory;
DROP POLICY IF EXISTS "org_delete_inventory" ON public.inventory;

CREATE POLICY "org_select_inventory" ON public.inventory
  FOR SELECT
  TO public
  USING (
    auth.role() = 'authenticated' OR 
    organization_id = get_current_user_org() OR 
    get_current_user_role() = 'super_admin' OR
    auth.uid() IS NULL
  );

CREATE POLICY "org_insert_inventory" ON public.inventory
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = get_current_user_org() OR 
    get_current_user_role() IN ('admin', 'super_admin') OR
    get_current_user_org() IS NULL
  );

CREATE POLICY "org_update_inventory" ON public.inventory
  FOR UPDATE
  TO authenticated
  USING (
    organization_id = get_current_user_org() OR 
    get_current_user_role() IN ('admin', 'super_admin')
  )
  WITH CHECK (
    organization_id = get_current_user_org() OR 
    get_current_user_role() IN ('admin', 'super_admin')
  );

CREATE POLICY "org_delete_inventory" ON public.inventory
  FOR DELETE
  TO authenticated
  USING (
    organization_id = get_current_user_org() OR 
    get_current_user_role() IN ('admin', 'super_admin')
  );

-- 4. Key-Value Store
DROP POLICY IF EXISTS "Allow access to kv_store_8405be07" ON public.kv_store_8405be07;
CREATE POLICY "Allow access to kv_store_8405be07" ON public.kv_store_8405be07
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- 5. GPS Units and Tracking
DROP POLICY IF EXISTS "Allow public on gps_unit_setup" ON public.gps_unit_setup;
CREATE POLICY "Allow public on gps_unit_setup" ON public.gps_unit_setup
  FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public on gps_units_setup" ON public.gps_units_setup;
CREATE POLICY "Allow public on gps_units_setup" ON public.gps_units_setup
  FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public on gps_tracking_history" ON public.gps_tracking_history;
CREATE POLICY "Allow public on gps_tracking_history" ON public.gps_tracking_history
  FOR ALL TO public USING (true) WITH CHECK (true);

-- 6. Auxiliary configuration tables
DROP POLICY IF EXISTS "Allow read on organization_settings" ON public.organization_settings;
DROP POLICY IF EXISTS "Allow write on organization_settings" ON public.organization_settings;
CREATE POLICY "Allow read on organization_settings" ON public.organization_settings
  FOR SELECT TO public USING (true);
CREATE POLICY "Allow write on organization_settings" ON public.organization_settings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow read on project_wizard_defaults" ON public.project_wizard_defaults;
DROP POLICY IF EXISTS "Allow write on project_wizard_defaults" ON public.project_wizard_defaults;
CREATE POLICY "Allow read on project_wizard_defaults" ON public.project_wizard_defaults
  FOR SELECT TO public USING (true);
CREATE POLICY "Allow write on project_wizard_defaults" ON public.project_wizard_defaults
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow read on referrals" ON public.referrals;
DROP POLICY IF EXISTS "Allow write on referrals" ON public.referrals;
CREATE POLICY "Allow read on referrals" ON public.referrals
  FOR SELECT TO public USING (true);
CREATE POLICY "Allow write on referrals" ON public.referrals
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow read on slot_closure_rules" ON public.slot_closure_rules;
DROP POLICY IF EXISTS "Allow write on slot_closure_rules" ON public.slot_closure_rules;
CREATE POLICY "Allow read on slot_closure_rules" ON public.slot_closure_rules
  FOR SELECT TO public USING (true);
CREATE POLICY "Allow write on slot_closure_rules" ON public.slot_closure_rules
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow read on store_delivery_configs" ON public.store_delivery_configs;
DROP POLICY IF EXISTS "Allow write on store_delivery_configs" ON public.store_delivery_configs;
CREATE POLICY "Allow read on store_delivery_configs" ON public.store_delivery_configs
  FOR SELECT TO public USING (true);
CREATE POLICY "Allow write on store_delivery_configs" ON public.store_delivery_configs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow read on truck_shift_closures" ON public.truck_shift_closures;
DROP POLICY IF EXISTS "Allow write on truck_shift_closures" ON public.truck_shift_closures;
CREATE POLICY "Allow read on truck_shift_closures" ON public.truck_shift_closures
  FOR SELECT TO public USING (true);
CREATE POLICY "Allow write on truck_shift_closures" ON public.truck_shift_closures
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
