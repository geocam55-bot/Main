import { Inbox, Link2, Mail, Plus, RefreshCw, Search, Send, Star, X } from 'lucide-react';
import { InteractiveModuleHelp } from './InteractiveModuleHelp';

interface EmailModuleHelpProps {
  userId: string;
  totalEmails: number;
  connectedAccounts: number;
  onOpenInbox: () => void;
  onOpenStarred: () => void;
  onOpenSearchExample: (query: string) => void;
  onClearSearch: () => void;
  onSync: () => void;
  onOpenAccountSetup: () => void;
  onOpenCompose: () => void;
}

export function EmailModuleHelp({
  userId,
  totalEmails,
  connectedAccounts,
  onOpenInbox,
  onOpenStarred,
  onOpenSearchExample,
  onClearSearch,
  onSync,
  onOpenAccountSetup,
  onOpenCompose,
}: EmailModuleHelpProps) {
  const processStages = 'Discovery -> Scope Lock -> Estimate -> Approval -> Handoff';

  return (
    <InteractiveModuleHelp
      moduleKey="email-help"
      userId={userId}
      title="Email Module Interactive Help"
      description="Manage inbox workflows, validate communication context, and hand off clear customer correspondence."
      moduleIcon={Mail}
      triggerLabel="Email Help"
      steps={[
        {
          title: 'Discovery and Scope Lock',
          body: 'Choose the correct account and folder before reading, composing, or moving critical communications.',
        },
        {
          title: 'Estimate and Validate',
          body: 'Use search, sync, and metadata checks to verify message completeness and timing.',
        },
        {
          title: 'Approval and Handoff',
          body: 'Send finalized communication and maintain folder discipline so teams can execute confidently.',
        },
      ]}
      badges={[
        { label: 'Emails In Scope', value: totalEmails },
        { label: 'Connected Accounts', value: connectedAccounts },
        { label: 'Workflow', value: processStages, variant: 'outline' },
      ]}
      actions={[
        { label: 'Show Inbox', icon: Inbox, variant: 'outline', onClick: onOpenInbox },
        { label: 'Show Starred', icon: Star, variant: 'outline', onClick: onOpenStarred },
        { label: 'Open Search Example', icon: Search, variant: 'outline', onClick: () => onOpenSearchExample('invoice follow-up') },
        { label: 'Clear Search', icon: X, variant: 'outline', onClick: onClearSearch },
        { label: 'Open Email Sync', icon: RefreshCw, variant: 'outline', onClick: onSync },
        { label: 'Open Account Setup', icon: Link2, variant: 'outline', onClick: onOpenAccountSetup },
        { label: 'Open Compose Form', icon: Send, onClick: onOpenCompose, fullWidth: true },
      ]}
      howToGuides={[
        {
          title: 'How to send a reliable customer email',
          steps: [
            'Discovery: Select the right connected account and open Compose.',
            'Scope Lock: Enter recipient, subject, and clear message context.',
            'Estimate: Validate links, references, and message clarity before sending.',
            'Approval: Send and verify it appears in Sent for the active account.',
            'Handoff: Link relevant CRM context so teammates can act on communication history.',
          ],
        },
        {
          title: 'How to keep inbox operations clean',
          steps: [
            'Discovery: Start in Inbox and identify high-priority threads.',
            'Scope Lock: Star or flag messages that require follow-up ownership.',
            'Estimate: Run sync and search checks to ensure no gaps in the timeline.',
            'Approval: Archive or move threads once actions are complete.',
            'Handoff: Keep folder organization consistent so handoffs remain auditable.',
          ],
        },
      ]}
    />
  );
}