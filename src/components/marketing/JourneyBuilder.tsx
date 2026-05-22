import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  Plus, 
  Play, 
  Pause,
  Edit,
  Copy,
  Trash2,
  MoreVertical,
  Mail,
  MessageSquare,
  Clock,
  GitBranch,
  Filter,
  CheckCircle,
  Loader2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import type { User } from '../../App';
import { journeysAPI } from '../../utils/api';
import { toast } from 'sonner@2.0.3';

interface JourneyBuilderProps {
  user: User;
}

export function JourneyBuilder({ user }: JourneyBuilderProps) {
  const [selectedJourney, setSelectedJourney] = useState<string | null>(null);
  const [journeys, setJourneys] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadJourneys();
  }, [user.organizationId]);

  const loadJourneys = async () => {
    if (!user.organizationId) return;
    setIsLoading(true);
    try {
      const data = await journeysAPI.getAll(user.organizationId);
      setJourneys(data);
    } catch (error) {
      toast.error('Failed to load journeys');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateJourney = async () => {
    if (!user.organizationId) return;
    setIsCreating(true);
    try {
      const newJourney = {
        name: 'New Journey ' + new Date().toLocaleDateString(),
        status: 'draft',
        trigger_type: 'Manual',
        steps: [],
        enrolled_count: 0,
        completed_count: 0
      };
      const created = await journeysAPI.create(newJourney, user.organizationId);
      setJourneys([created, ...journeys]);
      setSelectedJourney(created.id);
      toast.success('Journey created');
    } catch (error) {
      toast.error('Failed to create journey');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteJourney = async (id: string) => {
    if (!confirm('Are you sure you want to delete this journey?')) return;
    try {
      await journeysAPI.delete(id);
      setJourneys(journeys.filter(j => j.id !== id));
      if (selectedJourney === id) setSelectedJourney(null);
      toast.success('Journey deleted');
    } catch (error) {
      toast.error('Failed to delete journey');
    }
  };

  // Placeholder steps for visualization (in a real app, these would come from the selected journey)
  const journeySteps: any[] = [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'paused':
        return 'bg-yellow-100 text-yellow-700';
      case 'draft':
        return 'bg-muted text-foreground';
      default:
        return 'bg-muted text-foreground';
    }
  };

  const currentJourney = journeys.find(j => j.id === selectedJourney);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl text-foreground">Customer Journey Builder</h2>
          <p className="text-sm text-muted-foreground mt-1">Create automated workflows based on customer behavior</p>
        </div>
        <Button onClick={handleCreateJourney} disabled={isCreating} className="flex items-center gap-2">
          {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Create Journey
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Journey List */}
        <div className="lg:col-span-1 space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : journeys.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <p>No journeys found</p>
                <p className="text-sm mt-2">Create one to get started</p>
              </CardContent>
            </Card>
          ) : (
            journeys.map((journey) => (
            <Card
              key={journey.id}
              className={`cursor-pointer transition-all ${
                selectedJourney === journey.id ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => setSelectedJourney(journey.id)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-sm">{journey.name}</CardTitle>
                    </div>
                    <Badge className={`${getStatusColor(journey.status)} mt-2`}>
                      {journey.status}
                    </Badge>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        {journey.status === 'active' ? (
                          <>
                            <Pause className="h-4 w-4 mr-2" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-2" />
                            Activate
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600" onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteJourney(journey.id);
                      }}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Trigger:</span>
                    <span className="text-foreground">{journey.trigger_type || 'Manual'}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Enrolled:</span>
                    <span className="text-foreground">{journey.enrolled_count || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Completed:</span>
                    <span className="text-foreground">{journey.completed_count || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Avg. Duration:</span>
                    <span className="text-foreground">{journey.avg_duration_days || 0} days</span>
                  </div>
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground">Conversion Rate</p>
                    <p className="text-lg text-green-600">{journey.conversion_rate || 0}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )))}
        </div>

        {/* Journey Visual Builder */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Journey Flow</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Add Step
                  </Button>
                  <Button size="sm">
                    Save Changes
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {selectedJourney ? (
                <div className="space-y-4">
                  <div className="relative">
                    {/* Journey Steps Visualization */}
                    {currentJourney?.steps && currentJourney.steps.length > 0 ? (
                      <div className="space-y-6">
                        {currentJourney.steps.map((step: any, index: number) => {
                          const Icon = step.type === 'email' ? Mail : step.type === 'sms' ? MessageSquare : step.type === 'delay' ? Clock : step.type === 'condition' ? GitBranch : step.type === 'end' ? CheckCircle : Play;
                          const isCondition = step.type === 'condition';
                          const color = step.type === 'email' ? 'purple' : step.type === 'sms' ? 'indigo' : step.type === 'delay' ? 'blue' : step.type === 'condition' ? 'orange' : step.type === 'end' ? 'green' : 'gray';
                          
                          return (
                            <div key={index} className="relative">
                              {index > 0 && !isCondition && (
                                <div className="absolute left-6 -top-6 w-0.5 h-6 bg-gray-300" />
                              )}
                              
                              {isCondition && (
                                <div className="absolute left-6 top-12 w-0.5 h-full bg-gray-300" />
                              )}
                              
                              <div className={`flex items-start gap-4 ${isCondition ? 'ml-0' : ''}`}>
                                <div className={`h-12 w-12 rounded-lg bg-${color}-100 flex items-center justify-center flex-shrink-0`}>
                                  <Icon className={`h-6 w-6 text-${color}-600`} />
                                </div>
                                <div className="flex-1 bg-background border-2 border-border rounded-lg p-4 hover:border-blue-500 cursor-pointer transition-colors">
                                  <p className="text-sm text-foreground">{step.title || step.name || 'Untitled Step'}</p>
                                  <p className="text-xs text-muted-foreground mt-1 capitalize">{step.type}</p>
                                </div>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </div>

                              {/* Branch visualization for conditions */}
                              {isCondition && (
                                <div className="ml-12 mt-4 space-y-4">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-0.5 bg-gray-300" />
                                    <Badge className="bg-green-100 text-green-700">Yes</Badge>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-0.5 bg-gray-300" />
                                    <Badge className="bg-red-100 text-red-700">No</Badge>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <p>No steps configured for this journey yet.</p>
                        <p className="text-sm mt-2">Add a step to get started.</p>
                      </div>
                    )}
                  </div>

                  {/* Journey Stats */}
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Total Steps</p>
                          <p className="text-xl text-foreground mt-1">{currentJourney?.steps?.length || 0}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Avg. Duration</p>
                          <p className="text-xl text-foreground mt-1">{currentJourney?.avg_duration_days || 0} days</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Active Users</p>
                          <p className="text-xl text-foreground mt-1">{currentJourney?.enrolled_count || 0}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Completed</p>
                          <p className="text-xl text-green-600 mt-1">{currentJourney?.completed_count || 0}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="flex items-center justify-center h-96 text-muted-foreground">
                  <div className="text-center">
                    <Play className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p>Select a journey to view and edit</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Available Triggers */}
      <Card>
        <CardHeader>
          <CardTitle>Available Triggers & Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-sm text-foreground mb-3">Entry Triggers</h3>
              <div className="space-y-2">
                {['Form Submitted', 'Contact Created', 'Tag Added', 'Page Visited', 'Email Clicked', 'Purchase Made'].map((trigger) => (
                  <div key={trigger} className="p-2 bg-muted rounded text-sm text-foreground hover:bg-muted cursor-pointer">
                    {trigger}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm text-foreground mb-3">Actions</h3>
              <div className="space-y-2">
                {['Send Email', 'Send SMS', 'Add Tag', 'Update Score', 'Create Task', 'Send Notification'].map((action) => (
                  <div key={action} className="p-2 bg-muted rounded text-sm text-foreground hover:bg-muted cursor-pointer">
                    {action}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm text-foreground mb-3">Control Flow</h3>
              <div className="space-y-2">
                {['Wait/Delay', 'If/Then Branch', 'A/B Split', 'Go To Step', 'End Journey', 'Repeat Loop'].map((control) => (
                  <div key={control} className="p-2 bg-muted rounded text-sm text-foreground hover:bg-muted cursor-pointer">
                    {control}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}