import { Box, FileText, Hammer, Home, Layers, LayoutTemplate, Package, Printer, Settings, Triangle, Warehouse, ChefHat, FileTerminal } from 'lucide-react';
import { InteractiveModuleHelp } from '../InteractiveModuleHelp';

type PlannerType = 'deck' | 'garage' | 'shed' | 'roof' | 'kitchen';

interface PlannerWorkflowHelpProps {
  plannerType: PlannerType;
  userId: string;
  onOpenDesign: () => void;
  onOpenMaterials: () => void;
  onOpenTemplates: () => void;
  onOpenSaved: () => void;
  onOpenDefaults: () => void;
  onSwitch2D: () => void;
  onSwitch3D: () => void;
  onPrint: () => void;
  onOpenDiagnostics?: () => void;
  onOpenModelLibrary?: () => void;
}

const PROCESS_STAGES = 'Discovery -> Scope Lock -> Estimate -> Approval -> Handoff';

const plannerMeta = {
  deck: {
    moduleKey: 'deck-planner-help',
    title: 'Deck Planner Interactive Help',
    icon: Hammer,
    colorLabel: 'Deck',
    guides: [
      {
        title: 'How to design and estimate a deck project end-to-end',
        steps: [
          'Discovery: Open Design and set dimensions, shape, height, and stair location from customer requirements.',
          'Scope Lock: Finalize railing sides, railing style, and decking pattern before pricing validation.',
          'Estimate: Switch 2D/3D to verify geometry and then confirm framing, decking, railing, and hardware in Materials.',
          'Estimate: Review Defaults if pricing assumptions look off, then recheck Materials totals.',
          'Approval: Save the selected design revision for customer review and sign-off.',
          'Handoff: Print the approved plan for field and operations execution.',
        ],
      },
      {
        title: 'How to run revisions without losing pricing consistency',
        steps: [
          'Discovery: Load the saved design and document all requested changes.',
          'Scope Lock: Apply geometry updates first, then visual/style changes.',
          'Estimate: Recheck Materials totals and line-item deltas before finalizing.',
          'Estimate: If cost shifts unexpectedly, verify Defaults and conversion factors.',
          'Approval/Handoff: Save as a new revision so approved and in-progress scopes stay traceable.',
        ],
      },
    ],
  },
  garage: {
    moduleKey: 'garage-planner-help',
    title: 'Garage Planner Interactive Help',
    icon: Warehouse,
    colorLabel: 'Garage',
    guides: [
      {
        title: 'How to scope a garage build from framing to quote-ready output',
        steps: [
          'Discovery: Set footprint, wall height, roof style, and pitch from site/customer inputs.',
          'Scope Lock: Configure bays and verify overhead door layout and spacing.',
          'Scope Lock: Add windows, walk door, insulation, and electrical options.',
          'Estimate: Confirm openings in 2D/3D and validate material groups in Materials.',
          'Approval: Save the finalized scope for customer/internal review.',
          'Handoff: Print the approved plan for estimating and operations.',
        ],
      },
      {
        title: 'How to standardize garage output across your team',
        steps: [
          'Scope Lock: Open Defaults and confirm baseline material choices for common builds.',
          'Scope Lock: Test key variants in Templates (single-bay, two-bay, specialty).',
          'Estimate: Apply team-approved options for doors, siding, and roofing.',
          'Approval: Save with consistent revision naming for review traceability.',
          'Handoff: Use printouts to catch structural/scope mismatches before execution.',
        ],
      },
    ],
  },
  shed: {
    moduleKey: 'shed-planner-help',
    title: 'Shed Planner Interactive Help',
    icon: Home,
    colorLabel: 'Shed',
    guides: [
      {
        title: 'How to produce a complete shed scope with optional packages',
        steps: [
          'Discovery: Set dimensions, wall height, style, roof pitch, and foundation type in Design.',
          'Scope Lock: Configure doors, windows, and finish options including decorative packages.',
          'Scope Lock: Toggle electrical and shelving package options to match signed scope.',
          'Estimate: Validate the layout in 2D/3D and review key categories in Materials.',
          'Approval: Save the final shed package for customer sign-off.',
          'Handoff: Print the approved scope package for build preparation.',
        ],
      },
      {
        title: 'How to handle custom shed revisions quickly',
        steps: [
          'Discovery: Load the latest design and capture all requested changes first.',
          'Scope Lock: Update major geometry/structure settings before cosmetic upgrades.',
          'Estimate: Re-run materials validation and verify accessory impact on totals.',
          'Estimate: Check Defaults when category pricing appears inconsistent.',
          'Approval/Handoff: Save as a revision and print for side-by-side scope comparison.',
        ],
      },
    ],
  },
  roof: {
    moduleKey: 'roof-planner-help',
    title: 'Roof Planner Interactive Help',
    icon: Triangle,
    colorLabel: 'Roof',
    guides: [
      {
        title: 'How to build a roof estimate with complex details',
        steps: [
          'Discovery: Set dimensions, style, and pitch in Design as structural baseline.',
          'Scope Lock: Configure overhangs, material selections, and waste assumptions.',
          'Scope Lock: Add valleys, skylights, chimneys, and dormers where required.',
          'Estimate: Verify geometry in 2D/3D and validate all roofing material groups.',
          'Approval: Save final roof revision for customer/internal review.',
          'Handoff: Print approved outputs for estimating and installation teams.',
        ],
      },
      {
        title: 'How to troubleshoot pricing and quantity anomalies',
        steps: [
          'Estimate: Open Diagnostics when totals or quantities look unexpected.',
          'Estimate: Check Defaults for shingle type and category conversion factors.',
          'Scope Lock: Confirm pitch, waste, and feature counts in Design.',
          'Estimate: Reopen Materials and verify line-level changes after each update.',
          'Approval: Save corrected scope as a new revision once totals stabilize.',
        ],
      },
    ],
  },
  kitchen: {
    moduleKey: 'kitchen-planner-help',
    title: 'Kitchen Planner Interactive Help',
    icon: ChefHat,
    colorLabel: 'Kitchen',
    guides: [
      {
        title: 'How to take a kitchen design from layout to quote handoff',
        steps: [
          'Discovery: Set room dimensions, layout style, and baseline finish/material settings.',
          'Scope Lock: Add cabinets/appliances and position them precisely for final layout.',
          'Scope Lock: Use 2D/3D modes to validate flow, clearances, and visual coherence.',
          'Estimate: Review cabinets, countertops, appliances, hardware, and install lines in Materials.',
          'Estimate: If assets are missing, verify 3D Models availability before final render review.',
          'Approval/Handoff: Save the revision, print output, and pass into quote/approval workflow.',
        ],
      },
      {
        title: 'How to manage kitchen standards across many revisions',
        steps: [
          'Scope Lock: Start from Templates for standard layout consistency.',
          'Scope Lock/Estimate: Use Defaults to enforce material and cost assumptions.',
          'Estimate: Run Diagnostics when pricing or defaults behavior appears incorrect.',
          'Approval: Save milestone versions (concept, revision, final) with clear naming.',
          'Handoff: After each approved revision, print updated scope documentation.',
        ],
      },
    ],
  },
} as const;

