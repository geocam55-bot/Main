import { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Plus, Mail, MessageSquare, Share2, Camera, MoreVertical, Edit, Pause, Play, Copy, Trash2, BarChart, Send, Globe, ExternalLink, ChevronDown } from 'lucide-react';
import { campaignsAPI } from '../../utils/api';
import { toast } from 'sonner@2.0.3';
import { copyToClipboard } from '../../utils/clipboard';
import type { User } from '../../App';
import { canAdd, canChange, canDelete } from '../../utils/permissions';
import { getLandingPages } from '../../utils/marketing-client';
import { contactsAPI } from '../../utils/api';
import { CampaignAnalytics } from './CampaignAnalytics';
import { useAudienceSegments } from '../../hooks/useAudienceSegments';
import { normalizeCampaignMetrics } from '../../utils/campaign-metrics';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { sendSystemNotification } from '../../utils/notifications';

interface CampaignManagerProps {
  user: User;
}

export function CampaignManager({ user }: CampaignManagerProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isABTestDialogOpen, setIsABTestDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAnalyticsDialogOpen, setIsAnalyticsDialogOpen] = useState(false);
  const [selectedCampaignType, setSelectedCampaignType] = useState('email');
  const [isCreating, setIsCreating] = useState(false);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [editingCampaign, setEditingCampaign] = useState<any | null>(null);
  const [viewingCampaign, setViewingCampaign] = useState<any | null>(null);
  const [landingPages, setLandingPages] = useState<any[]>([]);
  
  // Load predefined audience segments from Settings
  const { segments: customerSegments } = useAudienceSegments(user.organizationId);
  
  // Form state
  const [campaignName, setCampaignName] = useState('');
  const [audienceSegment, setAudienceSegment] = useState('');
  const [selectedLandingPage, setSelectedLandingPage] = useState('');
  const [subjectLine, setSubjectLine] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [emailContent, setEmailContent] = useState('');
  const [scheduleType, setScheduleType] = useState('now');
  const [scheduleDateTime, setScheduleDateTime] = useState('');

  // Sample email template
  const sampleEmailContent = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #2563eb;">Hello {{first_name}}!</h2>
  
  <p>We hope this message finds you well. We're excited to share some updates with you!</p>
  
  <p>As a valued member of our community, you're among the first to hear about our latest offerings and exclusive opportunities.</p>
  
  <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <h3 style="margin-top: 0; color: #1f2937;">What's New?</h3>
    <p>We've been working hard to bring you innovative solutions that make your life easier. Stay tuned for exciting announcements!</p>
  </div>
  
  <p>We truly appreciate your continued support and trust in us.</p>
  
  <p>Best regards,<br/>
  The Team</p>
  
  <p style="font-size: 12px; color: #6b7280; margin-top: 30px;">
    You're receiving this email because you're a valued contact at {{email}}.
  </p>
