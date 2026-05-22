import { useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { 
  ArrowLeft,
  CheckCircle2,
  Users,
  Target,
  FileText,
  Calendar,
  Package,
  Mail,
  BarChart3,
  Shield,
  Zap,
  Globe,
  TrendingUp,
  Clock
} from 'lucide-react';

interface ModuleDetailProps {
  moduleId: string;
  onBack: () => void;
}

export function ModuleDetail({ moduleId, onBack }: ModuleDetailProps) {
  // Scroll to top when component mounts or moduleId changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [moduleId]);

  const modules = {
    'contact-management': {
      icon: Users,
      title: 'Contact Management',
      subtitle: 'Manage homeowners, suppliers, and subcontractors',
      color: 'from-blue-500 to-cyan-500',
      description: 'Build and maintain strong relationships with homeowners, suppliers, and subcontractors. Track every interaction from the first inquiry to project completion and beyond for repeat business and referrals.',
      images: [
        'https://images.unsplash.com/photo-1722876720000-f39b65b7d4a1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxob21lJTIwcmVub3ZhdGlvbiUyMGNvbnRyYWN0b3J8ZW58MXx8fHwxNzY2ODkwNjIwfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
        'https://images.unsplash.com/photo-1760963301666-582b92218a19?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb25zdHJ1Y3Rpb24lMjB3b3JrZXJzJTIwbWVldGluZ3xlbnwxfHx8fDE3NjY4OTA2MjB8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
      ],
      features: [
        'Centralized homeowner database with property details',
        'Subcontractor and supplier contact management',
        'Project history tracking per customer',
        'Communication log (calls, emails, site visits)',
        'Property photos and documentation storage',
        'Homeowner preferences and special requirements',
        'Referral source tracking',
        'Customer segmentation (residential, commercial)',
        'Service area and territory management',
        'Emergency contact information storage'
      ],
      benefits: [
        'Never lose track of homeowner project details',
        'Quick access to supplier and subcontractor info',
        'Build lasting relationships for repeat business',
        'Track referrals to reward loyal customers'
      ],
      useCases: [
        {
          title: 'Roofing Contractors',
          description: 'Track homeowners from initial roof inspection through warranty period, maintaining detailed property and contact records.'
        },
        {
          title: 'Kitchen & Bath Remodelers',
          description: 'Store customer preferences, style choices, and project history for personalized service and future referrals.'
        },
        {
          title: 'General Contractors',
          description: 'Manage relationships with homeowners, subcontractors, suppliers, and inspectors all in one place.'
        }
      ]
    },
    'opportunities': {
      icon: Target,
      title: 'Opportunities & Pipeline',
      subtitle: 'Track renovation projects from lead to completion',
      color: 'from-purple-500 to-pink-500',
      description: 'Transform your renovation sales process with visual pipeline management. Track projects from initial inquiry to signed contract, forecast revenue, and identify which leads need attention.',
      images: [
        'https://images.unsplash.com/photo-1765277789236-18b14cb7869f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxob21lJTIwY29uc3RydWN0aW9uJTIwcHJvamVjdHxlbnwxfHx8fDE3NjY4OTA2MjF8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
        'https://images.unsplash.com/photo-1587052694737-a972e4186288?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb250cmFjdG9yJTIwYnVzaW5lc3N8ZW58MXx8fHwxNzY2ODkwNjIzfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
      ],
      features: [
        'Visual pipeline for renovation projects',
        'Custom stages (Inquiry, Site Visit, Estimate, Contract, In Progress, Complete)',
        'Project value tracking and revenue forecasting',
        'Win/loss analysis by project type',
        'Seasonal trend tracking',
        'Project type categorization (roof, deck, kitchen, etc.)',
        'Lead source tracking (web, referral, canvassing)',
        'Probability-based revenue projections',
        'Team workload and capacity planning',
        'Project timeline and milestone tracking'
      ],
      benefits: [
        'See your entire project pipeline at a glance',
        'Identify bottlenecks in your sales process',
        'Accurate revenue forecasting for cash flow',
        'Focus on high-value renovation opportunities'
      ],
      useCases: [
        {
          title: 'Roofing Companies',
          description: 'Track leads from storm damage inquiries to completed roof replacements with accurate revenue forecasting.'
        },
        {
          title: 'Deck Builders',
          description: 'Manage seasonal pipeline of deck projects from design consultation to final walkthrough.'
        },
        {
          title: 'Multi-Service Contractors',
          description: 'Monitor diverse project types (roofing, siding, windows) and allocate crews efficiently.'
        }
      ]
    },
    'smart-bidding': {
      icon: FileText,
      title: 'Smart Bidding',
      subtitle: 'Professional renovation estimates with automation',
      color: 'from-orange-500 to-red-500',
      description: 'Create professional, accurate renovation estimates in minutes with automated calculations, material pricing, and labor costs. Win more projects with competitive, detailed proposals homeowners can trust.',
      images: [
        'https://images.unsplash.com/photo-1666137270524-5131ac07314d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb25zdHJ1Y3Rpb24lMjBlc3RpbWF0ZSUyMGRvY3VtZW50fGVufDF8fHx8MTc2Njg5MDYyMnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
        'https://images.unsplash.com/photo-1675024274628-47b1042d511f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb250cmFjdG9yJTIwY29uc3VsdGF0aW9uJTIwaG9tZW93bmVyfGVufDF8fHx8MTc2Njg5MDYyMnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
      ],
      features: [
        'Automated material and labor calculations',
        'Built-in tax calculations (GST, PST, HST)',
        'Project-specific estimate templates (roof, deck, garage)',
        'Line-by-line pricing breakdown',
        'Material waste factor calculations',
        'Labor hour estimation by trade',
        'Professional PDF quote generation',
        'Multiple estimate versions and revisions',
        'Profit margin tracking and optimization',
        'Historical pricing data for accuracy'
      ],
      benefits: [
        'Eliminate costly calculation errors',
        'Save hours creating professional estimates',
        'Consistent, branded proposal documents',
        'Improve win rates with accurate pricing'
      ],
      useCases: [
        {
          title: 'Roofing Contractors',
          description: 'Generate detailed roof replacement estimates with material quantities, labor hours, and disposal costs.'
        },
        {
          title: 'Kitchen Remodelers',
          description: 'Create comprehensive kitchen renovation quotes with cabinets, countertops, appliances, and installation.'
        },
        {
          title: 'Deck & Fence Builders',
          description: 'Quote outdoor projects with precise material calculations, permit fees, and labor breakdown.'
        }
      ]
    },
    'appointments': {
      icon: Calendar,
      title: 'Appointments & Scheduling',
      subtitle: 'Manage site visits, inspections, and consultations',
      color: 'from-green-500 to-emerald-500',
      description: 'Streamline your scheduling with integrated calendar management. Book site visits, inspections, and follow-ups with homeowners. Never miss an appointment or double-book your crew.',
      images: [
        'https://images.unsplash.com/photo-1661930941624-f4b43e3079f1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyb29mJTIwaW5zdGFsbGF0aW9uJTIwd29ya3xlbnwxfHx8fDE3NjY4OTA2MjF8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
        'https://images.unsplash.com/photo-1675024274628-47b1042d511f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb250cmFjdG9yJTIwY29uc3VsdGF0aW9uJTIwaG9tZW93bmVyfGVufDF8fHx8MTc2Njg5MDYyMnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
      ],
      features: [
        'Visual calendar with daily, weekly, monthly views',
        'Site visit and consultation scheduling',
        'Automated appointment reminders (SMS/Email)',
        'Crew availability and assignment tracking',
        'Job site location mapping and directions',
        'Inspection and walkthrough scheduling',
        'Recurring appointments (maintenance visits)',
        'Homeowner appointment confirmation tracking'
      ],
      benefits: [
        'Never double-book site visits or crews',
        'Reduce no-shows with automated reminders',
        'Optimize crew schedules',
        'Professional service with timely arrivals'
      ],
      useCases: [
        {
          title: 'Roofing Inspections',
          description: 'Schedule initial roof inspections, follow-up visits, and final walkthroughs with automated homeowner reminders.'
        },
        {
          title: 'Design Consultations',
          description: 'Book in-home design meetings for kitchens, bathrooms, and additions.'
        },
        {
          title: 'Multi-Crew Coordination',
          description: 'Manage multiple crews across different job sites while avoiding scheduling conflicts.'
        }
      ]
    },
    'inventory': {
      icon: Package,
      title: 'Inventory Management',
      subtitle: 'Track materials, tools, and supplies',
      color: 'from-indigo-500 to-blue-500',
      description: 'Keep perfect track of your building materials, tools, and supplies. Get low-stock alerts, manage supplier relationships, and ensure you have what you need for every job.',
      images: [
        'https://images.unsplash.com/photo-1761805618757-9d2b9552ee32?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidWlsZGluZyUyMG1hdGVyaWFscyUyMHdhcmVob3VzZXxlbnwxfHx8fDE3NjY4OTA2MjJ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
        'https://images.unsplash.com/photo-1756402664856-91a90f90b70b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb25zdHJ1Y3Rpb24lMjB0b29scyUyMHN1cHBsaWVzfGVufDF8fHx8MTc2Njg5MDYyM3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
      ],
      features: [
        'Building material inventory tracking',
        'Tool and equipment management',
        'Stock location tracking',
        'Low stock alerts for critical materials',
        'Product categorization (roofing, lumber, hardware, etc.)',
        'Supplier pricing and lead time tracking',
        'Material purchase order management',
        'Job costing and material allocation'
      ],
      benefits: [
        'Never run out of critical materials mid-job',
        'Reduce waste with accurate stock tracking',
        'Know what materials are on each truck or job site',
        'Better supplier negotiations with usage data'
      ],
      useCases: [
        {
          title: 'Roofing Companies',
          description: 'Track shingles, underlayment, nails, and flashing across multiple job sites and service trucks.'
        },
        {
          title: 'Deck Builders',
          description: 'Manage lumber inventory, fasteners, stains, and sealers with seasonal demand planning.'
        },
        {
          title: 'General Contractors',
          description: 'Monitor diverse material inventory across multiple trades and coordinate supplier deliveries.'
        }
      ]
    },
    'marketing': {
      icon: Mail,
      title: 'Marketing Automation',
      subtitle: 'Attract and engage homeowners',
      color: 'from-pink-500 to-rose-500',
      description: 'Create, launch, and track marketing campaigns that attract homeowners. Build automated email sequences, seasonal promotions, and nurture leads through your sales funnel.',
      images: [
        'https://images.unsplash.com/photo-1758548157440-a5640f99b5cd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxob21lJTIwcmVub3ZhdGlvbiUyMG1hcmtldGluZ3xlbnwxfHx8fDE3NjY4OTA2MjN8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
        'https://images.unsplash.com/photo-1587052694737-a972e4186288?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb250cmFjdG9yJTIwYnVzaW5lc3N8ZW58MXx8fHwxNzY2ODkwNjIzfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
      ],
      features: [
        'Visual email campaign builder',
        'Landing page builder with project galleries',
        'Seasonal campaign automation (spring roofing, fall siding)',
        'Homeowner segmentation by project type',
        'Before/after project showcase emails',
        'Campaign performance analytics',
        'Email template library for contractors',
        'Lead nurturing sequences',
        'ROI tracking per marketing channel'
      ],
      benefits: [
        'Automate seasonal marketing campaigns',
        'Nurture leads until they\'re ready to commit',
        'Track which marketing brings best ROI',
        'Increase referrals with automated follow-ups'
      ],
      useCases: [
        {
          title: 'Seasonal Campaigns',
          description: 'Launch spring roofing campaigns or fall gutter cleaning promotions with automated email sequences.'
        },
        {
          title: 'Post-Project Follow-Up',
          description: 'Automatically request reviews, referrals, and send maintenance tips after project completion.'
        },
        {
          title: 'Lead Nurturing',
          description: 'Build automated sequences that educate homeowners about renovation options until they\'re ready to buy.'
        }
      ]
    },
    'tasks': {
      icon: CheckCircle2,
      title: 'Task Management',
      subtitle: 'Organize work and manage deadlines',
      color: 'from-teal-500 to-cyan-500',
      description: 'Keep your team on track with powerful task management. Assign to-dos, set deadlines, track progress, and ensure nothing falls through the cracks on your renovation projects.',
      images: [
        'https://images.unsplash.com/photo-1754039985008-a15410211b67?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0YXNrJTIwbWFuYWdlbWVudCUyMGNoZWNrbGlzdHxlbnwxfHx8fDE3NjY5Mjc2MjJ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
        'https://images.unsplash.com/photo-1765378025264-ca795700291f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb25zdHJ1Y3Rpb24lMjB3b3JrZXIlMjBwbGFubmluZ3xlbnwxfHx8fDE3NjY5NTQ1NDF8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
      ],
      features: [
        'Create and assign tasks to team members',
        'Project-based task organization',
        'Priority levels (urgent, high, normal, low)',
        'Due date tracking and reminders',
        'Task dependencies and sequences',
        'Recurring tasks for maintenance jobs',
        'Checklist creation for standard procedures',
        'Progress tracking and completion status',
        'Time tracking for billable hours',
        'Mobile task updates from job sites'
      ],
      benefits: [
        'Never miss critical project deadlines',
        'Clear accountability for team members',
        'Standardize processes with task templates',
        'Track time spent on each renovation job'
      ],
      useCases: [
        {
          title: 'Project Task Lists',
          description: 'Create comprehensive task lists for roof replacements, kitchen remodels, or deck builds with assigned crew members.'
        },
        {
          title: 'Pre-Job Checklists',
          description: 'Ensure crews complete safety checks, material loading, and site prep before starting work.'
        },
        {
          title: 'Follow-Up Tasks',
          description: 'Schedule post-project tasks like final inspections, warranty registration, and customer satisfaction calls.'
        }
      ]
    },
    'documents': {
      icon: FileText,
      title: 'Document Management',
      subtitle: 'Store and organize project files',
      color: 'from-yellow-500 to-orange-500',
      description: 'Centralize all your project documents in one secure location. Store contracts, permits, blueprints, photos, warranties, and more with easy access from anywhere.',
      images: [
        'https://images.unsplash.com/photo-1762427354605-ac241af2b102?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkb2N1bWVudCUyMGZvbGRlciUyMGZpbGVzfGVufDF8fHx8MTc2Njk1NDU0MXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
        'https://images.unsplash.com/photo-1762146828422-50a8bd416d3c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb25zdHJ1Y3Rpb24lMjBibHVlcHJpbnRzJTIwZG9jdW1lbnRzfGVufDF8fHx8MTc2Njk1NDU0Mnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
      ],
      features: [
        'Secure cloud storage for all project files',
        'Organized folders by project or customer',
        'Contract and agreement storage',
        'Blueprint and plan management',
        'Before/after photo galleries',
        'Permit and inspection document tracking',
        'Warranty and manual storage',
        'Version control for updated documents',
        'Share files with homeowners securely',
        'Mobile photo upload from job sites'
      ],
      benefits: [
        'Access critical documents from anywhere',
        'Never lose important contracts or permits',
        'Share project files with homeowners easily',
        'Build photo portfolios for marketing'
      ],
      useCases: [
        {
          title: 'Contract Management',
          description: 'Store signed contracts, change orders, and payment schedules for easy reference and legal protection.'
        },
        {
          title: 'Project Documentation',
          description: 'Maintain blueprints, permits, inspection reports, and warranty information for each renovation project.'
        },
        {
          title: 'Photo Galleries',
          description: 'Build before/after photo collections for portfolio marketing and homeowner satisfaction documentation.'
        }
      ]
    },
    'email': {
      icon: Mail,
      title: 'Email Integration',
      subtitle: 'Manage customer communications',
      color: 'from-blue-600 to-indigo-600',
      description: 'Keep all customer communications in one place. Sync your email, track conversations by project, and never lose important correspondence with homeowners or suppliers.',
      images: [
        'https://images.unsplash.com/photo-1603539279542-e7cf76a92801?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlbWFpbCUyMGluYm94JTIwY29tbXVuaWNhdGlvbnxlbnwxfHx8fDE3NjY5NTQ1NDJ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
        'https://images.unsplash.com/photo-1682336869523-2c6859f781cb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidXNpbmVzcyUyMGVtYWlsJTIwY29tcHV0ZXJ8ZW58MXx8fHwxNzY2OTU0NTQzfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
      ],
      features: [
        'Email inbox integration (Gmail, Outlook)',
        'Customer email history tracking',
        'Email templates for common responses',
        'Attach emails to contacts and projects',
        'Send quotes and proposals via email',
        'Automated email notifications',
        'Email tracking and read receipts',
        'Team inbox for shared email accounts',
        'Search and filter by project or contact',
        'Mobile email access'
      ],
      benefits: [
        'All customer emails in one organized place',
        'Faster responses with email templates',
        'Track communication history per project',
        'Never miss important homeowner emails'
      ],
      useCases: [
        {
          title: 'Quote Follow-Up',
          description: 'Send professional quotes via email and track when homeowners open them for timely follow-up calls.'
        },
        {
          title: 'Project Updates',
          description: 'Keep homeowners informed with progress updates, photos, and scheduling changes via organized email threads.'
        },
        {
          title: 'Supplier Communication',
          description: 'Track all correspondence with material suppliers, delivery schedules, and order confirmations.'
        }
      ]
    },
    'project-wizards': {
      icon: Zap,
      title: 'Project Wizards',
      subtitle: 'Visual design tools for home improvement projects',
      color: 'from-violet-500 to-purple-500',
      description: 'Powerful visual planning tools for decks, garages, roofs, and sheds. Design projects with homeowners, generate material lists, and create professional proposals with 3D visualizations.',
      images: [
        'https://images.unsplash.com/photo-1667364973943-a625182326e0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkZWNrJTIwY29uc3RydWN0aW9uJTIwZGVzaWdufGVufDF8fHx8MTc2Njk1NDU0M3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
        'https://images.unsplash.com/photo-1739700712159-550519327ca7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxnYXJhZ2UlMjBjb25zdHJ1Y3Rpb24lMjBidWlsZGluZ3xlbnwxfHx8fDE3NjY5NTQ1NDR8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
      ],
      features: [
        'Deck Planner with visual canvas design',
        'Garage Builder with size customization',
        'Roof Designer with pitch and material selection',
        'Shed Configurator with style options',
        'Automated material quantity calculations',
        'Real-time cost estimation',
        'Professional printable designs',
        'Customer preference saving',
        'Template library for common designs',
        'Integration with inventory for material pricing'
      ],
      benefits: [
        'Visualize projects with homeowners before building',
        'Accurate material lists reduce waste',
        'Professional presentations win more bids',
        'Save time with design templates'
      ],
      useCases: [
        {
          title: 'Deck Design Consultations',
          description: 'Design custom decks with homeowners in real-time, showing different materials and sizes with instant pricing.'
        },
        {
          title: 'Garage Quotes',
          description: 'Configure detached garages with different dimensions, door options, and features for accurate estimates.'
        },
        {
          title: 'Roof Replacements',
          description: 'Calculate exact material needs for roof replacements based on measurements, pitch, and shingle selection.'
        }
      ]
    },
    'reports': {
      icon: BarChart3,
      title: 'Reports & Analytics',
      subtitle: 'Business insights and performance tracking',
      color: 'from-cyan-500 to-blue-500',
      description: 'Make data-driven decisions with comprehensive reporting. Track sales performance, project profitability, team productivity, and marketing ROI with real-time dashboards and detailed reports.',
      images: [
        'https://images.unsplash.com/photo-1551288049-bebda4e38f71?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhbmFseXRpY3MlMjBkYXNoYm9hcmQlMjBjaGFydHN8ZW58MXx8fHwxNzY2OTE5OTkyfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
        'https://images.unsplash.com/photo-1758518729696-884228731fce?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidXNpbmVzcyUyMHJlcG9ydHMlMjBkYXRhfGVufDF8fHx8MTc2Njk1NDU0NHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
      ],
      features: [
        'Sales pipeline reports and forecasting',
        'Project profitability analysis',
        'Team productivity tracking',
        'Marketing campaign performance',
        'Lead source ROI tracking',
        'Customer acquisition cost analysis',
        'Seasonal trend reports',
        'Task completion metrics',
        'Bid win/loss ratio tracking',
        'Custom report builder'
      ],
      benefits: [
        'Identify your most profitable project types',
        'Track which marketing channels work best',
        'Monitor team performance and productivity',
        'Forecast revenue for better planning'
      ],
      useCases: [
        {
          title: 'Monthly Performance Reviews',
          description: 'Generate comprehensive reports showing sales, profitability, and team performance for management meetings.'
        },
        {
          title: 'Marketing ROI Analysis',
          description: 'Track which marketing campaigns generate the most leads and highest-value projects for budget allocation.'
        },
        {
          title: 'Profitability Tracking',
          description: 'Analyze profit margins by project type to focus on your most profitable services (roofing vs. decks vs. siding).'
        }
      ]
    },
    'notes': {
      icon: FileText,
      title: 'Notes & Activity Log',
      subtitle: 'Capture important customer information',
      color: 'from-amber-500 to-yellow-500',
      description: 'Document every customer interaction, site visit observation, and important detail. Build a complete history of conversations, decisions, and follow-up items for each project.',
      images: [
        'https://images.unsplash.com/photo-1643094829594-0ae1519d75af?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxub3RlYm9vayUyMHdyaXRpbmclMjBub3Rlc3xlbnwxfHx8fDE3NjY5MzYwMjF8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
        'https://images.unsplash.com/photo-1758519289582-398f2d7a4a88?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjdXN0b21lciUyMG1lZXRpbmclMjBub3Rlc3xlbnwxfHx8fDE3NjY5NTQ1NDV8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
      ],
      features: [
        'Quick note capture from anywhere',
        'Attach notes to contacts, projects, or tasks',
        'Site visit observation logging',
        'Call notes and conversation summaries',
        'Meeting notes with action items',
        'Customer preference documentation',
        'Issue and resolution tracking',
        'Rich text formatting and attachments',
        'Search notes across all projects',
        'Automatic activity timeline'
      ],
      benefits: [
        'Remember important customer details',
        'Complete history of project communications',
        'Smooth handoffs between team members',
        'Better customer service with context'
      ],
      useCases: [
        {
          title: 'Site Visit Documentation',
          description: 'Record observations during roof inspections, noting damage areas, homeowner concerns, and special requirements.'
        },
        {
          title: 'Customer Preferences',
          description: 'Document homeowner style preferences, color choices, scheduling constraints, and special requests for reference.'
        },
        {
          title: 'Problem Resolution',
          description: 'Track issues that arise during projects and how they were resolved for quality improvement and warranty reference.'
        }
      ]
    }
  };

  const module = modules[moduleId as keyof typeof modules];

  if (!module) {
    return (
      <div className="min-h-screen bg-background light flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl text-foreground mb-4">Module not found</h2>
          <Button onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  const Icon = module.icon;

  return (
    <div className="min-h-screen bg-background light">
      {/* Navigation */}
      <div className="sticky top-0 z-50 bg-background border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Button variant="ghost" onClick={onBack} className="group">
            <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Back to Home
          </Button>
        </div>
      </div>

      {/* Hero Section */}
      <div className={`bg-gradient-to-br ${module.color} py-16`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-20 w-20 rounded-2xl bg-background/20 backdrop-blur-sm flex items-center justify-center">
              <Icon className="h-12 w-12 text-white" />
            </div>
            <div>
              <h1 className="text-4xl sm:text-5xl text-white mb-2">{module.title}</h1>
              <p className="text-xl text-white/90">{module.subtitle}</p>
            </div>
          </div>
          <p className="text-lg text-white/90 max-w-3xl">
            {module.description}
          </p>
        </div>
      </div>

      {/* Images Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          {module.images.map((image, index) => (
            <div key={index} className="rounded-xl overflow-hidden shadow-lg">
              <img 
                src={image} 
                alt={`${module.title} screenshot ${index + 1}`}
                className="w-full h-80 object-cover"
              />
            </div>
          ))}
        </div>

        {/* Features Section */}
        <div className="mb-16">
          <h2 className="text-3xl text-foreground mb-8">Key Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {module.features.map((feature, index) => (
              <div key={index} className="flex items-start gap-3">
                <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-foreground">{feature}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Benefits Section */}
        <div className="mb-16">
          <h2 className="text-3xl text-foreground mb-8">Benefits</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {module.benefits.map((benefit, index) => (
              <Card key={index} className="border-2">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${module.color} flex items-center justify-center flex-shrink-0`}>
                      <Zap className="h-5 w-5 text-white" />
                    </div>
                    <p className="text-foreground pt-1">{benefit}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Use Cases Section */}
        <div className="mb-16">
          <h2 className="text-3xl text-foreground mb-8">Use Cases</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {module.useCases.map((useCase, index) => (
              <Card key={index} className="border-0 shadow-lg">
                <CardContent className="pt-6">
                  <h3 className="text-xl mb-3 text-foreground">{useCase.title}</h3>
                  <p className="text-muted-foreground">{useCase.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl p-12">
          <h2 className="text-3xl text-foreground mb-4">
            Ready to get started with {module.title}?
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of businesses already using ProSpaces CRM to streamline their operations.
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" onClick={onBack} className={`bg-gradient-to-br ${module.color} text-white hover:opacity-90`}>
              Explore More Modules
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-900 text-white py-12 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-muted-foreground">© 2025 ProSpaces CRM. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}