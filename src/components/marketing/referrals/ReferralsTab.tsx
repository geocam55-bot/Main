import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { 
  Users, 
  Gift, 
  DollarSign, 
  Copy, 
  Plus, 
  Search, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  XCircle,
  Share2,
  AlertCircle
} from 'lucide-react';
import { ReferralSystemSetup } from './ReferralSystemSetup';
import { createClient } from '../../../utils/supabase/client';
import { toast } from 'sonner@2.0.3';
import type { User } from '../../../App';

interface ReferralsTabProps {
  user: User;
}

export function ReferralsTab({ user }: ReferralsTabProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [tableExists, setTableExists] = useState(false);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    converted: 0,
    pendingRewards: 0,
    paidRewards: 0
  });

  // Add Referral State
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newReferral, setNewReferral] = useState({
    referrer_contact_id: '',
    referred_lead_name: '',
    referred_lead_email: '',
    referred_lead_phone: '',
    notes: ''
  });
  const [contacts, setContacts] = useState<any[]>([]);

  useEffect(() => {
    checkTable();
  }, []);

  const checkTable = async () => {
    setIsLoading(true);
    const supabase = createClient();
    try {
      // Try to select from referrals table
      const { error } = await supabase.from('referrals').select('id').limit(1);
      
      if (error && (error.code === 'PGRST205' || error.message.includes('relation "referrals" does not exist'))) {
        setTableExists(false);
      } else {
        setTableExists(true);
        loadData();
        loadContacts();
      }
    } catch (e) {
      setTableExists(false);
    } finally {
      setIsLoading(false);
    }
  };

  const loadData = async () => {
    const supabase = createClient();
    
    // Load Referrals
    const { data: referralsData, error } = await supabase
      .from('referrals')
      .select(`
        *,
        referrer:referrer_contact_id(name, email),
        referred:referred_contact_id(name, email)
      `)
      .order('created_at', { ascending: false });

    if (referralsData) {
      setReferrals(referralsData);
      
      // Calculate stats
      const total = referralsData.length;
      const converted = referralsData.filter(r => r.status === 'converted' || r.status === 'reward_paid' || r.status === 'reward_due').length;
      const pendingRewards = referralsData
        .filter(r => r.status === 'reward_due')
        .reduce((sum, r) => sum + (Number(r.reward_amount) || 0), 0);
      const paidRewards = referralsData
        .filter(r => r.status === 'reward_paid')
        .reduce((sum, r) => sum + (Number(r.reward_amount) || 0), 0);

      setStats({
        total,
        converted,
        pendingRewards,
        paidRewards
      });
    }
  };

  const loadContacts = async () => {
    const supabase = createClient();
    const { data } = await supabase.from('contacts').select('id, name, email').order('name');
    if (data) setContacts(data);
  };

  const handleAddReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();

    try {
      const { error } = await supabase.from('referrals').insert({
        organization_id: user.organizationId,
        referrer_contact_id: newReferral.referrer_contact_id,
        referred_lead_name: newReferral.referred_lead_name,
        referred_lead_email: newReferral.referred_lead_email,
        referred_lead_phone: newReferral.referred_lead_phone,
        notes: newReferral.notes,
        status: 'new'
      });

      if (error) throw error;

      toast.success('Referral logged successfully');
      setIsAddDialogOpen(false);
      setNewReferral({
        referrer_contact_id: '',
        referred_lead_name: '',
        referred_lead_email: '',
        referred_lead_phone: '',
        notes: ''
      });
      loadData();
    } catch (error: any) {
      toast.error('Failed to add referral: ' + error.message);
    }
  };

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    const supabase = createClient();
    // If setting to converted or reward_due, maybe ask for amount? 
    // For simplicity, just update status
    
    let updates: any = { status: newStatus };
    if (newStatus === 'reward_due' || newStatus === 'converted') {
        // Default reward amount if not set? 
        // For now, let's just assume 100 if it's 0
        const currentRef = referrals.find(r => r.id === id);
        if (!currentRef.reward_amount) {
            updates.reward_amount = 100; // Default reward
        }
    }

    const { error } = await supabase.from('referrals').update(updates).eq('id', id);
    if (error) {
        toast.error('Failed to update status');
    } else {
        toast.success('Status updated');
        loadData();
    }
  };

  if (isLoading) {
    return (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4"></div>
            <p>Checking referral system...</p>
        </div>
    );
  }

  if (!tableExists) {
    return <ReferralSystemSetup onComplete={checkTable} />;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Referrals</p>
                <h3 className="text-2xl font-bold mt-2">{stats.total}</h3>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <div className="mt-2 flex items-center text-sm text-green-600">
              <TrendingUp className="h-4 w-4 mr-1" />
              <span>{stats.total > 0 ? ((stats.converted / stats.total) * 100).toFixed(0) : 0}% Conversion Rate</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Rewards</p>
                <h3 className="text-2xl font-bold mt-2">${stats.pendingRewards}</h3>
              </div>
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">To be paid out</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Rewards Paid</p>
                <h3 className="text-2xl font-bold mt-2">${stats.paidRewards}</h3>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">Lifetime value shared</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-600 to-indigo-600 text-white">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-purple-100">Top Referrer</p>
                <h3 className="text-xl font-bold mt-2">
                    {referrals.length > 0 
                        ? referrals.sort((a,b) => 
                            referrals.filter(r => r.referrer_contact_id === b.referrer_contact_id).length - 
                            referrals.filter(r => r.referrer_contact_id === a.referrer_contact_id).length
                          )[0]?.referrer?.name || '--'
                        : '--'}
                </h3>
              </div>
              <div className="p-2 bg-background/20 rounded-lg">
                <Gift className="h-5 w-5 text-white" />
              </div>
            </div>
            <p className="mt-2 text-sm text-purple-100">Most active advocate</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-foreground">Referral Activity</h2>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Log Manual Referral
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] bg-background">
            <DialogHeader>
              <DialogTitle>Log New Referral</DialogTitle>
              <DialogDescription>
                Record a referral manually when a customer recommends someone.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddReferral} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="referrer">Referred By (Existing Customer)</Label>
                <Select 
                    value={newReferral.referrer_contact_id} 
                    onValueChange={(val) => setNewReferral({...newReferral, referrer_contact_id: val})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer..." />
                  </SelectTrigger>
                  <SelectContent>
                    {contacts.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="leadName">New Lead Name</Label>
                <Input 
                    id="leadName" 
                    value={newReferral.referred_lead_name}
                    onChange={(e) => setNewReferral({...newReferral, referred_lead_name: e.target.value})}
                    placeholder="John Doe"
                    required 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="leadEmail">Lead Email</Label>
                    <Input 
                        id="leadEmail" 
                        type="email"
                        value={newReferral.referred_lead_email}
                        onChange={(e) => setNewReferral({...newReferral, referred_lead_email: e.target.value})}
                        placeholder="john@example.com"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="leadPhone">Lead Phone</Label>
                    <Input 
                        id="leadPhone" 
                        value={newReferral.referred_lead_phone}
                        onChange={(e) => setNewReferral({...newReferral, referred_lead_phone: e.target.value})}
                        placeholder="(555) 123-4567"
                    />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Input 
                    id="notes" 
                    value={newReferral.notes}
                    onChange={(e) => setNewReferral({...newReferral, notes: e.target.value})}
                    placeholder="E.g., Neighbor of John, interested in deck"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" type="button" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                <Button type="submit">Save Referral</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground bg-muted border-b">
                <tr>
                  <th className="px-6 py-3 font-medium">Referrer</th>
                  <th className="px-6 py-3 font-medium">Referred Lead</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Reward</th>
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {referrals.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                        <div className="flex flex-col items-center justify-center gap-2">
                            <Share2 className="h-8 w-8 text-gray-300" />
                            <p>No referrals found yet.</p>
                            <p className="text-xs">Start by logging a manual referral above.</p>
                        </div>
                    </td>
                  </tr>
                ) : (
                  referrals.map((referral) => (
                    <tr key={referral.id} className="bg-background border-b hover:bg-muted transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-foreground">{referral.referrer?.name || 'Unknown'}</div>
                        <div className="text-xs text-muted-foreground">{referral.referrer?.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-foreground">{referral.referred_lead_name || referral.referred?.name || 'Unknown'}</div>
                        <div className="text-xs text-muted-foreground">{referral.referred_lead_email || referral.referred?.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusSelect 
                            status={referral.status} 
                            onChange={(s) => handleStatusUpdate(referral.id, s)} 
                        />
                      </td>
                      <td className="px-6 py-4 font-medium">
                        ${referral.reward_amount}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {new Date(referral.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="sm">Edit</Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusSelect({ status, onChange }: { status: string, onChange: (s: string) => void }) {
  const styles: Record<string, string> = {
    new: 'bg-muted text-foreground hover:bg-muted',
    engaged: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
    converted: 'bg-purple-100 text-purple-800 hover:bg-purple-200',
    reward_due: 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200',
    reward_paid: 'bg-green-100 text-green-800 hover:bg-green-200',
    inactive: 'bg-red-100 text-red-800 hover:bg-red-200'
  };

  return (
    <Select value={status} onValueChange={onChange}>
        <SelectTrigger className={`w-[130px] h-8 text-xs border-0 ${styles[status] || styles.new}`}>
            <SelectValue />
        </SelectTrigger>
        <SelectContent>
            <SelectItem value="new">New Lead</SelectItem>
            <SelectItem value="engaged">Engaged</SelectItem>
            <SelectItem value="converted">Converted</SelectItem>
            <SelectItem value="reward_due">Reward Due</SelectItem>
            <SelectItem value="reward_paid">Paid</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
        </SelectContent>
    </Select>
  );
}