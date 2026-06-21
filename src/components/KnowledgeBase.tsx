import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  BookOpen,
  ChevronRight,
  ArrowLeft,
  ThumbsUp,
  ThumbsDown,
  HelpCircle,
  Sparkles,
  Send,
  MessageSquare,
  Compass,
  FileText,
  UserCheck,
  ShieldCheck,
  Wrench,
  Sparkle,
  Layers,
  Heart,
  CheckCircle2,
  X,
  Mail,
  ExternalLink
} from 'lucide-react';
import { useTheme } from './ThemeProvider';

// TYPES DEFINITION
export interface Article {
  id: string;
  title: string;
  category: string;
  content: string;
  tags: string[];
  lastUpdated: string;
  readTime: string;
  popularity: number; // 1 to 5 stars or scale
}

export interface Category {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  bgColor: string;
  borderColor: string;
}

// SAMPLE PRODUCTION-READY ARTICLES
const KNOWLEDGE_CATEGORIES: Category[] = [
  {
    id: 'getting-started',
    name: 'Getting Started',
    description: 'Learn the core concepts, sign up steps, and initial workspace configurations.',
    icon: Compass,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-100',
  },
  {
    id: 'contacts',
    name: 'CRM & Contacts',
    description: 'Import contacts, create custom fields, organize pipeline records, and set smart follow-ups.',
    icon: UserCheck,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-100',
  },
  {
    id: 'deals',
    name: 'Deals & Proposals',
    description: 'Drafting estimates, automated invoicing, customer portal feedback, and contract signatures.',
    icon: FileText,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-100',
  },
  {
    id: 'planners',
    name: 'Dynamic 3D Planners',
    description: 'How to utilize integrated Kitchen, Deck, Roof, Garage, and Shed builders to capture custom criteria.',
    icon: Wrench,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-100',
  },
  {
    id: 'security-admin',
    name: 'Admin & Security',
    description: 'Managing organization settings, seat licenses, access control permissions, and audit logs.',
    icon: ShieldCheck,
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-100',
  }
];

