import { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import {
  LayoutDashboard,
  FileText,
  FolderOpen,
  MessageSquare,
  Folder,
  User,
  Building2,
  Menu,
  X,
  LogOut,
  Loader2,
  Bell,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import {
  getPortalDashboard,
  getPortalQuotes,
  getPortalProjects,
  getPortalDocuments,
  getPortalMessages,
  getPortalUser,
  portalLogout,
} from '../../utils/portal-client';
import { CustomerPortalLogin } from './CustomerPortalLogin';
import { PortalDashboard } from './PortalDashboard';
import { PortalQuotes } from './PortalQuotes';
import { PortalProjects } from './PortalProjects';
import { PortalMessages } from './PortalMessages';
import { PortalDocuments } from './PortalDocuments';
import { PortalProfile } from './PortalProfile';
import { Toaster } from '../ui/sonner';
import { isPortalLoggedIn, clearPortalSession } from '../../utils/portal-client';
import ErrorBoundary from '../ErrorBoundary';

type PortalView = 'dashboard' | 'quotes' | 'projects' | 'messages' | 'documents' | 'profile';

export function CustomerPortal() {
  const [isLoggedIn, setIsLoggedIn] = useState(isPortalLoggedIn());
  const [currentView, setCurrentView] = useState<PortalView>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);

  const portalUser = getPortalUser();

  // Check URL for invite code
  const urlParams = new URLSearchParams(window.location.search);
  const inviteCode = urlParams.get('invite');

  useEffect(() => {
    if (isLoggedIn) {
      loadDashboard();
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) return;
    // Load view-specific data
    if (currentView === 'quotes') loadQuotes();
    else if (currentView === 'projects') loadProjects();
    else if (currentView === 'documents') loadDocuments();
    else if (currentView === 'messages') loadMessages();
  }, [currentView, isLoggedIn]);

  const loadDashboard = async () => {
    setLoading(true);
    setDashboardError(null);
    try {
      const data = await getPortalDashboard();
      setDashboardData(data);
      setQuotes(data.quotes || []);
      setMessages(data.messages || []);
    } catch (err: any) {
      if (err.message?.includes('Unauthorized') || err.message?.includes('401')) {
        clearPortalSession();
        setIsLoggedIn(false);
      } else {
        setDashboardError(err.message || 'Failed to load dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadQuotes = async () => {
    try {
      const data = await getPortalQuotes();
      setQuotes(data.quotes || []);
    } catch (err: any) {
      // Quotes load error – non-critical
    }
  };

  const loadProjects = async () => {
    try {
      const data = await getPortalProjects();
      setProjects(data.projects || []);
    } catch (err: any) {
      // Projects load error – non-critical
    }
  };

  const loadDocuments = async () => {
    try {
      const data = await getPortalDocuments();
      setDocuments(data.documents || []);
    } catch (err: any) {
      // Documents load error – non-critical
    }
  };

  const loadMessages = async () => {
    try {
      const data = await getPortalMessages();
      setMessages(data.messages || []);
    } catch (err: any) {
      // Messages load error – non-critical
    }
  };

  const handleLogout = async () => {
    try {
      await portalLogout();
    } catch {
      clearPortalSession();
    }
    setIsLoggedIn(false);
    setDashboardData(null);
  };

  if (!isLoggedIn) {
    return (
      <>
        <Toaster />
        <CustomerPortalLogin
          onLogin={() => setIsLoggedIn(true)}
          inviteCode={inviteCode || undefined}
        />
      </>
    );
  }

  if (loading && !dashboardData) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-muted-foreground">Loading your portal...</p>
        </div>
      </div>
    );
  }

  const navItems: { id: PortalView; label: string; icon: any; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'quotes', label: 'Quotes', icon: FileText, badge: (quotes || []).filter((q: any) => ['sent', 'viewed'].includes(q.status)).length },
    { id: 'projects', label: 'Projects', icon: FolderOpen },
    { id: 'messages', label: 'Messages', icon: MessageSquare, badge: dashboardData?.unreadMessages || 0 },
    { id: 'documents', label: 'Documents', icon: Folder },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  const navigate = (view: PortalView) => {
    setCurrentView(view);
    setMobileMenuOpen(false);
  };

  return (
    <>
      <Toaster />
      <div className="min-h-screen bg-muted">
        {/* Top Navigation Bar */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border shadow-sm">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between h-14">
              {/* Logo & Mobile Menu */}
              <div className="flex items-center gap-3">
                <button
                  className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-muted"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                  {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                    <Building2 className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-semibold text-foreground hidden sm:inline">
                    {dashboardData?.organization?.name || 'Customer Portal'}
                  </span>
                </div>
              </div>

              {/* Desktop Navigation */}
              <nav className="hidden lg:flex items-center gap-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentView === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => navigate(item.id)}
                      className={`relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                      {!!item.badge && item.badge > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>

              {/* User Menu */}
              <div className="flex items-center gap-3">
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-medium text-foreground">{portalUser?.name}</p>
                  <p className="text-xs text-muted-foreground">{portalUser?.email}</p>
                </div>
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-sm font-bold">
                  {(portalUser?.name || 'C')[0]?.toUpperCase()}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-black/20" onClick={() => setMobileMenuOpen(false)} />
            <div className="absolute top-14 left-0 right-0 bg-background border-b shadow-lg">
              <nav className="p-2 space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentView === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => navigate(item.id)}
                      className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </div>
                      {!!item.badge && item.badge > 0 && (
                        <span className="h-5 min-w-[20px] rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center px-1">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
                <hr className="my-2" />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </nav>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="pt-14 max-w-7xl mx-auto px-4 py-6">
          <ErrorBoundary>
          {/* Error state */}
          {dashboardError && !dashboardData && (
            <Card className="max-w-md mx-auto mt-12">
              <CardContent className="p-6 text-center">
                <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
                <h2 className="text-lg font-semibold text-foreground mb-2">Unable to Load Portal</h2>
                <p className="text-sm text-muted-foreground mb-4">{dashboardError}</p>
                <div className="flex gap-2 justify-center">
                  <Button onClick={loadDashboard} variant="outline" className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Retry
                  </Button>
                  <Button onClick={handleLogout} variant="ghost" className="gap-2 text-red-600">
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          {currentView === 'dashboard' && dashboardData && (
            <PortalDashboard data={dashboardData} onNavigate={(v) => navigate(v as PortalView)} />
          )}
          {currentView === 'quotes' && (
            <PortalQuotes quotes={quotes} onRefresh={() => { loadQuotes(); loadDashboard(); }} />
          )}
          {currentView === 'projects' && <PortalProjects projects={projects} />}
          {currentView === 'messages' && (
            <PortalMessages messages={messages} onRefresh={() => { loadMessages(); loadDashboard(); }} />
          )}
          {currentView === 'documents' && <PortalDocuments documents={documents} />}
          {currentView === 'profile' && (
            <PortalProfile
              contact={dashboardData?.contact}
              onRefresh={loadDashboard}
              onLogout={handleLogout}
            />
          )}
          </ErrorBoundary>
        </main>

        {/* Footer */}
        <footer className="border-t bg-background mt-8">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between text-xs text-muted-foreground">
            <span>Powered by ProSpaces CRM</span>
            <span>&copy; {new Date().getFullYear()}</span>
          </div>
        </footer>
      </div>
    </>
  );
}