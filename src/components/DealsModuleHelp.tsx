import { Filter, Plus, Search, X, FileText } from 'lucide-react';
import { InteractiveModuleHelp } from './InteractiveModuleHelp';

interface DealsModuleHelpProps {
  userId: string;
  totalDeals: number;
  totalValue: number;
  searchExample: string;
  onSearchExample: (query: string) => void;
  onFilterByStatus: (status: 'draft' | 'sent' | 'accepted') => void;
  onClearFilters: () => void;
  onOpenNewQuote: () => void;
}

export function DealsModuleHelp({
  userId,
  totalDeals,
  totalValue,
  searchExample,
  onSearchExample,
  onFilterByStatus,
  onClearFilters,
  onOpenNewQuote,
}: DealsModuleHelpProps) {
  const processStages = 'Discovery -> Scope Lock -> Estimate -> Approval -> Handoff';

  return (
    <InteractiveModuleHelp
      moduleKey="deals-help"
      userId={userId}
      pendingTourKey="bids"
      title="Deals Module Interactive Help"
      description="Learn how to move quotes from draft to close and run quick actions from this guide."
      moduleIcon={FileText}
      triggerLabel="Deals Help"
      steps={[
        {
          title: 'Search and filter your quotes',
          body: 'Type a customer name or company into the search box above to instantly find any quote. Use the status filter beside it to show only Draft, Sent, or Accepted quotes.',
          targetSelector: '[data-tour="bids-search"]',
          placement: 'bottom',
        },
        {
          title: 'Your quotes list',
          body: 'Each row here is a quote. Click any row to open and edit it, or use the row menu (⋮) to mark it Accepted, duplicate it, or delete it.',
          targetSelector: '[data-tour="bids-list"]',
          placement: 'top',
        },
        {
          title: 'Create a new quote',
          body: 'Click the **New Quote** button above to start building a quote — you will choose a customer, add line items with pricing, and then send or save as draft.',
          targetSelector: '[data-tour="bids-new"]',
          placement: 'bottom',
        },
      ]}
      badges={[
        { label: 'Deals In View', value: totalDeals },
        { label: 'Total Value', value: `$${Math.round(totalValue).toLocaleString()}` },
        { label: 'Workflow', value: processStages, variant: 'outline' },
      ]}
      actions={[
        {
          label: 'Open Search Example',
          icon: Search,
          variant: 'outline',
          onClick: () => onSearchExample(searchExample),
        },
        {
          label: 'Show Draft Deals',
          icon: Filter,
          variant: 'outline',
          onClick: () => onFilterByStatus('draft'),
        },
        {
          label: 'Show Sent Deals',
          icon: Filter,
          variant: 'outline',
          onClick: () => onFilterByStatus('sent'),
        },
        {
          label: 'Show Accepted Deals',
          icon: Filter,
          variant: 'outline',
          onClick: () => onFilterByStatus('accepted'),
        },
        {
          label: 'Clear Search and Filters',
          icon: X,
          variant: 'outline',
          onClick: onClearFilters,
          fullWidth: true,
        },
        {
          label: 'Open New Quote Form',
          icon: Plus,
          onClick: onOpenNewQuote,
          fullWidth: true,
        },
      ]}
      howToGuides={[
        {
          title: 'How to create a new quote',
          steps: [
            'Discovery: Click Open New Quote Form (or New Quote) in Deals.',
            'Scope Lock: Select the customer and define quote title/scope.',
            'Estimate: Set status, validity date, pricing tier, and line items.',
            'Estimate: Review discounts, taxes, and totals before finalizing.',
            'Approval/Handoff: Create the quote and proceed through send/accept workflow.',
          ],
        },
        {
          title: 'How to move a deal to accepted',
          steps: [
            'Discovery: Find the quote using search or status filters.',
            'Scope Lock: Open quote actions and verify final scope/terms.',
            'Approval: Change status from Draft/Sent to Accepted.',
            'Approval: Confirm the deal appears in Accepted view.',
            'Handoff: Send or resend confirmation communication for final records.',
          ],
        },
      ]}
    />
  );
}
