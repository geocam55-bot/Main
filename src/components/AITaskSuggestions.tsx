import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Progress } from './ui/progress';
import { copyToClipboard } from '../utils/clipboard';
import {
  Sparkles,
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle2,
  Mail,
  Phone,
  Calendar,
  FileText,
  Target,
  User as UserIcon,
  ArrowRight,
  RefreshCw,
  Star,
  Flame,
  Zap,
  MessageSquare,
  DollarSign,
  Users,
  BarChart3,
  Copy,
  Send,
  X,
  Lightbulb,
  Trophy,
  AlarmClock,
  History,
  ThumbsUp,
  Eye,
  EyeOff,
  Sunrise,
  Sun,
  Moon,
  Coffee,
  ChevronDown,
  ChevronUp,
  Award,
  Rocket,
  Brain,
  TrendingDown
} from 'lucide-react';
import type { User } from '../App';
import { PermissionGate } from './PermissionGate';
import { createClient } from '../utils/supabase/client';
import { toast } from 'sonner@2.0.3';
import { useAISuggestions, type Suggestion } from '../hooks/useAISuggestions';
import { getAIPrefsClient, upsertAIPrefsClient } from '../utils/ai-prefs-client';

// ─── Daily Tips Pool ───
const DAILY_TIPS = [
  { category: 'Sales', tip: 'Follow up within 24 hours of a meeting to keep momentum going. Speed beats perfection in sales outreach.', icon: Phone },
  { category: 'Productivity', tip: 'Block 30 minutes each morning to review your AI suggestions before diving into emails. Your future self will thank you.', icon: Clock },
  { category: 'Relationships', tip: 'Add a personal note to every contact interaction. Small details build trust and show you truly care.', icon: Users },
  { category: 'Deals', tip: 'Always have a clear next step defined for every active deal. Ambiguity kills momentum in your pipeline.', icon: Target },
  { category: 'Time Management', tip: 'Tackle your highest-priority suggestion first each day. Eating the frog early frees your mind for creative work.', icon: Rocket },
  { category: 'Follow-ups', tip: 'The fortune is in the follow-up. Most deals close after 5+ touchpoints, not the first call.', icon: RefreshCw },
  { category: 'Organization', tip: 'Update your CRM notes immediately after every call. Your memory fades faster than you think.', icon: FileText },
  { category: 'Networking', tip: 'Reconnect with one dormant contact each week. Old relationships can unlock unexpected new opportunities.', icon: MessageSquare },
  { category: 'Pipeline', tip: 'Review stale deals weekly and either advance them or remove them. A clean pipeline gives you honest visibility.', icon: TrendingUp },
  { category: 'Email', tip: 'Keep follow-up emails under 3 sentences. Brevity shows respect for your prospect\'s time and gets more replies.', icon: Mail },
  { category: 'Mindset', tip: 'Celebrate small wins daily. Every completed follow-up is one step closer to closing a deal.', icon: Trophy },
  { category: 'Strategy', tip: 'Focus on your top 20% of contacts that drive 80% of your revenue. Not all leads are created equal.', icon: Brain },
  { category: 'Customer Success', tip: 'Check in with existing customers quarterly. Retention is cheaper than acquisition every time.', icon: ThumbsUp },
  { category: 'Preparation', tip: 'Research a prospect for 5 minutes before every call. A tailored conversation always outperforms a generic pitch.', icon: Eye },
];

