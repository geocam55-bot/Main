-- ============================================================================
-- DOCUMENTS MODULE - COMPLETE DATABASE SETUP
-- ============================================================================
-- This migration creates the documents table, storage bucket, and permissions
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- =============================================
-- 1. CREATE STORAGE BUCKET
-- =============================================

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  52428800, -- 50MB
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- 2. CREATE STORAGE POLICIES
-- =============================================

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view files in their organization" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload files to their organization" ON storage.objects;
DROP POLICY IF EXISTS "Users can update files in their organization" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete files in their organization" ON storage.objects;

-- Policy: Authenticated users can view files in documents bucket
CREATE POLICY "Users can view files in their organization"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'documents');

-- Policy: Authenticated users can upload files to documents bucket
CREATE POLICY "Users can upload files to their organization"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

-- Policy: Authenticated users can update files in documents bucket
CREATE POLICY "Users can update files in their organization"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'documents');

-- Policy: Authenticated users can delete files in documents bucket
CREATE POLICY "Users can delete files in their organization"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'documents');

-- =============================================
-- 3. CREATE DOCUMENTS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- File Information
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_path TEXT NOT NULL UNIQUE,
  
  -- Document Metadata
  title TEXT,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  category TEXT,
  
  -- Associations
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  contact_name TEXT,
  
  -- Versioning
  version INTEGER DEFAULT 1,
  is_latest_version BOOLEAN DEFAULT true,
  parent_document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
  
  -- Audit Fields
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  uploaded_by_name TEXT,
  organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 4. CREATE INDEXES
-- =============================================

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_documents_organization_id ON public.documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_documents_contact_id ON public.documents(contact_id);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON public.documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON public.documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_category ON public.documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_parent_id ON public.documents(parent_document_id);
CREATE INDEX IF NOT EXISTS idx_documents_file_path ON public.documents(file_path);

-- Tag search index
CREATE INDEX IF NOT EXISTS idx_documents_tags ON public.documents USING gin(tags);

-- =============================================
-- 5. ENABLE ROW LEVEL SECURITY
-- =============================================

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 6. CREATE RLS POLICIES FOR DOCUMENTS TABLE
-- =============================================

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view documents in their organization" ON public.documents;
DROP POLICY IF EXISTS "Users can insert documents in their organization" ON public.documents;
DROP POLICY IF EXISTS "Users can update documents in their organization" ON public.documents;
DROP POLICY IF EXISTS "Users can delete documents in their organization" ON public.documents;

-- Policy: Authenticated users can view documents
CREATE POLICY "authenticated_users_read_documents"
ON public.documents
FOR SELECT
TO authenticated
USING (true);

-- Policy: Authenticated users can manage documents
CREATE POLICY "authenticated_users_manage_documents"
ON public.documents
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- =============================================
-- 7. CREATE TRIGGER FOR UPDATED_AT
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_documents_updated_at ON public.documents;
CREATE TRIGGER trigger_update_documents_updated_at
BEFORE UPDATE ON public.documents
FOR EACH ROW
EXECUTE FUNCTION update_documents_updated_at();

-- =============================================
-- 8. GRANT PERMISSIONS
-- =============================================

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;

-- =============================================
-- 9. INSERT DEFAULT PERMISSIONS FOR ALL ROLES
-- =============================================

-- Insert permissions for the documents module
INSERT INTO public.permissions (role, module, visible, add, change, delete)
VALUES
  ('super_admin', 'documents', true, true, true, true),
  ('admin', 'documents', true, true, true, true),
  ('manager', 'documents', true, true, true, false),
  ('marketing', 'documents', true, true, false, false),
  ('standard_user', 'documents', true, true, false, false)
ON CONFLICT (role, module) DO UPDATE SET
  visible = EXCLUDED.visible,
  add = EXCLUDED.add,
  change = EXCLUDED.change,
  delete = EXCLUDED.delete;

-- =============================================
-- 10. ADD COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON TABLE public.documents IS 'Stores document metadata and file references for the CRM';
COMMENT ON COLUMN public.documents.file_path IS 'Path to file in Supabase Storage';
COMMENT ON COLUMN public.documents.contact_id IS 'Optional association with a contact';
COMMENT ON COLUMN public.documents.version IS 'Document version number for versioning support';
COMMENT ON COLUMN public.documents.is_latest_version IS 'Flag to indicate if this is the latest version';
COMMENT ON COLUMN public.documents.parent_document_id IS 'Reference to original document for versioning';
COMMENT ON COLUMN public.documents.tags IS 'Array of tags for categorization and search';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- The Documents module is now ready to use!
-- Refresh your browser to see the changes.
-- ============================================================================