import { BarChart3, DollarSign, FileText, LineChart, Settings2 } from 'lucide-react';
import { InteractiveModuleHelp } from './InteractiveModuleHelp';

interface ReportsModuleHelpProps {
  userId: string;
  onOpenSummary: () => void;
  onOpenDeals: () => void;
  onShowSellingPrice: () => void;
  onShowCost: () => void;
}

export function ReportsModuleHelp({
  userId,
  onOpenSummary,
  onOpenDeals,
  onShowSellingPrice,
  onShowCost,
}: ReportsModuleHelpProps) {
  const processStages = 'Discovery -> Scope Lock -> Estimate -> Approval -> Handoff';

  return (
    <InteractiveModuleHelp
      moduleKey="reports-help"
      userId={userId}
      title="Reports Module Interactive Help"
      description="Use summary and deals analytics to validate performance and support decision-ready handoffs."
      moduleIcon={LineChart}
      triggerLabel="Reports Help"
      steps={[
        {
          title: 'Discovery and Scope Lock',
          body: 'Pick the correct report tab and pricing mode before analyzing trends or sharing outputs.',
        },
        {
          title: 'Estimate and Validate',
          body: 'Compare summary KPIs and deal metrics to validate assumptions and performance signals.',
        },
        {
          title: 'Approval and Handoff',
          body: 'Share aligned report views with leadership and operations for execution-ready decisions.',
        },
      ]}
      badges={[
        { label: 'Workflow', value: processStages, variant: 'outline' },
      ]}
      actions={[
        { label: 'Open Summary Report', icon: BarChart3, variant: 'outline', onClick: onOpenSummary },
        { label: 'Open Deals Report', icon: FileText, variant: 'outline', onClick: onOpenDeals },
        { label: 'Show Selling Price View', icon: DollarSign, variant: 'outline', onClick: onShowSellingPrice },
        { label: 'Show Cost View', icon: Settings2, variant: 'outline', onClick: onShowCost },
      ]}
      howToGuides={[
        {
          title: 'How to run a quick executive report review',
          steps: [
            'Discovery: Open Summary Report and select the relevant pricing mode.',
            'Scope Lock: Confirm KPI context (period, team, and module scope assumptions).',
            'Estimate: Compare trend direction and outliers across core metrics.',
            'Approval: Open Deals Report to validate pipeline and conversion implications.',
            'Handoff: Share key findings with owners and next actions.',
          ],
        },
        {
          title: 'How to compare selling price and cost views safely',
          steps: [
            'Discovery: Start from the same tab before changing the view mode.',
            'Scope Lock: Toggle Selling Price and Cost one at a time for apples-to-apples comparison.',
            'Estimate: Record major metric deltas between pricing modes.',
            'Approval: Validate conclusions with Deals Report context.',
            'Handoff: Publish final view assumptions with your report notes.',
          ],
        },
      ]}
    />
  );
}