import { Plus, Search, StickyNote, X } from 'lucide-react';
import { InteractiveModuleHelp } from './InteractiveModuleHelp';

interface NotesModuleHelpProps {
  userId: string;
  totalNotes: number;
  onOpenSearchExample: (query: string) => void;
  onClearSearch: () => void;
  onOpenAddNote: () => void;
}

export function NotesModuleHelp({
  userId,
  totalNotes,
  onOpenSearchExample,
  onClearSearch,
  onOpenAddNote,
}: NotesModuleHelpProps) {
  const processStages = 'Discovery -> Scope Lock -> Estimate -> Approval -> Handoff';

  return (
    <InteractiveModuleHelp
      moduleKey="notes-help"
      userId={userId}
      title="Notes Module Interactive Help"
      description="Capture reliable context and hand off clear internal notes without losing important details."
      moduleIcon={StickyNote}
      triggerLabel="Notes Help"
      steps={[
        {
          title: 'Discovery and Scope Lock',
          body: 'Capture complete note context early and link notes to the right contact when needed.',
        },
        {
          title: 'Estimate and Validate',
          body: 'Use search to validate that your notes are discoverable by title, content, and contact context.',
        },
        {
          title: 'Approval and Handoff',
          body: 'Save final notes and confirm visibility so teams can act on accurate project guidance.',
        },
      ]}
      badges={[
        { label: 'Notes', value: totalNotes },
        { label: 'Workflow', value: processStages, variant: 'outline' },
      ]}
      actions={[
        { label: 'Open Search Example', icon: Search, variant: 'outline', onClick: () => onOpenSearchExample('follow-up with customer') },
        { label: 'Clear Search', icon: X, variant: 'outline', onClick: onClearSearch },
        { label: 'Open Add Note Form', icon: Plus, onClick: onOpenAddNote, fullWidth: true },
      ]}
      howToGuides={[
        {
          title: 'How to create a useful project note',
          steps: [
            'Discovery: Open Add Note Form and define a clear title.',
            'Scope Lock: Write concise, actionable note content.',
            'Scope Lock: Link the note to the correct contact when applicable.',
            'Estimate: Search using key terms to verify findability.',
            'Approval/Handoff: Save and confirm the note is visible to your team.',
          ],
        },
        {
          title: 'How to maintain note quality over time',
          steps: [
            'Discovery: Review recent notes for duplicate or stale entries.',
            'Scope Lock: Keep each note focused on one topic or decision.',
            'Estimate: Use search to confirm retrieval by contact and keywords.',
            'Approval: Remove outdated notes that no longer support execution.',
            'Handoff: Keep current notes in place so downstream teams have clear context.',
          ],
        },
      ]}
    />
  );
}