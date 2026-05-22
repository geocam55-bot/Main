import {
  BookOpen,
  Brush,
  ChefHat,
  Hammer,
  Home,
  MessageSquare,
  Settings,
  Triangle,
  Users,
  Warehouse,
} from 'lucide-react';
import { InteractiveModuleHelp } from '../InteractiveModuleHelp';

interface ProjectWizardsModuleHelpProps {
  userId: string;
  plannerCount: number;
  hasFinishingPlanner: boolean;
  onOpenContacts: () => void;
  onOpenMessages: () => void;
  onOpenDeckPlanner: () => void;
  onOpenGaragePlanner: () => void;
  onOpenShedPlanner: () => void;
  onOpenRoofPlanner: () => void;
  onOpenKitchenPlanner: () => void;
  onOpenFinishingPlanner: () => void;
  onOpenSettings: () => void;
}

export function ProjectWizardsModuleHelp({
  userId,
  plannerCount,
  hasFinishingPlanner,
  onOpenContacts,
  onOpenMessages,
  onOpenDeckPlanner,
  onOpenGaragePlanner,
  onOpenShedPlanner,
  onOpenRoofPlanner,
  onOpenKitchenPlanner,
  onOpenFinishingPlanner,
  onOpenSettings,
}: ProjectWizardsModuleHelpProps) {
  const processStages = 'Discovery -> Scope Lock -> Estimate -> Approval -> Handoff';

  const plannerListLabel = hasFinishingPlanner
    ? 'Deck, Garage, Shed, Roof, Kitchen, and Interior Finishing'
    : 'Deck, Garage, Shed, Roof, and Kitchen';

  return (
    <InteractiveModuleHelp
      moduleKey="project-wizards-help"
      userId={userId}
      title="Project Wizards Interactive Help"
      description="Use this guide to move from customer intake to multi-planner design and handoff-ready pricing."
      moduleIcon={BookOpen}
      triggerLabel="Project Wizards Help"
      steps={[
        {
          title: 'Discovery and Scope Lock',
          body: 'Start in Contacts, define scope clearly, and select the right planner path before pricing decisions.',
        },
        {
          title: 'Estimate and Validate',
          body: `Run the appropriate planners (${plannerListLabel}) and validate quantities/defaults before review.`,
        },
        {
          title: 'Approval and Handoff',
          body: 'Use Message Space and saved planner outputs to close approvals and hand off execution-ready scope.',
        },
      ]}
      badges={[
        { label: 'Available planners', value: plannerCount },
        { label: 'Workflow', value: processStages, variant: 'outline' },
        { label: 'Finishing planner', value: hasFinishingPlanner ? 'Enabled' : 'Admin only', variant: 'outline' },
      ]}
      actions={[
        {
          label: 'Open Contacts',
          icon: Users,
          variant: 'outline',
          onClick: onOpenContacts,
        },
        {
          label: 'Open Message Space',
          icon: MessageSquare,
          variant: 'outline',
          onClick: onOpenMessages,
        },
        {
          label: 'Open Deck Planner',
          icon: Hammer,
          variant: 'outline',
          onClick: onOpenDeckPlanner,
        },
        {
          label: 'Open Garage Planner',
          icon: Warehouse,
          variant: 'outline',
          onClick: onOpenGaragePlanner,
        },
        {
          label: 'Open Shed Planner',
          icon: Home,
          variant: 'outline',
          onClick: onOpenShedPlanner,
        },
        {
          label: 'Open Roof Planner',
          icon: Triangle,
          variant: 'outline',
          onClick: onOpenRoofPlanner,
        },
        {
          label: 'Open Kitchen Planner',
          icon: ChefHat,
          variant: 'outline',
          onClick: onOpenKitchenPlanner,
        },
        ...(hasFinishingPlanner
          ? [
              {
                label: 'Open Interior Finishing Planner',
                icon: Brush,
                variant: 'outline' as const,
                onClick: onOpenFinishingPlanner,
                fullWidth: true,
              },
            ]
          : []),
        {
          label: 'Open Wizard Settings',
          icon: Settings,
          onClick: onOpenSettings,
          fullWidth: true,
        },
      ]}
      howToGuides={[
        {
          title: 'How to run a full multi-planner project workflow',
          steps: [
            'Discovery: Open Contacts and confirm customer details, project address, and project goals.',
            'Scope Lock: Launch the first planner and lock dimensions, layout, and major components.',
            'Scope Lock: Open additional planners for remaining scope segments and keep assumptions consistent.',
            'Estimate: Validate quantities and key options in each planner before moving forward.',
            'Estimate: Verify defaults and cost factors in Settings when totals look off.',
            'Approval: Use Message Space to document open questions and decisions.',
            'Approval: Return to planners for requested revisions, then save finalized outputs.',
            'Handoff: Publish aligned planner outputs and scope notes for estimating and operations.',
          ],
        },
        {
          title: 'How to configure planner defaults and cost factors across all planners',
          steps: [
            'Scope Lock: Open Profile/Settings and navigate to Project Wizard Settings.',
            'Scope Lock: Set default materials for each planner/material type.',
            'Estimate: Review organization cost factors and update markup assumptions.',
            'Estimate: Save settings, then verify defaults planner-by-planner.',
            'Estimate: Spot-check critical categories (framing, roofing, finishes, fixtures).',
            'Approval: Confirm the standard baseline with estimating and sales leads.',
            'Handoff: Communicate rollout so all new jobs follow the updated baseline.',
          ],
        },
        {
          title: 'How to handle revisions across multiple planners without losing alignment',
          steps: [
            'Discovery: Capture revision requests in Message Space and identify impacted planners.',
            'Scope Lock: Update the primary planner first where the change originated.',
            'Scope Lock: Apply matching updates in related planners to keep scope synchronized.',
            'Estimate: Recheck defaults and cost factors when material classes change.',
            'Approval: Review planner outputs side-by-side for mismatches or duplicated scope.',
            'Handoff: Document final decisions and notify stakeholders when updates are ready.',
          ],
        },
      ]}
    />
  );
}