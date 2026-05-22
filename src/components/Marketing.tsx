import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { 
  Mail, 
  MessageSquare, 
  TrendingUp, 
  Users, 
  Target,
  Zap,
  BarChart3,
  Globe,
  Plus
} from 'lucide-react';
import { MarketingDashboard } from './marketing/MarketingDashboard';
import { CampaignManager } from './marketing/CampaignManager';
import { LeadScoring } from './marketing/LeadScoring';
import { JourneyBuilder } from './marketing/JourneyBuilder';
import { LandingPageBuilder } from './marketing/LandingPageBuilder';
import { MarketingAnalytics } from './marketing/MarketingAnalytics';
import { ReferralsTab } from './marketing/referrals/ReferralsTab';
import type { User } from '../App';
import { PermissionGate } from './PermissionGate';
import { MarketingModuleHelp } from './MarketingModuleHelp';

interface MarketingProps {
  user: User;
  accessToken?: string;
}

export function Marketing({ user, accessToken }: MarketingProps) {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <PermissionGate user={user} module="marketing" action="view">
    <div className="p-6 space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex justify-end">
          <MarketingModuleHelp
            userId={user.id}
            activeTab={activeTab}
            onOpenDashboard={() => setActiveTab('dashboard')}
            onOpenCampaigns={() => setActiveTab('campaigns')}
            onOpenLeads={() => setActiveTab('leads')}
            onOpenJourneys={() => setActiveTab('journeys')}
            onOpenLandingPages={() => setActiveTab('pages')}
            onOpenAnalytics={() => setActiveTab('analytics')}
          />
        </div>
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex w-auto min-w-full lg:grid lg:w-full lg:grid-cols-7">
            <TabsTrigger value="dashboard" className="flex items-center gap-1.5 whitespace-nowrap px-3 sm:px-4">
              <BarChart3 className="h-4 w-4 flex-shrink-0" />
              <span className="text-xs sm:text-sm">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="flex items-center gap-1.5 whitespace-nowrap px-3 sm:px-4">
              <Mail className="h-4 w-4 flex-shrink-0" />
              <span className="text-xs sm:text-sm">Campaigns</span>
            </TabsTrigger>
            <TabsTrigger value="leads" className="flex items-center gap-1.5 whitespace-nowrap px-3 sm:px-4">
              <Target className="h-4 w-4 flex-shrink-0" />
              <span className="text-xs sm:text-sm">Lead Scoring</span>
            </TabsTrigger>
            <TabsTrigger value="journeys" className="flex items-center gap-1.5 whitespace-nowrap px-3 sm:px-4">
              <Zap className="h-4 w-4 flex-shrink-0" />
              <span className="text-xs sm:text-sm">Journeys</span>
            </TabsTrigger>
            <TabsTrigger value="pages" className="flex items-center gap-1.5 whitespace-nowrap px-3 sm:px-4">
              <Globe className="h-4 w-4 flex-shrink-0" />
              <span className="text-xs sm:text-sm">Landing Pages</span>
            </TabsTrigger>
            <TabsTrigger value="referrals" className="flex items-center gap-1.5 whitespace-nowrap px-3 sm:px-4">
              <Users className="h-4 w-4 flex-shrink-0" />
              <span className="text-xs sm:text-sm">Referrals</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-1.5 whitespace-nowrap px-3 sm:px-4">
              <TrendingUp className="h-4 w-4 flex-shrink-0" />
              <span className="text-xs sm:text-sm">Analytics</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="dashboard" className="mt-6">
          <MarketingDashboard user={user} />
        </TabsContent>

        <TabsContent value="campaigns" className="mt-6">
          <CampaignManager user={user} />
        </TabsContent>

        <TabsContent value="leads" className="mt-6">
          <LeadScoring user={user} />
        </TabsContent>

        <TabsContent value="journeys" className="mt-6">
          <JourneyBuilder user={user} />
        </TabsContent>

        <TabsContent value="pages" className="mt-6">
          <LandingPageBuilder user={user} accessToken={accessToken} />
        </TabsContent>

        <TabsContent value="referrals" className="mt-6">
          <ReferralsTab user={user} />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <MarketingAnalytics user={user} />
        </TabsContent>
      </Tabs>
    </div>
    </PermissionGate>
  );
}