const KNOWLEDGE_ARTICLES: Article[] = [
  // Getting Started
  {
    id: 'welcome-guide',
    title: 'Welcome to ProSpaces CRM: The Ultimate Workspace Initial Setup Guide',
    category: 'getting-started',
    readTime: '3 min read',
    lastUpdated: 'June 20, 2026',
    popularity: 5,
    tags: ['welcome', 'install', 'setup', 'first-time', 'organisation'],
    content: `Welcome to ProSpaces CRM! We are thrilled to have you here. ProSpaces is a premium, offline-first CRM tailored specifically for modern contracting and building services professionals.

To get started with your new CRM account:
1. **Set Up Your Organization Profile**: Go to Admin Settings > Settings. Add your logo, commercial address, and tax information. This will automatically populate your upcoming proposals and invoices.
2. **Configure Your Subdomain Space**: Head to the 'Customer Portal' settings in your Admin drop-down. Configure custom colors so clients feel aligned with your brand identity.
3. **Invite Your Core Team members**: In Admin Operations > Users, invite team roles ranging from Sales Agents to Directors. Each role carries specific, secure permissions.
4. **Download Your Logo Asset**: Always ensure your uploaded logo represents your brand cleanly to reinforce client trust.`
  },
  {
    id: 'invite-team',
    title: 'How to Invite Team Members & Configure Interactive Role Permissions',
    category: 'getting-started',
    readTime: '4 min read',
    lastUpdated: 'June 18, 2026',
    popularity: 4,
    tags: ['users', 'roles', 'team', 'permissions', 'invite'],
    content: `Inviting teammates and setting up their permissions ensures your operations continue efficiently without sacrificing confidential security.

Roles available in ProSpaces CRM:
• **Super Admin**: Ultimate platform controls. Ideal for founders and IT administrators.
• **Director**: High-level managerial visibility. Can approve contracts and override billing pipelines but lacks access to master system logs.
• **Admin**: Managerial workflows including invoice dispatching, creating customer portal accounts, and running exports.
• **Manager**: Manages assigned teams and deals; can assign tasks and view activity analytics.
• **Agent (Salesperson)**: Focuses directly on contacts, personal calendar items, proposal updates, and dynamic custom estimate builders.

To invite a user:
1. Expand the **Admin settings** dropdown in the header and select **Users**.
2. Click **Add New User** or invite via email.
3. Assign their corresponding workspace role.
4. Provide their starting password, which they can update securely under their internal Profile settings.`
  },

  // CRM & Contacts
  {
    id: 'importing-contacts',
    title: 'Bulk Importing Contacts from CSV files & Resolving Mapping Mismatches',
    category: 'contacts',
    readTime: '5 min read',
    lastUpdated: 'May 14, 2026',
    popularity: 5,
    tags: ['import', 'bulk', 'contacts', 'csv', 'mapping'],
    content: `Moving from a spreadsheet to a dedicated CRM can feel daunting, but ProSpaces automates standard CSV imports to streamline your transition.

Step-by-Step Bulk Import:
1. Navigate to the **Admin Dropdown Menu** and select **Import/Export**.
2. Download our lightweight **CSV import template** to align your existing column headers in seconds.
3. Click 'Upload File' and select your completed spreadsheet.
4. **Map the Columns**: The importer matches Standard Fields (First Name, Email, Phone Number, Mailing Address) automatically. For unique details, choose "Map to Custom Dynamic Field".
5. Click **Run Import Process**.

*Tip to Prevent Mismatches*: Ensure all phone numbers follow standard formatting. If you encounter errors, check the 'Scheduled Imports & Background Manager' page under Admin dropdown to view import audit highlights.`
  },
  {
    id: 'dynamic-custom-fields',
    title: 'Creating and Utilizing Dynamic Custom Fields for Niche Contracting',
    category: 'contacts',
    readTime: '3 min read',
    lastUpdated: 'May 02, 2026',
    popularity: 3,
    tags: ['fields', 'customization', 'attributes', 'dynamic'],
    content: `Every construction or home improvement specialist has specific details they need to capture—for example, measuring electrical amps, roof pitch angles, or floor surface types.

Through **Dynamic Custom Fields**, you can record key metrics directly on a contact card:
1. Open any customer card inside the **Contacts** page.
2. Select **Edit Details** and scroll past the core address.
3. Click **Add New Attributes**.
4. Define your field type: Plain Text, Numeric Magnitude, or Select Dropdowns.
5. These metrics are instantly preserved in our cloud-sync database, allowing you to access them while building active estimates or planners.`
  },

  // Deals & Proposals
  {
    id: 'building-estimates',
    title: 'Drafting Dynamic Estimates & Converting Them into High-Converting Client Proposals',
    category: 'deals',
    readTime: '5 min read',
    lastUpdated: 'June 19, 2026',
    popularity: 5,
    tags: ['estimates', 'bids', 'pricing', 'proposals', 'deals'],
    content: `ProSpaces makes constructing detailed estimates and closing bids extremely satisfying. Inside our **Deals** panel, you can maintain standard pipeline columns from initial touchpoint through final billing receipt.

To create an Estimate or Bid:
1. Open the **Deals** panel and click **Create Deal**.
2. Select your client from your existing context and input the preliminary deal title.
3. Choose **Line-Item Bid Editor**: Add materials columns, labor rates, and equipment contingencies.
4. **Enable Tax or Bulk Discounts**: Configure simple local parameters to compute totals on-the-fly.
5. Save the estimate. You can instantly download a branded PDF, or email an interactive approval connection directly to the client's Inbox.`
  },
  {
    id: 'customer-portal-setup',
    title: 'How to Launch client-facing Customer Portals & Accept Secure Online Approvals',
    category: 'deals',
    readTime: '4 min read',
    lastUpdated: 'June 11, 2026',
    popularity: 4,
    tags: ['portal', 'collaboration', 'approvals', 'signatures', 'client'],
    content: `Elevate customer collaboration with dedicated client-facing portals. Instead of messy email chains, give active clients a private page to track project progress, read structural layouts, and review proposals securely.

To configure and launch a portal:
1. Go to **Admin settings** > **Customer Portal**.
2. Select the unique subdomain space. Let's make it reflect your brand colors instantly.
3. Enable 'E-Signatures' to allow legally binding feedback directly from client browsers.
4. To grant access: Open any Contact card, select 'Portal Status', and check 'Activate Portal Access'. An automated notification will deliver magic-link connection keys directly to their inbox.`
  },

  // Dynamic Planners
  {
    id: 'integrated-planners',
    title: 'Utilizing Integrated 3D Design Planners (Kitchen, Deck, Roof, Garage)',
    category: 'planners',
    readTime: '6 min read',
    lastUpdated: 'June 15, 2026',
    popularity: 5,
    tags: ['planners', 'design', 'kitchen', 'deck', '3d', 'estimations'],
    content: `ProSpaces features unique built-in interactive planners directly tied to estimates and CRM profiles. Skip tedious secondary blueprint platforms!

How the Planners Work:
• **Roof Planner**: Map square dimensions, pitch slope, shingles density, and gutter run lengths.
• **Deck Planner**: Customize surface areas, select multi-level layouts, customize railings profiles, and decide composite vs timber materials.
• **Kitchen Planner**: Slide counter layouts (L-Shape, Galley, Island), cabinets quantities, appliance cutouts, and backsplash dimensions.
• **Garage & Shed Planners**: Draft structural framing specs, window counts, insulation options, and garage door styles.

*Syncing to Deals*: Inside any active planner, click **Export to Bid**. The system calculates structural quantities and formats them as transparent lines on your current active estimate.`
  },

  // Admin & Security
  {
    id: 'security-and-logs',
    title: 'Reviewing Security Protocols, User Audit Logs, and Enterprise Compliance',
    category: 'security-admin',
    readTime: '4 min read',
    lastUpdated: 'June 05, 2026',
    popularity: 4,
    tags: ['security', 'audit', 'logs', 'compliance', 'admin'],
    content: `Enterprise accounts require strict visibility into system edits. ProSpaces automatically files every data mutation to preserve accountability.

How to audit team activity:
1. Expand the **Admin settings** menu.
2. Select **Audit Log**. (Required role: Admin or Director)
3. Filter activity logs by: Timestamp, Specific User name, Space Action type, or impacted Database record.
4. Export options: Click 'Export Logs' to retrieve standard spreadsheets or archives.

*IP Constraints & SSO*: If your group requires advanced IP Whitelists or Active Directory alignment, explore the 'Security & Access Protocols' section under master Settings.`
  }
];

