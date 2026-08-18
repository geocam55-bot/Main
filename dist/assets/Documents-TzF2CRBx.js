import{j as e,C as ae,t as a,r as i,B as h,h as ie,l as ne,i as Me,k as ke,a1 as le,a0 as oe,a2 as re}from"./index-DQsIDAnN.js";import{I as x}from"./input-CDkEjJqI.js";import{D as ce,e as Xe,a as de,b as me,c as ue,d as he}from"./dialog-CUUclj60.js";import{L as c}from"./label-MTzEgsyb.js";import{T as pe}from"./textarea-Bdt8sav1.js";import{D as ze,a as Be,b as Ge,e as xe}from"./dropdown-menu-Bi8ayLpK.js";import{S as A,a as R,b as U,c as F,d as g}from"./select-BVJSMXDV.js";import{B as H}from"./badge-D8ddYGZr.js";import{P as Ye,a as He}from"./PermissionGate-DxR-AQX7.js";import{g as Qe,u as Ve,b as We,d as $e,a as Ke,c as qe}from"./documents-client-CmTUODA1.js";import{c as Ze}from"./api-CqaawAx8.js";import{A as ge,a as fe}from"./alert-CcUuLmPv.js";import{c as Je}from"./clipboard-DmeE4Bfy.js";import{D as et}from"./database-Cd2m70Km.js";import{C as p}from"./circle-check-big-CWZZCqSc.js";import{C as Q}from"./copy-pZS3CiZ1.js";import{E as tt}from"./external-link-C0pDkw6D.js";import{F as st}from"./folder-open-DrN4hqcI.js";import{I as at}from"./InteractiveModuleHelp-CoNYh_5Z.js";import{S as Ee}from"./search-BTaxMMGP.js";import{F as je}from"./funnel-DYr9AGjf.js";import{X as it}from"./x-BENs1vsw.js";import{P as nt}from"./plus-CwnyBrlQ.js";import{F as _}from"./file-text-C8bLFRK-.js";import{U as Ne}from"./upload-zPX9tByi.js";import{L as V}from"./loader-circle-B100HTwS.js";import{F as W}from"./file-D1IBtLrV.js";import{E as lt}from"./eye-XnaiSyKx.js";import{D as ot}from"./download-n-mlkpJ4.js";import{E as rt}from"./ellipsis-vertical-DvIPc8Fp.js";import{S as ct}from"./square-pen-DmzRrXJo.js";import{T as dt}from"./trash-2-BheQqkht.js";import"./index-Xk_uuuWD.js";import"./index-Bfeq6mPE.js";import"./chevron-up-CmxGn_3M.js";import"./lock-DKS3iboz.js";import"./marketing-client-Bf0jCEyk.js";import"./KnowledgeBase-zVb9RZ3J.js";import"./Logo-5GfnfKDR.js";import"./proxy-CLNaH4Ek.js";import"./user-check-BSTe3GOY.js";import"./sparkles-jaZdPhLg.js";import"./circle-question-mark-BzVl8BuO.js";import"./send-BLSQDZf_.js";import"./mail-DWCM3fy6.js";import"./video-UD-Wj8EM.js";const $=`-- ============================================================================
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
-- ============================================================================`;function mt(){const[n,r]=useState(!1),f=useRef(null),d=async()=>{try{if(await Je($))r(!0),a.success("SQL copied to clipboard!"),setTimeout(()=>r(!1),3e3);else if(f.current){f.current.select();try{document.execCommand("copy"),r(!0),a.success("SQL copied to clipboard!"),setTimeout(()=>r(!1),3e3)}catch{a.error("Unable to copy. Please select and copy manually.")}}}catch{a.error("Unable to copy. Please select and copy manually.")}};return e.jsxs("div",{className:"p-6 max-w-5xl mx-auto space-y-6",children:[e.jsx("textarea",{ref:f,value:$,readOnly:!0,className:"sr-only",style:{position:"absolute",left:"-9999px"}}),e.jsxs(Card,{children:[e.jsxs(CardHeader,{children:[e.jsxs(CardTitle,{className:"flex items-center gap-2",children:[e.jsx(et,{className:"w-6 h-6"}),"Documents Module Setup Required"]}),e.jsx(CardDescription,{children:"The documents table needs to be created in your Supabase database before you can use the Documents module."})]}),e.jsxs(CardContent,{className:"space-y-6",children:[e.jsxs(ge,{children:[e.jsx(ae,{className:"h-4 w-4"}),e.jsx(fe,{children:"The Documents module requires database setup that must be run from the Supabase Dashboard with admin privileges."})]}),e.jsxs("div",{className:"space-y-4",children:[e.jsx("h3",{className:"font-semibold",children:"What will be created:"}),e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-3",children:[e.jsxs("div",{className:"flex items-start gap-2",children:[e.jsx(p,{className:"w-4 h-4 text-green-600 mt-0.5 flex-shrink-0"}),e.jsxs("div",{className:"text-sm",children:[e.jsx("strong",{children:"Storage Bucket"}),e.jsx("p",{className:"text-muted-foreground",children:"Private bucket for document files (50MB limit)"})]})]}),e.jsxs("div",{className:"flex items-start gap-2",children:[e.jsx(p,{className:"w-4 h-4 text-green-600 mt-0.5 flex-shrink-0"}),e.jsxs("div",{className:"text-sm",children:[e.jsx("strong",{children:"Documents Table"}),e.jsx("p",{className:"text-muted-foreground",children:"Complete schema with all metadata fields"})]})]}),e.jsxs("div",{className:"flex items-start gap-2",children:[e.jsx(p,{className:"w-4 h-4 text-green-600 mt-0.5 flex-shrink-0"}),e.jsxs("div",{className:"text-sm",children:[e.jsx("strong",{children:"8 Performance Indexes"}),e.jsx("p",{className:"text-muted-foreground",children:"Optimized for fast queries and searches"})]})]}),e.jsxs("div",{className:"flex items-start gap-2",children:[e.jsx(p,{className:"w-4 h-4 text-green-600 mt-0.5 flex-shrink-0"}),e.jsxs("div",{className:"text-sm",children:[e.jsx("strong",{children:"8 RLS Policies"}),e.jsx("p",{className:"text-muted-foreground",children:"Multi-tenant security for table and storage"})]})]}),e.jsxs("div",{className:"flex items-start gap-2",children:[e.jsx(p,{className:"w-4 h-4 text-green-600 mt-0.5 flex-shrink-0"}),e.jsxs("div",{className:"text-sm",children:[e.jsx("strong",{children:"Auto-Update Triggers"}),e.jsx("p",{className:"text-muted-foreground",children:"Automatic timestamp management"})]})]}),e.jsxs("div",{className:"flex items-start gap-2",children:[e.jsx(p,{className:"w-4 h-4 text-green-600 mt-0.5 flex-shrink-0"}),e.jsxs("div",{className:"text-sm",children:[e.jsx("strong",{children:"Role Space Access"}),e.jsx("p",{className:"text-muted-foreground",children:"Default space access for all 5 roles"})]})]})]})]})]})]}),e.jsxs(Card,{children:[e.jsxs(CardHeader,{children:[e.jsxs(CardTitle,{className:"flex items-center justify-between",children:[e.jsx("span",{children:"Setup Instructions"}),e.jsx(Button,{onClick:d,variant:"outline",size:"sm",children:n?e.jsxs(e.Fragment,{children:[e.jsx(p,{className:"w-4 h-4 mr-2"}),"Copied!"]}):e.jsxs(e.Fragment,{children:[e.jsx(Q,{className:"w-4 h-4 mr-2"}),"Copy SQL"]})})]}),e.jsx(CardDescription,{children:"Follow these steps to set up the Documents module"})]}),e.jsxs(CardContent,{className:"space-y-6",children:[e.jsxs("div",{className:"space-y-4",children:[e.jsxs("div",{className:"flex items-start gap-3",children:[e.jsx("div",{className:"w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold flex-shrink-0",children:"1"}),e.jsxs("div",{className:"flex-1",children:[e.jsx("h4",{className:"font-semibold mb-1",children:"Open Supabase SQL Editor"}),e.jsxs("p",{className:"text-sm text-muted-foreground mb-2",children:["Go to your Supabase Dashboard and navigate to the ",e.jsx("strong",{children:"SQL Editor"})," section"]}),e.jsx(Button,{variant:"outline",size:"sm",asChild:!0,children:e.jsxs("a",{href:"https://supabase.com/dashboard",target:"_blank",rel:"noopener noreferrer",children:[e.jsx(tt,{className:"w-4 h-4 mr-2"}),"Open Supabase Dashboard"]})})]})]}),e.jsxs("div",{className:"flex items-start gap-3",children:[e.jsx("div",{className:"w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold flex-shrink-0",children:"2"}),e.jsxs("div",{className:"flex-1",children:[e.jsx("h4",{className:"font-semibold mb-1",children:"Copy the Migration SQL"}),e.jsx("p",{className:"text-sm text-muted-foreground mb-2",children:'Click the "Copy SQL" button above to copy the complete migration script'}),e.jsxs(Button,{onClick:d,size:"sm",children:[e.jsx(Q,{className:"w-4 h-4 mr-2"}),"Copy SQL to Clipboard"]})]})]}),e.jsxs("div",{className:"flex items-start gap-3",children:[e.jsx("div",{className:"w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold flex-shrink-0",children:"3"}),e.jsxs("div",{className:"flex-1",children:[e.jsx("h4",{className:"font-semibold mb-1",children:"Run the Migration"}),e.jsxs("p",{className:"text-sm text-muted-foreground",children:["Paste the SQL into the SQL Editor and click ",e.jsx("strong",{children:"Run"})," (or press Cmd/Ctrl + Enter)"]})]})]}),e.jsxs("div",{className:"flex items-start gap-3",children:[e.jsx("div",{className:"w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold flex-shrink-0",children:"4"}),e.jsxs("div",{className:"flex-1",children:[e.jsx("h4",{className:"font-semibold mb-1",children:"Wait for Success"}),e.jsx("p",{className:"text-sm text-muted-foreground",children:'You should see "Success" message in the SQL Editor. Some statements may return "Success. No rows returned" - this is normal.'})]})]}),e.jsxs("div",{className:"flex items-start gap-3",children:[e.jsx("div",{className:"w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-semibold flex-shrink-0",children:"5"}),e.jsxs("div",{className:"flex-1",children:[e.jsx("h4",{className:"font-semibold mb-1",children:"Refresh This Page"}),e.jsx("p",{className:"text-sm text-muted-foreground mb-2",children:"After the migration completes successfully, refresh your browser to start using the Documents module"}),e.jsxs(Button,{onClick:()=>window.location.reload(),size:"sm",variant:"default",children:[e.jsx(p,{className:"w-4 h-4 mr-2"}),"Refresh Page"]})]})]})]}),e.jsxs(ge,{className:"border-blue-200 bg-blue-50",children:[e.jsx(ae,{className:"h-4 w-4 text-blue-600"}),e.jsxs(fe,{className:"text-blue-900",children:[e.jsx("strong",{children:"Tip:"})," The migration is idempotent - it's safe to run multiple times. It will skip items that already exist."]})]})]})]}),e.jsxs(Card,{children:[e.jsxs(CardHeader,{children:[e.jsx(CardTitle,{children:"Migration SQL Preview"}),e.jsx(CardDescription,{children:"This is the SQL that will be executed. You can review it before running."})]}),e.jsx(CardContent,{children:e.jsxs("div",{className:"relative",children:[e.jsx("pre",{className:"bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs max-h-96 overflow-y-auto",children:$}),e.jsx(Button,{onClick:d,size:"sm",variant:"secondary",className:"absolute top-2 right-2",children:n?e.jsxs(e.Fragment,{children:[e.jsx(p,{className:"w-3 h-3 mr-1"}),"Copied"]}):e.jsxs(e.Fragment,{children:[e.jsx(Q,{className:"w-3 h-3 mr-1"}),"Copy"]})})]})})]}),e.jsxs(Card,{children:[e.jsx(CardHeader,{children:e.jsxs(CardTitle,{className:"flex items-center gap-2 text-lg",children:[e.jsx(st,{className:"w-5 h-5"}),"About the Documents Module"]})}),e.jsxs(CardContent,{className:"space-y-3 text-sm",children:[e.jsx("p",{children:"The Documents module provides secure, multi-tenant document management with:"}),e.jsxs("ul",{className:"space-y-1 ml-4 text-muted-foreground",children:[e.jsx("li",{children:"• Upload and store documents (PDF, DOCX, XLSX, PPT, images)"}),e.jsx("li",{children:"• Associate documents with contacts"}),e.jsx("li",{children:"• Search and filter by category, contact, or tags"}),e.jsx("li",{children:"• Metadata management (title, description, tags, category)"}),e.jsx("li",{children:"• Role-based access control (configurable in Security → Space Matrix)"}),e.jsx("li",{children:"• Download and preview documents"}),e.jsx("li",{children:"• Version tracking and audit history"}),e.jsx("li",{children:"• 50MB file size limit per document"})]})]})]})]})}function ut({userId:n,totalDocuments:r,onOpenSearchExample:f,onShowAllCategories:d,onShowAllContacts:S,onClearFilters:O,onOpenUploadForm:I}){return e.jsx(at,{moduleKey:"documents-help",userId:n,title:"Documents Module Interactive Help",description:"Organize files, validate metadata, and hand off reliable project documentation.",moduleIcon:_,triggerLabel:"Documents Help",steps:[{title:"Discovery and Scope Lock",body:"Upload with complete metadata so each document is tied to the right project context."},{title:"Estimate and Validate",body:"Use search and filters to confirm documents are easy to retrieve by title, category, and contact."},{title:"Approval and Handoff",body:"Verify versions and access so downstream teams can execute from trusted documentation."}],badges:[{label:"Documents",value:r},{label:"Workflow",value:"Discovery -> Scope Lock -> Estimate -> Approval -> Handoff",variant:"outline"}],actions:[{label:"Open Search Example",icon:Ee,variant:"outline",onClick:()=>f("proposal contract")},{label:"Show All Categories",icon:je,variant:"outline",onClick:d},{label:"Show All Contacts",icon:je,variant:"outline",onClick:S},{label:"Clear Search and Filters",icon:it,variant:"outline",onClick:O},{label:"Open Upload Document Form",icon:nt,onClick:I,fullWidth:!0}],howToGuides:[{title:"How to upload a document with complete metadata",steps:["Discovery: Open Upload Document Form and select the source file.","Scope Lock: Enter title, description, category, and optional tags.","Scope Lock: Link the file to the correct contact when relevant.","Estimate: Review metadata and file details before upload.","Approval/Handoff: Upload and verify retrieval in list/search views."]},{title:"How to keep document retrieval reliable",steps:["Discovery: Use search terms aligned to project and file naming conventions.","Scope Lock: Filter by category and contact to narrow result sets.","Estimate: Validate file title, contact link, tags, and category consistency.","Approval: Update document metadata when structure standards change.","Handoff: Confirm final files are visible and downloadable for stakeholders."]}]})}function ns({user:n}){const[r,f]=i.useState([]),[d,S]=i.useState([]),[O,I]=i.useState(!1),[j,P]=i.useState(""),[M,k]=i.useState("all"),[X,z]=i.useState("all"),[Ce,K]=i.useState(!1),[be,D]=i.useState(!1),[N,q]=i.useState(null),[l,E]=i.useState({title:"",description:"",category:"",tags:"",contactId:""}),[B,Z]=i.useState(!1),[Te,w]=i.useState(!1),[J,ee]=i.useState(null),[o,b]=i.useState({title:"",description:"",category:"",tags:"",contactId:""}),[G,te]=i.useState(!1),[T,v]=i.useState(1),y=50;i.useEffect(()=>{L(),ve()},[]);const L=async()=>{I(!0),K(!1);try{const{documents:t}=await Qe();f(t)}catch(t){t.code!=="PGRST205"&&t.code!=="42P01"&&t.message?.includes("Could not find the table"),t.code==="PGRST205"||t.code==="42P01"||t.message?.includes("Could not find the table")?K(!0):a.error("Failed to load documents")}finally{I(!1)}},ve=async()=>{try{const t=await Ze.getAll("team");S(t.contacts||[])}catch{a.error("Failed to load contacts")}},Se=t=>{const s=t.target.files?.[0];s&&(q(s),E(m=>({...m,title:s.name})))},ye=async()=>{if(!N){a.error("Please select a file to upload");return}if(!le("documents",n.role)){a.error("You do not have permission to upload documents");return}Z(!0);try{const t=d.find(s=>s.id===l.contactId);await Ve(N,{title:l.title||N.name,description:l.description||void 0,category:l.category||void 0,tags:l.tags?l.tags.split(",").map(s=>s.trim()):void 0,contactId:l.contactId||void 0,contactName:t?`${t.name} - ${t.company}`:void 0}),a.success("Document uploaded successfully"),D(!1),q(null),E({title:"",description:"",category:"",tags:"",contactId:""}),L()}catch(t){a.error(t.message||"Failed to upload document")}finally{Z(!1)}},Oe=t=>{ee(t),b({title:t.title||"",description:t.description||"",category:t.category||"",tags:t.tags?.join(", ")||"",contactId:t.contactId||""}),w(!0)},Ie=async()=>{if(J){if(!oe("documents",n.role)){a.error("You do not have permission to edit documents");return}te(!0);try{const t=d.find(s=>s.id===o.contactId);await qe(J.id,{title:o.title,description:o.description,category:o.category,tags:o.tags?o.tags.split(",").map(s=>s.trim()):[],contactId:o.contactId||void 0,contactName:t?`${t.name} - ${t.company}`:void 0}),a.success("Document updated successfully"),w(!1),ee(null),L()}catch{a.error("Failed to update document")}finally{te(!1)}}},De=async t=>{try{const s=await $e(t.filePath),m=window.URL.createObjectURL(s),u=document.createElement("a");u.href=m,u.download=t.fileName,document.body.appendChild(u),u.click(),window.URL.revokeObjectURL(m),document.body.removeChild(u),a.success("Document downloaded")}catch{a.error("Failed to download document")}},we=async t=>{if(!re("documents",n.role)){a.error("You do not have permission to delete documents");return}if(confirm(`Are you sure you want to delete "${t.title||t.fileName}"?`))try{await Ke(t.id),a.success("Document deleted successfully"),L()}catch{a.error("Failed to delete document")}},Le=async t=>{try{const s=await We(t.filePath);window.open(s,"_blank")}catch{a.error("Failed to view document")}},C=r.filter(t=>{const s=t.title?.toLowerCase().includes(j.toLowerCase())||t.fileName.toLowerCase().includes(j.toLowerCase())||t.description?.toLowerCase().includes(j.toLowerCase())||t.contactName?.toLowerCase().includes(j.toLowerCase())||t.tags?.some(Pe=>Pe.toLowerCase().includes(j.toLowerCase())),m=M==="all"||t.category===M,u=X==="all"||t.contactId===X;return s&&m&&u}),Ae=Array.from(new Set(r.map(t=>t.category).filter(Boolean))),Re=Array.from(new Set(r.filter(t=>t.contactId).map(t=>({id:t.contactId,name:t.contactName}))).values()),Y=Math.ceil(C.length/y),Ue=C.slice((T-1)*y,T*y),se=t=>{if(t===0)return"0 Bytes";const s=1024,m=["Bytes","KB","MB","GB"],u=Math.floor(Math.log(t)/Math.log(s));return Math.round(t/Math.pow(s,u)*100)/100+" "+m[u]},Fe=t=>new Date(t).toLocaleDateString("en-US",{year:"numeric",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}),_e=t=>t.includes("pdf")?e.jsx(_,{className:"w-5 h-5 text-red-500"}):t.includes("word")||t.includes("document")?e.jsx(_,{className:"w-5 h-5 text-blue-500"}):t.includes("excel")||t.includes("sheet")?e.jsx(_,{className:"w-5 h-5 text-green-500"}):t.includes("image")?e.jsx(W,{className:"w-5 h-5 text-purple-500"}):e.jsx(W,{className:"w-5 h-5 text-muted-foreground"});return Ce?e.jsx(mt,{}):e.jsx(Ye,{user:n,module:"documents",action:"view",children:e.jsxs("div",{className:"p-4 sm:p-6 space-y-4 sm:space-y-6",children:[e.jsxs("div",{className:"flex justify-end items-center",children:[e.jsx(ut,{userId:n.id,totalDocuments:r.length,onOpenSearchExample:t=>{P(t),v(1)},onShowAllCategories:()=>{k("all"),v(1)},onShowAllContacts:()=>{z("all"),v(1)},onClearFilters:()=>{P(""),k("all"),z("all"),v(1)},onOpenUploadForm:()=>D(!0)}),e.jsx(He,{module:"documents",action:"add",userRole:n.role,children:e.jsxs(ce,{open:be,onOpenChange:D,children:[e.jsx(Xe,{asChild:!0,children:e.jsxs(h,{children:[e.jsx(Ne,{className:"w-4 h-4 mr-2"}),"Upload Document"]})}),e.jsxs(de,{className:"max-w-2xl bg-background",children:[e.jsxs(me,{children:[e.jsx(ue,{children:"Upload Document"}),e.jsx(he,{children:"Upload a new document and associate it with a contact"})]}),e.jsxs("div",{className:"space-y-4",children:[e.jsxs("div",{children:[e.jsx(c,{htmlFor:"file",children:"File *"}),e.jsx(x,{id:"file",type:"file",onChange:Se,accept:".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif"}),N&&e.jsxs("p",{className:"text-sm text-muted-foreground mt-1",children:["Selected: ",N.name," (",se(N.size),")"]})]}),e.jsxs("div",{children:[e.jsx(c,{htmlFor:"title",children:"Title"}),e.jsx(x,{id:"title",value:l.title,onChange:t=>E(s=>({...s,title:t.target.value})),placeholder:"Document title"})]}),e.jsxs("div",{children:[e.jsx(c,{htmlFor:"description",children:"Description"}),e.jsx(pe,{id:"description",value:l.description,onChange:t=>E(s=>({...s,description:t.target.value})),placeholder:"Brief description of the document",rows:3})]}),e.jsxs("div",{children:[e.jsx(c,{htmlFor:"contact",children:"Associated Contact"}),e.jsxs(A,{value:l.contactId,onValueChange:t=>E(s=>({...s,contactId:t})),children:[e.jsx(R,{children:e.jsx(U,{placeholder:"Select a contact (optional)"})}),e.jsxs(F,{children:[e.jsx(g,{value:"none",children:"None"}),d.map(t=>e.jsxs(g,{value:t.id,children:[t.name," - ",t.company]},t.id))]})]})]}),e.jsxs("div",{children:[e.jsx(c,{htmlFor:"category",children:"Category"}),e.jsx(x,{id:"category",value:l.category,onChange:t=>E(s=>({...s,category:t.target.value})),placeholder:"e.g., Contract, Invoice, Proposal"})]}),e.jsxs("div",{children:[e.jsx(c,{htmlFor:"tags",children:"Tags"}),e.jsx(x,{id:"tags",value:l.tags,onChange:t=>E(s=>({...s,tags:t.target.value})),placeholder:"Comma-separated tags"})]}),e.jsxs("div",{className:"flex justify-end gap-2 pt-4",children:[e.jsx(h,{variant:"outline",onClick:()=>D(!1),disabled:B,children:"Cancel"}),e.jsx(h,{onClick:ye,disabled:!N||B,children:B?e.jsxs(e.Fragment,{children:[e.jsx(V,{className:"w-4 h-4 mr-2 animate-spin"}),"Uploading..."]}):e.jsxs(e.Fragment,{children:[e.jsx(Ne,{className:"w-4 h-4 mr-2"}),"Upload"]})})]})]})]})]})})]}),e.jsx(ie,{children:e.jsx(ne,{className:"pt-6",children:e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-4 gap-4",children:[e.jsx("div",{className:"md:col-span-2",children:e.jsxs("div",{className:"relative",children:[e.jsx(Ee,{className:"absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4"}),e.jsx(x,{placeholder:"Search documents...",value:j,onChange:t=>P(t.target.value),className:"pl-10"})]})}),e.jsx("div",{children:e.jsxs(A,{value:M,onValueChange:k,children:[e.jsx(R,{children:e.jsx(U,{placeholder:"All Categories"})}),e.jsxs(F,{children:[e.jsx(g,{value:"all",children:"All Categories"}),Ae.map(t=>e.jsx(g,{value:t,children:t},t))]})]})}),e.jsx("div",{children:e.jsxs(A,{value:X,onValueChange:z,children:[e.jsx(R,{children:e.jsx(U,{placeholder:"All Contacts"})}),e.jsxs(F,{children:[e.jsx(g,{value:"all",children:"All Contacts"}),Re.map(t=>e.jsx(g,{value:t.id,children:t.name},t.id))]})]})})]})})}),e.jsxs(ie,{children:[e.jsx(Me,{children:e.jsxs(ke,{children:[C.length," ",C.length===1?"Document":"Documents"]})}),e.jsx(ne,{children:O?e.jsx("div",{className:"flex items-center justify-center py-8",children:e.jsx(V,{className:"w-8 h-8 animate-spin text-muted-foreground"})}):C.length===0?e.jsxs("div",{className:"text-center py-8 text-muted-foreground",children:[e.jsx(W,{className:"w-12 h-12 mx-auto mb-4 opacity-50"}),e.jsx("p",{children:"No documents found"}),le("documents",n.role)&&e.jsx("p",{className:"text-sm",children:"Upload your first document to get started"})]}):e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"overflow-x-auto",children:e.jsxs("table",{className:"w-full",children:[e.jsx("thead",{children:e.jsxs("tr",{className:"border-b",children:[e.jsx("th",{className:"text-left p-3",children:"File"}),e.jsx("th",{className:"text-left p-3 hidden sm:table-cell",children:"Title"}),e.jsx("th",{className:"text-left p-3 hidden lg:table-cell",children:"Contact"}),e.jsx("th",{className:"text-left p-3 hidden md:table-cell",children:"Category"}),e.jsx("th",{className:"text-left p-3 hidden md:table-cell",children:"Size"}),e.jsx("th",{className:"text-left p-3 hidden lg:table-cell",children:"Uploaded"}),e.jsx("th",{className:"text-left p-3 hidden lg:table-cell",children:"Tags"}),e.jsx("th",{className:"text-right p-3",children:"Actions"})]})}),e.jsx("tbody",{children:Ue.map(t=>e.jsxs("tr",{className:"border-b hover:bg-muted/50",children:[e.jsx("td",{className:"p-3",children:e.jsxs("div",{className:"flex items-center gap-2",children:[_e(t.fileType),e.jsx("span",{className:"text-sm truncate max-w-[200px]",title:t.fileName,children:t.fileName})]})}),e.jsx("td",{className:"p-3 hidden sm:table-cell",children:e.jsxs("div",{children:[e.jsx("div",{className:"truncate max-w-[200px]",title:t.title,children:t.title}),t.description&&e.jsx("div",{className:"text-sm text-muted-foreground truncate max-w-[200px]",title:t.description,children:t.description})]})}),e.jsx("td",{className:"p-3 hidden lg:table-cell",children:t.contactName?e.jsx("span",{className:"text-sm truncate max-w-[150px] inline-block",title:t.contactName,children:t.contactName}):e.jsx("span",{className:"text-muted-foreground text-sm",children:"-"})}),e.jsx("td",{className:"p-3 hidden md:table-cell",children:t.category?e.jsx(H,{variant:"outline",children:t.category}):e.jsx("span",{className:"text-muted-foreground text-sm",children:"-"})}),e.jsx("td",{className:"p-3 text-sm text-muted-foreground hidden md:table-cell",children:se(t.fileSize)}),e.jsx("td",{className:"p-3 hidden lg:table-cell",children:e.jsxs("div",{className:"text-sm",children:[e.jsx("div",{children:Fe(t.createdAt)}),e.jsx("div",{className:"text-muted-foreground",children:t.uploadedByName})]})}),e.jsx("td",{className:"p-3 hidden lg:table-cell",children:e.jsxs("div",{className:"flex flex-wrap gap-1",children:[t.tags&&t.tags.length>0?t.tags.slice(0,2).map((s,m)=>e.jsx(H,{variant:"secondary",className:"text-xs",children:s},m)):e.jsx("span",{className:"text-muted-foreground text-sm",children:"-"}),t.tags&&t.tags.length>2&&e.jsxs(H,{variant:"secondary",className:"text-xs",children:["+",t.tags.length-2]})]})}),e.jsx("td",{className:"p-3",children:e.jsxs("div",{className:"flex items-center justify-end gap-2",children:[e.jsx(h,{variant:"ghost",size:"sm",onClick:()=>Le(t),children:e.jsx(lt,{className:"w-4 h-4"})}),e.jsx(h,{variant:"ghost",size:"sm",onClick:()=>De(t),children:e.jsx(ot,{className:"w-4 h-4"})}),e.jsxs(ze,{children:[e.jsx(Be,{asChild:!0,children:e.jsx(h,{variant:"ghost",size:"sm",children:e.jsx(rt,{className:"w-4 h-4"})})}),e.jsxs(Ge,{align:"end",children:[oe("documents",n.role)&&e.jsxs(xe,{onClick:()=>Oe(t),children:[e.jsx(ct,{className:"w-4 h-4 mr-2"}),"Edit Details"]}),re("documents",n.role)&&e.jsxs(xe,{onClick:()=>we(t),className:"text-destructive",children:[e.jsx(dt,{className:"w-4 h-4 mr-2"}),"Delete"]})]})]})]})})]},t.id))})]})}),Y>1&&e.jsxs("div",{className:"flex items-center justify-between mt-4 pt-4 border-t",children:[e.jsxs("div",{className:"text-sm text-muted-foreground",children:["Showing ",(T-1)*y+1," to"," ",Math.min(T*y,C.length)," of"," ",C.length," documents"]}),e.jsxs("div",{className:"flex gap-2",children:[e.jsx(h,{variant:"outline",size:"sm",onClick:()=>v(t=>Math.max(1,t-1)),disabled:T===1,children:"Previous"}),e.jsx(h,{variant:"outline",size:"sm",onClick:()=>v(t=>Math.min(Y,t+1)),disabled:T===Y,children:"Next"})]})]})]})})]}),e.jsx(ce,{open:Te,onOpenChange:w,children:e.jsxs(de,{className:"max-w-2xl bg-background",children:[e.jsxs(me,{children:[e.jsx(ue,{children:"Edit Document Details"}),e.jsx(he,{children:"Update document information and associations"})]}),e.jsxs("div",{className:"space-y-4",children:[e.jsxs("div",{children:[e.jsx(c,{htmlFor:"edit-title",children:"Title"}),e.jsx(x,{id:"edit-title",value:o.title,onChange:t=>b(s=>({...s,title:t.target.value})),placeholder:"Document title"})]}),e.jsxs("div",{children:[e.jsx(c,{htmlFor:"edit-description",children:"Description"}),e.jsx(pe,{id:"edit-description",value:o.description,onChange:t=>b(s=>({...s,description:t.target.value})),placeholder:"Brief description of the document",rows:3})]}),e.jsxs("div",{children:[e.jsx(c,{htmlFor:"edit-contact",children:"Associated Contact"}),e.jsxs(A,{value:o.contactId,onValueChange:t=>b(s=>({...s,contactId:t})),children:[e.jsx(R,{children:e.jsx(U,{placeholder:"Select a contact (optional)"})}),e.jsxs(F,{children:[e.jsx(g,{value:"none",children:"None"}),d.map(t=>e.jsxs(g,{value:t.id,children:[t.name," - ",t.company]},t.id))]})]})]}),e.jsxs("div",{children:[e.jsx(c,{htmlFor:"edit-category",children:"Category"}),e.jsx(x,{id:"edit-category",value:o.category,onChange:t=>b(s=>({...s,category:t.target.value})),placeholder:"e.g., Contract, Invoice, Proposal"})]}),e.jsxs("div",{children:[e.jsx(c,{htmlFor:"edit-tags",children:"Tags"}),e.jsx(x,{id:"edit-tags",value:o.tags,onChange:t=>b(s=>({...s,tags:t.target.value})),placeholder:"Comma-separated tags"})]}),e.jsxs("div",{className:"flex justify-end gap-2 pt-4",children:[e.jsx(h,{variant:"outline",onClick:()=>w(!1),disabled:G,children:"Cancel"}),e.jsx(h,{onClick:Ie,disabled:G,children:G?e.jsxs(e.Fragment,{children:[e.jsx(V,{className:"w-4 h-4 mr-2 animate-spin"}),"Saving..."]}):"Save Changes"})]})]})]})})]})})}export{ns as Documents};
