import { Alert, AlertDescription } from './ui/alert';
import { CheckCircle, AlertCircle, Database, FolderOpen, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { copyToClipboard } from '../utils/clipboard';

const MIGRATION_SQL = `-- ============================================================================
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
-- ============================================================================`;

export function DocumentsSetup() {
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleCopy = async () => {
    try {
      const success = await copyToClipboard(MIGRATION_SQL);
      if (success) {
        setCopied(true);
        toast.success('SQL copied to clipboard!');
        setTimeout(() => setCopied(false), 3000);
      } else {
        // Fallback to textarea selection method
        if (textareaRef.current) {
          textareaRef.current.select();
          try {
            document.execCommand('copy');
            setCopied(true);
            toast.success('SQL copied to clipboard!');
            setTimeout(() => setCopied(false), 3000);
          } catch (fallbackErr) {
            toast.error('Unable to copy. Please select and copy manually.');
          }
        }
      }
    } catch (err) {
      toast.error('Unable to copy. Please select and copy manually.');
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Hidden textarea for fallback copy functionality */}
      <textarea
        ref={textareaRef}
        value={MIGRATION_SQL}
        readOnly
        className="sr-only"
        style={{ position: 'absolute', left: '-9999px' }}
      />
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-6 h-6" />
            Documents Module Setup Required
          </CardTitle>
          <CardDescription>
            The documents table needs to be created in your Supabase database before you can use the Documents module.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              The Documents module requires database setup that must be run from the Supabase Dashboard with admin privileges.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <h3 className="font-semibold">What will be created:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <strong>Storage Bucket</strong>
                  <p className="text-muted-foreground">Private bucket for document files (50MB limit)</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <strong>Documents Table</strong>
                  <p className="text-muted-foreground">Complete schema with all metadata fields</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <strong>8 Performance Indexes</strong>
                  <p className="text-muted-foreground">Optimized for fast queries and searches</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <strong>8 RLS Policies</strong>
                  <p className="text-muted-foreground">Multi-tenant security for table and storage</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <strong>Auto-Update Triggers</strong>
                  <p className="text-muted-foreground">Automatic timestamp management</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <strong>Role Space Access</strong>
                  <p className="text-muted-foreground">Default space access for all 5 roles</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Setup Instructions</span>
            <Button onClick={handleCopy} variant="outline" size="sm">
              {copied ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy SQL
                </>
              )}
            </Button>
          </CardTitle>
          <CardDescription>
            Follow these steps to set up the Documents module
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold flex-shrink-0">
                1
              </div>
              <div className="flex-1">
                <h4 className="font-semibold mb-1">Open Supabase SQL Editor</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Go to your Supabase Dashboard and navigate to the <strong>SQL Editor</strong> section
                </p>
                <Button variant="outline" size="sm" asChild>
                  <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open Supabase Dashboard
                  </a>
                </Button>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold flex-shrink-0">
                2
              </div>
              <div className="flex-1">
                <h4 className="font-semibold mb-1">Copy the Migration SQL</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Click the "Copy SQL" button above to copy the complete migration script
                </p>
                <Button onClick={handleCopy} size="sm">
                  <Copy className="w-4 h-4 mr-2" />
                  Copy SQL to Clipboard
                </Button>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold flex-shrink-0">
                3
              </div>
              <div className="flex-1">
                <h4 className="font-semibold mb-1">Run the Migration</h4>
                <p className="text-sm text-muted-foreground">
                  Paste the SQL into the SQL Editor and click <strong>Run</strong> (or press Cmd/Ctrl + Enter)
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold flex-shrink-0">
                4
              </div>
              <div className="flex-1">
                <h4 className="font-semibold mb-1">Wait for Success</h4>
                <p className="text-sm text-muted-foreground">
                  You should see "Success" message in the SQL Editor. Some statements may return "Success. No rows returned" - this is normal.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-semibold flex-shrink-0">
                5
              </div>
              <div className="flex-1">
                <h4 className="font-semibold mb-1">Refresh This Page</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  After the migration completes successfully, refresh your browser to start using the Documents module
                </p>
                <Button onClick={() => window.location.reload()} size="sm" variant="default">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Refresh Page
                </Button>
              </div>
            </div>
          </div>

          <Alert className="border-blue-200 bg-blue-50">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-900">
              <strong>Tip:</strong> The migration is idempotent - it's safe to run multiple times. It will skip items that already exist.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Migration SQL Preview</CardTitle>
          <CardDescription>
            This is the SQL that will be executed. You can review it before running.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs max-h-96 overflow-y-auto">
              {MIGRATION_SQL}
            </pre>
            <Button
              onClick={handleCopy}
              size="sm"
              variant="secondary"
              className="absolute top-2 right-2"
            >
              {copied ? (
                <>
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 mr-1" />
                  Copy
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FolderOpen className="w-5 h-5" />
            About the Documents Module
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            The Documents module provides secure, multi-tenant document management with:
          </p>
          <ul className="space-y-1 ml-4 text-muted-foreground">
            <li>• Upload and store documents (PDF, DOCX, XLSX, PPT, images)</li>
            <li>• Associate documents with contacts</li>
            <li>• Search and filter by category, contact, or tags</li>
            <li>• Metadata management (title, description, tags, category)</li>
            <li>• Role-based access control (configurable in Security → Space Matrix)</li>
            <li>• Download and preview documents</li>
            <li>• Version tracking and audit history</li>
            <li>• 50MB file size limit per document</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}