import { AlertTriangle, MessageSquare, Plus, RefreshCw, Search, X } from 'lucide-react';
import { InteractiveModuleHelp } from './InteractiveModuleHelp';

interface MessagingModuleHelpProps {
  userId: string;
  customerConversations: number;
  internalConversations: number;
  unreadCount: number;
  onRefresh: () => void;
  onOpenNewChat: () => void;
  onOpenSearchExample: (query: string) => void;
  onClearSearchAndFilters: () => void;
  onShowSlaAlerts: () => void;
  onShowAllConversations: () => void;
}

export function MessagingModuleHelp({
  userId,
  customerConversations,
  internalConversations,
  unreadCount,
  onRefresh,
  onOpenNewChat,
  onOpenSearchExample,
  onClearSearchAndFilters,
  onShowSlaAlerts,
  onShowAllConversations,
}: MessagingModuleHelpProps) {
  const processStages = 'Discovery -> Scope Lock -> Estimate -> Approval -> Handoff';

  return (
    <InteractiveModuleHelp
      moduleKey="messaging-help"
      userId={userId}
      title="Messaging Module Interactive Help"
      description="Coordinate customer and internal conversations with clear triage, SLA ownership, and handoff-ready context."
      moduleIcon={MessageSquare}
      triggerLabel="Messaging Help"
      steps={[
        {
          title: 'Discovery and Scope Lock',
          body: 'Identify whether the conversation is customer-facing or internal and lock ownership before replying.',
        },
        {
          title: 'Estimate and Validate',
          body: 'Prioritize unread and SLA-risk threads, then validate context before sending updates or creating follow-ups.',
        },
        {
          title: 'Approval and Handoff',
          body: 'Confirm final response quality and leave a clean thread state so teammates can execute without ambiguity.',
        },
      ]}
      badges={[
        { label: 'Customer Threads', value: customerConversations },
        { label: 'Internal Chats', value: internalConversations },
        { label: 'Unread Items', value: unreadCount },
        { label: 'Workflow', value: processStages, variant: 'outline' },
      ]}
      actions={[
        { label: 'Show Latest Conversations', icon: RefreshCw, variant: 'outline', onClick: onRefresh },
        { label: 'Open New Chat or Group', icon: Plus, variant: 'outline', onClick: onOpenNewChat },
        { label: 'Open Search Example', icon: Search, variant: 'outline', onClick: () => onOpenSearchExample('follow-up') },
        { label: 'Show SLA Alerts', icon: AlertTriangle, variant: 'outline', onClick: onShowSlaAlerts },
        { label: 'Show All Conversations', icon: MessageSquare, variant: 'outline', onClick: onShowAllConversations },
        { label: 'Clear Search and Filters', icon: X, onClick: onClearSearchAndFilters, fullWidth: true },
      ]}
      howToGuides={[
        {
          title: 'How to triage customer conversations quickly',
          steps: [
            'Discovery: Start with unread and SLA-risk customer threads.',
            'Scope Lock: Confirm owner and expected response timing for each thread.',
            'Estimate: Validate thread context before sending updates or creating tasks.',
            'Approval: Send the final response and verify the timeline reflects the action.',
            'Handoff: Leave clear notes so the next owner can continue without rework.',
          ],
        },
        {
          title: 'How to keep internal collaboration clean',
          steps: [
            'Discovery: Open the relevant direct or group chat for the workstream.',
            'Scope Lock: Keep the thread focused on one decision path at a time.',
            'Estimate: Capture blockers and dependencies before proposing timelines.',
            'Approval: Confirm commitments in-thread after team agreement.',
            'Handoff: Close with clear next steps, owners, and timing.',
          ],
        },
      ]}
    />
  );
}
