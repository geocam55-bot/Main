import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

interface DealsTabProps {
  opportunities: any[];
  users: any[];
}

export function DealsTab({ opportunities, users }: DealsTabProps) {
  const getUserName = (id: string) => {
    const user = users.find(u => u.id === id);
    return user ? (user.name || user.email) : 'Unassigned';
  };

  const getUserAvatar = (id: string) => {
    const user = users.find(u => u.id === id);
    return user ? (user.avatar_url || user.avatarUrl) : null;
  };

  const getInitials = (name: string) => {
    if (!name || name === 'Unknown' || name === 'Unassigned') return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const getRottenDays = (updatedAt: string) => {
    if (!updatedAt) return 0;
    const diff = new Date().getTime() - new Date(updatedAt).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const getProbability = (stage: string) => {
    // Calculate probability based on stage
    const stageLower = (stage || '').toLowerCase();
    if (['lead', 'draft'].includes(stageLower)) return '10%';
    if (['contact', 'pending'].includes(stageLower)) return '20%';
    if (['needs analysis', 'qualified'].includes(stageLower)) return '30%';
    if (['proposal', 'sent'].includes(stageLower)) return '50%';
    if (['negotiation', 'viewed', 'review'].includes(stageLower)) return '80%';
    if (['accepted', 'won', 'closed won'].includes(stageLower)) return '100%';
    if (['rejected', 'lost', 'closed lost'].includes(stageLower)) return '0%';
    return '25%'; // Default
  };
  
  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground bg-background border-b uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Owner</th>
                <th className="px-4 py-3 font-medium">Stage</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Label</th>
                <th className="px-4 py-3 font-medium text-right">Value</th>
                <th className="px-4 py-3 font-medium text-right">Probability</th>
                <th className="px-4 py-3 font-medium text-right">Rotten days</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {opportunities.map((opp) => {
                const rottenDays = getRottenDays(opp.updatedAt);
                const isRotten = rottenDays > 30;
                
                return (
                  <tr key={opp.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{opp.id.substring(0, 4)}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{opp.title}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={getUserAvatar(opp.ownerId)} alt={getUserName(opp.ownerId)} />
                          <AvatarFallback className="bg-blue-100 text-blue-700 text-[10px]">
                            {getInitials(getUserName(opp.ownerId))}
                          </AvatarFallback>
                        </Avatar>
                        <span>{getUserName(opp.ownerId)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-muted text-foreground">
                            {opp.stage || opp.status || 'Unknown'}
                        </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground capitalize">{opp.status}</td>
                    <td className="px-4 py-3">
                        <Badge variant="outline" className="font-normal text-muted-foreground">
                            {opp.type || 'Deal'}
                        </Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                        ${parseFloat(opp.value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                        {getProbability(opp.stage)}
                    </td>
                    <td className={`px-4 py-3 text-right ${isRotten ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                        {rottenDays > 0 ? rottenDays : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {opportunities.length === 0 && (
             <div className="p-8 text-center text-muted-foreground">
                 No deals found
             </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}