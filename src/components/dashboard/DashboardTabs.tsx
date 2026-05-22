import { Button } from "../ui/button";

interface DashboardTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function DashboardTabs({ activeTab, onTabChange }: DashboardTabsProps) {
  return (
    <div className="flex bg-blue-900 p-1 rounded-lg">
      <Button
        variant={activeTab === 'overview' ? 'secondary' : 'ghost'}
        className={`rounded-md text-sm font-medium px-6 py-1 h-8 ${
          activeTab === 'overview' 
            ? 'bg-blue-700 text-white hover:bg-blue-600' 
            : 'text-blue-100 hover:bg-blue-800 hover:text-white'
        }`}
        onClick={() => onTabChange('overview')}
      >
        Overview
      </Button>
      <Button
        variant={activeTab === 'agents' ? 'secondary' : 'ghost'}
        className={`rounded-md text-sm font-medium px-6 py-1 h-8 ${
          activeTab === 'agents' 
            ? 'bg-blue-700 text-white hover:bg-blue-600' 
            : 'text-blue-100 hover:bg-blue-800 hover:text-white'
        }`}
        onClick={() => onTabChange('agents')}
      >
        Team
      </Button>
      <Button
        variant={activeTab === 'deals' ? 'secondary' : 'ghost'}
        className={`rounded-md text-sm font-medium px-6 py-1 h-8 ${
          activeTab === 'deals' 
            ? 'bg-blue-700 text-white hover:bg-blue-600' 
            : 'text-blue-100 hover:bg-blue-800 hover:text-white'
        }`}
        onClick={() => onTabChange('deals')}
      >
        Deals
      </Button>
    </div>
  );
}
