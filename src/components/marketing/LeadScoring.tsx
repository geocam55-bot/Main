import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Badge } from '../ui/badge';
import { Plus, TrendingUp, Star, Mail, MousePointer, FileText, Calendar, Edit, Trash2 } from 'lucide-react';
import { Slider } from '../ui/slider';
import type { User } from '../../App';
import { getLeadScores, getLeadScoreStats, getScoringRules, createScoringRule, deleteScoringRule } from '../../utils/marketing-client';
import { toast } from 'sonner@2.0.3';

interface LeadScoringProps {
  user: User;
}

export function LeadScoring({ user }: LeadScoringProps) {
  const [isCreateRuleOpen, setIsCreateRuleOpen] = useState(false);
  const [leads, setLeads] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [scoringRules, setScoringRules] = useState<any[]>([]);
  const [newRuleAction, setNewRuleAction] = useState('');
  const [newRuleCategory, setNewRuleCategory] = useState('');
  const [newRulePoints, setNewRulePoints] = useState(10);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user.organization_id) {
      loadData();
    }
  }, [user.organization_id]);

  const loadData = async () => {
    try {
      const [leadsData, statsData, rulesData] = await Promise.all([
        getLeadScores(user.organization_id!),
        getLeadScoreStats(user.organization_id!),
        getScoringRules(user.organization_id!)
      ]);
      setLeads(leadsData);
      setStats(statsData);
      setScoringRules(rulesData);
    } catch (error) {
      // Handle silently
    }
  };

  const handleCreateRule = async () => {
    if (!newRuleAction) {
      toast.error('Please select an action/behavior');
      return;
    }
    if (!newRuleCategory) {
      toast.error('Please select a category');
      return;
    }
    if (!user.organization_id) {
      toast.error('No organization found');
      return;
    }

    setIsSaving(true);
    try {
      const actionLabels: Record<string, string> = {
        email_open: 'Email Opened',
        link_click: 'Link Clicked',
        form_submit: 'Form Submitted',
        page_visit: 'Page Visit',
        demo_request: 'Demo Requested',
        download: 'Downloaded Resource',
      };

      await createScoringRule(
        {
          action: actionLabels[newRuleAction] || newRuleAction,
          category: newRuleCategory as any,
          points: newRulePoints,
        },
        user.organization_id
      );

      toast.success('Scoring rule created successfully');
      setIsCreateRuleOpen(false);
      setNewRuleAction('');
      setNewRuleCategory('');
      setNewRulePoints(10);
      await loadData();
    } catch (error: any) {
      toast.error(`Failed to create scoring rule: ${error.message || error}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      await deleteScoringRule(ruleId);
      toast.success('Scoring rule deleted');
      await loadData();
    } catch (error: any) {
      toast.error(`Failed to delete rule: ${error.message || error}`);
    }
  };

  // Use real leads if available, otherwise show empty state or fallback
  const displayLeads = leads.length > 0 ? leads.map(lead => ({
    id: lead.id,
    name: lead.contacts ? `${lead.contacts.first_name || ''} ${lead.contacts.last_name || ''}`.trim() || lead.contacts.email : 'Unknown Contact',
    email: lead.contacts?.email || '',
    company: lead.contacts?.company || '',
    score: lead.score,
    status: lead.status?.charAt(0).toUpperCase() + lead.status?.slice(1) || 'Unscored',
    lastActivity: lead.last_activity ? new Date(lead.last_activity).toLocaleDateString() : 'N/A'
  })) : [];

  const displaySegments = stats?.segments || [
    { name: 'Hot Leads (80-100)', count: 0, percentage: 0 },
    { name: 'Warm Leads (50-79)', count: 0, percentage: 0 },
    { name: 'Cold Leads (1-49)', count: 0, percentage: 0 },
    { name: 'Unscored', count: 0, percentage: 0 },
  ];

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-red-600';
    if (score >= 50) return 'text-orange-600';
    return 'text-blue-600';
  };


  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Hot':
        return 'bg-red-100 text-red-700';
      case 'Warm':
        return 'bg-orange-100 text-orange-700';
      case 'Cold':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-muted text-foreground';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl text-foreground">Lead Scoring</h2>
          <p className="text-sm text-muted-foreground mt-1">Automatically score and prioritize leads based on behavior</p>
        </div>
        <Dialog open={isCreateRuleOpen} onOpenChange={setIsCreateRuleOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Scoring Rule
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Scoring Rule</DialogTitle>
              <DialogDescription>Define a new rule to score leads based on their actions.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Action/Behavior</Label>
                <Select value={newRuleAction} onValueChange={setNewRuleAction}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email_open">Email Opened</SelectItem>
                    <SelectItem value="link_click">Link Clicked</SelectItem>
                    <SelectItem value="form_submit">Form Submitted</SelectItem>
                    <SelectItem value="page_visit">Page Visit</SelectItem>
                    <SelectItem value="demo_request">Demo Requested</SelectItem>
                    <SelectItem value="download">Downloaded Resource</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={newRuleCategory} onValueChange={setNewRuleCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="engagement">Engagement</SelectItem>
                    <SelectItem value="interest">Interest</SelectItem>
                    <SelectItem value="intent">Purchase Intent</SelectItem>
                    <SelectItem value="conversion">Conversion</SelectItem>
                    <SelectItem value="decay">Score Decay</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Points ({newRulePoints})</Label>
                <Slider value={[newRulePoints]} onValueChange={(val) => setNewRulePoints(val[0])} max={100} min={-50} step={5} />
                <p className="text-xs text-muted-foreground">Use negative values for score decay</p>
              </div>
              <div className="flex gap-2 mt-6">
                <Button variant="outline" onClick={() => setIsCreateRuleOpen(false)} className="flex-1">
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleCreateRule} disabled={isSaving}>
                  {isSaving ? 'Creating...' : 'Create Rule'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scoring Rules */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Scoring Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {scoringRules.map((rule) => (
                  <div key={rule.id} className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-lg ${
                        rule.points > 0 ? 'bg-green-100' : 'bg-red-100'
                      } flex items-center justify-center`}>
                        <span className={`text-sm ${
                          rule.points > 0 ? 'text-green-700' : 'text-red-700'
                        }`}>
                          {rule.points > 0 ? '+' : ''}{rule.points}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm text-foreground">{rule.action}</p>
                        <p className="text-xs text-muted-foreground">{rule.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteRule(rule.id)}>
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lead Segments */}
        <Card>
          <CardHeader>
            <CardTitle>Lead Segments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {displaySegments.map((segment, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-foreground">{segment.name}</span>
                    <span className="text-sm text-muted-foreground">{segment.count}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500"
                      style={{ width: `${segment.percentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{segment.percentage}% of total leads</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Scoring Leads */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Top Scoring Leads</CardTitle>
            <Button variant="outline" size="sm">View All</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm text-muted-foreground">Lead</th>
                  <th className="text-left py-3 px-4 text-sm text-muted-foreground">Company</th>
                  <th className="text-left py-3 px-4 text-sm text-muted-foreground">Score</th>
                  <th className="text-left py-3 px-4 text-sm text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-4 text-sm text-muted-foreground">Last Activity</th>
                  <th className="text-left py-3 px-4 text-sm text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayLeads.length > 0 ? (
                  displayLeads.map((lead) => (
                    <tr key={lead.id} className="border-b border-border hover:bg-muted">
                      <td className="py-3 px-4">
                        <div>
                          <p className="text-sm text-foreground">{lead.name}</p>
                          <p className="text-xs text-muted-foreground">{lead.email}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-muted-foreground">{lead.company}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Star className={`h-4 w-4 ${getScoreColor(lead.score)}`} />
                          <span className={`text-lg ${getScoreColor(lead.score)}`}>{lead.score}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={getStatusBadge(lead.status)}>{lead.status}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-muted-foreground">{lead.lastActivity}</span>
                      </td>
                      <td className="py-3 px-4">
                        <Button variant="outline" size="sm">Contact</Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-muted-foreground">
                      No leads scored yet. Interaction with quotes will appear here.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* AI Insights */}
      <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-purple-600" />
            <CardTitle>AI-Powered Insights</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-3 bg-background rounded-lg">
              <p className="text-sm text-foreground">💡 Leads who visit the pricing page 3+ times are 5x more likely to convert. Consider increasing scoring weight.</p>
            </div>
            <div className="p-3 bg-background rounded-lg">
              <p className="text-sm text-foreground">🎯 Your "Hot Leads" segment has a 67% higher conversion rate. Prioritize immediate follow-up.</p>
            </div>
            <div className="p-3 bg-background rounded-lg">
              <p className="text-sm text-foreground">📊 Leads scoring 80+ typically convert within 7 days. Create urgency-based campaigns for this segment.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}