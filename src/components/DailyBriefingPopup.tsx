import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import {
  Sparkles,
  X,
  Lightbulb,
  Trophy,
  Flame,
  Zap,
  Star,
  CheckCircle2,
  Phone,
  Mail,
  Calendar,
  FileText,
  RefreshCw,
  ArrowRight,
  Clock,
  DollarSign,
  Target,
  Users,
  MessageSquare,
  Brain,
  Rocket,
  AlarmClock,
  Sunrise,
  Sun,
  Moon,
  Coffee,
  ChevronRight,
  Award,
  ThumbsUp,
  TrendingUp,
  BarChart3,
  AlertCircle
} from 'lucide-react';
import type { User } from '../App';
import { useAISuggestions, type Suggestion } from '../hooks/useAISuggestions';
import { motion, AnimatePresence } from 'motion/react';
import { getAIPrefsClient } from '../utils/ai-prefs-client';

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
  { category: 'Preparation', tip: 'Research a prospect for 5 minutes before every call. A tailored conversation always outperforms a generic pitch.', icon: Star },
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

const STORAGE_KEY_SHOWN = 'prospaces_briefing_last_shown';
const STORAGE_KEY_STREAK = 'prospaces_ai_streak';
const STORAGE_KEY_DISMISSED = 'prospaces_ai_dismissed';

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  totalActionsCompleted: number;
  todayActionsCompleted: number;
  lastActiveDate: string;
}

interface DailyBriefingPopupProps {
  user: User;
  onNavigate?: (view: string) => void;
  organization?: any;
  currentView?: string;
}

