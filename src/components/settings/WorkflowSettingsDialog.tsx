import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Plus, Trash2, ArrowRight, Save, Play, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface WorkflowRule {
  id: string;
  name: string;
  trigger: string;
  action: string;
  isActive: boolean;
}

interface WorkflowSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId?: string;
}

export function WorkflowSettingsDialog({ open, onOpenChange, organizationId }: WorkflowSettingsDialogProps) {
  const [activeTab, setActiveTab] = useState('deals');
  const [workflows, setWorkflows] = useState<WorkflowRule[]>([
    { id: '1', name: 'Auto-assign New Deals', trigger: 'deal_created', action: 'assign_to_creator', isActive: true },
    { id: '2', name: 'Notify Admin on High Value', trigger: 'deal_value_gt_10k', action: 'email_admin', isActive: true },
    { id: '3', name: 'Welcome Email', trigger: 'contact_created', action: 'send_email_template_welcome', isActive: false },
  ]);

  const [isEditing, setIsEditing] = useState(false);
  const [newWorkflow, setNewWorkflow] = useState<Partial<WorkflowRule>>({
    name: '',
    trigger: '',
    action: '',
    isActive: true
  });

  // Load workflows from localStorage on mount
  useEffect(() => {
    if (open && organizationId) {
      const stored = localStorage.getItem(`workflows_${organizationId}`);
      if (stored) {
        try {
          setWorkflows(JSON.parse(stored));
        } catch (e) {
          // Failed to parse workflows – using defaults
        }
      }
    }
  }, [open, organizationId]);

  const handleSave = () => {
    if (organizationId) {
      localStorage.setItem(`workflows_${organizationId}`, JSON.stringify(workflows));
      toast.success('Workflow settings saved successfully');
    }
    onOpenChange(false);
  };

  const handleAddWorkflow = () => {
    if (!newWorkflow.name || !newWorkflow.trigger || !newWorkflow.action) {
      toast.error('Please fill in all fields');
      return;
    }

    const workflow: WorkflowRule = {
      id: Math.random().toString(36).substr(2, 9),
      name: newWorkflow.name || 'New Workflow',
      trigger: newWorkflow.trigger || '',
      action: newWorkflow.action || '',
      isActive: true,
    };

    setWorkflows([...workflows, workflow]);
    setNewWorkflow({ name: '', trigger: '', action: '', isActive: true });
    setIsEditing(false);
    toast.success('Workflow added');
  };

  const handleDeleteWorkflow = (id: string) => {
    setWorkflows(workflows.filter(w => w.id !== id));
    toast.success('Workflow removed');
  };

  const toggleWorkflowStatus = (id: string) => {
    setWorkflows(workflows.map(w => 
      w.id === id ? { ...w, isActive: !w.isActive } : w
    ));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto bg-background dark:bg-slate-900">
        <DialogHeader>
          <DialogTitle>Configure Workflows</DialogTitle>
          <DialogDescription>
            Automate actions based on triggers in your CRM.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="deals" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="deals">Deals & Quotes</TabsTrigger>
            <TabsTrigger value="contacts">Contacts</TabsTrigger>
            <TabsTrigger value="tasks">Tasks & Projects</TabsTrigger>
          </TabsList>
          
          <div className="mt-4 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium text-foreground">Active Automations</h3>
              <Button size="sm" onClick={() => setIsEditing(true)} disabled={isEditing}>
                <Plus className="h-4 w-4 mr-2" />
                Add Workflow
              </Button>
            </div>

            {isEditing && (
              <Card className="border-dashed border-2 bg-muted">
                <CardContent className="pt-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Workflow Name</Label>
                      <Input 
                        placeholder="e.g. Notify Manager on Win" 
                        value={newWorkflow.name}
                        onChange={(e) => setNewWorkflow({...newWorkflow, name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Trigger Event</Label>
                      <Select 
                        value={newWorkflow.trigger} 
                        onValueChange={(val) => setNewWorkflow({...newWorkflow, trigger: val})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select trigger..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="deal_created">Deal Created</SelectItem>
                          <SelectItem value="deal_won">Deal Won (Accepted)</SelectItem>
                          <SelectItem value="deal_lost">Deal Lost (Rejected)</SelectItem>
                          <SelectItem value="deal_value_gt_10k">Deal Value &gt; $10k</SelectItem>
                          <SelectItem value="contact_created">Contact Created</SelectItem>
                          <SelectItem value="task_overdue">Task Overdue</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 justify-center py-2 text-muted-foreground">
                    <ArrowRight className="h-4 w-4" />
                    <span className="text-xs uppercase font-medium">Then</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>

                  <div className="space-y-2">
                    <Label>Action</Label>
                    <Select 
                        value={newWorkflow.action} 
                        onValueChange={(val) => setNewWorkflow({...newWorkflow, action: val})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select action..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="send_email_owner">Email Owner</SelectItem>
                          <SelectItem value="email_admin">Email Admin</SelectItem>
                          <SelectItem value="create_task">Create Follow-up Task</SelectItem>
                          <SelectItem value="assign_to_creator">Assign to Creator</SelectItem>
                          <SelectItem value="update_contact_status">Update Contact Status</SelectItem>
                        </SelectContent>
                      </Select>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
                    <Button size="sm" onClick={handleAddWorkflow}>Add Rule</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-2">
              {workflows.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border rounded-md">
                  No workflows configured.
                </div>
              ) : (
                workflows.map(workflow => (
                  <Card key={workflow.id} className="overflow-hidden">
                    <div className="flex items-center justify-between p-4 bg-background">
                      <div className="flex items-center gap-3">
                        <div 
                          className={`p-2 rounded-full cursor-pointer transition-colors ${workflow.isActive ? 'bg-green-100 text-green-600' : 'bg-muted text-muted-foreground'}`}
                          onClick={() => toggleWorkflowStatus(workflow.id)}
                          title={workflow.isActive ? "Active" : "Paused"}
                        >
                          {workflow.isActive ? <Play className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                        </div>
                        <div>
                          <h4 className={`font-medium ${!workflow.isActive && 'text-muted-foreground'}`}>{workflow.name}</h4>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100">
                              When: {workflow.trigger.replace(/_/g, ' ')}
                            </span>
                            <ArrowRight className="h-3 w-3" />
                            <span className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded border border-purple-100">
                              Do: {workflow.action.replace(/_/g, ' ')}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteWorkflow(workflow.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
            
            <div className="bg-blue-50 p-4 rounded-md border border-blue-100 flex gap-3 items-start mt-6">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">About Workflows</p>
                <p>
                  Workflows run automatically in the background. Changes made here will take effect immediately for all new events.
                  For advanced customer journeys and marketing automation, please use the Marketing module.
                </p>
              </div>
            </div>
          </div>
        </Tabs>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}