import { useState, useEffect } from 'react';
import { createClient } from '../utils/supabase/client';
import { getCrmPortalMessages } from '../utils/portal-client';
import type { User } from '../App';

export interface Suggestion {
  id: string;
  type: 'follow_up' | 'deadline' | 'inactive' | 'engagement' | 'opportunity' | 'task';
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  impact: number; // 1-100
  urgency: number; // 1-100
  score: number; // Combined priority score
  actionType: 'call' | 'email' | 'meeting' | 'review' | 'update';
  relatedEntity: {
    type: 'bid' | 'opportunity' | 'contact' | 'task' | 'appointment';
    id: string;
    name: string;
  };
  daysInactive?: number;
  potentialValue?: number;
  suggestedAction: string;
  context: string;
  createdAt: Date;
}

export interface DailyMetrics {
  totalSuggestions: number;
  criticalActions: number;
  potentialRevenue: number;
  avgDaysInactive: number;
  topPriority: Suggestion | null;
}

// Safe query helper — returns empty array on ANY error (missing table, RLS, bad column, etc.)
async function safeQuery(supabase: any, table: string, orgId: string, filterCol: string, userId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('organization_id', orgId)
      .eq(filterCol, userId)
      .limit(100);
    if (error) {
      return [];
    }
    return data || [];
  } catch (err: any) {
    return [];
  }
}