export function DailyBriefingPopup({ user, onNavigate, organization, currentView }: DailyBriefingPopupProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isDocked, setIsDocked] = useState(false);
  const { suggestions, metrics, isLoading } = useAISuggestions(user);
  const [streakData, setStreakData] = useState<StreakData>({
    currentStreak: 0,
    longestStreak: 0,
    totalActionsCompleted: 0,
    todayActionsCompleted: 0,
    lastActiveDate: '',
  });

  // Check if AI suggestions are enabled for the organization
  const aiEnabled = organization?.ai_suggestions_enabled !== false && user?.role !== 'super_admin';

  // Check if briefing should show today
  useEffect(() => {
    if (!aiEnabled) return;
    if (currentView !== 'dashboard' && currentView !== 'main-panels') return;

    const sessionShownKey = `prospaces_briefing_session_shown_${user.id}`;
    const shownThisSession = sessionStorage.getItem(sessionShownKey) === 'true';

    if (!shownThisSession) {
      // Wait for suggestions to load, then show
      const timer = setTimeout(() => {
        if (!isLoading) {
          setIsVisible(true);
          setIsDocked(false);
          sessionStorage.setItem(sessionShownKey, 'true');
        }
      }, 1500); // Brief delay so dashboard loads first
      return () => clearTimeout(timer);
    }
  }, [isLoading, aiEnabled, user.id, currentView]);

  // If onboarding launches a guided tour, dock this popup in the bottom-right.
  useEffect(() => {
    const handleTourStarting = () => {
      setIsVisible(true);
      setIsDocked(true);
      setIsClosing(false);
    };
    window.addEventListener('prospaces:tour-starting', handleTourStarting as EventListener);
    return () => window.removeEventListener('prospaces:tour-starting', handleTourStarting as EventListener);
  }, []);

  // Load streak data and fetch dismissed
  const [remoteDismissedIds, setRemoteDismissedIds] = useState<string[] | null>(null);
  
  useEffect(() => {
    let isMounted = true;
    try {
      const storageKeyStreak = `${STORAGE_KEY_STREAK}_${user.id}`;
      const streak = localStorage.getItem(storageKeyStreak);
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
      // Failed to load streak data – non-critical
    }
    
    // Sync with remote
    getAIPrefsClient().then(prefs => {
      if (isMounted && prefs) {
        if (prefs.streakData) setStreakData(prefs.streakData);
        if (prefs.dismissedIds) setRemoteDismissedIds(prefs.dismissedIds);
      }
    });
    
    return () => { isMounted = false; };
  }, [user.id]);

  // Filter out dismissed suggestions
  const activeSuggestions = useMemo(() => {
    try {
      const storageKeyDismissed = `${STORAGE_KEY_DISMISSED}_${user.id}`;
      const dismissed = localStorage.getItem(storageKeyDismissed);
      const localDismissedIds: string[] = dismissed ? JSON.parse(dismissed) : [];
      // Combine local and remote dismissed IDs
      const allDismissedIds = [...new Set([...localDismissedIds, ...(remoteDismissedIds || [])])];
      return suggestions.filter(s => !allDismissedIds.includes(s.id));
    } catch {
      return suggestions;
    }
  }, [suggestions, user.id, remoteDismissedIds]);

  // Time-based greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    const firstName = user.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'there';

    if (hour < 6) return { text: `Burning the midnight oil, ${firstName}?`, icon: Moon, emoji: '' };
    if (hour < 12) return { text: `Good morning, ${firstName}!`, icon: Sunrise, emoji: '' };
    if (hour < 17) return { text: `Good afternoon, ${firstName}!`, icon: Sun, emoji: '' };
    if (hour < 21) return { text: `Good evening, ${firstName}!`, icon: Coffee, emoji: '' };
    return { text: `Working late, ${firstName}?`, icon: Moon, emoji: '' };
  }, [user?.full_name, user?.email]);

  // Daily tip
  const dailyTip = useMemo(() => {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    return DAILY_TIPS[dayOfYear % DAILY_TIPS.length];
  }, []);

  // Daily quote
  const dailyQuote = useMemo(() => {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    return MOTIVATIONAL_QUOTES[dayOfYear % MOTIVATIONAL_QUOTES.length];
  }, []);

  // Focus of the day
  const focusOfDay = useMemo(() => {
    if (!activeSuggestions.length) return null;
    const typeCounts: Record<string, { count: number; totalScore: number }> = {};
    activeSuggestions.forEach(s => {
      if (!typeCounts[s.type]) typeCounts[s.type] = { count: 0, totalScore: 0 };
      typeCounts[s.type].count++;
      typeCounts[s.type].totalScore += s.score;
    });
    const topType = Object.entries(typeCounts).sort((a, b) => b[1].totalScore - a[1].totalScore)[0];
    if (!topType) return null;

    const labels: Record<string, string> = {
      follow_up: 'Follow-Ups',
      deadline: 'Deadlines',
      inactive: 'Re-Engagement',
      engagement: 'Engagement',
      opportunity: 'Opportunities',
      task: 'Tasks',
    };
    return { label: labels[topType[0]] || topType[0], count: topType[1].count };
  }, [activeSuggestions]);

  // Priority counts
  const criticalCount = activeSuggestions.filter(s => s.priority === 'critical').length;
  const highCount = activeSuggestions.filter(s => s.priority === 'high').length;

  const topSuggestions = activeSuggestions.slice(0, 3);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsVisible(false);
      setIsDocked(false);
      setIsClosing(false);
    }, 300);
  };

  const handleGoToSuggestions = () => {
    setIsDocked(false);
    handleClose();
    onNavigate?.('ai-suggestions');
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-100 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-100 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      default: return 'text-green-600 bg-green-100 border-green-200';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical': return <Flame className="h-3.5 w-3.5" />;
      case 'high': return <Zap className="h-3.5 w-3.5" />;
      case 'medium': return <Star className="h-3.5 w-3.5" />;
      default: return <CheckCircle2 className="h-3.5 w-3.5" />;
    }
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'call': return <Phone className="h-3.5 w-3.5" />;
      case 'email': return <Mail className="h-3.5 w-3.5" />;
      case 'meeting': return <Calendar className="h-3.5 w-3.5" />;
      case 'review': return <FileText className="h-3.5 w-3.5" />;
      case 'update': return <RefreshCw className="h-3.5 w-3.5" />;
      default: return <ArrowRight className="h-3.5 w-3.5" />;
    }
  };

  if (!isVisible || !aiEnabled) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {!isDocked && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
                onClick={handleClose}
              />

              {/* Popup Panel */}
              <motion.div
                initial={{ opacity: 0, x: 80, scale: 0.95 }}
                animate={{ opacity: isClosing ? 0 : 1, x: isClosing ? 80 : 0, scale: isClosing ? 0.95 : 1 }}
                exit={{ opacity: 0, x: 80, scale: 0.95 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed top-[84px] right-4 bottom-4 w-full max-w-[380px] z-50 flex flex-col"
              >
            <div className="flex flex-col h-full bg-background rounded-2xl shadow-2xl overflow-hidden border border-border">
              {/* Header */}
              <div className="relative bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-600 px-6 py-5 text-white">
                <button
                  onClick={handleClose}
                  className="absolute top-4 right-4 p-1.5 rounded-lg bg-background/20 hover:bg-background/30 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-background/20 flex items-center justify-center">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">{greeting.text}</h2>
                    <p className="text-sm text-white/70">Your daily AI briefing</p>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-3 mt-4">
                  <div className="bg-background/15 rounded-lg px-3 py-2 text-center">
                    <p className="text-2xl font-bold">{activeSuggestions.length}</p>
                    <p className="text-[11px] text-white/70">Suggestions</p>
                  </div>
                  <div className="bg-background/15 rounded-lg px-3 py-2 text-center">
                    <p className="text-2xl font-bold text-red-300">{criticalCount + highCount}</p>
                    <p className="text-[11px] text-white/70">Urgent</p>
                  </div>
                  <div className="bg-background/15 rounded-lg px-3 py-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Flame className="h-4 w-4 text-orange-300" />
                      <p className="text-2xl font-bold">{streakData.currentStreak}</p>
                    </div>
                    <p className="text-[11px] text-white/70">Day Streak</p>
                  </div>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

                {/* Focus of the Day */}
                {focusOfDay && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="h-4 w-4 text-indigo-500" />
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Focus Area</span>
                    </div>
                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3.5 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                        <Target className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-indigo-900">{focusOfDay.label}</p>
                        <p className="text-xs text-indigo-600">{focusOfDay.count} items need your attention today</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-indigo-400 flex-shrink-0" />
                    </div>
                  </motion.div>
                )}

                {/* Revenue at Stake */}
                {metrics && metrics.potentialRevenue > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                  >
                    <div className="bg-green-50 border border-green-100 rounded-xl p-3.5 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                        <DollarSign className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-green-900">
                          ${metrics.potentialRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })} at stake
                        </p>
                        <p className="text-xs text-green-600">Revenue tied to your open suggestions</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Top Suggestions */}
                {topSuggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-orange-500" />
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Top Priorities</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{activeSuggestions.length} total</span>
                    </div>
                    <div className="space-y-2">
                      {topSuggestions.map((suggestion, index) => (
                        <motion.div
                          key={suggestion.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.25 + index * 0.08 }}
                          className="bg-background border border-border rounded-xl p-3 hover:shadow-md transition-shadow cursor-pointer"
                          onClick={handleGoToSuggestions}
                        >
                          <div className="flex items-start gap-2.5">
                            <div className={`mt-0.5 flex-shrink-0 p-1 rounded-md ${getPriorityColor(suggestion.priority)}`}>
                              {getPriorityIcon(suggestion.priority)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground leading-snug">{suggestion.title}</p>
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{suggestion.suggestedAction}</p>
                              <div className="flex items-center gap-2 mt-1.5">
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 gap-0.5">
                                  {getActionIcon(suggestion.actionType)}
                                  <span className="capitalize">{suggestion.actionType}</span>
                                </Badge>
                                {suggestion.potentialValue ? (
                                  <span className="text-[10px] text-green-600 font-medium">
                                    ${suggestion.potentialValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                ) : null}
                                {suggestion.daysInactive ? (
                                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                    <Clock className="h-2.5 w-2.5" /> {suggestion.daysInactive}d
                                  </span>
                                ) : null}
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-gray-300 flex-shrink-0 mt-1" />
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Daily Tip */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="h-4 w-4 text-amber-500" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tip of the Day</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-amber-300 text-amber-700">{dailyTip.category}</Badge>
                  </div>
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-3.5">
                    <p className="text-sm text-foreground leading-relaxed">{dailyTip.tip}</p>
                    <div className="mt-3 pt-2.5 border-t border-amber-200">
                      <p className="text-xs italic text-muted-foreground">"{dailyQuote.quote}"</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">-- {dailyQuote.author}</p>
                    </div>
                  </div>
                </motion.div>

                {/* Streak Motivation */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-100 rounded-xl p-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-md flex-shrink-0">
                        <span className="text-lg font-bold text-white">{streakData.currentStreak}</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-orange-900">
                          {streakData.currentStreak === 0
                            ? 'Start your streak today!'
                            : streakData.currentStreak === 1
                              ? 'Day 1 -- keep it going!'
                              : `${streakData.currentStreak} day streak!`
                          }
                        </p>
                        <p className="text-xs text-orange-600">
                          {streakData.currentStreak === 0
                            ? 'Act on a suggestion to begin your streak'
                            : `${streakData.totalActionsCompleted} total actions completed`
                          }
                        </p>
                        {streakData.currentStreak >= 3 && (
                          <div className="flex items-center gap-1 mt-1">
                            <Award className="h-3 w-3 text-amber-600" />
                            <span className="text-[10px] text-amber-700 font-medium">
                              Best streak: {streakData.longestStreak} days
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Footer */}
              <div className="px-5 py-4 border-t border-border bg-muted/80">
                <div className="flex gap-2">
                  <Button
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                    onClick={handleGoToSuggestions}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    View All Suggestions
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleClose}
                  >
                    Dismiss
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground text-center mt-2">This briefing appears once daily</p>
              </div>
            </div>
              </motion.div>
            </>
          )}

          {isDocked && (
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.96 }}
              transition={{ type: 'spring', damping: 24, stiffness: 280 }}
              className="fixed bottom-4 right-4 z-50"
            >
              <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-white/95 px-3 py-2 shadow-xl backdrop-blur">
                <Sparkles className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-medium text-slate-700">AI briefing docked during tour</span>
                <Button size="sm" className="h-7 px-2 text-xs" onClick={() => setIsDocked(false)}>
                  Open
                </Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleClose}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </motion.div>
          )}
        </>
      )}
    </AnimatePresence>
  );
}