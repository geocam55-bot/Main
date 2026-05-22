import { useEffect, useState } from 'react';
import { Filter, Plus, Search, Users, X } from 'lucide-react';
import { InteractiveModuleHelp } from './InteractiveModuleHelp';

interface CustomerModuleHelpProps {
  userId: string;
  totalContacts: number;
  onSearchExample: (query: string) => void;
  onFilterByStatus: (status: 'Active' | 'Prospect' | 'Inactive') => void;
  onClearFilters: () => void;
  onOpenAddContact: () => void;
}

export function CustomerModuleHelp({
  userId,
  totalContacts,
  onSearchExample,
  onFilterByStatus,
  onClearFilters,
  onOpenAddContact,
}: CustomerModuleHelpProps) {
  const processStages = 'Discovery -> Scope Lock -> Estimate -> Approval -> Handoff';
  const [forceStartToken, setForceStartToken] = useState(0);

  useEffect(() => {
    const triggerStart = () => {
      sessionStorage.removeItem('prospaces.pending-tour');
      setForceStartToken(Date.now());
    };

    if (sessionStorage.getItem('prospaces.pending-tour') === 'contacts') {
      const t = setTimeout(triggerStart, 200);
      return () => clearTimeout(t);
    }

    const onStartTour = (event: Event) => {
      const detail = (event as CustomEvent<{ key?: string }>).detail;
      if (detail?.key === 'contacts') {
        triggerStart();
      }
    };

    window.addEventListener('prospaces:start-tour', onStartTour as EventListener);
    return () => window.removeEventListener('prospaces:start-tour', onStartTour as EventListener);
  }, []);

  return (
    <InteractiveModuleHelp
      moduleKey="customer-help"
      userId={userId}
      pendingTourKey="contacts"
      forceStartToken={forceStartToken}
      title="Customer Module Interactive Help"
      description="Learn the workflow and run quick actions directly from this guide."
      moduleIcon={Users}
      triggerLabel="Customer Help"
      steps={[
        {
          title: 'Search your contacts',
          body: 'Type a name, email, company, or phone number into the search box above to filter your contact list in real time. Use the status dropdown to the right to show only Active, Inactive, or Prospect contacts.',
          targetSelector: '[data-tour="contacts-search"]',
          placement: 'bottom',
        },
        {
          title: 'Your contacts list',
          body: 'Each row is a contact. Click any row to open their full profile and deal history, or use the row menu (\u22ee) on the left to edit, delete, or view their details.',
          targetSelector: '[data-tour="contacts-list"]',
          placement: 'top',
        },
        {
          title: 'Add a new contact',
          body: 'Click **Add Contact** above to create a new contact. Fill in their name, email, phone, and company, then set a status (Active, Prospect, or Inactive) and save.',
          targetSelector: '[data-tour="contacts-add"]',
          placement: 'bottom',
        },
      ]}
      badges={[
        { label: 'Current Customers', value: totalContacts },
        { label: 'Workflow', value: processStages, variant: 'outline' },
      ]}
      actions={[
        {
          label: 'Open Search Example',
          icon: Search,
          variant: 'outline',
          onClick: () => onSearchExample('show active customers'),
        },
        {
          label: 'Show Active Customers',
          icon: Filter,
          variant: 'outline',
          onClick: () => onFilterByStatus('Active'),
        },
        {
          label: 'Show Prospects',
          icon: Filter,
          variant: 'outline',
          onClick: () => onFilterByStatus('Prospect'),
        },
        {
          label: 'Clear Search and Filters',
          icon: X,
          variant: 'outline',
          onClick: onClearFilters,
        },
        {
          label: 'Open Add Contact Form',
          icon: Plus,
          fullWidth: true,
          onClick: onOpenAddContact,
        },
      ]}
      howToGuides={[
        {
          title: 'How to add a new customer',
          steps: [
            'Discovery: Open Contacts and click Add Contact.',
            'Scope Lock: Enter required details (Name, Email, Phone, Company).',
            'Scope Lock: Set Status and Price Level for your workflow.',
            'Estimate: Add optional context such as Address, Notes, Tags, and sales metrics.',
            'Approval: Click Add Contact to save the new record.',
            'Handoff: Reopen/search the contact and verify details before team use.',
          ],
        },
        {
          title: 'How to edit an existing customer',
          steps: [
            'Discovery: Search for the customer and open the row menu.',
            'Scope Lock: Open Edit from row actions or customer detail view.',
            'Estimate: Update fields such as status, price level, tags, notes, or contact details.',
            'Approval: Click Save Changes to apply updates.',
            'Handoff: Reopen the detail view and confirm the latest values are visible.',
          ],
        },
      ]}
    />
  );
}
