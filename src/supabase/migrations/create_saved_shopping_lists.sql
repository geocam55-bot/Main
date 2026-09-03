-- Create saved_shopping_lists table
CREATE TABLE IF NOT EXISTS public.saved_shopping_lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    organization_id TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    totals JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Enable RLS
ALTER TABLE public.saved_shopping_lists ENABLE ROW LEVEL SECURITY;

-- Create policy for users to see lists within their organization
CREATE POLICY "Users can view saved shopping lists in their organization"
    ON public.saved_shopping_lists
    FOR SELECT
    USING (organization_id = current_setting('request.jwt.claims', true)::json->>'org_id' OR organization_id = '34638283-7b3d-47e2-bec8-a9e600e28c4a');

-- Create policy for users to insert lists in their organization
CREATE POLICY "Users can create saved shopping lists in their organization"
    ON public.saved_shopping_lists
    FOR INSERT
    WITH CHECK (organization_id = current_setting('request.jwt.claims', true)::json->>'org_id' OR organization_id = '34638283-7b3d-47e2-bec8-a9e600e28c4a');

-- Create policy for users to update lists in their organization
CREATE POLICY "Users can update saved shopping lists in their organization"
    ON public.saved_shopping_lists
    FOR UPDATE
    USING (organization_id = current_setting('request.jwt.claims', true)::json->>'org_id' OR organization_id = '34638283-7b3d-47e2-bec8-a9e600e28c4a');

-- Create policy for users to delete lists in their organization
CREATE POLICY "Users can delete saved shopping lists in their organization"
    ON public.saved_shopping_lists
    FOR DELETE
    USING (organization_id = current_setting('request.jwt.claims', true)::json->>'org_id' OR organization_id = '34638283-7b3d-47e2-bec8-a9e600e28c4a');

-- Add index for organization_id for faster lookups
CREATE INDEX IF NOT EXISTS saved_shopping_lists_org_idx ON public.saved_shopping_lists(organization_id);