export function KnowledgeBase() {
  const { theme } = useTheme();

  // STATE
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeArticleId, setActiveArticleId] = useState<string | null>(null);

  // Ratings feedback State
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<{ [key: string]: 'helpful' | 'unhelpful' }>({});
  
  // Dynamic Local Assistant chat simulation
  const [assistantInput, setAssistantInput] = useState('');
  const [assistantMessages, setAssistantMessages] = useState<Array<{ sender: 'user' | 'assistant', text: string, timestamp: string }>>([
    {
      sender: 'assistant',
      text: 'Hi! I am the ProSpaces Support Assistant. Ask me anything about configuring your CRM, dynamic fields, inviting team members, or utilizing our 3D design planners!',
      timestamp: 'Just now'
    }
  ]);
  const [isAssistantTyping, setIsAssistantTyping] = useState(false);

  // Close article or selection when category changes
  useEffect(() => {
    setActiveArticleId(null);
  }, [selectedCategory]);

  // SELECT CURRENT ACTIVE ARTICLE
  const activeArticle = useMemo(() => {
    if (!activeArticleId) return null;
    return KNOWLEDGE_ARTICLES.find(art => art.id === activeArticleId) || null;
  }, [activeArticleId]);

  // FILTERED ARTICLES
  const filteredArticles = useMemo(() => {
    let result = KNOWLEDGE_ARTICLES;

    if (selectedCategory) {
      result = result.filter(art => art.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        art =>
          art.title.toLowerCase().includes(q) ||
          art.content.toLowerCase().includes(q) ||
          art.tags.some(tag => tag.toLowerCase().includes(q))
      );
    }

    return result;
  }, [selectedCategory, searchQuery]);

  // POPULAR ARTICLES (Highest Popularity Rating)
  const popularArticles = useMemo(() => {
    return KNOWLEDGE_ARTICLES.filter(art => art.popularity >= 5).slice(0, 4);
  }, []);

  // ARBITRARY FEEDBACK HANDLING
  const handleFeedback = (articleId: string, type: 'helpful' | 'unhelpful') => {
    setFeedbackSubmitted(prev => ({
      ...prev,
      [articleId]: type
    }));
  };

  // ASSISTANT HELPER CHAT ENGINE (Simulates AI-supported KB contextual answering)
  const handleAssistantSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assistantInput.trim()) return;

    const userMsg = assistantInput;
    setAssistantMessages(prev => [...prev, {
      sender: 'user',
      text: userMsg,
      timestamp: 'Just now'
    }]);
    setAssistantInput('');
    setIsAssistantTyping(true);

    // Contextual matching from KB articles
    setTimeout(() => {
      const q = userMsg.toLowerCase();
      let answerText = '';

      // Match keywords in articles
      const matchedArticle = KNOWLEDGE_ARTICLES.find(art => 
        art.title.toLowerCase().includes(q) || 
        art.tags.some(t => t.toLowerCase().includes(q)) ||
        art.content.toLowerCase().includes(q)
      );

      if (matchedArticle) {
        answerText = `Great question! Based on our Article "${matchedArticle.title}":\n\n${matchedArticle.content.slice(0, 320)}...\n\n👉 Learn more in the linked article "${matchedArticle.title}" in the ${KNOWLEDGE_CATEGORIES.find(c => c.id === matchedArticle.category)?.name || 'guides'} category!`;
      } else if (q.includes('hello') || q.includes('hi ') || q.includes('hey')) {
        answerText = "Hello! 👋 How can I guide you inside ProSpaces CRM today? Try asking about 'estimates', 'custom fields', 'invite users', or 'customer portal'.";
      } else if (q.includes('creator') || q.includes('who built') || q.includes('who are you')) {
        answerText = "I am the ProSpaces interactive virtual assistant, designed to map standard support documentation to your queries instantly.";
      } else {
        // Default generic helpful answer summarizing features
        answerText = "I couldn't find a direct article match for that precise term, but I'm happy to outline the core solution! ProSpaces CRM allows you to manage contacts, track dynamic bids, share modern customer portals, and launch 3D structure planners. Try searching terms like 'logo', 'portal', representational 'estimates', or 'CSV import' in the search bar above!";
      }

      setAssistantMessages(prev => [...prev, {
        sender: 'assistant',
        text: answerText,
        timestamp: 'Just now'
      }]);
      setIsAssistantTyping(false);
    }, 900);
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* ── Sub Header banner ── */}
      <div className="w-full bg-gradient-to-r from-[#002f5d] to-[#1E6FD9] text-white py-14 px-6 md:px-12 relative overflow-hidden">
        {/* Subtle geometric circles */}
        <div className="absolute -right-24 -top-24 w-96 h-96 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute left-1/3 -bottom-10 w-64 h-64 rounded-full bg-white/5 pointer-events-none" />

        <div className="max-w-5xl mx-auto flex flex-col items-center text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-bold uppercase tracking-wider mb-4 border border-white/15">
            <Sparkle className="h-3 w-3 text-cyan-300 fill-cyan-300" />
            Support Center
          </div>
          
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight mb-4">
            ProSpaces Help &amp; Knowledge Base
          </h1>
          <p className="text-base md:text-lg text-blue-100 max-w-2xl mb-8">
            Search our guides, learn setup workflows, configure custom dynamic attributes, and align client portals seamlessly.
          </p>

          {/* Large custom search input */}
          <div className="w-full max-w-2xl relative shadow-xl rounded-2xl bg-white text-slate-800 flex items-center p-1.5 border border-slate-200">
            <div className="p-3 text-slate-400">
              <Search className="h-6 w-6" />
            </div>
            <input
              type="text"
              placeholder="Search guides, setup answers, planners, custom fields, PDF logo..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (activeArticleId) setActiveArticleId(null); // Return to list view during active search
              }}
              className="flex-1 px-2 py-3 bg-transparent text-base focus:outline-none text-slate-900 placeholder:text-slate-400 font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="p-2 text-slate-400 hover:text-slate-600 transition-colors mr-1"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Main Layout Body ── */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-10 grid grid-cols-1 lg:grid-cols-12 gap-8 flex-grow w-full">
        
        {/* Left Column (8 cols): FAQ Articles Browser */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* CATEGORIES GRID (Only shown when not displaying a specific article, or can act as quick filter tabs) */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-150">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
              <h2 className="text-sm font-bold uppercase text-slate-400 tracking-wider flex items-center gap-2">
                <Layers className="h-4 w-4 text-blue-500" />
                Browse by Category
              </h2>
              {selectedCategory && (
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors bg-blue-50 px-2.5 py-1 rounded-full"
                >
                  Clear filter <X className="h-3 w-3" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {KNOWLEDGE_CATEGORIES.map((cat) => {
                const CatIcon = cat.icon;
                const isSelected = selectedCategory === cat.id;

                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(isSelected ? null : cat.id)}
                    className={`flex flex-col items-center justify-center p-4 rounded-2xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#1E6FD9] bg-blue-50/70 shadow-sm ring-2 ring-[#1E6FD9]/10'
                        : 'border-slate-150 hover:border-blue-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className={`p-3 rounded-full ${cat.bgColor} ${cat.color} mb-2.5`}>
                      <CatIcon className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-bold text-slate-800 leading-tight">
                      {cat.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ────── LIST VIEW OR DETAIL VIEW ────── */}
          {!activeArticle ? (
            <div className="flex flex-col gap-4">
              <h2 className="text-xl font-extrabold text-[#002f5d] tracking-tight flex items-center justify-between">
                <span>
                  {searchQuery ? 'Search Results' : selectedCategory ? `${KNOWLEDGE_CATEGORIES.find(c => c.id === selectedCategory)?.name} Articles` : 'Knowledge Base Handbook'}
                </span>
                <span className="text-xs font-bold bg-slate-200 text-slate-600 px-3 py-1 rounded-full">
                  {filteredArticles.length} {filteredArticles.length === 1 ? 'Article' : 'Articles'}
                </span>
              </h2>

              {filteredArticles.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-slate-150 flex flex-col items-center justify-center">
                  <HelpCircle className="h-14 w-14 text-slate-300 mb-4 animate-bounce" />
                  <h3 className="text-lg font-bold text-slate-700">No guides matching your query</h3>
                  <p className="text-sm text-slate-400 max-w-md mt-2">
                    Try checking your spelling, clear active classification tabs, or direct your query to our live simulated support assistant on the right rail.
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory(null);
                    }}
                    className="mt-6 px-5 py-2 bg-[#1E6FD9] text-white hover:bg-[#155fc2] text-xs font-bold rounded-xl shadow-sm transition-all"
                  >
                    Reset Search &amp; Categories
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredArticles.map((art) => {
                    const catInfo = KNOWLEDGE_CATEGORIES.find(c => c.id === art.category);
                    const CatIcon = catInfo ? catInfo.icon : FileText;

                    return (
                      <div
                        key={art.id}
                        onClick={() => setActiveArticleId(art.id)}
                        className="p-5 rounded-3xl bg-white border border-slate-150 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer flex flex-col justify-between group active:scale-98"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${catInfo?.bgColor || 'bg-slate-50'} ${catInfo?.color || 'text-slate-500'}`}>
                              <CatIcon className="h-2.5 w-2.5" />
                              {catInfo?.name || art.category}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {art.readTime}
                            </span>
                          </div>
                          
                          <h3 className="text-base font-extrabold text-slate-900 group-hover:text-[#1E6FD9] transition-all tracking-tight leading-snug">
                            {art.title}
                          </h3>

                          <p className="text-xs text-slate-500 mt-2 line-clamp-3 leading-relaxed">
                            {art.content}
                          </p>
                        </div>

                        <div className="border-t border-slate-50 mt-4 pt-3 flex justify-between items-center">
                          <span className="text-[10px] text-slate-400 font-medium">
                            Updated {art.lastUpdated}
                          </span>
                          <span className="text-xs font-semibold text-blue-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                            Read article <ChevronRight className="h-3 w-3" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* POPULAR ARTICLES CARDS (Only displayed on empty query) */}
              {!searchQuery && !selectedCategory && (
                <div className="mt-6">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                    <Heart className="h-4 w-4 text-red-500 fill-red-500" />
                    Highly Visited Handbooks
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {popularArticles.map((art) => (
                      <div
                        key={art.id}
                        onClick={() => setActiveArticleId(art.id)}
                        className="p-4 rounded-2xl bg-white border border-slate-150 hover:border-blue-200 transition-all cursor-pointer flex items-center gap-3.5"
                      >
                        <div className="h-10 w-10 shrink-0 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                          <BookOpen className="h-5 w-5" />
                        </div>
                        <div className="overflow-hidden">
                          <h4 className="text-sm font-bold text-slate-800 leading-snug hover:text-[#1E6FD9] transition-all truncate">
                            {art.title}
                          </h4>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {art.readTime} • Updated {art.lastUpdated}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ────── DETAILS READING CAP ────── */
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-150 flex flex-col">
              
              {/* Back breadcrumbs */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 flex-wrap gap-2">
                <button
                  onClick={() => setActiveArticleId(null)}
                  className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-[#1E6FD9] transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" /> Back to Guides List
                </button>
                <div className="text-xs text-slate-400 font-medium flex items-center gap-1">
                  <span>Help Center</span>
                  <ChevronRight className="h-3 w-3" />
                  <span className="capitalize">{activeArticle.category.replace('-', ' ')}</span>
                  <ChevronRight className="h-3 w-3" />
                  <span className="truncate max-w-[150px]">{activeArticle.title}</span>
                </div>
              </div>

              {/* Dynamic Header Metrics */}
              <div className="flex items-center gap-2 mb-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-50 text-[#1E6FD9]">
                  {KNOWLEDGE_CATEGORIES.find(c => c.id === activeArticle.category)?.name || activeArticle.category}
                </span>
                <span className="text-xs text-slate-400 font-semibold">•</span>
                <span className="text-xs text-slate-400 font-semibold">{activeArticle.readTime}</span>
                <span className="text-xs text-slate-400 font-semibold">•</span>
                <span className="text-xs text-slate-400 font-semibold">Updated {activeArticle.lastUpdated}</span>
              </div>

              <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-tight mb-6">
                {activeArticle.title}
              </h2>

              <div className="text-slate-700 text-sm md:text-base leading-relaxed space-y-4 whitespace-pre-wrap font-sans border-b border-slate-100 pb-8">
                {activeArticle.content}
              </div>

              {/* Tags & Feedback row */}
              <div className="pt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                {/* Article tags */}
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-xs font-bold text-slate-400 mr-1.5 uppercase tracking-wider">Tags:</span>
                  {activeArticle.tags.map(tag => (
                    <span
                      key={tag}
                      onClick={() => {
                        setSearchQuery(tag);
                        setActiveArticleId(null);
                      }}
                      className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-600 cursor-pointer transition-colors"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>

                {/* Rating component */}
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-500">Was this guide helpful?</span>
                  
                  {feedbackSubmitted[activeArticle.id] ? (
                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 animate-pulse">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Thank you for your feedback!
                    </span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleFeedback(activeArticle.id, 'helpful')}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <ThumbsUp className="h-3.5 w-3.5" /> Yes
                      </button>
                      <button
                        onClick={() => handleFeedback(activeArticle.id, 'unhelpful')}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <ThumbsDown className="h-3.5 w-3.5" /> No
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Related posts */}
              <div className="bg-slate-50 rounded-2xl p-5 mt-8 border border-slate-150">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 block">
                  Other Guides in Category
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {KNOWLEDGE_ARTICLES.filter(art => art.category === activeArticle.category && art.id !== activeArticle.id).slice(0, 2).map((rel) => (
                    <div
                      key={rel.id}
                      onClick={() => setActiveArticleId(rel.id)}
                      className="px-3.5 py-2.5 rounded-xl bg-white border border-slate-150 hover:border-blue-200 cursor-pointer transition-all flex items-center justify-between"
                    >
                      <span className="text-xs font-bold text-slate-700 truncate">{rel.title}</span>
                      <ChevronRight className="h-3 w-3 text-slate-400 shrink-0" />
                    </div>
                  ))}
                  {KNOWLEDGE_ARTICLES.filter(art => art.category === activeArticle.category && art.id !== activeArticle.id).length === 0 && (
                    <span className="text-xs text-slate-400 italic">No additional articles in this category.</span>
                  )}
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Right Column (4 cols): AI Support Assistant Box & Direct offline contact */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* ────── AI SUPPORTER ASSISTANT BOX ────── */}
          <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-blue-950 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col max-h-[500px]">
            {/* Ambient gradients */}
            <div className="absolute right-0 top-0 w-24 h-24 bg-blue-500/10 rounded-full blur-xl pointer-events-none" />
            
            <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-3">
              <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-cyan-300 fill-cyan-300 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-tight">ProSpaces AI Assistant</h3>
                <span className="text-[10px] text-cyan-400 font-extrabold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Direct KB Matcher
                </span>
              </div>
            </div>

            {/* Conversation message logs container */}
            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 py-1 max-h-[250px] min-h-[180px] scrollbar-thin">
              {assistantMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex flex-col max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-[#1E6FD9] text-white self-end ml-auto rounded-tr-none'
                      : 'bg-white/10 text-slate-200 self-start mr-auto rounded-tl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>
              ))}

              {isAssistantTyping && (
                <div className="bg-white/10 text-slate-200 self-start rounded-2xl rounded-tl-none p-3 max-w-[50%] mr-auto text-xs flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              )}
            </div>

            {/* Chat Input form */}
            <form onSubmit={handleAssistantSubmit} className="mt-4 flex items-center gap-1.5 border-t border-white/10 pt-3">
              <input
                type="text"
                placeholder="Ask about dynamic fields, permissions..."
                value={assistantInput}
                onChange={(e) => setAssistantInput(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 text-xs rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
              />
              <button
                type="submit"
                disabled={!assistantInput.trim() || isAssistantTyping}
                className="p-2.5 rounded-xl bg-blue-600 border border-blue-500 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors cursor-pointer flex items-center justify-center shrink-0"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>

          {/* ────── CUSTOM TICKET SUBMISSION ────── */}
          <div className="bg-white rounded-3xl p-6 border border-slate-150 shadow-sm flex flex-col">
            <h3 className="text-sm font-bold uppercase text-slate-400 tracking-wider flex items-center gap-2 mb-3">
              <MessageSquare className="h-4 w-4 text-orange-500" />
              Need Direct Support?
            </h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              If our guides or assistant haven&apos;t fully completed your answer, our team of helpful support specialists can address your custom inquiry.
            </p>

            <div className="space-y-3">
              <a
                href="mailto:support@prospaces.com"
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Mail className="h-4 w-4 text-slate-500" /> support@prospaces.com
              </a>
              <div className="text-[10px] text-slate-400 text-center italic mt-2">
                Typical reply duration: Under 2 hours (Mon–Fri)
              </div>
            </div>
          </div>

          {/* Quick Stats list */}
          <div className="bg-slate-100 rounded-3xl p-6 border border-slate-200 flex flex-col gap-3">
            <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider">
              Quick System Stats
            </h4>
            
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Platform Status</span>
              <span className="font-extrabold text-emerald-600 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> All Systems Operational
              </span>
            </div>

            <div className="flex justify-between items-center text-xs border-t border-slate-200/55 pt-2">
              <span className="text-slate-500 font-medium">Last release version</span>
              <span className="font-bold text-slate-700">v2.14.8 (Enterprise)</span>
            </div>

            <div className="flex justify-between items-center text-xs border-t border-slate-200/55 pt-2">
              <span className="text-slate-500 font-medium">Secure Backup Cycle</span>
              <span className="font-bold text-slate-700">Continuous Hourly</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