export function PlannerWorkflowHelp({
  plannerType,
  userId,
  onOpenDesign,
  onOpenMaterials,
  onOpenTemplates,
  onOpenSaved,
  onOpenDefaults,
  onSwitch2D,
  onSwitch3D,
  onPrint,
  onOpenDiagnostics,
  onOpenModelLibrary,
}: PlannerWorkflowHelpProps) {
  const meta = plannerMeta[plannerType];

  return (
    <InteractiveModuleHelp
      moduleKey={meta.moduleKey}
      userId={userId}
      title={meta.title}
      description="Use guided workflow steps and one-click planner actions to move from design to estimate-ready output."
      moduleIcon={meta.icon}
      triggerLabel={`${meta.colorLabel} Help`}
      steps={[
        {
          title: 'Design the scope first',
          body: 'Start with geometry and core options so quantities reflect the real project before pricing review.',
        },
        {
          title: 'Validate materials and assumptions',
          body: 'Review material outputs and defaults together to prevent pricing drift between revisions.',
        },
        {
          title: 'Save, print, and hand off',
          body: 'Capture revisions in Saved Designs and produce printable plans for customer and operations alignment.',
        },
      ]}
      badges={[
        { label: 'Planner', value: meta.colorLabel },
        { label: 'Workflow', value: PROCESS_STAGES, variant: 'outline' },
      ]}
      actions={[
        {
          label: 'Open Design',
          icon: Layers,
          variant: 'outline',
          onClick: onOpenDesign,
        },
        {
          label: 'Open Materials',
          icon: Package,
          variant: 'outline',
          onClick: onOpenMaterials,
        },
        {
          label: 'Open Templates',
          icon: LayoutTemplate,
          variant: 'outline',
          onClick: onOpenTemplates,
        },
        {
          label: 'Open Saved Designs',
          icon: FileText,
          variant: 'outline',
          onClick: onOpenSaved,
        },
        {
          label: 'Open Defaults',
          icon: Settings,
          variant: 'outline',
          onClick: onOpenDefaults,
        },
        ...(onOpenDiagnostics
          ? [
              {
                label: 'Open Diagnostics',
                icon: FileTerminal,
                variant: 'outline' as const,
                onClick: onOpenDiagnostics,
              },
            ]
          : []),
        ...(onOpenModelLibrary
          ? [
              {
                label: 'Open 3D Models',
                icon: Box,
                variant: 'outline' as const,
                onClick: onOpenModelLibrary,
              },
            ]
          : []),
        {
          label: 'Switch to 2D View',
          icon: Layers,
          variant: 'outline',
          onClick: onSwitch2D,
        },
        {
          label: 'Switch to 3D View',
          icon: Box,
          variant: 'outline',
          onClick: onSwitch3D,
        },
        {
          label: 'Print Current Plan',
          icon: Printer,
          onClick: onPrint,
          fullWidth: true,
        },
      ]}
      howToGuides={meta.guides}
    />
  );
}