export function useAISuggestions(user: User) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [metrics, setMetrics] = useState<DailyMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user && user.role !== 'super_admin') {
      loadAISuggestions();
      
      // Poll for updates every 5 minutes
      const intervalId = setInterval(loadAISuggestions, 5 * 60 * 1000);
      return () => clearInterval(intervalId);
    } else if (user?.role === 'super_admin') {
      setIsLoading(false);
      setSuggestions([]);
    }
  }, [user?.id, user?.role, user?.organizationId]);

  const loadAISuggestions = async () => {
    try {
      setIsLoading(true);
      const supabase = createClient();
      
      // Fetch all relevant data INDEPENDENTLY — each query is self-contained
      const [bids, contacts, tasks, opportunities, appointments] = await Promise.all([
        safeQuery(supabase, 'bids', user.organizationId, 'created_by', user.id),
        safeQuery(supabase, 'contacts', user.organizationId, 'owner_id', user.id),
        safeQuery(supabase, 'tasks', user.organizationId, 'owner_id', user.id),
        safeQuery(supabase, 'opportunities', user.organizationId, 'owner_id', user.id),
        safeQuery(supabase, 'appointments', user.organizationId, 'owner_id', user.id),
      ]);

      // Also try quotes table (may not exist — that's fine)
      const quotes = await safeQuery(supabase, 'quotes', user.organizationId, 'created_by', user.id);

      // Fetch portal messages (non-blocking)
      let portalMessages: any[] = [];
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          const pmData = await getCrmPortalMessages(session.access_token);
          portalMessages = pmData.messages || [];
        }
      } catch (pmErr) {
        // console statement removed
      }

      const generatedSuggestions: Suggestion[] = [];

      // Helper functions
      const getDaysSince = (dateString: string): number => {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 0;
        const now = new Date();
        return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      };

      const getDaysUntil = (dateString: string): number => {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 999;
        const now = new Date();
        return Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      };

      const calculateImpact = (value: number, daysInactive: number): number => {
        const valueScore = Math.min(100, (value / 10000) * 50);
        const decayFactor = Math.max(0.5, 1 - (daysInactive / 100));
        return Math.round(Math.max(30, valueScore * decayFactor)); // Minimum 30 impact
      };

      // ── 1. ANALYZE DEALS & QUOTES ──
      const allDeals = [...bids, ...quotes];
      allDeals.forEach(bid => {
        const daysInactive = getDaysSince(bid.updated_at || bid.created_at);
        const status = (bid.status || '').toLowerCase();
        const value = parseFloat(bid.total || bid.amount || bid.value || 0);
        const title = bid.title || bid.name || bid.subject || 'Untitled Deal';

        // Follow up on submitted/sent bids (lowered from 5 to 3 days)
        if ((status === 'submitted' || status === 'sent' || status === 'pending') && daysInactive >= 3) {
          generatedSuggestions.push({
            id: `bid-followup-${bid.id}`,
            type: 'follow_up',
            title: `Follow up on ${title}`,
            description: `Deal ${status} ${daysInactive} days ago with no response`,
            priority: daysInactive > 10 ? 'critical' : daysInactive > 7 ? 'high' : 'medium',
            impact: calculateImpact(value, daysInactive),
            urgency: Math.min(100, daysInactive * 8),
            score: 0,
            actionType: 'call',
            relatedEntity: { type: 'bid', id: bid.id, name: title },
            daysInactive,
            potentialValue: value,
            suggestedAction: `Call to discuss ${title} — last contact was ${daysInactive} days ago.`,
            context: `${value > 0 ? `Potential value: $${value.toLocaleString()}.` : ''} Status: ${bid.status}.`,
            createdAt: new Date()
          });
        }

        // Re-engagement for rejected/lost bids (lowered from 30 to 14 days)
        if ((status === 'rejected' || status === 'lost' || status === 'declined') && daysInactive >= 14 && daysInactive <= 120) {
          generatedSuggestions.push({
            id: `bid-reengage-${bid.id}`,
            type: 'engagement',
            title: `Re-engage: ${title}`,
            description: `${status} ${daysInactive} days ago — time to reconnect with updated offering`,
            priority: 'medium',
            impact: calculateImpact(value * 0.7, daysInactive),
            urgency: 60,
            score: 0,
            actionType: 'email',
            relatedEntity: { type: 'bid', id: bid.id, name: title },
            daysInactive,
            potentialValue: value * 0.7,
            suggestedAction: `Send updated proposal for ${title} with revised pricing or terms.`,
            context: `${value > 0 ? `Original value: $${value.toLocaleString()}. ` : ''}Consider a discount or new features.`,
            createdAt: new Date()
          });
        }

        // Draft bids stuck (lowered from 7 to 3 days)
        if (status === 'draft' && daysInactive >= 3) {
          generatedSuggestions.push({
            id: `bid-draft-${bid.id}`,
            type: 'deadline',
            title: `Complete draft: ${title}`,
            description: `Draft has been sitting for ${daysInactive} days`,
            priority: daysInactive > 14 ? 'critical' : daysInactive > 7 ? 'high' : 'medium',
            impact: calculateImpact(value, daysInactive),
            urgency: Math.min(100, daysInactive * 6),
            score: 0,
            actionType: 'update',
            relatedEntity: { type: 'bid', id: bid.id, name: title },
            daysInactive,
            potentialValue: value,
            suggestedAction: `Finalize and submit ${title} to maintain momentum.`,
            context: `${value > 0 ? `Estimated value: $${value.toLocaleString()}. ` : ''}Review and submit soon.`,
            createdAt: new Date()
          });
        }

        // Accepted/won deals that haven't been updated recently — review for next steps
        if ((status === 'accepted' || status === 'won' || status === 'approved') && daysInactive >= 7) {
          generatedSuggestions.push({
            id: `bid-won-followup-${bid.id}`,
            type: 'follow_up',
            title: `Follow up on won deal: ${title}`,
            description: `Won ${daysInactive} days ago — check on project kickoff or delivery`,
            priority: daysInactive > 14 ? 'high' : 'medium',
            impact: calculateImpact(value, daysInactive),
            urgency: Math.min(80, daysInactive * 4),
            score: 0,
            actionType: 'call',
            relatedEntity: { type: 'bid', id: bid.id, name: title },
            daysInactive,
            potentialValue: value,
            suggestedAction: `Check in on ${title} — ensure smooth project start and customer satisfaction.`,
            context: `${value > 0 ? `Deal value: $${value.toLocaleString()}. ` : ''}Won ${daysInactive} days ago.`,
            createdAt: new Date()
          });
        }

        // Viewed but no action (from public quote link tracking)
        if (status === 'viewed' && daysInactive >= 2) {
          generatedSuggestions.push({
            id: `bid-viewed-${bid.id}`,
            type: 'opportunity',
            title: `Customer viewed: ${title}`,
            description: `Quote was viewed ${daysInactive} days ago but no response yet`,
            priority: daysInactive > 5 ? 'high' : 'medium',
            impact: calculateImpact(value, daysInactive),
            urgency: Math.min(90, daysInactive * 10),
            score: 0,
            actionType: 'call',
            relatedEntity: { type: 'bid', id: bid.id, name: title },
            daysInactive,
            potentialValue: value,
            suggestedAction: `The customer has viewed your quote for ${title}. Call now while they're interested!`,
            context: `Hot lead — they opened your quote. ${value > 0 ? `Value: $${value.toLocaleString()}.` : ''}`,
            createdAt: new Date()
          });
        }

        // Any bid inactive for 2+ days (catch-all for statuses we might miss)
        if (!['draft', 'submitted', 'sent', 'pending', 'rejected', 'lost', 'declined',
              'accepted', 'won', 'approved', 'viewed', 'completed', 'cancelled', 'closed'].includes(status) 
            && daysInactive >= 5) {
          generatedSuggestions.push({
            id: `bid-review-${bid.id}`,
            type: 'inactive',
            title: `Review deal: ${title}`,
            description: `Status "${bid.status}" — inactive for ${daysInactive} days`,
            priority: daysInactive > 14 ? 'high' : 'medium',
            impact: calculateImpact(value, daysInactive),
            urgency: Math.min(70, daysInactive * 5),
            score: 0,
            actionType: 'review',
            relatedEntity: { type: 'bid', id: bid.id, name: title },
            daysInactive,
            potentialValue: value,
            suggestedAction: `Review and update the status of ${title}.`,
            context: `Current status: ${bid.status}. Last updated ${daysInactive} days ago.`,
            createdAt: new Date()
          });
        }
      });

      // ── 2. ANALYZE OPPORTUNITIES ──
      opportunities.forEach(opp => {
        const daysInactive = getDaysSince(opp.updated_at || opp.created_at);
        const status = (opp.status || '').toLowerCase();
        const value = parseFloat(opp.value || opp.amount || 0);
        const name = opp.name || opp.title || 'Unnamed Opportunity';

        // Stuck opportunities (lowered from 10 to 5 days)
        if (['prospecting', 'qualification', 'proposal', 'negotiation', 'discovery', 'new', 'open'].includes(status) && daysInactive >= 5) {
          generatedSuggestions.push({
            id: `opp-stuck-${opp.id}`,
            type: 'inactive',
            title: `Review stalled opportunity: ${name}`,
            description: `Status stuck at '${opp.status}' for ${daysInactive} days`,
            priority: daysInactive > 20 ? 'critical' : daysInactive > 10 ? 'high' : 'medium',
            impact: calculateImpact(value, daysInactive),
            urgency: Math.min(100, daysInactive * 7),
            score: 0,
            actionType: 'review',
            relatedEntity: { type: 'opportunity', id: opp.id, name },
            daysInactive,
            potentialValue: value,
            suggestedAction: `Update status or schedule follow-up for ${name}.`,
            context: `${value > 0 ? `Potential value: $${value.toLocaleString()}. ` : ''}Last updated ${daysInactive} days ago.`,
            createdAt: new Date()
          });
        }

        // Opportunities nearing close date
        if (opp.close_date || opp.expected_close_date) {
          const closeDate = opp.close_date || opp.expected_close_date;
          const daysUntilClose = getDaysUntil(closeDate);
          if (daysUntilClose <= 7 && daysUntilClose >= -3 && status !== 'won' && status !== 'lost' && status !== 'closed') {
            generatedSuggestions.push({
              id: `opp-closing-${opp.id}`,
              type: 'deadline',
              title: daysUntilClose < 0 
                ? `Overdue close date: ${name}` 
                : `Opportunity closing soon: ${name}`,
              description: daysUntilClose < 0 
                ? `Close date was ${Math.abs(daysUntilClose)} days ago` 
                : `Close date in ${daysUntilClose} days`,
              priority: daysUntilClose <= 1 ? 'critical' : 'high',
              impact: calculateImpact(value, 0),
              urgency: Math.max(80, 100 - daysUntilClose * 5),
              score: 0,
              actionType: 'call',
              relatedEntity: { type: 'opportunity', id: opp.id, name },
              potentialValue: value,
              suggestedAction: `Final push on ${name} — close date is ${daysUntilClose < 0 ? 'overdue' : 'approaching'}!`,
              context: `${value > 0 ? `Value: $${value.toLocaleString()}. ` : ''}Close date: ${new Date(closeDate).toLocaleDateString()}.`,
              createdAt: new Date()
            });
          }
        }
      });

      // ── 3. ANALYZE TASKS ──
      tasks.forEach(task => {
        const status = (task.status || '').toLowerCase();
        if (status === 'completed' || status === 'done' || status === 'closed') return;

        const dueDateStr = task.dueDate || task.due_date || task.deadline;
        const title = task.title || task.name || 'Untitled Task';
        const daysInactive = getDaysSince(task.updated_at || task.created_at);

        if (dueDateStr) {
          const daysOverdue = getDaysSince(dueDateStr);
          const daysUntilDue = getDaysUntil(dueDateStr);

          // Overdue tasks
          if (daysOverdue > 0 && daysUntilDue < 0) {
            generatedSuggestions.push({
              id: `task-overdue-${task.id}`,
              type: 'deadline',
              title: `Overdue task: ${title}`,
              description: `Task is ${daysOverdue} days overdue`,
              priority: daysOverdue > 7 ? 'critical' : daysOverdue > 3 ? 'high' : 'medium',
              impact: (task.priority === 'high' || task.priority === 'urgent') ? 85 : task.priority === 'medium' ? 65 : 45,
              urgency: Math.min(100, daysOverdue * 10),
              score: 0,
              actionType: 'update',
              relatedEntity: { type: 'task', id: task.id, name: title },
              suggestedAction: `Complete overdue task: ${title}`,
              context: `Priority: ${task.priority || 'normal'}. Overdue by ${daysOverdue} days.`,
              createdAt: new Date()
            });
          }

          // Upcoming tasks due within 3 days (expanded from 2)
          if (daysUntilDue >= 0 && daysUntilDue <= 3) {
            generatedSuggestions.push({
              id: `task-upcoming-${task.id}`,
              type: 'deadline',
              title: `Due soon: ${title}`,
              description: `Due in ${daysUntilDue === 0 ? 'today' : `${daysUntilDue} day${daysUntilDue > 1 ? 's' : ''}`}`,
              priority: daysUntilDue === 0 ? 'critical' : (task.priority === 'high' || task.priority === 'urgent') ? 'high' : 'medium',
              impact: 75,
              urgency: 85,
              score: 0,
              actionType: 'update',
              relatedEntity: { type: 'task', id: task.id, name: title },
              suggestedAction: `Focus on ${title} — due ${daysUntilDue === 0 ? 'today' : 'soon'}!`,
              context: `Priority: ${task.priority || 'normal'}. Due: ${new Date(dueDateStr).toLocaleDateString()}.`,
              createdAt: new Date()
            });
          }
        }

        // Tasks with no due date that have been sitting (lowered from no check to 3+ days)
        if (!dueDateStr && daysInactive >= 3) {
          generatedSuggestions.push({
            id: `task-nodue-${task.id}`,
            type: 'task',
            title: `Set due date: ${title}`,
            description: `Task created ${daysInactive} days ago with no due date`,
            priority: daysInactive > 14 ? 'high' : 'medium',
            impact: 50,
            urgency: Math.min(60, daysInactive * 3),
            score: 0,
            actionType: 'update',
            relatedEntity: { type: 'task', id: task.id, name: title },
            daysInactive,
            suggestedAction: `Add a due date and prioritize ${title}.`,
            context: `Status: ${task.status || 'unknown'}. Created ${daysInactive} days ago.`,
            createdAt: new Date()
          });
        }
      });

      // ── 4. ANALYZE CONTACTS ──
      contacts.forEach(contact => {
        const daysInactive = getDaysSince(contact.updated_at || contact.created_at);
        const status = (contact.status || '').toLowerCase();
        const name = contact.name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || contact.email || 'Unknown Contact';

        // Active contacts with no recent interaction (lowered from 30 to 14 days)
        if ((status === 'active' || status === 'customer' || status === 'lead' || status === 'prospect') && daysInactive >= 14) {
          generatedSuggestions.push({
            id: `contact-inactive-${contact.id}`,
            type: 'inactive',
            title: `Re-engage with ${name}`,
            description: `No interaction for ${daysInactive} days`,
            priority: daysInactive > 60 ? 'high' : daysInactive > 30 ? 'medium' : 'low',
            impact: 65,
            urgency: Math.min(80, daysInactive * 2),
            score: 0,
            actionType: 'email',
            relatedEntity: { type: 'contact', id: contact.id, name },
            daysInactive,
            suggestedAction: `Send check-in email to ${name} at ${contact.company || 'their company'}.`,
            context: `Last contact: ${daysInactive} days ago. Keep the relationship warm.`,
            createdAt: new Date()
          });
        }

        // New contacts that haven't been contacted yet (created recently, not updated)
        if (daysInactive <= 3 && daysInactive >= 0) {
          const createdDaysAgo = getDaysSince(contact.created_at);
          if (createdDaysAgo >= 1 && createdDaysAgo <= 7 && (status === 'lead' || status === 'prospect' || status === 'new' || !status)) {
            generatedSuggestions.push({
              id: `contact-new-${contact.id}`,
              type: 'opportunity',
              title: `Reach out to new ${status || 'contact'}: ${name}`,
              description: `Added ${createdDaysAgo} day${createdDaysAgo > 1 ? 's' : ''} ago — make a great first impression`,
              priority: 'medium',
              impact: 70,
              urgency: 65,
              score: 0,
              actionType: 'email',
              relatedEntity: { type: 'contact', id: contact.id, name },
              suggestedAction: `Send an introductory email to ${name}${contact.company ? ` at ${contact.company}` : ''}.`,
              context: `Status: ${status || 'new'}. First contact opportunity.`,
              createdAt: new Date()
            });
          }
        }
      });

      // ── 5. ANALYZE APPOINTMENTS ──
      appointments.forEach(appt => {
        const title = appt.title || appt.subject || 'Untitled Appointment';
        const apptDate = appt.start_time || appt.date || appt.scheduled_at;
        if (!apptDate) return;

        const daysUntil = getDaysUntil(apptDate);

        // Upcoming appointments that need preparation (within 2 days)
        if (daysUntil >= 0 && daysUntil <= 2) {
          generatedSuggestions.push({
            id: `appt-prep-${appt.id}`,
            type: 'deadline',
            title: `Prepare for: ${title}`,
            description: daysUntil === 0 ? 'Appointment is today!' : `Appointment in ${daysUntil} day${daysUntil > 1 ? 's' : ''}`,
            priority: daysUntil === 0 ? 'critical' : 'high',
            impact: 80,
            urgency: daysUntil === 0 ? 100 : 85,
            score: 0,
            actionType: 'review',
            relatedEntity: { type: 'appointment', id: appt.id, name: title },
            suggestedAction: `Review notes and prepare for ${title}.`,
            context: `Scheduled: ${new Date(apptDate).toLocaleString()}.`,
            createdAt: new Date()
          });
        }

        // Missed/past appointments with no follow-up
        if (daysUntil < 0 && daysUntil >= -7) {
          const daysSince = Math.abs(daysUntil);
          generatedSuggestions.push({
            id: `appt-followup-${appt.id}`,
            type: 'follow_up',
            title: `Follow up after: ${title}`,
            description: `Appointment was ${daysSince} day${daysSince > 1 ? 's' : ''} ago`,
            priority: daysSince > 3 ? 'high' : 'medium',
            impact: 70,
            urgency: Math.min(80, daysSince * 12),
            score: 0,
            actionType: 'email',
            relatedEntity: { type: 'appointment', id: appt.id, name: title },
            daysInactive: daysSince,
            suggestedAction: `Send follow-up notes or thank-you after ${title}.`,
            context: `Took place ${daysSince} day${daysSince > 1 ? 's' : ''} ago on ${new Date(apptDate).toLocaleDateString()}.`,
            createdAt: new Date()
          });
        }
      });

      // ── 6. ANALYZE PORTAL MESSAGES ──
      portalMessages.forEach((msg: any) => {
        const isUnread = !msg.read && msg.from === 'customer';
        const hasNoReply = !msg.replies || msg.replies.length === 0 ||
          msg.replies[msg.replies.length - 1]?.from === 'customer';

        if (isUnread || hasNoReply) {
          const hoursSinceSent = (Date.now() - new Date(msg.createdAt).getTime()) / (1000 * 60 * 60);
          const daysSinceSent = Math.floor(hoursSinceSent / 24);
          const customerName = msg.contactName || msg.senderEmail || 'A customer';

          generatedSuggestions.push({
            id: `portal-msg-${msg.id}`,
            type: 'follow_up',
            title: `Reply to portal message from ${customerName}`,
            description: isUnread
              ? `Unread message: "${msg.subject}" — sent ${daysSinceSent > 0 ? daysSinceSent + ' days' : Math.round(hoursSinceSent) + ' hours'} ago`
              : `Awaiting your reply: "${msg.subject}"`,
            priority: hoursSinceSent > 48 ? 'critical' : hoursSinceSent > 12 ? 'high' : 'medium',
            impact: 85,
            urgency: Math.min(100, Math.round(hoursSinceSent * 2)),
            score: 0,
            actionType: 'email',
            relatedEntity: {
              type: 'contact',
              id: msg.contactId || msg.id,
              name: customerName,
            },
            suggestedAction: `Open Customer Portal admin and reply to "${msg.subject}" from ${customerName}.`,
            context: `${msg.contactCompany ? `Company: ${msg.contactCompany}. ` : ''}Subject: ${msg.subject}. ${isUnread ? 'Message has not been read yet.' : 'Customer is waiting for your response.'}`,
            createdAt: new Date(msg.createdAt),
          });
        }
      });

      // ── 7. PIPELINE HEALTH SUGGESTIONS (always-on baseline) ──
      // These ensure the user always sees at least a few actionable items
      if (allDeals.length > 0) {
        const draftCount = allDeals.filter(b => (b.status || '').toLowerCase() === 'draft').length;
        const activeCount = allDeals.filter(b => !['completed', 'cancelled', 'closed', 'won', 'lost', 'rejected', 'declined'].includes((b.status || '').toLowerCase())).length;
        
        if (draftCount > 3) {
          generatedSuggestions.push({
            id: `pipeline-drafts-bulk`,
            type: 'task',
            title: `${draftCount} draft deals need attention`,
            description: `You have ${draftCount} deals stuck in draft — review and send or archive them`,
            priority: draftCount > 10 ? 'high' : 'medium',
            impact: 55,
            urgency: 50,
            score: 0,
            actionType: 'review',
            relatedEntity: { type: 'bid', id: 'pipeline', name: `${draftCount} Draft Deals` },
            suggestedAction: `Open your Deals view and filter by "Draft" to review and update these deals.`,
            context: `${draftCount} of ${allDeals.length} total deals are still in draft status.`,
            createdAt: new Date()
          });
        }

        // Pipeline with no recent wins
        const recentWins = allDeals.filter(b => {
          const status = (b.status || '').toLowerCase();
          return (status === 'won' || status === 'accepted' || status === 'approved') && getDaysSince(b.updated_at || b.created_at) <= 30;
        });
        if (activeCount > 0 && recentWins.length === 0) {
          generatedSuggestions.push({
            id: `pipeline-no-wins`,
            type: 'opportunity',
            title: `No recent wins in the last 30 days`,
            description: `Review your ${activeCount} active deals and identify the most promising ones to push forward`,
            priority: 'medium',
            impact: 60,
            urgency: 55,
            score: 0,
            actionType: 'review',
            relatedEntity: { type: 'bid', id: 'pipeline', name: 'Active Pipeline' },
            suggestedAction: `Focus on your highest-value deals and schedule follow-ups this week.`,
            context: `${activeCount} active deals in pipeline. Prioritize the ones closest to closing.`,
            createdAt: new Date()
          });
        }
      }

      // ── 8. CALCULATE SCORES AND SORT ──
      generatedSuggestions.forEach(suggestion => {
        suggestion.score = (suggestion.impact * 0.6) + (suggestion.urgency * 0.4);
      });

      generatedSuggestions.sort((a, b) => b.score - a.score);

      // Calculate metrics
      const criticalCount = generatedSuggestions.filter(s => s.priority === 'critical').length;
      const totalRevenue = generatedSuggestions.reduce((sum, s) => sum + (s.potentialValue || 0), 0);
      const inactiveSuggestions = generatedSuggestions.filter(s => s.daysInactive);
      const avgInactive = inactiveSuggestions.length > 0
        ? inactiveSuggestions.reduce((sum, s) => sum + (s.daysInactive || 0), 0) / inactiveSuggestions.length
        : 0;

      setMetrics({
        totalSuggestions: generatedSuggestions.length,
        criticalActions: criticalCount,
        potentialRevenue: totalRevenue,
        avgDaysInactive: Math.round(avgInactive),
        topPriority: generatedSuggestions[0] || null
      });

      setSuggestions(generatedSuggestions);

    } catch (error) {
      setSuggestions([]);
      setMetrics(null);
    } finally {
      setIsLoading(false);
    }
  };

  return { suggestions, metrics, isLoading, refresh: loadAISuggestions };
}