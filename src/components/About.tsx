import { Building2, Hammer, Package, Mail, Calendar, FileText, BarChart3, Shield, X, Download, ExternalLink, Users, Code, Globe, Zap, ChevronDown, ChevronUp, Monitor, Smartphone, HelpCircle } from 'lucide-react';
import { Button } from './ui/button';
import { useTheme } from './ThemeProvider';
import { useState } from 'react';

interface AboutProps {
  onClose?: () => void;
}

export function About({ onClose }: AboutProps) {
  const { theme } = useTheme();
  const version = '1.2.0';
  const buildDate = 'March 2026';
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    changelog: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const modules = [
    { name: 'Dashboard & Analytics', icon: BarChart3, color: theme.isDark ? 'text-blue-400' : 'text-blue-600' },
    { name: 'Contact Management', icon: Building2, color: theme.isDark ? 'text-purple-400' : 'text-purple-600' },
    { name: 'Task & Calendar', icon: Calendar, color: theme.isDark ? 'text-green-400' : 'text-green-600' },
    { name: 'Email Integration', icon: Mail, color: theme.isDark ? 'text-red-400' : 'text-red-600' },
    { name: 'Inventory Tracking', icon: Package, color: theme.isDark ? 'text-orange-400' : 'text-orange-600' },
    { name: 'Document Management', icon: FileText, color: theme.isDark ? 'text-indigo-400' : 'text-indigo-600' },
    { name: 'Project Wizards', icon: Hammer, color: theme.isDark ? 'text-amber-400' : 'text-amber-600' },
    { name: 'Security & Audit', icon: Shield, color: theme.isDark ? 'text-muted-foreground' : 'text-muted-foreground' },
  ];

  const planners = [
    { name: 'Roof Planner', description: 'Design complex roofing projects with 3D visualization' },
    { name: 'Deck Planner', description: 'Plan outdoor decks with railings and stairs' },
    { name: 'Garage Planner', description: 'Configure custom garages with doors and windows' },
    { name: 'Shed Planner', description: 'Design storage sheds with various configurations' },
    { name: 'Kitchen Planner', description: 'Layout kitchen cabinets and appliances' },
  ];

  const techStack = [
    'React 18 with TypeScript',
    'Tailwind CSS v4',
    'Supabase (Database, Auth, Storage)',
    'Three.js (3D Rendering)',
    'React Router (Data Mode)',
    'Recharts (Analytics)',
  ];

  const integrations = [
    { name: 'Gmail', description: 'OAuth2 email integration', icon: Mail },
    { name: 'Microsoft Outlook', description: 'Azure AD email sync', icon: Mail },
    { name: 'Google Calendar', description: 'Calendar synchronization', icon: Calendar },
    { name: 'Microsoft Calendar', description: 'Outlook calendar sync', icon: Calendar },
    { name: 'Supabase', description: 'Database and authentication', icon: Shield },
  ];

  const roadmap = [
    { version: '1.3.0', quarter: 'Q2 2026', features: ['AI-powered quote generation', 'Mobile app (iOS/Android)', 'Advanced analytics dashboard', 'Custom reporting engine'] },
    { version: '1.4.0', quarter: 'Q3 2026', features: ['Team collaboration tools', 'Real-time chat', 'Video conferencing integration', 'Enhanced mobile experience'] },
    { version: '2.0.0', quarter: 'Q4 2026', features: ['Multi-language support', 'Advanced automation workflows', 'Marketplace for extensions', 'API for third-party integrations'] },
  ];

  const versionHistory = [
    {
      version: '1.2.0',
      date: 'March 2026',
      changes: [
        'Enhanced 3D rendering with procedural textures and 4096x4096 shadow maps',
        'Fixed Garage Planner door and window rotation alignment',
        'Resolved Roof Planner rake fascia rotation bug',
        'Fixed Three.js EdgesGeometry parsing issue',
        'Added architectural details and edge outlines to all planners',
      ]
    },
    {
      version: '1.1.0',
      date: 'February 2026',
      changes: [
        'Added Kitchen Planner with cabinet and appliance layout',
        'Implemented customer portal with project tracking',
        'Added subscription billing system with multiple tiers',
        'Enhanced email integration with preloading',
        'Improved inventory management with bulk import',
      ]
    },
    {
      version: '1.0.0',
      date: 'January 2026',
      changes: [
        'Initial release with core CRM functionality',
        'Contact and deal management',
        'Four 3D project planners (Roof, Deck, Garage, Shed)',
        'Email integration (Gmail, Outlook, Nylas)',
        'Document management and storage',
        'Role-based access control',
        'Audit logging for Enterprise plan',
      ]
    },
  ];

  const teamMembers = [
    { name: 'Development Team', role: 'Engineering & Architecture', icon: Code },
    { name: 'Design Team', role: 'UI/UX & 3D Graphics', icon: Zap },
    { name: 'Product Team', role: 'Strategy & Planning', icon: BarChart3 },
  ];

  const systemRequirements = {
    browsers: ['Chrome 90+', 'Firefox 88+', 'Safari 14+', 'Edge 90+'],
    recommended: ['4GB RAM minimum', 'Modern GPU for 3D planners', 'Stable internet connection', '1920x1080 resolution or higher'],
    mobile: ['iOS 14+ (Safari)', 'Android 10+ (Chrome)'],
  };

  return (
    <div 
      className="h-full overflow-y-auto"
      style={{ 
        background: theme.isDark 
          ? 'linear-gradient(to bottom right, #1a1a1a, #0f172a)' 
          : 'linear-gradient(to bottom right, #f8fafc, #dbeafe)'
      }}
    >
      <div className="max-w-5xl mx-auto p-8">
        {/* Header */}
        <div className="relative mb-8">
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="absolute -top-2 -right-2"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          <div className="flex items-center gap-4 mb-4">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg">
              <Building2 className="h-9 w-9 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold" style={{ color: theme.colors.text }}>ProSpaces CRM</h1>
              <p className="text-lg" style={{ color: theme.colors.secondaryText }}>Professional Construction & Property Management</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className={`px-3 py-1 rounded-full font-semibold ${theme.isDark ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
              Version {version}
            </span>
            <span style={{ color: theme.colors.secondaryText }}>{buildDate}</span>
          </div>
        </div>

        {/* Description */}
        <div 
          className="rounded-xl shadow-sm border p-6 mb-6"
          style={{ 
            backgroundColor: theme.colors.cardBackground,
            borderColor: theme.colors.border 
          }}
        >
          <h2 className="text-xl font-semibold mb-3" style={{ color: theme.colors.text }}>About ProSpaces</h2>
          <p className="leading-relaxed mb-4" style={{ color: theme.colors.secondaryText }}>
            ProSpaces CRM is a comprehensive customer relationship management platform designed specifically 
            for construction professionals, property managers, and contractors. Built with modern web technologies, 
            it combines powerful business tools with innovative 3D project planning capabilities.
          </p>
          <p className="leading-relaxed" style={{ color: theme.colors.secondaryText }}>
            From lead tracking and bid management to interactive 3D visualizations of roofing, decking, and 
            garage projects, ProSpaces streamlines your workflow and helps you close more deals.
          </p>
        </div>

        {/* Core Modules */}
        <div 
          className="rounded-xl shadow-sm border p-6 mb-6"
          style={{ 
            backgroundColor: theme.colors.cardBackground,
            borderColor: theme.colors.border 
          }}
        >
          <h2 className="text-xl font-semibold mb-4" style={{ color: theme.colors.text }}>Core Modules</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {modules.map((module) => {
              const Icon = module.icon;
              return (
                <div 
                  key={module.name} 
                  className="flex items-center gap-3 p-3 rounded-lg border transition-colors"
                  style={{ 
                    borderColor: theme.isDark ? '#2a2a2a' : '#f1f5f9',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = theme.isDark ? '#3a3a3a' : '#e2e8f0';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = theme.isDark ? '#2a2a2a' : '#f1f5f9';
                  }}
                >
                  <div className="flex-shrink-0">
                    <Icon className={`h-5 w-5 ${module.color}`} />
                  </div>
                  <span className="font-medium" style={{ color: theme.colors.text }}>{module.name}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Project Planners */}
        <div 
          className="rounded-xl shadow-sm border p-6 mb-6"
          style={{ 
            backgroundColor: theme.colors.cardBackground,
            borderColor: theme.colors.border 
          }}
        >
          <h2 className="text-xl font-semibold mb-4" style={{ color: theme.colors.text }}>3D Project Planners</h2>
          <div className="space-y-3">
            {planners.map((planner) => (
              <div 
                key={planner.name} 
                className="flex items-start gap-3 p-3 rounded-lg border transition-colors"
                style={{ 
                  borderColor: theme.isDark ? '#2a2a2a' : '#f1f5f9',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = theme.isDark ? '#3a3a3a' : '#e2e8f0';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = theme.isDark ? '#2a2a2a' : '#f1f5f9';
                }}
              >
                <div className="flex-shrink-0 mt-0.5">
                  <div className="h-2 w-2 rounded-full bg-blue-600"></div>
                </div>
                <div>
                  <div className="font-semibold" style={{ color: theme.colors.text }}>{planner.name}</div>
                  <div className="text-sm" style={{ color: theme.colors.secondaryText }}>{planner.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Integrations */}
        <div 
          className="rounded-xl shadow-sm border p-6 mb-6"
          style={{ 
            backgroundColor: theme.colors.cardBackground,
            borderColor: theme.colors.border 
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Globe className="h-5 w-5" style={{ color: theme.colors.primary }} />
            <h2 className="text-xl font-semibold" style={{ color: theme.colors.text }}>Integrations</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {integrations.map((integration) => {
              const Icon = integration.icon;
              return (
                <div key={integration.name} className="flex items-center gap-3 p-2 rounded-lg">
                  <Icon className={`h-4 w-4 ${theme.isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                  <div>
                    <div className="font-medium text-sm" style={{ color: theme.colors.text }}>{integration.name}</div>
                    <div className="text-xs" style={{ color: theme.colors.secondaryText }}>{integration.description}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Technology Stack */}
        <div 
          className="rounded-xl shadow-sm border p-6 mb-6"
          style={{ 
            backgroundColor: theme.colors.cardBackground,
            borderColor: theme.colors.border 
          }}
        >
          <h2 className="text-xl font-semibold mb-4" style={{ color: theme.colors.text }}>Technology Stack</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {techStack.map((tech) => (
              <div key={tech} className="flex items-center gap-2">
                <div className={`h-1.5 w-1.5 rounded-full ${theme.isDark ? 'bg-slate-600' : 'bg-slate-400'}`}></div>
                <span className="text-sm" style={{ color: theme.colors.text }}>{tech}</span>
              </div>
            ))}
          </div>
        </div>

        {/* System Requirements */}
        <div 
          className="rounded-xl shadow-sm border p-6 mb-6"
          style={{ 
            backgroundColor: theme.colors.cardBackground,
            borderColor: theme.colors.border 
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Monitor className="h-5 w-5" style={{ color: theme.colors.primary }} />
            <h2 className="text-xl font-semibold" style={{ color: theme.colors.text }}>System Requirements</h2>
          </div>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-sm mb-2" style={{ color: theme.colors.text }}>Supported Browsers</h3>
              <div className="flex flex-wrap gap-2">
                {systemRequirements.browsers.map((browser) => (
                  <span 
                    key={browser} 
                    className={`px-2 py-1 rounded text-xs ${theme.isDark ? 'bg-slate-800 text-slate-300' : 'bg-muted text-foreground'}`}
                  >
                    {browser}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-2" style={{ color: theme.colors.text }}>Recommended Specifications</h3>
              <div className="space-y-1">
                {systemRequirements.recommended.map((req) => (
                  <div key={req} className="flex items-center gap-2">
                    <div className={`h-1 w-1 rounded-full ${theme.isDark ? 'bg-slate-600' : 'bg-slate-400'}`}></div>
                    <span className="text-sm" style={{ color: theme.colors.secondaryText }}>{req}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Smartphone className="h-4 w-4" style={{ color: theme.colors.primary }} />
                <h3 className="font-semibold text-sm" style={{ color: theme.colors.text }}>Mobile Support</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {systemRequirements.mobile.map((platform) => (
                  <span 
                    key={platform} 
                    className={`px-2 py-1 rounded text-xs ${theme.isDark ? 'bg-slate-800 text-slate-300' : 'bg-muted text-foreground'}`}
                  >
                    {platform}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Roadmap */}
        <div 
          className="rounded-xl shadow-sm border p-6 mb-6"
          style={{ 
            backgroundColor: theme.colors.cardBackground,
            borderColor: theme.colors.border 
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-5 w-5" style={{ color: theme.colors.primary }} />
            <h2 className="text-xl font-semibold" style={{ color: theme.colors.text }}>Roadmap</h2>
          </div>
          <div className="space-y-4">
            {roadmap.map((release, index) => (
              <div key={release.version} className="relative">
                {index < roadmap.length - 1 && (
                  <div 
                    className="absolute left-2 top-8 bottom-0 w-0.5" 
                    style={{ backgroundColor: theme.isDark ? '#2a2a2a' : '#e2e8f0' }}
                  ></div>
                )}
                <div className="flex gap-4">
                  <div className={`h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 ${theme.isDark ? 'bg-blue-900' : 'bg-blue-100'}`}>
                    <div className={`h-2 w-2 rounded-full ${theme.isDark ? 'bg-blue-400' : 'bg-blue-600'}`}></div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold" style={{ color: theme.colors.text }}>{release.version}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${theme.isDark ? 'bg-purple-900/50 text-purple-300' : 'bg-purple-100 text-purple-700'}`}>
                        {release.quarter}
                      </span>
                    </div>
                    <ul className="space-y-1">
                      {release.features.map((feature) => (
                        <li key={feature} className="text-sm flex items-center gap-2" style={{ color: theme.colors.secondaryText }}>
                          <span className={theme.isDark ? 'text-blue-400' : 'text-blue-600'}>→</span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Features Highlight */}
        <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl shadow-lg p-6 mb-6 text-white">
          <h2 className="text-xl font-semibold mb-4">Key Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2">✨ Enhanced 3D Rendering</h3>
              <p className="text-sm text-blue-100">
                Photorealistic materials, procedural textures, and 4096x4096 shadow maps
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">📧 Email Integration</h3>
              <p className="text-sm text-blue-100">
                Connect Gmail and Outlook for unified inbox management
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">🔒 Enterprise Security</h3>
              <p className="text-sm text-blue-100">
                Role-based permissions, audit logging, and secure data storage
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">📱 Progressive Web App</h3>
              <p className="text-sm text-blue-100">
                Install on desktop or mobile for offline-capable access
              </p>
            </div>
          </div>
        </div>

        {/* Version History / Changelog */}
        <div 
          className="rounded-xl shadow-sm border p-6 mb-6"
          style={{ 
            backgroundColor: theme.colors.cardBackground,
            borderColor: theme.colors.border 
          }}
        >
          <button
            onClick={() => toggleSection('changelog')}
            className="w-full flex items-center justify-between mb-4"
          >
            <h2 className="text-xl font-semibold" style={{ color: theme.colors.text }}>Version History</h2>
            {expandedSections.changelog ? (
              <ChevronUp className="h-5 w-5" style={{ color: theme.colors.secondaryText }} />
            ) : (
              <ChevronDown className="h-5 w-5" style={{ color: theme.colors.secondaryText }} />
            )}
          </button>
          
          {expandedSections.changelog ? (
            <div className="space-y-6">
              {versionHistory.map((release) => (
                <div key={release.version}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`font-semibold ${theme.isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                      v{release.version}
                    </span>
                    <span className="text-sm" style={{ color: theme.colors.secondaryText }}>—</span>
                    <span className="text-sm" style={{ color: theme.colors.secondaryText }}>{release.date}</span>
                  </div>
                  <ul className="space-y-1.5">
                    {release.changes.map((change, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <span className={`mt-1 ${theme.isDark ? 'text-green-400' : 'text-green-600'} font-bold`}>✓</span>
                        <span style={{ color: theme.colors.secondaryText }}>{change}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm" style={{ color: theme.colors.secondaryText }}>
              Click to view complete version history and changelog
            </p>
          )}
        </div>

        {/* Team & Credits */}
        <div 
          className="rounded-xl shadow-sm border p-6 mb-6"
          style={{ 
            backgroundColor: theme.colors.cardBackground,
            borderColor: theme.colors.border 
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5" style={{ color: theme.colors.primary }} />
            <h2 className="text-xl font-semibold" style={{ color: theme.colors.text }}>Team & Credits</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {teamMembers.map((member) => {
              const Icon = member.icon;
              return (
                <div 
                  key={member.name} 
                  className="flex flex-col items-center text-center p-4 rounded-lg"
                  style={{ backgroundColor: theme.isDark ? '#1a1a1a' : '#f8fafc' }}
                >
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center mb-3 ${theme.isDark ? 'bg-blue-900/50' : 'bg-blue-100'}`}>
                    <Icon className={`h-6 w-6 ${theme.isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                  </div>
                  <h3 className="font-semibold mb-1" style={{ color: theme.colors.text }}>{member.name}</h3>
                  <p className="text-sm" style={{ color: theme.colors.secondaryText }}>{member.role}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* License Information */}
        <div 
          className="rounded-xl shadow-sm border p-6 mb-6"
          style={{ 
            backgroundColor: theme.colors.cardBackground,
            borderColor: theme.colors.border 
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5" style={{ color: theme.colors.primary }} />
            <h2 className="text-xl font-semibold" style={{ color: theme.colors.text }}>License</h2>
          </div>
          <div className="space-y-3">
            <p className="text-sm" style={{ color: theme.colors.secondaryText }}>
              ProSpaces CRM is proprietary software licensed for commercial use. All rights reserved.
            </p>
            <div className={`p-3 rounded-lg ${theme.isDark ? 'bg-amber-900/20 border-amber-800' : 'bg-amber-50 border-amber-200'} border`}>
              <p className={`text-xs ${theme.isDark ? 'text-amber-300' : 'text-amber-800'}`}>
                <strong>Notice:</strong> This software is provided under a commercial license agreement. 
                Unauthorized copying, distribution, or modification is strictly prohibited and may result 
                in severe civil and criminal penalties.
              </p>
            </div>
            <div className="text-xs" style={{ color: theme.colors.secondaryText }}>
              <p className="mb-2">Third-party libraries and dependencies:</p>
              <ul className="space-y-1 ml-4">
                <li>• React - MIT License</li>
                <li>• Three.js - MIT License</li>
                <li>• Tailwind CSS - MIT License</li>
                <li>• Lucide Icons - ISC License</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Support & Contact */}
        <div 
          className="rounded-xl shadow-sm border p-6 mb-6"
          style={{ 
            backgroundColor: theme.colors.cardBackground,
            borderColor: theme.colors.border 
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <HelpCircle className="h-5 w-5" style={{ color: theme.colors.primary }} />
            <h2 className="text-xl font-semibold" style={{ color: theme.colors.text }}>Support & Contact</h2>
          </div>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-sm mb-2" style={{ color: theme.colors.text }}>Need Help?</h3>
              <p className="text-sm mb-3" style={{ color: theme.colors.secondaryText }}>
                Our support team is here to help you get the most out of ProSpaces CRM.
              </p>
              <div className="space-y-2">
                <a 
                  href="mailto:support@prospaces.com"
                  className={`flex items-center gap-2 text-sm ${theme.isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'} transition-colors`}
                >
                  <Mail className="h-4 w-4" />
                  support@prospaces.com
                </a>
                <a 
                  href="https://docs.prospaces.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-2 text-sm ${theme.isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'} transition-colors`}
                >
                  <ExternalLink className="h-4 w-4" />
                  Documentation & Guides
                </a>
              </div>
            </div>
            <div className={`p-3 rounded-lg ${theme.isDark ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
              <p className="text-xs" style={{ color: theme.colors.secondaryText }}>
                <strong>Business Hours:</strong> Monday - Friday, 9:00 AM - 5:00 PM EST<br />
                <strong>Response Time:</strong> Within 24 hours for standard support, 4 hours for Enterprise customers
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div 
          className="text-center text-sm border-t pt-6"
          style={{ 
            color: theme.colors.secondaryText,
            borderColor: theme.colors.border 
          }}
        >
          <p className="mb-2">© 2026 ProSpaces CRM. All rights reserved.</p>
          <p>Built with ❤️ for construction and property management professionals</p>
        </div>
      </div>
    </div>
  );
}