import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { ExplicitChartContainer } from "../ui/ExplicitChartContainer";
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';

interface AgentsTabProps {
  opportunities: any[];
  users: any[]; // List of user profiles { id, name, ... }
}

export function AgentsTab({ opportunities, users }: AgentsTabProps) {
  
  const getInitials = (name: string) => {
    if (!name || name === 'Unknown' || name === 'Unassigned') return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const agentMetrics = useMemo(() => {
    const metrics: Record<string, any> = {};

    // Initialize metrics for all users (even those with no deals)
    users.forEach(user => {
      metrics[user.id] = {
        id: user.id,
        name: user.name || user.email || 'Unknown',
        avatar: user.avatar_url || user.avatarUrl,
        closedAmount: 0,
        dealsCount: 0,
        openDeals: 0,
        lostDeals: 0,
        wonDeals: 0,
        totalDuration: 0, // For avg days to close
        closedCount: 0, // For avg days to close
        totalOpenAge: 0, // For avg open deal age
        openDealsCount: 0, // For avg open deal age
        stages: {} as Record<string, number>
      };
    });

    // Process opportunities
    opportunities.forEach(opp => {
      const ownerId = opp.ownerId || 'unassigned';
      if (!metrics[ownerId]) {
        // Handle unassigned or unknown users
        metrics[ownerId] = {
            id: ownerId,
            name: 'Unassigned',
            avatar: null,
            closedAmount: 0,
            dealsCount: 0,
            openDeals: 0,
            lostDeals: 0,
            wonDeals: 0,
            totalDuration: 0, 
            closedCount: 0,
            totalOpenAge: 0,
            openDealsCount: 0,
            stages: {}
        };
      }

      const m = metrics[ownerId];
      m.dealsCount++;

      const status = (opp.status || '').toLowerCase();
      const value = parseFloat(opp.value) || 0;
      
      // Handle snake_case vs camelCase
      const createdStr = opp.created_at || opp.createdAt;
      const updatedStr = opp.updated_at || opp.updatedAt;
      
      const createdAt = createdStr ? new Date(createdStr).getTime() : 0;
      const updatedAt = updatedStr ? new Date(updatedStr).getTime() : 0;
      
      // Stage counting for chart
      // Use status as stage for now since they are often mixed
      const stageName = opp.stage || opp.status || 'Unknown';
      m.stages[stageName] = (m.stages[stageName] || 0) + 1;

      if (status === 'won' || status === 'accepted' || status === 'closed won') {
        m.wonDeals++;
        m.closedAmount += value;
        
        // Avg days to close
        if (createdAt && updatedAt) {
             const days = (updatedAt - createdAt) / (1000 * 60 * 60 * 24);
             if (days >= 0) {
                m.totalDuration += days;
                m.closedCount++;
             }
        } else if (createdAt && !updatedAt) {
             // Fallback: if won but no update date, assume closed now? 
             // Or better to skip to avoid skewing data with 0 if we assume instant close?
             // Actually, if we use current time it might be wrong.
             // If we use 0 (instant close), it lowers the average.
             // Let's assume instant close (0 days) if missing updated date but has created date
             // m.closedCount++;
             // Actually, let's just skip invalid data to be safe.
        }
      } else if (status === 'lost' || status === 'rejected' || status === 'closed lost') {
        m.lostDeals++;
        // Also counts towards closed deals for duration
        if (createdAt && updatedAt) {
             const days = (updatedAt - createdAt) / (1000 * 60 * 60 * 24);
             if (days >= 0) {
                m.totalDuration += days;
                m.closedCount++;
             }
        }
      } else {
        m.openDeals++;
        // Avg open deal age
        if (createdAt) {
             const now = new Date().getTime();
             const days = (now - createdAt) / (1000 * 60 * 60 * 24);
             if (days >= 0) {
                m.totalOpenAge += days;
                m.openDealsCount++;
             }
        }
      }
    });

    return Object.values(metrics).map(m => {
        const totalClosed = m.wonDeals + m.lostDeals;
        const winRate = totalClosed > 0 ? (m.wonDeals / totalClosed) * 100 : 0;
        const closeRate = m.dealsCount > 0 ? (m.wonDeals / m.dealsCount) * 100 : 0;
        const avgDaysToClose = m.closedCount > 0 ? m.totalDuration / m.closedCount : 0;
        const avgOpenDealAge = m.openDealsCount > 0 ? m.totalOpenAge / m.openDealsCount : 0;

        return {
            ...m,
            winRate,
            closeRate,
            avgDaysToClose,
            avgOpenDealAge
        };
    }).sort((a, b) => b.closedAmount - a.closedAmount); // Sort by revenue by default
  }, [opportunities, users]);

  // Data for chart
  const chartData = agentMetrics.map(agent => {
    // Flatten stages into the object
    const stageData: any = { name: agent.name };
    Object.entries(agent.stages).forEach(([stage, count]) => {
        stageData[stage] = count;
    });
    return stageData;
  });

  // Get all unique stages for chart keys
  const allStages = Array.from(new Set(opportunities.map(o => o.stage || o.status || 'Unknown')));
  const COLORS = ['#0ea5e9', '#22c55e', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'];

  return (
    <div className="space-y-6">
      {/* Agents Table */}
      <Card className="border-0 shadow-sm overflow-hidden min-w-0">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground bg-background border-b">
                <tr>
                  <th className="px-4 py-3 font-medium">Owner</th>
                  <th className="px-4 py-3 font-medium text-right">Closed amount</th>
                  <th className="px-4 py-3 font-medium text-right">Deals</th>
                  <th className="px-4 py-3 font-medium text-right">Open deals</th>
                  <th className="px-4 py-3 font-medium text-right">Lost deals</th>
                  <th className="px-4 py-3 font-medium text-right">Won deals</th>
                  <th className="px-4 py-3 font-medium text-right">Win rate</th>
                  <th className="px-4 py-3 font-medium text-right">Close rate</th>
                  <th className="px-4 py-3 font-medium text-right">Avg days to close</th>
                  <th className="px-4 py-3 font-medium text-right">Avg open deal age</th>
                </tr>
              </thead>
              <tbody>
                {agentMetrics.map((agent, i) => (
                  <tr key={agent.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="px-4 py-3 font-medium text-foreground">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-16 w-16">
                          <AvatarImage src={agent.avatar} alt={agent.name} />
                          <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                            {getInitials(agent.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span>{agent.name}</span>
                      </div>
                    </td>
                    
                    {/* Closed Amount - Blue heatmap background simulation */}
                    <td className="px-4 py-3 text-right font-medium" style={{ backgroundColor: `rgba(59, 130, 246, ${Math.min(agent.closedAmount / 100000, 0.3)})` }}>
                        ${(agent.closedAmount / 1000).toFixed(2)}K
                    </td>
                    
                    {/* Deals - Green heatmap */}
                    <td className="px-4 py-3 text-right" style={{ backgroundColor: `rgba(34, 197, 94, ${Math.min(agent.dealsCount / 50, 0.3)})` }}>
                        {agent.dealsCount}
                    </td>
                    
                    <td className="px-4 py-3 text-right bg-muted">{agent.openDeals}</td>
                    <td className="px-4 py-3 text-right bg-orange-50">{agent.lostDeals}</td>
                    <td className="px-4 py-3 text-right bg-blue-50">{agent.wonDeals}</td>
                    
                    {/* Win Rate */}
                    <td className="px-4 py-3 text-right" style={{ 
                        backgroundColor: agent.winRate > 20 ? 'rgba(34, 197, 94, 0.2)' : agent.winRate < 10 ? 'rgba(239, 68, 68, 0.1)' : 'transparent' 
                    }}>
                        {agent.winRate.toFixed(2)}%
                    </td>
                    
                    <td className="px-4 py-3 text-right">{agent.closeRate.toFixed(2)}%</td>
                    <td className="px-4 py-3 text-right bg-red-50">{agent.avgDaysToClose.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right bg-sky-50">{agent.avgOpenDealAge.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Sales Pipeline by Agent Chart */}
      <Card className="border-0 shadow-sm min-w-0">
        <CardHeader>
          <CardTitle className="text-foreground text-lg">Sales pipeline by agent</CardTitle>
        </CardHeader>
        <CardContent>
            {/* Using absolute positioning trick to fix Recharts width issue */}
            <div className="relative h-[400px] w-full min-w-0">
              <div className="absolute inset-0">
                <ExplicitChartContainer key="agents-chart-container">
                    <BarChart
                        key="agents-barchart"
                        layout="vertical"
                        data={chartData}
                        margin={{ top: 20, right: 30, left: 40, bottom: 5 }}
                    >
                        <CartesianGrid key="agents-grid" strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                        <XAxis key="agents-xaxis" type="number" hide />
                        <YAxis key="agents-yaxis" dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
                        <Tooltip key="agents-tooltip" />
                        <Legend key="agents-legend" wrapperStyle={{paddingTop: '20px'}} />
                        {allStages.map((stage, index) => (
                            <Bar 
                                key={`agents-bar-${(stage || 'unknown').toString().replace(/\s+/g, '-')}`} 
                                dataKey={stage as string} 
                                stackId="a" 
                                fill={COLORS[index % COLORS.length]} 
                                radius={index === allStages.length - 1 ? [0, 4, 4, 0] : [0, 0, 0, 0]}
                            />
                        ))}
                    </BarChart>
                </ExplicitChartContainer>
              </div>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}