// ─── Motivational Quotes ───
const MOTIVATIONAL_QUOTES = [
  { quote: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier" },
  { quote: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
  { quote: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { quote: "Every strike brings me closer to the next home run.", author: "Babe Ruth" },
  { quote: "Action is the foundational key to all success.", author: "Pablo Picasso" },
  { quote: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { quote: "Opportunities don't happen. You create them.", author: "Chris Grosser" },
];

// ─── Storage Keys Helper ───
const getStorageKeys = (userId: string) => ({
  dismissed: `prospaces_ai_dismissed_${userId}`,
  snoozed: `prospaces_ai_snoozed_${userId}`,
  completed: `prospaces_ai_completed_${userId}`,
  streak: `prospaces_ai_streak_${userId}`,
  lastActiveDate: `prospaces_ai_last_active_${userId}`,
});

interface CompletedAction {
  id: string;
  title: string;
  type: string;
  actionTaken: string;
  completedAt: string;
}

interface SnoozedItem {
  id: string;
  snoozeUntil: string;
  title: string;
}

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  totalActionsCompleted: number;
  todayActionsCompleted: number;
  lastActiveDate: string;
}

interface AITaskSuggestionsProps {
  user: User;
  onNavigate?: (view: string) => void;
}

export function AITaskSuggestions({ user, onNavigate }: AITaskSuggestionsProps) {
  const { suggestions, metrics, isLoading, refresh } = useAISuggestions(user);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');
  const [activeTab, setActiveTab] = useState<'briefing' | 'suggestions' | 'history'>('briefing');
  
  // Email template dialog state
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  
  // Task creation dialog state
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');

  // Snooze dialog state
  const [showSnoozeDialog, setShowSnoozeDialog] = useState(false);
  const [snoozeHours, setSnoozeHours] = useState('4');

  // Interactive state
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [snoozedItems, setSnoozedItems] = useState<SnoozedItem[]>([]);
  const [completedActions, setCompletedActions] = useState<CompletedAction[]>([]);
  const [streakData, setStreakData] = useState<StreakData>({
    currentStreak: 0,
    longestStreak: 0,
    totalActionsCompleted: 0,
    todayActionsCompleted: 0,
    lastActiveDate: '',
  });
  const [showCompletedExpanded, setShowCompletedExpanded] = useState(false);

  // ─── Load persisted state ───
  useEffect(() => {
    let isMounted = true;
    
    // Fast initial load from localStorage
    try {
      const storageKeys = getStorageKeys(user.id);
      const dismissed = localStorage.getItem(storageKeys.dismissed);
      if (dismissed) setDismissedIds(JSON.parse(dismissed));

      const snoozed = localStorage.getItem(storageKeys.snoozed);
      if (snoozed) {
        const items: SnoozedItem[] = JSON.parse(snoozed);
        const active = items.filter(s => new Date(s.snoozeUntil) > new Date());
        setSnoozedItems(active);
        localStorage.setItem(storageKeys.snoozed, JSON.stringify(active));
      }

      const completed = localStorage.getItem(storageKeys.completed);
      if (completed) setCompletedActions(JSON.parse(completed));

      const streak = localStorage.getItem(storageKeys.streak);
      if (streak) {
        const data: StreakData = JSON.parse(streak);
        const lastActive = new Date(data.lastActiveDate);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const isToday = lastActive.toDateString() === today.toDateString();
        const isYesterday = lastActive.toDateString() === yesterday.toDateString();
        
        if (!isToday && !isYesterday) {
          data.currentStreak = 0;
          data.todayActionsCompleted = 0;
        } else if (!isToday) {
          data.todayActionsCompleted = 0;
        }
        
        setStreakData(data);
      }
    } catch (e) {
      // Failed to load local AI suggestions state
    }
    
    // Sync with remote server state (survives logouts/device switches)
    const syncRemote = async () => {
      try {
        const prefs = await getAIPrefsClient();
        if (!prefs || !isMounted) return;
        
        const storageKeys = getStorageKeys(user.id);
        
        if (prefs.dismissedIds) {
          setDismissedIds(prefs.dismissedIds);
          localStorage.setItem(storageKeys.dismissed, JSON.stringify(prefs.dismissedIds));
        }
        if (prefs.snoozedItems) {
          const items: SnoozedItem[] = prefs.snoozedItems;
          const active = items.filter(s => new Date(s.snoozeUntil) > new Date());
          setSnoozedItems(active);
          localStorage.setItem(storageKeys.snoozed, JSON.stringify(active));
        }
        if (prefs.completedActions) {
          setCompletedActions(prefs.completedActions);
          localStorage.setItem(storageKeys.completed, JSON.stringify(prefs.completedActions));
        }
        if (prefs.streakData) {
          const data: StreakData = prefs.streakData;
          const lastActive = new Date(data.lastActiveDate);
          const today = new Date();
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          
          const isToday = lastActive.toDateString() === today.toDateString();
          const isYesterday = lastActive.toDateString() === yesterday.toDateString();
          
          if (!isToday && !isYesterday) {
            data.currentStreak = 0;
            data.todayActionsCompleted = 0;
          } else if (!isToday) {
            data.todayActionsCompleted = 0;
          }
          setStreakData(data);
          localStorage.setItem(storageKeys.streak, JSON.stringify(data));
        }
      } catch (e) {}
    };
    
    syncRemote();
    
    return () => { isMounted = false; };
  }, [user.id]);

  // ─── Time-based greeting ───
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    const firstName = user.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'there';
    
    if (hour < 6) return { text: `Burning the midnight oil, ${firstName}?`, icon: Moon, period: 'night' };
    if (hour < 12) return { text: `Good morning, ${firstName}!`, icon: Sunrise, period: 'morning' };
    if (hour < 17) return { text: `Good afternoon, ${firstName}!`, icon: Sun, period: 'afternoon' };
    if (hour < 21) return { text: `Good evening, ${firstName}!`, icon: Coffee, period: 'evening' };
    return { text: `Working late, ${firstName}?`, icon: Moon, period: 'night' };
  }, [user?.full_name, user?.email]);

  // ─── Daily tip (changes daily) ───
  const dailyTip = useMemo(() => {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    return DAILY_TIPS[dayOfYear % DAILY_TIPS.length];
  }, []);

  // ─── Daily quote (changes daily) ───
  const dailyQuote = useMemo(() => {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    return MOTIVATIONAL_QUOTES[dayOfYear % MOTIVATIONAL_QUOTES.length];
  }, []);

  // ─── Focus of the Day ───
  const focusOfDay = useMemo(() => {
    if (!suggestions.length) return null;

    const typeCounts: Record<string, { count: number; totalScore: number; totalValue: number }> = {};
    suggestions.forEach(s => {
      if (!typeCounts[s.type]) typeCounts[s.type] = { count: 0, totalScore: 0, totalValue: 0 };
      typeCounts[s.type].count++;
      typeCounts[s.type].totalScore += s.score;
      typeCounts[s.type].totalValue += s.potentialValue || 0;
    });

    const topType = Object.entries(typeCounts).sort((a, b) => b[1].totalScore - a[1].totalScore)[0];
    if (!topType) return null;

    const typeLabels: Record<string, { label: string; description: string; icon: any; color: string }> = {
      follow_up: { label: 'Follow-Ups', description: 'You have pending follow-ups that need attention. Reaching out today could make a real difference.', icon: Phone, color: 'blue' },
      deadline: { label: 'Deadlines', description: 'Several items are approaching deadlines or overdue. Prioritize these to stay on track.', icon: AlarmClock, color: 'red' },
      inactive: { label: 'Re-Engagement', description: 'Some contacts and deals have gone quiet. Today is a great day to reconnect.', icon: Users, color: 'purple' },
      engagement: { label: 'Engagement', description: 'Opportunities exist to re-engage with previous prospects. A fresh approach could reopen doors.', icon: MessageSquare, color: 'green' },
      opportunity: { label: 'Opportunities', description: 'New opportunities need your attention. Review and move them forward.', icon: Target, color: 'orange' },
      task: { label: 'Tasks', description: 'You have tasks requiring action. Clearing these will free your pipeline.', icon: CheckCircle2, color: 'teal' },
    };

    const info = typeLabels[topType[0]] || { label: topType[0], description: 'Focus on this area today.', icon: Target, color: 'blue' };
    return {
      ...info,
      count: topType[1].count,
      totalValue: topType[1].totalValue,
    };
  }, [suggestions]);

  // ─── Filter out dismissed and snoozed suggestions ───
  const activeSuggestions = useMemo(() => {
    const snoozedIds = snoozedItems.map(s => s.id);
    return suggestions.filter(s => !dismissedIds.includes(s.id) && !snoozedIds.includes(s.id));
  }, [suggestions, dismissedIds, snoozedItems]);

  const filteredSuggestions = activeSuggestions.filter(s => 
    selectedFilter === 'all' || s.priority === selectedFilter
  );

  // ─── Daily progress ───
  const dailyProgress = useMemo(() => {
    const total = activeSuggestions.length + streakData.todayActionsCompleted;
    if (total === 0) return 100;
    return Math.round((streakData.todayActionsCompleted / Math.max(total, 1)) * 100);
  }, [activeSuggestions, streakData]);

  // ─── Streak management ───
  const updateStreak = useCallback((actionTitle: string, actionType: string) => {
    const storageKeys = getStorageKeys(user.id);
    let updatedStreak: StreakData | null = null;
    
    setStreakData(prev => {
      const today = new Date().toDateString();
      const lastActive = prev.lastActiveDate ? new Date(prev.lastActiveDate).toDateString() : '';
      
      let newStreak = prev.currentStreak;
      if (lastActive !== today) {
        // New day! Check if yesterday
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (lastActive === yesterday.toDateString() || lastActive === '') {
          newStreak = prev.currentStreak + 1;
        } else {
          newStreak = 1; // Reset
        }
      } else if (prev.todayActionsCompleted === 0) {
        newStreak = prev.currentStreak + 1;
      }

      const updated: StreakData = {
        currentStreak: newStreak,
        longestStreak: Math.max(prev.longestStreak, newStreak),
        totalActionsCompleted: prev.totalActionsCompleted + 1,
        todayActionsCompleted: (lastActive === today ? prev.todayActionsCompleted : 0) + 1,
        lastActiveDate: new Date().toISOString(),
      };

      localStorage.setItem(storageKeys.streak, JSON.stringify(updated));
      updatedStreak = updated;
      return updated;
    });

    // Add to completed actions
    const newCompleted: CompletedAction = {
      id: Date.now().toString(),
      title: actionTitle,
      type: actionType,
      actionTaken: actionType,
      completedAt: new Date().toISOString(),
    };
    
    setCompletedActions(prev => {
      const updated = [newCompleted, ...prev].slice(0, 50); // Keep last 50
      localStorage.setItem(storageKeys.completed, JSON.stringify(updated));
      
      // Fire and forget remote sync
      if (updatedStreak) {
        upsertAIPrefsClient({ streakData: updatedStreak, completedActions: updated });
      }
      
      return updated;
    });
  }, [user.id]);

  // ─── Handlers ───
  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical': return <Flame className="h-4 w-4 text-red-600" />;
      case 'high': return <Zap className="h-4 w-4 text-orange-600" />;
      case 'medium': return <Star className="h-4 w-4 text-yellow-600" />;
      case 'low': return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      default: return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    const config = {
      critical: { className: 'bg-red-100 text-red-700 border-red-200' },
      high: { className: 'bg-orange-100 text-orange-700 border-orange-200' },
      medium: { className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
      low: { className: 'bg-green-100 text-green-700 border-green-200' },
    };
    return config[priority as keyof typeof config] || config.low;
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'call': return <Phone className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      case 'meeting': return <Calendar className="h-4 w-4" />;
      case 'review': return <FileText className="h-4 w-4" />;
      case 'update': return <RefreshCw className="h-4 w-4" />;
      default: return <ArrowRight className="h-4 w-4" />;
    }
  };

  const generateEmailTemplate = (suggestion: Suggestion): { subject: string; body: string } => {
    const { relatedEntity, type, daysInactive, potentialValue } = suggestion;
    
    switch (type) {
      case 'follow_up':
        return {
          subject: `Following up on ${relatedEntity.name}`,
          body: `Hi there,\n\nI wanted to follow up on the ${relatedEntity.type} "${relatedEntity.name}" that we submitted ${daysInactive} days ago.\n\nI'd love to discuss this further and answer any questions you may have. The proposal outlines a ${potentialValue ? `$${potentialValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''} solution that I believe would be a great fit for your needs.\n\nWould you be available for a quick call this week to discuss?\n\nBest regards,\n${user.full_name || user.email || 'User'}`
        };
      case 'engagement':
        return {
          subject: `New opportunity for ${relatedEntity.name}`,
          body: `Hi there,\n\nI hope this email finds you well! I wanted to reach out regarding our previous conversation about "${relatedEntity.name}".\n\nWe've made some exciting updates to our offering, including:\n- Enhanced features and capabilities\n- Competitive pricing options\n- Flexible terms that may better suit your needs\n\nI'd love to schedule a time to reconnect and share how these changes might benefit your organization.\n\nLooking forward to hearing from you!\n\nBest regards,\n${user.full_name || user.email || 'User'}`
        };
      case 'inactive':
        return {
          subject: `Checking in - ${relatedEntity.name}`,
          body: `Hi there,\n\nI hope you've been well! It's been about ${daysInactive} days since we last connected, and I wanted to reach out to see how things are going.\n\nI'd love to catch up and learn about any new projects or challenges you're currently facing. Perhaps there's an opportunity for us to collaborate again.\n\nWould you be available for a brief call or coffee sometime soon?\n\nWarm regards,\n${user.full_name || user.email || 'User'}`
        };
      default:
        return {
          subject: `Regarding ${relatedEntity.name}`,
          body: `Hi there,\n\nI wanted to reach out regarding "${relatedEntity.name}".\n\n${suggestion.suggestedAction}\n\nPlease let me know if you'd like to discuss this further.\n\nBest regards,\n${user.full_name || user.email || 'User'}`
        };
    }
  };

  const handleTakeAction = (suggestion: Suggestion) => {
    setSelectedSuggestion(suggestion);
    
    // Portal messages: navigate directly to the portal admin
    if (suggestion.id.startsWith('portal-msg-') && onNavigate) {
      onNavigate('portal-admin');
      toast.info('Opening Customer Portal to reply...');
      return;
    }

    if (suggestion.actionType === 'email') {
      const template = generateEmailTemplate(suggestion);
      setEmailSubject(template.subject);
      setEmailBody(template.body);
      setShowEmailDialog(true);
    } else {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      setTaskTitle(suggestion.title);
      setTaskDescription(suggestion.suggestedAction + '\n\n' + suggestion.context);
      setTaskDueDate(tomorrow.toISOString().split('T')[0]);
      setTaskPriority(suggestion.priority === 'critical' || suggestion.priority === 'high' ? 'high' : 'medium');
      setShowTaskDialog(true);
    }
  };

  const handleSendEmail = async () => {
    try {
      const emailContent = `Subject: ${emailSubject}\n\n${emailBody}`;
      await copyToClipboard(emailContent);
      
      setShowEmailDialog(false);
      toast.success('Email template copied to clipboard!');
      
      if (selectedSuggestion) {
        updateStreak(selectedSuggestion.title, 'email');
        handleDismissSuggestion(selectedSuggestion.id);
      }
    } catch (error) {
      // Failed to copy email
      toast.error('Failed to copy email template');
    }
  };

  const handleCreateTask = async () => {
    try {
      const supabase = createClient();
      
      const newTask = {
        title: taskTitle,
        description: taskDescription,
        status: 'pending',
        priority: taskPriority,
        dueDate: taskDueDate,
        assigned_to: user.id,
        created_by: user.id,
        organization_id: user.organizationId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const { error } = await supabase
        .from('tasks')
        .insert([newTask])
        .select()
        .single();
      
      if (error) {
        // Error creating task
        toast.error('Failed to create task');
        return;
      }
      
      setShowTaskDialog(false);
      toast.success('Task created successfully!');
      
      if (selectedSuggestion) {
        updateStreak(selectedSuggestion.title, 'task');
        handleDismissSuggestion(selectedSuggestion.id);
      }
      
      refresh();
    } catch (error) {
      // Failed to create task
      toast.error('Failed to create task');
    }
  };

  const handleDismissSuggestion = (suggestionId: string) => {
    const storageKeys = getStorageKeys(user.id);
    setDismissedIds(prev => {
      const updated = [...prev, suggestionId];
      localStorage.setItem(storageKeys.dismissed, JSON.stringify(updated));
      upsertAIPrefsClient({ dismissedIds: updated });
      return updated;
    });
    toast.success('Suggestion dismissed');
  };

  const handleSnoozeSuggestion = (suggestion: Suggestion) => {
    setSelectedSuggestion(suggestion);
    setShowSnoozeDialog(true);
  };

  const confirmSnooze = () => {
    if (!selectedSuggestion) return;
    
    const storageKeys = getStorageKeys(user.id);
    const snoozeUntil = new Date();
    snoozeUntil.setHours(snoozeUntil.getHours() + parseInt(snoozeHours));
    
    const newSnoozed: SnoozedItem = {
      id: selectedSuggestion.id,
      snoozeUntil: snoozeUntil.toISOString(),
      title: selectedSuggestion.title,
    };

    setSnoozedItems(prev => {
      const updated = [...prev, newSnoozed];
      localStorage.setItem(storageKeys.snoozed, JSON.stringify(updated));
      upsertAIPrefsClient({ snoozedItems: updated });
      return updated;
    });

    setShowSnoozeDialog(false);
    toast.success(`Snoozed for ${snoozeHours} hours. It'll come back later!`);
  };

  const handleMarkComplete = (suggestion: Suggestion) => {
    updateStreak(suggestion.title, suggestion.actionType);
    handleDismissSuggestion(suggestion.id);
    toast.success('Marked as complete! Great work!');
  };

  const handleCopyEmail = async () => {
    try {
      const emailContent = `Subject: ${emailSubject}\n\n${emailBody}`;
      await copyToClipboard(emailContent);
      toast.success('Email template copied to clipboard!');
    } catch (error) {
      // Failed to copy email
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleClearHistory = () => {
    const storageKeys = getStorageKeys(user.id);
    setCompletedActions([]);
    localStorage.setItem(storageKeys.completed, JSON.stringify([]));
    upsertAIPrefsClient({ completedActions: [] });
    toast.success('Action history cleared');
  };

  // ─── Today's date formatted ───
  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // ─── Render ───
  return (
    <PermissionGate user={user} module="ai-suggestions" action="view">
    <div className="h-full flex flex-col space-y-4 sm:space-y-6 p-4 sm:p-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {(() => {
              const GreetIcon = greeting.icon;
              return <GreetIcon className="h-6 w-6 text-amber-500" />;
            })()}
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground">{greeting.text}</h1>
          </div>
          <p className="text-sm text-muted-foreground">{todayFormatted}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Streak Badge */}
          {streakData.currentStreak > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-orange-100 to-amber-100 border border-orange-200">
              <Flame className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-semibold text-orange-700">{streakData.currentStreak} day streak</span>
            </div>
          )}
          <Button onClick={refresh} disabled={isLoading} size="sm" variant="outline">
            <RefreshCw className={`h-4 w-4 sm:mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg w-full sm:w-fit overflow-x-auto whitespace-nowrap [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <button
          onClick={() => setActiveTab('briefing')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'briefing' 
              ? 'bg-background text-foreground shadow-sm' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4" />
            Daily Briefing
          </div>
        </button>
        <button
          onClick={() => setActiveTab('suggestions')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'suggestions' 
              ? 'bg-background text-foreground shadow-sm' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Target className="h-4 w-4" />
            Suggestions
            {activeSuggestions.length > 0 && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0">{activeSuggestions.length}</Badge>
            )}
          </div>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'history' 
              ? 'bg-background text-foreground shadow-sm' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <History className="h-4 w-4" />
            History
            {completedActions.length > 0 && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0">{completedActions.length}</Badge>
            )}
          </div>
        </button>
      </div>

      {/* ═══════════ TAB: DAILY BRIEFING ═══════════ */}
      {activeTab === 'briefing' && (
        <div className="space-y-4 sm:space-y-6">
          {/* Daily Progress & Streaks Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Today's Progress */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Rocket className="h-5 w-5 text-blue-600" />
                  Today's Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {streakData.todayActionsCompleted} of {activeSuggestions.length + streakData.todayActionsCompleted} suggestions addressed
                    </span>
                    <span className="font-semibold text-blue-600">{dailyProgress}%</span>
                  </div>
                  <Progress value={dailyProgress} className="h-3" />
                  <div className="grid grid-cols-3 gap-4 pt-2">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-foreground">{streakData.todayActionsCompleted}</p>
                      <p className="text-xs text-muted-foreground">Done Today</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">{activeSuggestions.length}</p>
                      <p className="text-xs text-muted-foreground">Remaining</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600">{snoozedItems.length}</p>
                      <p className="text-xs text-muted-foreground">Snoozed</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Streak Card */}
            <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-amber-600" />
                  Your Streak
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center space-y-3">
                  <div className="relative inline-flex items-center justify-center">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-lg">
                      <span className="text-3xl font-bold text-white">{streakData.currentStreak}</span>
                    </div>
                    {streakData.currentStreak >= 7 && (
                      <Award className="absolute -top-1 -right-1 h-7 w-7 text-amber-600" />
                    )}
                  </div>
                  <p className="text-sm text-orange-700 font-medium">
                    {streakData.currentStreak === 0 
                      ? 'Start your streak today!' 
                      : streakData.currentStreak === 1 
                        ? 'Day streak! Keep it going!'
                        : `${streakData.currentStreak} day streak! Amazing!`
                    }
                  </p>
                  <div className="flex justify-between text-xs text-orange-600 pt-1">
                    <span>Best: {streakData.longestStreak}d</span>
                    <span>Total: {streakData.totalActionsCompleted}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Metrics Dashboard */}
          {metrics && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <Card>
                <CardContent className="pt-4 sm:pt-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">Active Suggestions</p>
                      <p className="text-2xl sm:text-3xl text-foreground mt-1">{activeSuggestions.length}</p>
                    </div>
                    <Sparkles className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4 sm:pt-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">Critical Actions</p>
                      <p className="text-2xl sm:text-3xl text-red-600 mt-1">{metrics.criticalActions}</p>
                    </div>
                    <Flame className="h-6 w-6 sm:h-8 sm:w-8 text-red-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4 sm:pt-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">Potential Revenue</p>
                      <p className="text-xl sm:text-2xl text-green-600 mt-1">
                        ${metrics.potentialRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                    <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4 sm:pt-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">Avg Days Inactive</p>
                      <p className="text-2xl sm:text-3xl text-orange-600 mt-1">{metrics.avgDaysInactive}</p>
                    </div>
                    <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-orange-600" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Focus of the Day + Daily Tip Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Focus of the Day */}
            {focusOfDay && (
              <Card className={`border-2 border-${focusOfDay.color}-200 bg-gradient-to-br from-${focusOfDay.color}-50 to-white`}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Brain className="h-5 w-5 text-indigo-600" />
                    Today's Focus Area
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-background shadow-sm flex items-center justify-center flex-shrink-0">
                      {(() => {
                        const FocusIcon = focusOfDay.icon;
                        return <FocusIcon className="h-6 w-6 text-indigo-600" />;
                      })()}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground mb-1">{focusOfDay.label}</h3>
                      <p className="text-sm text-muted-foreground mb-2">{focusOfDay.description}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Target className="h-3 w-3" /> {focusOfDay.count} items
                        </span>
                        {focusOfDay.totalValue > 0 && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" /> ${focusOfDay.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        )}
                      </div>
                      <Button 
                        size="sm" 
                        className="mt-3"
                        onClick={() => setActiveTab('suggestions')}
                      >
                        View Suggestions
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Daily Tip */}
            <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Lightbulb className="h-5 w-5 text-amber-500" />
                  Tip of the Day
                  <Badge variant="outline" className="text-xs border-amber-300 text-amber-700">{dailyTip.category}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-background shadow-sm flex items-center justify-center flex-shrink-0">
                    {(() => {
                      const TipIcon = dailyTip.icon;
                      return <TipIcon className="h-6 w-6 text-amber-600" />;
                    })()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-foreground leading-relaxed">{dailyTip.tip}</p>
                  </div>
                </div>
                {/* Daily Quote */}
                <div className="mt-4 pt-4 border-t border-amber-200">
                  <p className="text-xs italic text-muted-foreground">"{dailyQuote.quote}"</p>
                  <p className="text-xs text-muted-foreground mt-1">-- {dailyQuote.author}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Priority Alert */}
          {metrics?.topPriority && (
            <Card className="border-purple-300 bg-purple-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-900 text-base sm:text-lg">
                  <Star className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                  Top Priority Action
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="flex-1">
                    <h3 className="text-base sm:text-lg text-purple-900 mb-2">{metrics.topPriority.title}</h3>
                    <p className="text-sm text-purple-800 mb-3">{metrics.topPriority.suggestedAction}</p>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <Badge className={`${getPriorityBadge(metrics.topPriority.priority).className} border text-xs`}>
                        {metrics.topPriority.priority}
                      </Badge>
                      <span className="text-xs sm:text-sm text-purple-700">
                        Score: {Math.round(metrics.topPriority.score)}
                      </span>
                      {metrics.topPriority.potentialValue && (
                        <span className="text-xs sm:text-sm text-purple-700">
                          Value: ${metrics.topPriority.potentialValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      className="bg-purple-600 hover:bg-purple-700"
                      onClick={() => handleTakeAction(metrics.topPriority!)}
                    >
                      Take Action
                    </Button>
                    <Button 
                      variant="outline" 
                      className="border-purple-300 text-purple-700 hover:bg-purple-100"
                      onClick={() => handleMarkComplete(metrics.topPriority!)}
                    >
                      <ThumbsUp className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Snoozed Items */}
          {snoozedItems.length > 0 && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm text-blue-800">
                  <AlarmClock className="h-4 w-4" />
                  Snoozed ({snoozedItems.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {snoozedItems.map(item => (
                    <div key={item.id} className="flex items-center justify-between text-sm bg-background rounded-lg px-3 py-2">
                      <span className="text-foreground truncate flex-1 mr-2">{item.title}</span>
                      <span className="text-xs text-blue-600 whitespace-nowrap">
                        Returns {new Date(item.snoozeUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ═══════════ TAB: SUGGESTIONS ═══════════ */}
      {activeTab === 'suggestions' && (
        <div className="space-y-4">
          {/* Filter Tabs */}
          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto -mx-6 px-6 sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <div className="flex gap-2 min-w-max sm:min-w-0 pb-1">
                  <Button
                    variant={selectedFilter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedFilter('all')}
                    className="whitespace-nowrap"
                  >
                    All ({activeSuggestions.length})
                  </Button>
                  <Button
                    variant={selectedFilter === 'critical' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedFilter('critical')}
                    className={`whitespace-nowrap ${selectedFilter === 'critical' ? 'bg-red-600 hover:bg-red-700' : ''}`}
                  >
                    <Flame className="h-4 w-4 mr-1" />
                    Critical ({activeSuggestions.filter(s => s.priority === 'critical').length})
                  </Button>
                  <Button
                    variant={selectedFilter === 'high' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedFilter('high')}
                    className={`whitespace-nowrap ${selectedFilter === 'high' ? 'bg-orange-600 hover:bg-orange-700' : ''}`}
                  >
                    <Zap className="h-4 w-4 mr-1" />
                    High ({activeSuggestions.filter(s => s.priority === 'high').length})
                  </Button>
                  <Button
                    variant={selectedFilter === 'medium' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedFilter('medium')}
                    className={`whitespace-nowrap ${selectedFilter === 'medium' ? 'bg-yellow-600 hover:bg-yellow-700' : ''}`}
                  >
                    <Star className="h-4 w-4 mr-1" />
                    Medium ({activeSuggestions.filter(s => s.priority === 'medium').length})
                  </Button>
                  <Button
                    variant={selectedFilter === 'low' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedFilter('low')}
                    className="whitespace-nowrap"
                  >
                    Low ({activeSuggestions.filter(s => s.priority === 'low').length})
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Suggestions List */}
          <Card className="flex-1">
            <CardHeader>
              <CardTitle>Suggested Actions</CardTitle>
              <CardDescription>
                {filteredSuggestions.length} {selectedFilter !== 'all' ? selectedFilter : ''} suggestions based on your CRM data
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse">
                      <div className="h-24 bg-muted rounded-lg"></div>
                    </div>
                  ))}
                </div>
              ) : filteredSuggestions.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-green-500" />
                  <p className="text-lg text-foreground mb-2">
                    {activeSuggestions.length === 0 && suggestions.length === 0 
                      ? "No suggestions yet" 
                      : "All caught up!"}
                  </p>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    {activeSuggestions.length === 0 && suggestions.length === 0
                      ? "Suggestions are generated from your deals, contacts, tasks, and opportunities. Add some data or check the browser console for diagnostics."
                      : dismissedIds.length > 0 || snoozedItems.length > 0
                        ? `${dismissedIds.length} dismissed, ${snoozedItems.length} snoozed`
                        : 'No urgent actions needed at the moment.'
                    }
                  </p>
                  <div className="flex items-center justify-center gap-2 mt-4">
                    {dismissedIds.length > 0 && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          const storageKeys = getStorageKeys(user.id);
                          setDismissedIds([]);
                          localStorage.setItem(storageKeys.dismissed, JSON.stringify([]));
                          upsertAIPrefsClient({ dismissedIds: [] });
                          toast.success('All dismissed suggestions restored');
                        }}
                      >
                        Restore Dismissed
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { refresh(); toast.info('Rescanning your CRM data...'); }}
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Rescan Now
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                  {filteredSuggestions.map((suggestion) => (
                    <div
                      key={suggestion.id}
                      className={`p-3 sm:p-4 rounded-lg border-2 hover:shadow-md transition-all ${
                        suggestion.priority === 'critical'
                          ? 'border-red-200 bg-red-50'
                          : suggestion.priority === 'high'
                          ? 'border-orange-200 bg-orange-50'
                          : suggestion.priority === 'medium'
                          ? 'border-yellow-200 bg-yellow-50'
                          : 'border-border bg-background'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                        <div className="flex items-start gap-2 sm:gap-3 flex-1">
                          <div className="mt-1 flex-shrink-0">
                            {getPriorityIcon(suggestion.priority)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <h3 className="text-sm sm:text-base text-foreground">{suggestion.title}</h3>
                              <Badge className={`${getPriorityBadge(suggestion.priority).className} border text-xs`}>
                                {suggestion.priority}
                              </Badge>
                            </div>
                            <p className="text-xs sm:text-sm text-foreground mb-2">{suggestion.description}</p>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-3">
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <BarChart3 className="h-3 w-3" />
                                Score: {Math.round(suggestion.score)}
                              </span>
                              {suggestion.daysInactive && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {suggestion.daysInactive}d
                                </span>
                              )}
                              {suggestion.potentialValue && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <DollarSign className="h-3 w-3" />
                                  ${suggestion.potentialValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              )}
                            </div>
                            <div className="bg-background bg-opacity-50 rounded p-2 sm:p-3 mb-3">
                              <p className="text-xs sm:text-sm text-foreground mb-1">
                                <strong>Suggested Action:</strong> {suggestion.suggestedAction}
                              </p>
                              <p className="text-xs text-muted-foreground">{suggestion.context}</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {getActionIcon(suggestion.actionType)}
                                <span className="ml-1 capitalize">{suggestion.actionType}</span>
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {suggestion.relatedEntity.type}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 sm:flex sm:flex-col gap-2 w-full sm:w-auto">
                          <Button size="sm" className="flex-1 sm:flex-none whitespace-nowrap text-xs sm:text-sm" onClick={() => handleTakeAction(suggestion)}>
                            {getActionIcon(suggestion.actionType)}
                            <span className="ml-1 sm:ml-2">Take Action</span>
                          </Button>
                          <Button size="sm" variant="outline" className="flex-1 sm:flex-none text-xs sm:text-sm text-green-700 border-green-300 hover:bg-green-50" onClick={() => handleMarkComplete(suggestion)}>
                            <ThumbsUp className="h-3 w-3 mr-1" />
                            Done
                          </Button>
                          <Button size="sm" variant="outline" className="flex-1 sm:flex-none text-xs sm:text-sm" onClick={() => handleSnoozeSuggestion(suggestion)}>
                            <AlarmClock className="h-3 w-3 mr-1" />
                            Snooze
                          </Button>
                          <Button size="sm" variant="ghost" className="flex-1 sm:flex-none text-xs sm:text-sm text-muted-foreground hover:text-muted-foreground" onClick={() => handleDismissSuggestion(suggestion.id)}>
                            <X className="h-3 w-3 mr-1" />
                            Dismiss
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══════════ TAB: HISTORY ═══════════ */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* Stats Overview */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card>
              <CardContent className="pt-5 text-center">
                <Trophy className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-foreground">{streakData.totalActionsCompleted}</p>
                <p className="text-xs text-muted-foreground">Total Actions</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 text-center">
                <Flame className="h-8 w-8 text-orange-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-foreground">{streakData.currentStreak}</p>
                <p className="text-xs text-muted-foreground">Current Streak</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 text-center">
                <Award className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-foreground">{streakData.longestStreak}</p>
                <p className="text-xs text-muted-foreground">Best Streak</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 text-center">
                <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-foreground">{streakData.todayActionsCompleted}</p>
                <p className="text-xs text-muted-foreground">Done Today</p>
              </CardContent>
            </Card>
          </div>

          {/* Completed Actions Log */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5 text-muted-foreground" />
                    Action History
                  </CardTitle>
                  <CardDescription>
                    Your recently completed AI suggestion actions
                  </CardDescription>
                </div>
                {completedActions.length > 0 && (
                  <Button variant="outline" size="sm" onClick={handleClearHistory}>
                    Clear History
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {completedActions.length === 0 ? (
                <div className="text-center py-12">
                  <History className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-muted-foreground mb-1">No actions completed yet</p>
                  <p className="text-sm text-muted-foreground">
                    Start acting on suggestions to build your streak!
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-4"
                    onClick={() => setActiveTab('suggestions')}
                  >
                    View Suggestions
                  </Button>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {completedActions.slice(0, showCompletedExpanded ? 50 : 10).map((action) => (
                    <div
                      key={action.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-100"
                    >
                      <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate">{action.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(action.completedAt).toLocaleDateString()} at{' '}
                          {new Date(action.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs capitalize flex-shrink-0">
                        {action.type}
                      </Badge>
                    </div>
                  ))}
                  {completedActions.length > 10 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-muted-foreground"
                      onClick={() => setShowCompletedExpanded(!showCompletedExpanded)}
                    >
                      {showCompletedExpanded ? (
                        <>
                          <ChevronUp className="h-4 w-4 mr-1" />
                          Show Less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4 mr-1" />
                          Show All ({completedActions.length})
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══════════ DIALOGS ═══════════ */}

      {/* Email Template Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto bg-background">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Email Template</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Review and send the email to {selectedSuggestion?.relatedEntity.name}:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="email-subject" className="text-xs sm:text-sm">Subject</Label>
              <Input
                id="email-subject"
                value={emailSubject}
                onChange={e => setEmailSubject(e.target.value)}
                placeholder="Email subject"
                className="text-xs sm:text-sm"
              />
            </div>
            <div>
              <Label htmlFor="email-body" className="text-xs sm:text-sm">Body</Label>
              <Textarea
                id="email-body"
                value={emailBody}
                onChange={e => setEmailBody(e.target.value)}
                placeholder="Email body"
                className="h-32 sm:h-40 text-xs sm:text-sm"
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button size="sm" variant="outline" onClick={handleCopyEmail} className="w-full sm:w-auto text-xs sm:text-sm">
              <Copy className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
              Copy to Clipboard
            </Button>
            <Button size="sm" onClick={handleSendEmail} className="w-full sm:w-auto text-xs sm:text-sm">
              <Send className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
              Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Creation Dialog */}
      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto bg-background">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Create Task</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Create a new task based on the suggestion:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="task-title" className="text-xs sm:text-sm">Title</Label>
              <Input
                id="task-title"
                value={taskTitle}
                onChange={e => setTaskTitle(e.target.value)}
                placeholder="Task title"
                className="text-xs sm:text-sm"
              />
            </div>
            <div>
              <Label htmlFor="task-description" className="text-xs sm:text-sm">Description</Label>
              <Textarea
                id="task-description"
                value={taskDescription}
                onChange={e => setTaskDescription(e.target.value)}
                placeholder="Task description"
                className="h-32 sm:h-40 text-xs sm:text-sm"
              />
            </div>
            <div>
              <Label htmlFor="task-due-date" className="text-xs sm:text-sm">Due Date</Label>
              <Input
                id="task-due-date"
                type="date"
                value={taskDueDate}
                onChange={e => setTaskDueDate(e.target.value)}
                placeholder="Task due date"
                className="text-xs sm:text-sm"
              />
            </div>
            <div>
              <Label htmlFor="task-priority" className="text-xs sm:text-sm">Priority</Label>
              <Select
                value={taskPriority}
                onValueChange={value => setTaskPriority(value as 'low' | 'medium' | 'high')}
              >
                <SelectTrigger className="text-xs sm:text-sm">
                  <SelectValue>{taskPriority}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowTaskDialog(false)} className="w-full sm:w-auto text-xs sm:text-sm">
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreateTask} className="w-full sm:w-auto text-xs sm:text-sm">
              Create Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Snooze Dialog */}
      <Dialog open={showSnoozeDialog} onOpenChange={setShowSnoozeDialog}>
        <DialogContent className="max-w-sm bg-background">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlarmClock className="h-5 w-5 text-blue-600" />
              Snooze Suggestion
            </DialogTitle>
            <DialogDescription>
              This suggestion will reappear after the snooze period:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm font-medium text-foreground">{selectedSuggestion?.title}</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: '1', label: '1 Hour' },
                { value: '4', label: '4 Hours' },
                { value: '8', label: '8 Hours' },
                { value: '24', label: '1 Day' },
                { value: '48', label: '2 Days' },
                { value: '168', label: '1 Week' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setSnoozeHours(opt.value)}
                  className={`p-2 rounded-lg border text-sm text-center transition-all ${
                    snoozeHours === opt.value 
                      ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium' 
                      : 'border-border hover:border-border text-muted-foreground'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSnoozeDialog(false)}>Cancel</Button>
            <Button onClick={confirmSnooze} className="bg-blue-600 hover:bg-blue-700">
              <AlarmClock className="h-4 w-4 mr-2" />
              Snooze
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </PermissionGate>
  );
}
