import React, { useState, useEffect } from 'react';
import { createClient } from '../../utils/supabase/client';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Button } from '../ui/button';
import { Plus, Target, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';

interface Opportunity {
  id: string;
  title: string;
  customer_id: string;
  customer_name?: string;
  status: string;
  value: number;
}

interface OpportunitySelectorProps {
  organizationId: string;
  selectedOpportunity: Opportunity | null;
  onOpportunitySelect: (opportunity: Opportunity | null) => void;
  customerId?: string; // Optional: filter opportunities by customer
}

export function OpportunitySelector({
  organizationId,
  selectedOpportunity,
  onOpportunitySelect,
  customerId
}: OpportunitySelectorProps) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newOppTitle, setNewOppTitle] = useState('');
  const [newOppDescription, setNewOppDescription] = useState('');
  const [newOppValue, setNewOppValue] = useState('');

  useEffect(() => {
    if (organizationId && customerId) {
      loadOpportunities();
    } else {
      // Clear opportunities if no customer is selected
      setOpportunities([]);
    }
  }, [organizationId, customerId]);

  const loadOpportunities = async () => {
    // Only load if we have both organizationId and customerId
    if (!customerId) {
      setOpportunities([]);
      return;
    }

    setIsLoading(true);
    try {
      const supabase = createClient();
      const query = supabase
        .from('opportunities')
        .select(`
          id,
          title,
          customer_id,
          status,
          value
        `)
        .eq('organization_id', organizationId)
        .eq('customer_id', customerId)
        .in('status', ['open', 'in_progress'])
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      // Fetch customer names
      const oppsWithCustomers = await Promise.all(
        (data || []).map(async (opp) => {
          const { data: contact } = await supabase
            .from('contacts')
            .select('name')
            .eq('id', opp.customer_id)
            .single();

          return {
            ...opp,
            customer_name: contact?.name || 'Unknown Customer'
          };
        })
      );

      setOpportunities(oppsWithCustomers);
    } catch (error) {
      // Error loading opportunities
    } finally {
      setIsLoading(false);
    }
  };

  const createOpportunity = async () => {
    if (!newOppTitle.trim() || !customerId) {
      return;
    }

    setIsCreating(true);
    try {
      const supabase = createClient();
      
      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('opportunities')
        .insert({
          organization_id: organizationId,
          customer_id: customerId,
          title: newOppTitle.trim(),
          description: newOppDescription.trim() || null,
          value: parseFloat(newOppValue) || 0,
          status: 'open',
          owner_id: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Fetch customer name
      const { data: contact } = await supabase
        .from('contacts')
        .select('name')
        .eq('id', customerId)
        .single();

      const newOpp = {
        ...data,
        customer_name: contact?.name || 'Unknown Customer'
      };

      setOpportunities([newOpp, ...opportunities]);
      onOpportunitySelect(newOpp);
      
      // Reset form
      setNewOppTitle('');
      setNewOppDescription('');
      setNewOppValue('');
      setIsCreateDialogOpen(false);
    } catch (error) {
      // Error creating opportunity
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="opportunity">Link to Opportunity (Optional)</Label>
        {customerId && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 text-xs">
                <Plus className="w-3 h-3 mr-1" />
                New Opportunity
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Opportunity</DialogTitle>
                <DialogDescription>
                  Create a new opportunity for the selected customer
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="newOppTitle">Opportunity Title *</Label>
                  <Input
                    id="newOppTitle"
                    placeholder="e.g., Q1 2026 Deck Project"
                    value={newOppTitle}
                    onChange={(e) => setNewOppTitle(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="newOppDescription">Description</Label>
                  <Textarea
                    id="newOppDescription"
                    placeholder="Project details..."
                    value={newOppDescription}
                    onChange={(e) => setNewOppDescription(e.target.value)}
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="newOppValue">Estimated Value</Label>
                  <Input
                    id="newOppValue"
                    type="number"
                    placeholder="0"
                    value={newOppValue}
                    onChange={(e) => setNewOppValue(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={createOpportunity} 
                  disabled={isCreating || !newOppTitle.trim()}
                  className="w-full"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Opportunity
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Select
            value={selectedOpportunity?.id || 'none'}
            onValueChange={(value) => {
              if (value === 'none') {
                onOpportunitySelect(null);
              } else {
                const opp = opportunities.find(o => o.id === value);
                onOpportunitySelect(opp || null);
              }
            }}
            disabled={isLoading}
          >
            <SelectTrigger id="opportunity">
              <SelectValue>
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Loading...
                  </span>
                ) : selectedOpportunity ? (
                  <span className="flex items-center gap-2">
                    <Target className="w-3 h-3" />
                    {selectedOpportunity.title}
                  </span>
                ) : (
                  'Select opportunity...'
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                <span className="text-muted-foreground">No opportunity</span>
              </SelectItem>
              {opportunities.map((opp) => (
                <SelectItem key={opp.id} value={opp.id}>
                  <div className="flex flex-col">
                    <span>{opp.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {opp.customer_name} • ${opp.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} • {opp.status}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!customerId ? (
        <p className="text-xs text-muted-foreground">
          💡 Select a customer first to see their opportunities
        </p>
      ) : opportunities.length === 0 && !isLoading ? (
        <p className="text-xs text-muted-foreground">
          No open opportunities found for this customer. Create one to link this design.
        </p>
      ) : null}
    </div>
  );
}
