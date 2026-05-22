import { FileText, Filter, Plus, Search, X } from 'lucide-react';
import { InteractiveModuleHelp } from './InteractiveModuleHelp';

interface DocumentsModuleHelpProps {
  userId: string;
  totalDocuments: number;
  onOpenSearchExample: (query: string) => void;
  onShowAllCategories: () => void;
  onShowAllContacts: () => void;
  onClearFilters: () => void;
  onOpenUploadForm: () => void;
}

export function DocumentsModuleHelp({
  userId,
  totalDocuments,
  onOpenSearchExample,
  onShowAllCategories,
  onShowAllContacts,
  onClearFilters,
  onOpenUploadForm,
}: DocumentsModuleHelpProps) {
  const processStages = 'Discovery -> Scope Lock -> Estimate -> Approval -> Handoff';

  return (
    <InteractiveModuleHelp
      moduleKey="documents-help"
      userId={userId}
      title="Documents Module Interactive Help"
      description="Organize files, validate metadata, and hand off reliable project documentation."
      moduleIcon={FileText}
      triggerLabel="Documents Help"
      steps={[
        {
          title: 'Discovery and Scope Lock',
          body: 'Upload with complete metadata so each document is tied to the right project context.',
        },
        {
          title: 'Estimate and Validate',
          body: 'Use search and filters to confirm documents are easy to retrieve by title, category, and contact.',
        },
        {
          title: 'Approval and Handoff',
          body: 'Verify versions and access so downstream teams can execute from trusted documentation.',
        },
      ]}
      badges={[
        { label: 'Documents', value: totalDocuments },
        { label: 'Workflow', value: processStages, variant: 'outline' },
      ]}
      actions={[
        { label: 'Open Search Example', icon: Search, variant: 'outline', onClick: () => onOpenSearchExample('proposal contract') },
        { label: 'Show All Categories', icon: Filter, variant: 'outline', onClick: onShowAllCategories },
        { label: 'Show All Contacts', icon: Filter, variant: 'outline', onClick: onShowAllContacts },
        { label: 'Clear Search and Filters', icon: X, variant: 'outline', onClick: onClearFilters },
        { label: 'Open Upload Document Form', icon: Plus, onClick: onOpenUploadForm, fullWidth: true },
      ]}
      howToGuides={[
        {
          title: 'How to upload a document with complete metadata',
          steps: [
            'Discovery: Open Upload Document Form and select the source file.',
            'Scope Lock: Enter title, description, category, and optional tags.',
            'Scope Lock: Link the file to the correct contact when relevant.',
            'Estimate: Review metadata and file details before upload.',
            'Approval/Handoff: Upload and verify retrieval in list/search views.',
          ],
        },
        {
          title: 'How to keep document retrieval reliable',
          steps: [
            'Discovery: Use search terms aligned to project and file naming conventions.',
            'Scope Lock: Filter by category and contact to narrow result sets.',
            'Estimate: Validate file title, contact link, tags, and category consistency.',
            'Approval: Update document metadata when structure standards change.',
            'Handoff: Confirm final files are visible and downloadable for stakeholders.',
          ],
        },
      ]}
    />
  );
}