</div>`; 

  useEffect(() => {
    loadCampaigns();
    loadLandingPages();
  }, []);

  const loadCampaigns = async () => {
    try {
      const { campaigns: data } = await campaignsAPI.getAll();
      setCampaigns((data || []).map(normalizeCampaignMetrics));
    } catch (error) {
      toast.error('Failed to load campaigns');
    }
  };

  const loadLandingPages = async () => {
    try {
      const pages = await getLandingPages();
      setLandingPages(pages || []);
    } catch (error) {
      toast.error('Failed to load landing pages');
    }
  };

  const handleCreateCampaign = async () => {
    if (!campaignName.trim()) {
      toast.error('Please enter a campaign name');
      return;
    }

    setIsCreating(true);
    try {
      // Build campaign data - DO NOT include landing_page_slug since database doesn't have this column
      // Instead, we'll store it in the campaign's metadata/description field as JSON
      const campaignData: any = {
        name: campaignName,
        type: selectedCampaignType,
        status: scheduleType === 'now' ? 'active' : 'scheduled',
        audience_segment: audienceSegment || 'all',
        subject_line: subjectLine || null,
        preview_text: previewText || null,
        start_date: scheduleType === 'schedule' && scheduleDateTime ? new Date(scheduleDateTime).toISOString() : new Date().toISOString(),
      };

      // Store landing page slug and email content in description field as JSON metadata
      campaignData.emailContent = emailContent || previewText;
      campaignData.landingPageSlug = selectedLandingPage && selectedLandingPage !== 'none' ? selectedLandingPage : null;

      const { campaign } = await campaignsAPI.create(campaignData);
      
      if (scheduleType === 'now') {
        toast.info('Initiating campaign send...');
        try {
          const result = await campaignsAPI.send(campaign.id);
          const successMsg = `Campaign created and sent! ${result.sent} emails sent.`;
          toast.success(successMsg, { duration: 5000 });
          sendSystemNotification("Campaign Sent", { body: successMsg });
        } catch (sendError: any) {
          toast.warning('Campaign created but failed to send immediately. Please try sending manually.');
        }
      } else {
        toast.success('Campaign created successfully!');
        sendSystemNotification("Campaign Created", { body: `${campaignName} has been created and scheduled.` });
      }

      setIsCreateDialogOpen(false);
      
      // Reset form
      setCampaignName('');
      setAudienceSegment('');
      setSelectedLandingPage('');
      setSubjectLine('');
      setPreviewText('');
      setEmailContent('');
      setScheduleType('now');
      setScheduleDateTime('');
      
      // Reload campaigns
      await loadCampaigns();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create campaign');
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenABTestDialog = () => {
    setIsABTestDialogOpen(true);
  };

  const handleEditCampaign = (campaign: any) => {
    setEditingCampaign(campaign);
    setCampaignName(campaign.name);
    
    // Use unpacked emailContent, fallback to description if it's not JSON
    let content = campaign.emailContent || '';
    if (!content && campaign.description && !campaign.description.startsWith('{')) {
      content = campaign.description;
    }
    
    setEmailContent(content);
    setSelectedCampaignType(campaign.type || 'email');
    setIsEditDialogOpen(true);
  };

  const handleUpdateCampaign = async () => {
    if (!editingCampaign || !campaignName.trim()) {
      toast.error('Please enter a campaign name');
      return;
    }

    setIsCreating(true);
    try {
      const campaignData = {
        name: campaignName,
        type: selectedCampaignType,
        emailContent: emailContent || previewText,
      };

      await campaignsAPI.update(editingCampaign.id, campaignData);
      toast.success('Campaign updated successfully!');
      setIsEditDialogOpen(false);
      
      // Reset form
      setCampaignName('');
      setEmailContent('');
      setEditingCampaign(null);
      
      // Reload campaigns
      await loadCampaigns();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update campaign');
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleStatus = async (campaign: any) => {
    try {
      const newStatus = campaign.status === 'Active' ? 'Paused' : 'Active';
      await campaignsAPI.update(campaign.id, { status: newStatus });
      toast.success(`Campaign ${newStatus === 'Active' ? 'activated' : 'paused'} successfully!`);
      await loadCampaigns();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update campaign status');
    }
  };

  const handleDuplicateCampaign = async (campaign: any) => {
    try {
      const duplicatedData = {
        name: `${campaign.name} (Copy)`,
        type: campaign.type,
        status: 'Paused',
        description: campaign.description,
        start_date: new Date().toISOString(),
      };
      await campaignsAPI.create(duplicatedData);
      toast.success('Campaign duplicated successfully!');
      await loadCampaigns();
    } catch (error: any) {
      toast.error(error.message || 'Failed to duplicate campaign');
    }
  };

  const handleDeleteCampaign = async (campaign: any) => {
    if (!confirm(`Are you sure you want to delete "${campaign.name}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      await campaignsAPI.delete(campaign.id);
      toast.success('Campaign deleted successfully!');
      await loadCampaigns();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete campaign');
    }
  };

  const handleSendCampaign = async (campaign: any) => {
    const segment = campaign.audience_segment || 'all';
    const confirmMessage = segment === 'all' 
      ? `Are you sure you want to send "${campaign.name}" to ALL contacts in your organization?`
      : `Are you sure you want to send "${campaign.name}" to all contacts with the "${segment}" tag?`;
    
    if (!confirm(confirmMessage)) {
      return;
    }
    
    try {
      toast.info('Sending campaign...');
      const result = await campaignsAPI.send(campaign.id);
      
      toast.success(
        `Campaign sent successfully! ${result.sent} emails sent to: ${result.sentTo.join(', ')}`,
        { duration: 8000 }
      );
      
      if (result.failed > 0) {
        toast.warning(
          `${result.failed} emails failed to send. Check console for details.`,
          { duration: 5000 }
        );
      }
      
      await loadCampaigns();
    } catch (error: any) {
      toast.error(error.message || 'Failed to send campaign');
    }
  };

  const handleViewAnalytics = (campaign: any) => {
    setViewingCampaign(campaign);
    setIsAnalyticsDialogOpen(true);
  };

  // Insert dynamic field into email content
  const insertDynamicField = (field: string) => {
    if (!emailContentRef.current) return;
    
    const start = emailContentRef.current.selectionStart;
    const end = emailContentRef.current.selectionEnd;
    const text = emailContent;
    const before = text.substring(0, start);
    const after = text.substring(end);
    
    const newContent = before + field + after;
    setEmailContent(newContent);
    
    // Set cursor position after inserted field
    setTimeout(() => {
      if (emailContentRef.current) {
        emailContentRef.current.focus();
        const newPosition = start + field.length;
        emailContentRef.current.setSelectionRange(newPosition, newPosition);
      }
    }, 0);
    
    toast.success(`Inserted ${field}`);
  };

  // Load sample email template
  const loadSampleTemplate = () => {
    setEmailContent(sampleEmailContent);
    setSubjectLine('Welcome! We\'re Excited to Connect');
    setPreviewText('Discover what\'s new and stay connected with us');
    toast.success('Sample template loaded!');
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'sms':
        return <MessageSquare className="h-4 w-4" />;
      case 'facebook':
        return <Share2 className="h-4 w-4" />;
      case 'instagram':
        return <Camera className="h-4 w-4" />;
      case 'portal':
        return <Globe className="h-4 w-4" />;
      default:
        return <Mail className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    // Normalize status to handle lowercase
    const normalizedStatus = status?.charAt(0).toUpperCase() + status?.slice(1).toLowerCase();
    
    switch (normalizedStatus) {
      case 'Active':
        return 'bg-green-100 text-green-700';
      case 'Paused':
        return 'bg-yellow-100 text-yellow-700';
      case 'Scheduled':
        return 'bg-blue-100 text-blue-700';
      case 'Completed':
        return 'bg-muted text-foreground';
      default:
        return 'bg-muted text-foreground';
    }
  };

  const emailContentRef = useRef<HTMLTextAreaElement | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl text-foreground">Campaign Management</h2>
          <p className="text-sm text-muted-foreground mt-1">Create and manage omnichannel marketing campaigns</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            {canAdd('marketing', user.role) && (
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Campaign
            </Button>
            )}
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-background">
            <DialogHeader>
              <DialogTitle>Create New Campaign</DialogTitle>
              <DialogDescription>Choose the type of campaign you want to create.</DialogDescription>
            </DialogHeader>
            <Tabs value={selectedCampaignType} onValueChange={setSelectedCampaignType}>
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5">
                <TabsTrigger value="email" className="text-xs sm:text-sm">Email</TabsTrigger>
                <TabsTrigger value="sms" className="text-xs sm:text-sm">SMS</TabsTrigger>
                <TabsTrigger value="social" className="text-xs sm:text-sm">Social</TabsTrigger>
                <TabsTrigger value="portal" className="text-xs sm:text-sm">Portal</TabsTrigger>
                <TabsTrigger value="multi" className="text-xs sm:text-sm">Multi</TabsTrigger>
              </TabsList>

              <TabsContent value="email" className="space-y-4 mt-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Campaign Name</Label>
                    <Input placeholder="e.g., Spring Newsletter" value={campaignName} onChange={(e) => setCampaignName(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Audience Segment</Label>
                      <Select value={audienceSegment} onValueChange={setAudienceSegment}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select segment" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Contacts</SelectItem>
                          {customerSegments.map((segment) => (
                            <SelectItem key={segment} value={segment}>
                              {segment}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Landing Page (Optional)</Label>
                      <Select value={selectedLandingPage} onValueChange={setSelectedLandingPage}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select landing page" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Landing Page</SelectItem>
                          {landingPages.map((page: any) => (
                            <SelectItem key={page.id} value={page.slug}>
                              {page.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Subject Line</Label>
                    <Input placeholder="Your compelling subject line" value={subjectLine} onChange={(e) => setSubjectLine(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Preview Text</Label>
                    <Input placeholder="This appears after the subject in inbox" value={previewText} onChange={(e) => setPreviewText(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Email Content</Label>
                      <div className="flex gap-2">
                        <Button 
                          type="button"
                          variant="outline" 
                          size="sm" 
                          onClick={loadSampleTemplate}
                          className="text-xs"
                        >
                          Load Sample Template
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button type="button" variant="outline" size="sm" className="text-xs">
                              Insert Field <ChevronDown className="h-3 w-3 ml-1" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => insertDynamicField('{{first_name}}')}>
                              <span className="font-mono text-xs">{'{{first_name}}'}</span>
                              <span className="ml-2 text-xs text-muted-foreground">- Contact's first name</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => insertDynamicField('{{last_name}}')}>
                              <span className="font-mono text-xs">{'{{last_name}}'}</span>
                              <span className="ml-2 text-xs text-muted-foreground">- Contact's last name</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => insertDynamicField('{{name}}')}>
                              <span className="font-mono text-xs">{'{{name}}'}</span>
                              <span className="ml-2 text-xs text-muted-foreground">- Full name</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => insertDynamicField('{{email}}')}>
                              <span className="font-mono text-xs">{'{{email}}'}</span>
                              <span className="ml-2 text-xs text-muted-foreground">- Email address</span>
                            </DropdownMenuItem>
                            {selectedLandingPage && selectedLandingPage !== 'none' && (
                              <DropdownMenuItem onClick={() => insertDynamicField('{{landing_page}}')}>
                                <span className="font-mono text-xs">{'{{landing_page}}'}</span>
                                <span className="ml-2 text-xs text-muted-foreground">- Landing page URL</span>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <Textarea 
                      placeholder="Write your email content here... (Supports dynamic fields like {{first_name}}, {{email}})"
                      rows={8}
                      value={emailContent}
                      onChange={(e) => setEmailContent(e.target.value)}
                      ref={emailContentRef}
                    />
                    {selectedLandingPage && selectedLandingPage !== 'none' && (
                      <div className="text-xs bg-blue-50 text-blue-700 p-3 rounded-lg border border-blue-200">
                        💡 <strong>Tip:</strong> Your landing page link will be automatically added as a "Learn More" button. 
                        Or use <code className="bg-blue-100 px-1 rounded">{'{{landing_page}}'}</code> in your content to insert the tracked link.
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Schedule</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Send immediately" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="now">Send Immediately</SelectItem>
                          <SelectItem value="schedule">Schedule for Later</SelectItem>
                          <SelectItem value="optimize">AI Optimize Send Time</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input type="datetime-local" value={scheduleDateTime} onChange={(e) => setScheduleDateTime(e.target.value)} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                    <div>
                      <p className="text-sm text-foreground">A/B Testing</p>
                      <p className="text-xs text-muted-foreground">Test subject lines, content, or send times</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleOpenABTestDialog}>Configure</Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="sms" className="space-y-4 mt-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Campaign Name</Label>
                    <Input placeholder="e.g., Flash Sale Alert" />
                  </div>
                  <div className="space-y-2">
                    <Label>Audience Segment</Label>
                    <Select value={audienceSegment} onValueChange={setAudienceSegment}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select segment" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All SMS Subscribers</SelectItem>
                        {customerSegments.map((segment) => (
                          <SelectItem key={segment} value={segment}>
                            {segment}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Message (160 characters)</Label>
                    <Textarea 
                      placeholder="Your SMS message..."
                      rows={4}
                      maxLength={160}
                    />
                    <p className="text-xs text-muted-foreground">Character count: 0/160</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Include Link</Label>
                    <Input placeholder="https://your-landing-page.com" />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="social" className="space-y-4 mt-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Campaign Name</Label>
                    <Input placeholder="e.g., Social Media Promotion" />
                  </div>
                  <div className="space-y-2">
                    <Label>Platforms</Label>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex items-center gap-2">
                        <Share2 className="h-4 w-4" />
                        Facebook
                      </Button>
                      <Button variant="outline" size="sm" className="flex items-center gap-2">
                        <Camera className="h-4 w-4" />
                        Instagram
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Post Content</Label>
                    <Textarea 
                      placeholder="Your social media post..."
                      rows={6}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="portal" className="space-y-4 mt-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Campaign Name</Label>
                    <Input 
                      placeholder="e.g., Spring Sale Announcement" 
                      value={campaignName} 
                      onChange={(e) => setCampaignName(e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Portal Message Content</Label>
                    <Textarea 
                      placeholder="Message to display in the customer portal..."
                      rows={6}
                      value={emailContent}
                      onChange={(e) => setEmailContent(e.target.value)}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="multi" className="space-y-4 mt-4">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Create coordinated campaigns across email, SMS, and social media channels
                  </p>
                  <div className="space-y-2">
                    <Label>Campaign Name</Label>
                    <Input placeholder="e.g., Product Launch - Multi-channel" />
                  </div>
                  <div className="space-y-2">
                    <Label>Select Channels</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {['Email', 'SMS', 'Facebook', 'Instagram'].map((channel) => (
                        <Button key={channel} variant="outline" className="justify-start">
                          {channel}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex gap-2 mt-6">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleCreateCampaign} disabled={isCreating}>
                {isCreating ? 'Creating...' : 'Create Campaign'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* A/B Test Configuration Dialog */}
      <Dialog open={isABTestDialogOpen} onOpenChange={setIsABTestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>A/B Test Configuration</DialogTitle>
            <DialogDescription>Set up variants to test different elements of your campaign</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Test Element</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="What do you want to test?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="subject">Subject Line</SelectItem>
                  <SelectItem value="content">Email Content</SelectItem>
                  <SelectItem value="sendtime">Send Time</SelectItem>
                  <SelectItem value="sender">Sender Name</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Variant A</Label>
              <Input placeholder="Enter first variant" />
            </div>
            <div className="space-y-2">
              <Label>Variant B</Label>
              <Input placeholder="Enter second variant" />
            </div>
            <div className="space-y-2">
              <Label>Test Size (%)</Label>
              <Input type="number" min="10" max="50" defaultValue="20" placeholder="20" />
              <p className="text-xs text-muted-foreground">Percentage of audience to include in test</p>
            </div>
            <div className="space-y-2">
              <Label>Success Metric</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="How will you measure success?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="opens">Open Rate</SelectItem>
                  <SelectItem value="clicks">Click Rate</SelectItem>
                  <SelectItem value="conversions">Conversion Rate</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 mt-6">
            <Button variant="outline" onClick={() => setIsABTestDialogOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button className="flex-1" onClick={() => { setIsABTestDialogOpen(false); toast.success('A/B test configured!'); }}>
              Save Configuration
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Campaign Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-background">
          <DialogHeader>
            <DialogTitle>Edit Campaign</DialogTitle>
            <DialogDescription>Update your campaign details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Campaign Name</Label>
              <Input 
                placeholder="e.g., Spring Newsletter" 
                value={campaignName} 
                onChange={(e) => setCampaignName(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label>Campaign Type</Label>
              <Select value={selectedCampaignType} onValueChange={setSelectedCampaignType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="social">Social</SelectItem>
                  <SelectItem value="portal">Customer Portal</SelectItem>
                  <SelectItem value="multi">Multi-channel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description/Content</Label>
              <Textarea 
                placeholder="Campaign description or content..."
                rows={8}
                value={emailContent}
                onChange={(e) => setEmailContent(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2 mt-6">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleUpdateCampaign} disabled={isCreating}>
              {isCreating ? 'Updating...' : 'Update Campaign'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Campaign Analytics Dialog */}
      <Dialog open={isAnalyticsDialogOpen} onOpenChange={setIsAnalyticsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-background">
          <DialogHeader>
            <DialogTitle>Campaign Analytics</DialogTitle>
            <DialogDescription>View detailed analytics for your campaign</DialogDescription>
          </DialogHeader>
          {viewingCampaign && <CampaignAnalytics campaign={viewingCampaign} />}
          <div className="flex gap-2 mt-6">
            <Button variant="outline" onClick={() => setIsAnalyticsDialogOpen(false)} className="flex-1">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Campaigns Grid */}
      <div className="grid grid-cols-1 gap-6">
        {campaigns.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">No campaigns yet. Create your first campaign to get started!</p>
            </CardContent>
          </Card>
        ) : (
          campaigns.map((campaign) => (
          <Card key={campaign.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    {getChannelIcon(campaign.type || campaign.channel)}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{campaign.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={getStatusColor(campaign.status)}>{campaign.status}</Badge>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">{campaign.type}</span>
                    </div>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEditCampaign(campaign)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleToggleStatus(campaign)}>
                      {campaign.status === 'Active' ? (
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
                    <DropdownMenuItem onClick={() => handleDuplicateCampaign(campaign)}>
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                    {canDelete('marketing', user.role) && (
                    <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteCampaign(campaign)}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => handleViewAnalytics(campaign)}>
                      <BarChart className="h-4 w-4 mr-2" />
                      View Analytics
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSendCampaign(campaign)}>
                      <Send className="h-4 w-4 mr-2" />
                      Send Campaign
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Audience</p>
                  <p className="text-lg text-foreground mt-1">{campaign.audience_metric.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Sent</p>
                  <p className="text-lg text-foreground mt-1">{campaign.sent_metric.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Opened</p>
                  <p className="text-lg text-foreground mt-1">{campaign.opened_metric}</p>
                  <p className="text-xs text-muted-foreground">{campaign.sent_metric > 0 ? ((campaign.opened_metric / campaign.sent_metric) * 100).toFixed(1) : 0}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Clicked</p>
                  <p className="text-lg text-foreground mt-1">{campaign.clicked_metric}</p>
                  <p className="text-xs text-muted-foreground">{campaign.opened_metric > 0 ? ((campaign.clicked_metric / campaign.opened_metric) * 100).toFixed(1) : 0}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Converted</p>
                  <p className="text-lg text-foreground mt-1">{campaign.converted_metric}</p>
                  <p className="text-xs text-green-600">{campaign.sent_metric > 0 ? ((campaign.converted_metric / campaign.sent_metric) * 100).toFixed(1) : 0}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Revenue</p>
                  <p className="text-lg text-foreground mt-1">${campaign.revenue_metric.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Schedule</p>
                  <p className="text-sm text-foreground mt-1">
                    {campaign.schedule || (campaign.start_date ? new Date(campaign.start_date).toLocaleDateString() : 'Not scheduled')}
                  </p>
                </div>
              </div>
              
              {/* Landing Page Link */}
              {(() => {
                // Parse landing page slug from campaign metadata
                const landingPageSlug = campaign.landing_page_slug_metric;
                
                return landingPageSlug ? (
                <div className="mt-6 pt-6 border-t border-border">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 flex-1">
                      <Globe className="h-4 w-4 text-blue-600" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground mb-1">Campaign Landing Page (with UTM tracking)</p>
                        <div className="flex items-center gap-2">
                          <code className="text-sm text-foreground bg-muted px-2 py-1 rounded border border-border font-mono truncate block">
                            {window.location.origin}?view=landing&slug={landingPageSlug}&campaign={campaign.id}&utm_source=email&utm_medium=campaign&utm_campaign={encodeURIComponent(campaign.name)}
                          </code>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              const url = `${window.location.origin}?view=landing&slug=${landingPageSlug}&campaign=${campaign.id}&utm_source=email&utm_medium=campaign&utm_campaign=${encodeURIComponent(campaign.name)}`;
                              copyToClipboard(url);
                              toast.success('Landing page URL copied to clipboard!');
                            }}
                            className="flex-shrink-0"
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copy
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              const url = `${window.location.origin}?view=landing&slug=${landingPageSlug}&campaign=${campaign.id}&utm_source=email&utm_medium=campaign&utm_campaign=${encodeURIComponent(campaign.name)}`;
                              window.open(url, '_blank');
                            }}
                            className="flex-shrink-0"
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Preview
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                ) : null;
              })()}
            </CardContent>
          </Card>
        ))
        )}
      </div>
    </div>
  );
}