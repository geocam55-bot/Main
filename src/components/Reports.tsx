import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  TrendingUp, 
  FileText, 
  Users, 
  CheckSquare, 
  Mail, 
  MessageSquare,
  BarChart3,
  DollarSign
} from 'lucide-react';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { BidProposalReports } from './reports/BidProposalReports';
import { ManagerSummaryReports } from './reports/ManagerSummaryReports';
import { ReportsModuleHelp } from './ReportsModuleHelp';
import type { User } from '../App';
import { PermissionGate } from './PermissionGate';

interface ReportsProps {
  user: User;
}

export function Reports({ user }: ReportsProps) {
  const [activeTab, setActiveTab] = useState('summary');
  const [showCost, setShowCost] = useState(false);

  return (
    <PermissionGate user={user} module="reports" action="view">
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4">
        <ReportsModuleHelp
          userId={user.id}
          onOpenSummary={() => setActiveTab('summary')}
          onOpenDeals={() => setActiveTab('bids')}
          onShowSellingPrice={() => setShowCost(false)}
          onShowCost={() => setShowCost(true)}
        />
        {/* Price/Cost Toggle Switch */}
        <div className="flex items-center gap-3 bg-background border border-border rounded-lg px-4 py-2.5 shadow-sm">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <div className="flex items-center gap-2">
            <Label 
              htmlFor="price-toggle" 
              className={`text-sm cursor-pointer transition-colors ${!showCost ? 'text-foreground' : 'text-muted-foreground'}`}
            >
              Selling Price
            </Label>
            <Switch
              id="price-toggle"
              checked={showCost}
              onCheckedChange={setShowCost}
            />
            <Label 
              htmlFor="price-toggle" 
              className={`text-sm cursor-pointer transition-colors ${showCost ? 'text-foreground' : 'text-muted-foreground'}`}
            >
              Cost
            </Label>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex w-auto min-w-full lg:grid lg:w-full lg:grid-cols-2">
            <TabsTrigger value="summary" className="flex items-center gap-1.5 whitespace-nowrap px-3 sm:px-4">
              <BarChart3 className="h-4 w-4 flex-shrink-0" />
              <span className="text-xs sm:text-sm">Summary</span>
            </TabsTrigger>
            <TabsTrigger value="bids" className="flex items-center gap-1.5 whitespace-nowrap px-3 sm:px-4">
              <FileText className="h-4 w-4 flex-shrink-0" />
              <span className="text-xs sm:text-sm">Deals</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="summary" className="mt-6">
          <ManagerSummaryReports user={user} showCost={showCost} />
        </TabsContent>

        <TabsContent value="bids" className="mt-6">
          <BidProposalReports user={user} showCost={showCost} />
        </TabsContent>
      </Tabs>
    </div>
    </PermissionGate>
  );
}