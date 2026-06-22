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
  X as XIcon,
  Mail,
  ExternalLink,
  Check,
  Activity,
  AlertCircle,
  Clock,
  Phone,
  Video,
  FileDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Logo } from './Logo';

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
    color: 'text-sky-700',
    bgColor: 'bg-sky-50',
    borderColor: 'border-sky-100',
  },
  {
    id: 'contacts',
    name: 'CRM & Contacts',
    description: 'Import contacts, create custom fields, organize pipeline records, and set smart follow-ups.',
    icon: UserCheck,
    color: 'text-[#1E6FD9]',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-100',
  },
  {
    id: 'deals',
    name: 'Deals & Proposals',
    description: 'Drafting estimates, automated invoicing, customer portal feedback, and contract signatures.',
    icon: FileText,
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-100',
  },
  {
    id: 'planners',
    name: '3D Planners',
    description: 'How to utilize integrated Kitchen, Deck, Roof, Garage, and Shed builders to capture custom criteria.',
    icon: Wrench,
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-100',
  },
  {
    id: 'security-admin',
    name: 'Admin & Operations',
    description: 'Managing organization settings, seat licenses, access control permissions, and audit logs.',
    icon: ShieldCheck,
    color: 'text-rose-700',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-100',
  },
  {
    id: 'reports-kpis',
    name: 'KPIs & Diagnostics',
    description: 'Understanding total sales, win rates, close ratios, weighted pipelines, and campaign conversion telemetry.',
    icon: Activity,
    color: 'text-indigo-800',
    bgColor: 'bg-indigo-50/50',
    borderColor: 'border-indigo-100',
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
    content: `Welcome to ProSpaces CRM! We are thrilled to have you here. ProSpaces is a premium, cloud-synced CRM tailored specifically for modern contracting, lumber suppliers, and commercial building operations.

To get started with your new workspace account:
1. **Set Up Your Organization Profile**: Expand Admin Settings and select Settings. Add your business logo, primary commercial address, and state tax information. This will automatically populate your upcoming proposals and branded estimate invoices.
2. **Configure Your Subdomain Space**: Head to the 'Customer Portal' config inside Settings. Formulate beautiful accent colors so custom builders feel trusted and aligned with your branding.
3. **Invite Your Core Team Members**: In Admin Operations > Users, invite team roles ranging from Sales Agents to Directors. Each role carries specific, secure permissions.
4. **Download Your Logo Asset**: Ensure your uploaded logo is high contrast to maintain pristine visuals on client exports.`
  },
  {
    id: 'invite-team',
    title: 'How to Invite Team Members & Configure Interactive Role Permissions',
    category: 'getting-started',
    readTime: '4 min read',
    lastUpdated: 'June 18, 2026',
    popularity: 4,
    tags: ['users', 'roles', 'team', 'permissions', 'invite'],
    content: `Inviting teammates and setting up their permissions ensures your operations run smoothly without sacrificing confidential security and administrative workflows.

Roles available in ProSpaces CRM:
• **Super Admin**: Ultimate platform controls. Ideal for owners, founders, and IT directors.
• **Director**: High-level managerial visibility. Can approve custom contracts and override status pipelines, but lacks direct IT server logs.
• **Admin**: General operation controls, including invoice dispatching, creating customer portal accounts, and running file backups.
• **Manager**: Manages assigned teams and deals; can assign active checklist tasks and view regional activity analytics.
• **Agent (Salesperson)**: Focuses directly on contacts, personal calendar items, proposal updates, and initiating dynamic estimate planners.

To invite a user:
1. Hover/click the **Admin settings** dropdown in the header and select **Users**.
2. Click **Add New User** or invite via secure email.
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
    content: `Moving from static spreadsheets to a dedicated collaborative CRM can feel daunting, but ProSpaces automates standard CSV imports to streamline your transition.

Step-by-Step Bulk Import:
1. Click the **Admin Dropdown** at the top right and select **Import/Export**.
2. Download our lightweight **CSV import template** to align your existing column headers in seconds.
3. Click 'Upload File' and select your completed contractor spreadsheet.
4. **Map the Columns**: The importer matches Standard Fields (First Name, Email, Phone Number, Mailing Address) automatically. For unique custom contractor metadata, choose "Map to Custom Dynamic Field".
5. Click **Run Import Process**.

*Tip to Prevent Mismatches*: Ensure all phone numbers follow standard formatting. If you encounter errors, check the 'Scheduled Imports \& Background Manager' page under Admin dropdown to view import audit highlights.`
  },
  {
    id: 'dynamic-custom-fields',
    title: 'Creating and Utilizing Dynamic Custom Fields for Niche Contracting',
    category: 'contacts',
    readTime: '3 min read',
    lastUpdated: 'May 02, 2026',
    popularity: 3,
    tags: ['fields', 'customization', 'attributes', 'dynamic'],
    content: `Every construction, flooring, or framing specialist has specific details they need to capture—for example, measuring electrical amps, roof pitch angles, lumber species, or exact square footages.

Through **Dynamic Custom Fields**, you can record key metrics directly on a contact card:
1. Open any customer card inside your **Contacts** list.
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
  },
  {
    id: 'rls-database-security',
    title: 'Row-Level Security (RLS) Guide: User-Specific Partitioning & Data Isolation Policies',
    category: 'security-admin',
    readTime: '5 min read',
    lastUpdated: 'June 21, 2026',
    popularity: 5,
    tags: ['rls', 'security', 'database', 'isolation', 'permissions', 'supabase', 'tenant'],
    content: `Protecting contact leads and business transaction accounts is fully backed by real PostgreSQL design protocols. ProSpaces utilizes rigorous Row-Level Security (RLS) on database tables to guarantee multi-tenant branch privacy.

How RLS protects your active workspace:
• **Tenant-Level Filtering**: Every single query executed on CRM tables is automatically filtered through the authenticated user's active 'organization_id'. It is structurally impossible for separate companies to access your lead data.
• **Role-Based Controls**: Custom database policies inspect if an actor's profile carries Agent, Manager, or Director authorizations before permitting mutations or file edits.
• **Supervisor Level Override**: While sales agents are limited purely to personal contracts, managers and directors hold specialized overrides to coordinate broader regional teams.

Notice an access alert? Run the **RLS Setup Guide** or click **Fix Invalid Org IDs** inside your Admin diagnostics suite to scan for and resolve profile mismatches instantly.`
  },
  {
    id: 'messaging-hub-guide',
    title: 'Unified Messaging Hub: Configuring Threaded Chats, Customer Rooms & Staff Notes',
    category: 'contacts',
    readTime: '4 min read',
    lastUpdated: 'June 22, 2026',
    popularity: 5,
    tags: ['messaging', 'chat', 'communications', 'thread', 'portal', 'internal-notes'],
    content: `The ProSpaces Messaging Hub brings together client conversations, internal team channels, and secure portal-user threads into one interface. This eliminates the need for external chat programs.

Best practices for managing the Hub:
1. **Threaded Discussions**: Click 'Reply' to discuss specific tasks within message threads. This prevents main panels from becoming cluttered.
2. **Confidential Staff Annotations**: Type your message and select the 'Internal Note' toggle. This creates a secure, yellow-shaded annotation in the discussion pane visible *only* to teammates, while remaining completely hidden from the client portal.
3. **Convert Texts into Actions**: Received a message requesting an extra deck board or fixture update? Hover over the message clip and click **Create Follow-Up Task** to automatically generate a workspace task with original messages preserved.
4. **Polling Intervals**: In development, active chat windows execute a state update check every 30 seconds to fetch inbound portal replies synchronously.`
  },
  {
    id: 'background-imports-manager',
    title: 'Configuring Background Imports, Document Repositories & Automated Job Processors',
    category: 'security-admin',
    readTime: '6 min read',
    lastUpdated: 'June 22, 2026',
    popularity: 4,
    tags: ['background', 'imports', 'jobs', 'onedrive', 'processing', 'queue', 'billing'],
    content: `Importing massive contractor price books or bulk contacts takes high-performance handling. ProSpaces routes long-standing spreadsheet imports through a dedicated Background Job Queue to prevent slow browser sessions.

Understanding asynchronous operations:
• **The Job Pool Manager**: Go to the **Admin settings** dropdown and select **Background Manager**. Here you will see active, scheduled, and historically resolved batch workflows.
• **OneDrive Synchronization**: Under **Documents**, connect your OneDrive directories. The background runner pulls design shapes and files every 30 minutes.
• **Spreadsheet Recovery**: If a vendor inventory spreadsheet contains malformed pricing strings, the import processor pauses, records the mismatched row inside the background logs, and allows you to load corrected sheets.`
  },
  {
    id: 'inventory-skus-optimization',
    title: 'Managing High-Speed SKU Databases, Raw Material Inventories & Pricing Books',
    category: 'contacts',
    readTime: '5 min read',
    lastUpdated: 'June 22, 2026',
    popularity: 5,
    tags: ['inventory', 'sku', 'lumber', 'suppliers', 'pricing', 'diagnostic', 'index'],
    content: `To build accurate estimates inside the 3D Planners, you can access an integrated, fast-loading raw materials list. Linking items to your active inventory ensures that changes in raw material costs update current bids dynamically.

Optimizing material pricing and index lookups:
1. View structural supplies in the **Inventory Space** section.
2. **Ingest Excel Price Files**: Click **Import Inventory** inside the main Inventory manager to map distributor columns (SKU ID, Material, Thickness, Unit Price).
3. **Run Inventory Diagnostics**: If specific deck hardware, steel roofing, or fasteners are missing from planners search, execute the **Inventory Index Fixer**. This runs a diagnostic wipe on outdated local SKU keys and repopulated lists.
4. **Configure Dynamic Margins**: Define local markup percentages (e.g., 15% margin on lumber flashing) to auto-adjust quotes before presenting lines to the client.`
  },
  {
    id: 'integrations-mail-calendar',
    title: 'Multi-Account Sync Guide: Linking CalDAV Schedulers & SMTP Mail Outbox Hubs',
    category: 'getting-started',
    readTime: '4 min read',
    lastUpdated: 'June 22, 2026',
    popularity: 4,
    tags: ['email', 'calendar', 'oauth', 'setup', 'appointments', 'smtp'],
    content: `To send branded quotes and calendar updates directly from your business identity, connect your email clients and calendar schedulers to your active representative slot.

How to configure mail & schedules:
• **Setup Custom Outboxes**: Under **Settings > SMTP Setup**, register your mail parameters or click the modern OAuth prompt (Workspace/O365) to delegate safe sending tokens.
• **Synchronize Customer Portal Schedulers**: Connecting your corporate calendar allows prospective clients to view your availability. They can select appointment times, which sync with your central calendar in seconds.
• **Set Up Auto-Reminders**: Enable notifications inside your **Appointments Space** to dispatch custom text/email alerts 24 hours before a designer inspects a structural site.`
  },
  {
    id: 'kitchen-planner-layouts',
    title: 'Utilizing the 3D Kitchen Planner: Creating Custom L-Shapes, Islands & Appliance Cuts',
    category: 'planners',
    readTime: '5 min read',
    lastUpdated: 'June 22, 2026',
    popularity: 5,
    tags: ['kitchen', 'design', 'planner', 'appliances', 'backsplash', 'cabinets'],
    content: `Capture perfect design details using the built-in 3D Kitchen Planner. Build immersive, spatial mockups directly inside your client folder.

Step-by-step layout design:
1. Open the customer workspace folder and click **Design Spaces**.
2. Select **Kitchen Planner** to open the 3D stage and design panel.
3. **Room Dimensions**: Input room height and specify the layout orientation (L-Shape, G-Shape, Galley, or Single Wall with Island).
4. **Appliance Cutouts**: Place standard-sized refrigerator, stove, and dishwasher slots into the 3D footprint.
5. **Cabinet Configurations**: Click 'Add Upper/Lower Cabinets', choose species (Oak, Maple, or Painted Shaker), and configure backsplash tiling widths.
6. **Material Callout Generation**: Click **Sync to Deal** to auto-generate corresponding material cost lines on your active estimate.`
  },
  {
    id: 'tenant-billing-seats',
    title: 'Scaling Operations: Managing Organization Tenants, Seat Licenses & Modules',
    category: 'security-admin',
    readTime: '5 min read',
    lastUpdated: 'June 22, 2026',
    popularity: 4,
    tags: ['tenants', 'organizations', 'seats', 'billing', 'subscription', 'modules'],
    content: `ProSpaces is built to scale alongside your business operations. Our Organization Administrator panel allows you to customize features, toggle access slots, and review licenses.

Key metrics to manage:
• **Interactive Feature Toggles**: Keep workspace layouts simple by turning off irrelevant modules (e.g. disabling Garage or Roof Planners if you specialize solely in Kitchen redesigns). This is managed under **Admin > Modules Manager**.
• **Agent Seats Allocation**: See how many active representative logins exist. Safely invite or terminate agent profiles to optimize your monthly enterprise licensing plan.
• **Separate Division Tenancy**: For companies operating across multiple regions, establish independent sub-organizations. This isolates local accounts, while letting executives view master summaries.`
  },
  {
    id: 'brand-theme-customization',
    title: 'Theme Customization: Branded Client Portals & Accent Palette Presets',
    category: 'getting-started',
    readTime: '3 min read',
    lastUpdated: 'June 22, 2026',
    popularity: 3,
    tags: ['theme', 'palette', 'brand', 'design-system', 'custom-portal', 'logo'],
    content: `Provide a consistent visual experience across your corporate portal and estimator interfaces. You can easily modify both your internal design aesthetics and customer-facing viewports.

Adjusting your brand aesthetics:
1. Navigate to **Settings > Theme System Configuration** inside your Administrator dashboard.
2. Choose from curated design presets, including **Modern Carbon**, **Slate Minimalist**, **Warm Timber**, and **Steel Blue**.
3. **Hex Color Specificity**: Add your unique brand hex values to keep client portals matching your actual business website.
4. **Optimized Logo Ingestion**: Upload transparent PNG files. The CRM's customer portal uses these graphics to label external magic-link portals, maintaining high quality for client exports.`
  },
  {
    id: 'deck-planner-howto',
    title: 'How to Utilize the 3D Deck Planner: Designing Balusters & Selecting Composite Materials',
    category: 'planners',
    readTime: '4 min read',
    lastUpdated: 'June 22, 2026',
    popularity: 5,
    tags: ['deck', 'decking', 'composite', 'timber', 'planners', 'railing', 'outdoor', '3d', 'builder'],
    content: `Learn how to configure our 3D Deck Planner to compile professional deck building cost estimations and structural designs in real time.

Designing procedure:
1. Access any Deal or Contact record, navigate to **Design Spaces** and select the **Deck Builder** pane.
2. **Set Surface Dimensions**: Select deck length, projection depth, and elevate the deck structure to desired heights. Grid parameters scale instantly.
3. **Select Materials**: Toggle between standard Pressure-Treated Timber and premium Redwood-toned Composites. The costing database updates unit lines instantly based on materials.
4. **Configure Railing Profiles**: Apply continuous rails, select metal balusters or modern glass inserts, and specify stairway counts if required.
5. **Compute & Export Cost Estimations**: Click **Sync to Deal** to push structural joists, ledger boards, deck screws, concrete footings, and composite board inventories directly to your current bid list.`
  },
  {
    id: 'roof-planner-howto',
    title: 'How to Design Roof Profiles: Map Hip, Gable, Pitch Slopes & Finishing Trims',
    category: 'planners',
    readTime: '5 min read',
    lastUpdated: 'June 22, 2026',
    popularity: 5,
    tags: ['roof', 'roofing', 'pitch', 'shingle', 'metal', 'gable', 'hip', 'gutters', 'drip-edge', 'planners'],
    content: `The ProSpaces automated 3D Roof Planner is engineered to estimate complete roofing sheets, shingle quantities, and gutter runs in seconds.

Core design steps:
1. Open active Client Designs and select the **3D Roof Builder** workspace.
2. **Define Roof Profiles**: Choose Gable (triangular ends), Hip (four sloping sides), or Clean Slope Flat roof configurations.
3. **Set Pitch Slope Specifics**: Slide the pitch angle from 4/12 up to a steep 12/12. Ridge heights and sheet volumes recalibrate instantly.
4. **Specify Finishing Trims**: Choose linear footage parameters for ridge caps, valley flashings, drip edges, and matching aluminum gutters.
5. **Select Architectural Shingles vs standing-seam Aluminum Metal**: View immediate materials lists.
6. **Calculate Estimates**: Clicking **Sync to Deal** runs material estimations to push shingle squares, underlayment rolls, and flashing quantities directly to your active invoice.`
  },
  {
    id: 'shed-garage-planner-howto',
    title: 'How to Draft 3D Sheds & Garage Specs: Sizing Dimensions, Roll-Up Doors & Framing',
    category: 'planners',
    readTime: '4 min read',
    lastUpdated: 'June 22, 2026',
    popularity: 5,
    tags: ['shed', 'garage', 'framing', 'insulation', 'door', 'windows', 'sheathing', 'planners'],
    content: `Configure outbuilding framing, structural columns, windows, and vinyl siding using the customizable 3D Shed & Garage Planner.

Detailed design parameters:
1. Select **Garage & Shed Builder** from the interactive Design Checkpoints menu.
2. **Setup Sizing Specs**: Input width, depth, and wall plate heights. Select common preset sizes (such as 10x12, 12x20, or multi-car 24x24 frames).
3. **Select Stud Framing & Insulation**: Choose between standard 16-inch or 24-inch center stud spacings, and inject R-13 or thermal R-19 fiberglass batts insulation parameters.
4. **Add Overhead Gates & Picture Windows**: Drag and drop overhead roll-up doors, entry doors, or picture windows into the design layout.
5. **Siding Materials selection**: Choose vinyl lap siding, board & batton timber, or corrugated steel sheet claddings.
6. **Cost Syncing**: Export directly to pipeline deals, calculating precise 2x4 stud counts, siding panels, and sheathing sheets.`
  },
  {
    id: 'sales-pipelines-howto',
    title: 'How to Configure Custom Deal Pipelines: Managing Kanban Cards & Closing Bids',
    category: 'deals',
    readTime: '4 min read',
    lastUpdated: 'June 22, 2026',
    popularity: 4,
    tags: ['deals', 'pipelines', 'stages', 'kanban', 'sales', 'closing', 'estimates'],
    content: `Keep your sales agents aligned by organizing incoming contracting leads on visual Kanban stages.

Pipeline management rules:
1. Open the **Deals** workspace to see your sequential status boards (Lead-In, On-Site Survey, Estimate Drafted, Out for Client Approval, Deal Won, Deal Lost).
2. **Drag-and-Drop Operations**: Drag cards to represent pipeline progress. Top banner statistics recalculate your projected commissions and active deals volume instantly.
3. **Quick Proposal Tracking**: Double-click any card to view detailed cost breakdowns, edit item prices, or check if the client has viewed their portal access magic-link.
4. **Overdue deal alerts**: Toggle filter logs to prioritize aging leads requiring urgent follow-up consultations.`
  },
  {
    id: 'appointments-caldav-howto',
    title: 'How to Link CalDAV Calendars: Scheduling On-Site Surveys & Customer Bookings',
    category: 'getting-started',
    readTime: '4 min read',
    lastUpdated: 'June 22, 2026',
    popularity: 4,
    tags: ['appointments', 'calendar', 'caldav', 'schedule', 'booking', 'survey', 'onsite'],
    content: `Maintain seamless availability sync by connecting your corporate calendar accounts (Google Suite, O365, iCloud) directly to ProSpaces.

Scheduling setup procedures:
1. Open the **Appointments Space** from your left-hand menu.
2. **Synchronize CalDAV Nodes**: Provide your corporate calendar sync URL along with security authorization tokens.
3. **Set Hours & Limits**: Define operational availability (e.g., Mon-Fri, 8 AM - 6 PM) and survey duration buffers (e.g., 60 minutes per site survey).
4. **Embed Portal Consultations Widget**: Activate the scheduler inside customer portals, allowing clients to pick available slots instantly.
5. **Confirmations & SMS Triggers**: The app dispatches automated confirmation sequences containing survey directions, designer profiles, and cancel/reschedule tokens.`
  },
  {
    id: 'smtp-email-outbox-howto',
    title: 'How to Setup Custom SMTP Outboxes: Custom Branded Deliveries & Recipient Alerts',
    category: 'getting-started',
    readTime: '4 min read',
    lastUpdated: 'June 22, 2026',
    popularity: 4,
    tags: ['smtp', 'email', 'custom-smtp', 'dkim', 'deliver', 'notifications', 'branding'],
    content: `Stop letting contracts drop into spam folders! Configure your domain settings to route automated estimate invoice alerts through custom business SMTP outboxes.

SMTP parameters setup guidelines:
1. Access **Settings > SMTP Setup** under your administrator action drawer.
2. **Fill Host Information**: Specify your secure Server Host (e.g. smtp.gmail.com), Port parameter (usually 587 for TLS or 465 for SSL), and SSL/TLS toggles.
3. **Insert Outbox Credentials**: Record your business email address and secure App Password key.
4. **Conduct Outbox Tests**: Click "Send Diagnostics Mail" to verify connection loops.
5. **Email Layout Tailoring**: Inject custom footers, company phone links, logo attachments, and business state compliance texts to automatically wrap around dispatched bid emails.`
  },
  {
    id: 'rls-troubleshoot-howto',
    title: 'Row Level Security Diagnostics: Solving Access Alerts & Syncing Invalid Org IDs',
    category: 'security-admin',
    readTime: '5 min read',
    lastUpdated: 'June 22, 2026',
    popularity: 5,
    tags: ['rls', 'security', 'mismatch', 'invalid', 'org-id', 'diagnostic', 'troubleshoot', 'fix'],
    content: `Row-Level Security (RLS) policies guard database integrity so users only view leads under their correct tenant organization. If teammates encounter access alerts, run these diagnostics.

Step-by-step diagnostic fixes:
1. Open **Admin settings > Advanced Diagnostics / IT Panel**.
2. **Inspect Organisation Integrity**: Look for user profiles with empty or corrupted "organization_id" links.
3. **Execute the Org ID Auto-Fixer**: Click **Fix Invalid Org IDs** to automatically search the database and heal orphaned profiles to match your primary organization tenant.
4. **Review Role-level Policies**: Ensure that Agent vs Manager database policies are deployed by executing "Redeploy RLS Rules". This fixes table constraints instantly.`
  },
  {
    id: 'inventory-ingestion-howto',
    title: 'Bulk Ingesting Lumber & Fastener Price Books & Wiping Cached SKU Memory',
    category: 'contacts',
    readTime: '5 min read',
    lastUpdated: 'June 22, 2026',
    popularity: 5,
    tags: ['inventory', 'sku', 'wipe', 'import', 'excel', 'lumber', 'index', 'distributor'],
    content: `Keep your 3D planner calculations accurate by maintaining up-to-date raw lumber, decking, shingles, and fastener catalogs from distributors.

Ingestion procedures:
1. Open the **Inventory Space** and click **Import Inventory**.
2. **Map Columns**: Select your distributor Excel/CSV spreadsheet. Map standard fields (SKU ID, Material Group, Thickness/Length specs, Unit cost, Supplier name).
3. **Execute Import**: Click 'Run Catalog Update'. The backend job queue parses details to prevent UI locks.
4. **Fix outdated planner caches**: If older timber or siding prices persist inside planners, click **Wipe SKU Memory \& Index**. This purges local pricing state, forcing planners to pull from the newly ingested database.`
  },
  {
    id: 'kpi-definitions-sales',
    title: 'Definitions of Sales KPIs: Total Sales, Win Rate, and Close Ratio Formulas',
    category: 'reports-kpis',
    readTime: '3 min read',
    lastUpdated: 'June 22, 2026',
    popularity: 5,
    tags: ['kpi', 'sales', 'win-rate', 'close-rate', 'total-sales', 'definition', 'formula', 'revenue'],
    content: `Understand the fundamental metrics monitoring your sales performance, performance ratios, and absolute sales generation.

1. **Total Sales (Actualized Revenue)**:
• **What it represents**: The sum total dollar value of all successfully closed contracts (deals marked "Won").
• **How it is calculated**: Sum of final bid amounts for won opportunities. Active estimates, drafts, or lost deals are entirely excluded. 
• **How to improve**: Enhance follow-up consistency on approved estimates and utilize custom portals to streamline electronic signature approvals.

2. **Win Rate (Proposal Conversion Ratio)**:
• **What it represents**: The proportion of closed-out proposals converted into actualized clients. 
• **How it is calculated**: \`Win Rate = [Won Deals / (Won Deals + Lost Deals)] * 100\`
• **Key Note**: This metric ignores currently in-progress active candidates to provide a pure look at your bid closing strength.
• **Target Standard**: Industry-leading home renovators and contractors aim for win rates between 40% and 60% on qualified onsite bids.

3. **Close Rate (Overall Conversion Metric)**:
• **What it represents**: The overall throughput of your operational sales pipeline, factoring in total lead-in counts vs finalized contracts.
• **How it is calculated**: Calculated dynamically based on current sales activity cycles relative to historical trends.`
  },
  {
    id: 'kpi-definitions-pipeline',
    title: 'Definitions of Pipeline KPIs: Understanding Weighted Value, Pipeline Value, Average Age & Velocity',
    category: 'reports-kpis',
    readTime: '4 min read',
    lastUpdated: 'June 22, 2026',
    popularity: 5,
    tags: ['kpi', 'pipeline', 'weighted-value', 'pipeline-value', 'deal-age', 'velocity', 'days-to-close', 'forecast'],
    content: `Learn how probability-adjusted pipelines eliminate guesswork and provide precise financial forecasting.

1. **Pipeline Value (Raw Value)**:
• **What it represents**: The raw aggregate sum of all potential contracts currently situated in active pipeline columns (Estimate, On-Site, Portal Approval).
• **Usage limit**: While useful as a ceiling, it assumes every single lead will buy.

2. **Weighted Value (Probability-Adjusted Revenue Forecast)**:
• **What it represents**: The real-world adjusted cash forecast based on the specific success probabilities of each board column.
• **Common defaults**: Lead In = 10%, On-Site Survey = 30%, Estimate Drafted = 50%, Out for Portal Approval = 85%.
• **How it is calculated**: \`Weighted Value = Sum(Deal Amount * Stage Success Probability)\`
• **Business value**: Provides an airtight cash flow prediction for scheduling material purchases and planning lumber orders.

3. **Avg Days to Close (Velocity Tracker)**:
• **What it represents**: The elapsed timeframe required to convert a brand-new contact into a closed deal.
• **How to lower**: Use customized portals and direct automated SMS alerts so estimates are scrutinized by homeowners without administrative latency.

4. **Avg Deal Age (Aging Analysis)**:
• **What it represents**: The average number of days that your currently open active deals have spent waiting in the pipeline.
• **Significance**: Open deals with an age exceeding twice your typical 'Avg Days to Close' suggest a bottleneck or lost motivation.`
  },
  {
    id: 'kpi-definitions-marketing',
    title: 'Definitions of Marketing KPIs: Campaign Visibility, CTR, CPC, and Qualified Lead Conversion',
    category: 'reports-kpis',
    readTime: '4 min read',
    lastUpdated: 'June 22, 2026',
    popularity: 4,
    tags: ['kpi', 'marketing', 'ctr', 'cpc', 'qualified-leads', 'conversion', 'campaigns', 'roi'],
    content: `Track raw campaigns to determine precise demand generation costs and conversion funnels.

1. **Qualified Leads**:
• **What it represents**: The subset of acquired leads matching your commercial buying profile and displaying operational intent (such as submitting an initial custom 3D deck or kitchen layout).
• **Business priority**: Keeps sales agents focused on highly profitable bids.

2. **Campaign Visibility Index**:
• **What it represents**: Multi-channel reach KPI tracking digital impressions, organic searches, social interactions, and local map clicks.

3. **CTR (Click-Through Rate)**:
• **What it represents**: The performance of your ad copy and links.
• **How it is calculated**: \`CTR = (Clicks / Impressions) * 100\`

4. **CPC & Cost Per Acquisition (CPA)**:
• **What it represents**: Average budgets required to generate an individual dynamic planner submission or signed client.`
  },
  {
    id: 'kpi-definitions-ops',
    title: 'Definitions of IT & Operations KPIs: SKU Accuracy, Stockout Ratios, and Audit Traceability',
    category: 'reports-kpis',
    readTime: '3 min read',
    lastUpdated: 'June 22, 2026',
    popularity: 4,
    tags: ['kpi', 'operations', 'sku-accuracy', 'stockout', 'audit', 'traceability', 'it', 'rls'],
    content: `Operations metrics balance backend efficiency with catalog accuracy inside your 3D planner calculations.

1. **SKU Accuracy**:
• **What it represents**: The correlation between live supplier prices and structural pricing indexes inside the 3D Planner calculators.
• **Target**: Standard is 99+% to keep estimated costs synchronized with invoice margins.

2. **Fewer Stockouts Ratio**:
• **What it represents**: The reduction of material unavailability alerts inside lumber or deck building pipelines. Keeps timelines intact.

3. **Audit Traceability**:
• **What it represents**: A security baseline ensuring 100% of user logins, proposal updates, configuration overrides, and customer exports are recorded under encrypted logs.`
  }
];

export function KnowledgeBase({
  embedded = false,
  initialCategory = null,
}: {
  embedded?: boolean;
  initialCategory?: string | null;
} = {}) {
  // SUB-NAV TABS: 'kb' | 'status' | 'contact'
  const [activeSubTab, setActiveSubTab] = useState<'kb' | 'status' | 'contact'>('kb');

  // KNOWLEDGE STATE
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(initialCategory);
  const [activeArticleId, setActiveArticleId] = useState<string | null>(null);

  // Ratings feedback State
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<{ [key: string]: 'helpful' | 'unhelpful' }>({});
  
  // Custom ticket submitting form State
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketDescription, setTicketDescription] = useState('');
  const [ticketCategory, setTicketCategory] = useState('General Info');
  const [ticketSubmitted, setTicketSubmitted] = useState(false);

  // Dynamic Local Assistant chat simulation
  const [assistantInput, setAssistantInput] = useState('');
  const [assistantMessages, setAssistantMessages] = useState<Array<{ sender: 'user' | 'assistant', text: string, timestamp: string }>>([
    {
      sender: 'assistant',
      text: 'Hi there! I am the ProSpaces Support Bot. Ask me anything about configuring your CRM, dynamic fields, inviting team members, or utilizing our active 3D planners!',
      timestamp: 'Just now'
    }
  ]);
  const [isAssistantTyping, setIsAssistantTyping] = useState(false);

  // Reset parameters when changing sub-tabs
  useEffect(() => {
    setSearchQuery('');
    setSelectedCategory(initialCategory);
    setActiveArticleId(null);
    setTicketSubmitted(false);
  }, [activeSubTab, initialCategory]);

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

  // FEEDBACK HANDLING
  const handleFeedback = (articleId: string, type: 'helpful' | 'unhelpful') => {
    setFeedbackSubmitted(prev => ({
      ...prev,
      [articleId]: type
    }));
  };

  // TICKET HANDLING
  const handleTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketDescription.trim()) return;

    setTicketSubmitted(true);
    // Auto reset values after time
    setTimeout(() => {
      setTicketSubject('');
      setTicketDescription('');
      setTicketCategory('General Info');
    }, 2000);
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
      const q = userMsg.toLowerCase().trim();
      let answerText = '';

      // 1. Synonym expansions
      const searchTerms = [q];
      if (q.includes('quote') || q.includes('quotes') || q.includes('estimator') || q.includes('estimation') || q.includes('pricing') || q.includes('bid') || q.includes('proposal') || q.includes('deal') || q.includes('deals')) {
        searchTerms.push('estimates', 'bids', 'deals', 'proposals', 'pricing', 'pipelines');
      }
      if (q.includes('import') || q.includes('csv') || q.includes('excel') || q.includes('contacts') || q.includes('upload') || q.includes('spreadsheet') || q.includes('bulk')) {
        searchTerms.push('import', 'csv', 'bulk', 'mapping', 'contacts', 'spreadsheet');
      }
      if (q.includes('invite') || q.includes('user') || q.includes('users') || q.includes('team') || q.includes('permission') || q.includes('permissions') || q.includes('role') || q.includes('roles') || q.includes('staff')) {
        searchTerms.push('users', 'roles', 'team', 'permissions', 'invite');
      }
      if (q.includes('portal') || q.includes('client') || q.includes('customer') || q.includes('subdomain') || q.includes('e-signature') || q.includes('approval')) {
        searchTerms.push('portal', 'client', 'customer', 'approvals', 'signatures');
      }
      if (q.includes('field') || q.includes('fields') || q.includes('attribute') || q.includes('attributes') || q.includes('niche') || q.includes('customize')) {
        searchTerms.push('fields', 'customization', 'attributes', 'dynamic');
      }
      if (q.includes('inventory') || q.includes('sku') || q.includes('lumber') || q.includes('material') || q.includes('materials') || q.includes('price book')) {
        searchTerms.push('inventory', 'sku', 'lumber', 'pricing', 'material');
      }
      if (q.includes('kitchen') || q.includes('cabinate') || q.includes('cabinet') || q.includes('appliance') || q.includes('island')) {
        searchTerms.push('kitchen', 'design', 'cabinets', 'appliances', 'backsplash');
      }
      if (q.includes('deck') || q.includes('decking') || q.includes('composite') || q.includes('railing') || q.includes('baluster') || q.includes('balusters')) {
        searchTerms.push('deck', 'decking', 'composite', 'timber', 'planners');
      }
      if (q.includes('roof') || q.includes('roofing') || q.includes('gable') || q.includes('hip') || q.includes('pitch') || q.includes('shingle') || q.includes('shingles')) {
        searchTerms.push('roof', 'roofing', 'pitch', 'shingle', 'metal');
      }
      if (q.includes('shed') || q.includes('sheds') || q.includes('garage') || q.includes('garages') || q.includes('framing') || q.includes('insulation')) {
        searchTerms.push('shed', 'garage', 'framing', 'insulation', 'door');
      }
      if (q.includes('pipeline') || q.includes('pipelines') || q.includes('kanban') || q.includes('stage') || q.includes('stages')) {
        searchTerms.push('deals', 'pipelines', 'stages', 'kanban');
      }
      if (q.includes('appointment') || q.includes('appointments') || q.includes('calendar') || q.includes('caldav') || q.includes('booking') || q.includes('book')) {
        searchTerms.push('appointments', 'calendar', 'caldav', 'schedule');
      }
      if (q.includes('smtp') || q.includes('email') || q.includes('outbox') || q.includes('mail') || q.includes('dkim') || q.includes('tls') || q.includes('ssl')) {
        searchTerms.push('smtp', 'email', 'custom-smtp', 'notifications');
      }
      if (q.includes('theme') || q.includes('brand') || q.includes('color') || q.includes('colors') || q.includes('logo') || q.includes('preset') || q.includes('custom-portal')) {
        searchTerms.push('theme', 'palette', 'brand', 'logo', 'custom-portal');
      }
      if (q.includes('rls') || q.includes('isolation') || q.includes('tenant') || q.includes('row level security') || q.includes('security') || q.includes('database')) {
        searchTerms.push('rls', 'security', 'database', 'isolation', 'tenant');
      }
      if (q.includes('log') || q.includes('logs') || q.includes('audit') || q.includes('compliance')) {
        searchTerms.push('security', 'audit', 'logs', 'compliance', 'admin');
      }
      if (q.includes('kpi') || q.includes('kpis') || q.includes('metric') || q.includes('metrics') || q.includes('calculation') || q.includes('forecast') || q.includes('ratio') || q.includes('ratios') || q.includes('performance') || q.includes('value')) {
        searchTerms.push('kpi', 'sales', 'deals', 'marketing', 'operations', 'forecast', 'reports-kpis');
      }

      // 2. Tokenize original query to match individual keywords
      const stopWords = new Set(['how', 'do', 'i', 'create', 'a', 'the', 'to', 'in', 'and', 'of', 'about', 'for', 'with', 'is', 'on', 'can', 'what', 'you', 'me', 'my', 'we', 'our', 'help', 'with']);
      const tokens = q.split(/[\s,.\-?/!]+/).filter(tok => tok.length > 2 && !stopWords.has(tok));

      // Add tokens to search terms
      tokens.forEach(tok => {
        if (!searchTerms.includes(tok)) searchTerms.push(tok);
      });

      // 3. Score articles
      let bestArticle: typeof KNOWLEDGE_ARTICLES[0] | null = null;
      let maxScore = 0;

      KNOWLEDGE_ARTICLES.forEach(art => {
        let score = 0;

        // Direct phrase check has extreme priority
        if (art.title.toLowerCase().includes(q) || art.content.toLowerCase().includes(q)) {
          score += 150;
        }

        // Full tag query match
        art.tags.forEach(tag => {
          if (q.includes(tag.toLowerCase())) {
            score += 50;
          }
        });

        // Check individual search terms
        searchTerms.forEach(term => {
          const lowerTitle = art.title.toLowerCase();
          const lowerContent = art.content.toLowerCase();

          if (lowerTitle.includes(term)) {
            score += 30; // Strong match on title keywords
          }
          if (art.tags.some(t => t.toLowerCase() === term)) {
            score += 20; // Match on actual tag
          }
          if (lowerContent.includes(term)) {
            score += 5; // Moderate match on body content
          }
        });

        if (score > maxScore) {
          maxScore = score;
          bestArticle = art;
        }
      });

      if (bestArticle && maxScore >= 15) {
        answerText = `Great question! Based on our Article **"${bestArticle.title}"**:\n\n${bestArticle.content.slice(0, 380)}...\n\n👉 **Read the complete guide titled "${bestArticle.title}"** above for full step-by-step instructions!`;
      } else if (q.includes('hello') || q.includes('hi ') || q.includes('hey') || q.includes('greetings')) {
        answerText = "Hello! 👋 Welcome to ProSpaces Support. How can I assist you with your workspace setups today? Try asking about 'estimates', 'custom fields', 'invite users', or 'customer portal'.";
      } else if (q.includes('creator') || q.includes('who built') || q.includes('who are you')) {
        answerText = "I am the ProSpaces system assistant, designed to securely map support handbooks to your questions in real time.";
      } else {
        answerText = "I couldn't find a direct document matching that precise phrasing, but I can guide you! ProSpaces CRM allows you to sync contacts, build custom estimation sheets, open client-facing portal nodes, and execute 3D structures. Try searching for 'welcome', 'import contacts', or 'custom fields' in the search box above!";
      }

      setAssistantMessages(prev => [...prev, {
        sender: 'assistant',
        text: answerText,
        timestamp: 'Just now'
      }]);
      setIsAssistantTyping(false);
    }, 850);
  };

  return (
    <div className={`w-full bg-[#F8FAFC] text-slate-800 flex flex-col font-sans select-none ${embedded ? '' : 'min-h-screen'}`}>
      
      {/* ── 1. HELP CENTER HEADER ── */}
      {!embedded ? (
        <header className="w-full bg-[#1E6FD9] text-white px-4 sm:px-8 py-3.5 flex items-center justify-between border-b border-[#1154A8] shrink-0 sticky top-0 z-30 shadow-md">
          <div className="flex items-center gap-6 sm:gap-10">
            
            {/* Logo Branding */}
            <div 
              onClick={() => setActiveSubTab('kb')}
              className="flex items-center gap-3 cursor-pointer select-none group"
            >
              <Logo size="sm" showText={false} className="h-8 w-auto shrink-0 transition-transform duration-300 group-hover:scale-105 bg-white p-1 rounded-md" />
              <span className="font-sans font-black tracking-widest text-xs sm:text-sm uppercase text-white">
                Help Center
              </span>
            </div>

            {/* Navigation Links inside dark green header */}
            <nav className="flex items-center gap-4 sm:gap-6 text-xs font-bold text-white/80">
              <button
                onClick={() => { setActiveSubTab('kb'); setActiveArticleId(null); setSelectedCategory(null); }}
                className={`pb-1 px-1 transition-all relative ${
                  activeSubTab === 'kb' 
                    ? 'text-white' 
                    : 'hover:text-white'
                }`}
              >
                <span>Knowledge Base</span>
                {activeSubTab === 'kb' && (
                  <motion.div layoutId="headerUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full" />
                )}
              </button>
              <button
                onClick={() => setActiveSubTab('status')}
                className={`pb-1 px-1 transition-all relative ${
                  activeSubTab === 'status' 
                    ? 'text-white' 
                    : 'hover:text-white'
                }`}
              >
                <span>Status</span>
                {activeSubTab === 'status' && (
                  <motion.div layoutId="headerUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full" />
                )}
              </button>
              <button
                onClick={() => setActiveSubTab('contact')}
                className={`pb-1 px-1 transition-all relative ${
                  activeSubTab === 'contact' 
                    ? 'text-white' 
                    : 'hover:text-white'
                }`}
              >
                <span>Contact Support</span>
                {activeSubTab === 'contact' && (
                  <motion.div layoutId="headerUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full" />
                )}
              </button>
            </nav>
          </div>

          {/* Right spacer for header layout symmetry */}
          <div className="w-8 h-8" />
        </header>
      ) : (
        /* Compact inline subtabs inside embedded view */
        <div className="w-full bg-[#1E6FD9] text-white px-6 py-2 flex items-center justify-between border-b border-[#1154A8] shrink-0 sticky top-0 z-30 shadow-sm">
          <nav className="flex items-center gap-4 sm:gap-6 text-[11px] font-bold text-white/80">
            <button
              onClick={() => { setActiveSubTab('kb'); setActiveArticleId(null); setSelectedCategory(null); }}
              className={`pb-1 px-1 transition-all relative ${activeSubTab === 'kb' ? 'text-white' : 'hover:text-white'}`}
            >
              <span>Knowledge Base</span>
              {activeSubTab === 'kb' && (
                <motion.div layoutId="embeddedHeaderUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full" />
              )}
            </button>
            <button
              onClick={() => setActiveSubTab('status')}
              className={`pb-1 px-1 transition-all relative ${activeSubTab === 'status' ? 'text-white' : 'hover:text-white'}`}
            >
              <span>Status</span>
              {activeSubTab === 'status' && (
                <motion.div layoutId="embeddedHeaderUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full" />
              )}
            </button>
            <button
              onClick={() => setActiveSubTab('contact')}
              className={`pb-1 px-1 transition-all relative ${activeSubTab === 'contact' ? 'text-white' : 'hover:text-white'}`}
            >
              <span>Contact Support</span>
              {activeSubTab === 'contact' && (
                <motion.div layoutId="embeddedHeaderUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full" />
              )}
            </button>
          </nav>
        </div>
      )}

      {/* ── 2. HIGH-FIDELITY BLUE BANNER ── */}
      {activeSubTab === 'kb' && (
        <div className="w-full bg-[#E3F2FD] py-10 sm:py-14 px-6 md:px-12 relative overflow-hidden border-b border-blue-200">
          
          {/* Deep corporate blue swirl shape on raw right side (inspired exactly by attached reference) */}
          <div className="absolute right-0 top-0 bottom-0 w-[42%] bg-[#1E6FD9] rounded-l-[160px] hidden lg:block z-0 relative">
            {/* Soft grid overlay in blue section */}
            <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:14px_24px]" />
          </div>

          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-10 relative z-10">
            
            {/* Left section: Title & Search bar details */}
            <div className="flex-1 flex flex-col text-left max-w-2xl">
              
              <h1 className="text-3xl sm:text-5xl font-black text-[#1E6FD9] tracking-tight leading-none mb-3">
                Help
              </h1>
              
              <p className="text-xs sm:text-sm font-semibold text-[#0F4C81]/85 mb-6 max-w-md leading-relaxed">
                Connect your team, sync inventory metrics, configure dynamic specs and explore CRM solutions with direct indexing.
              </p>

              {/* Large search input layout centered beautifully */}
              <div className="w-full relative shadow-lg rounded-full bg-white text-slate-800 flex items-center p-1 sm:p-1.5 border border-[#BDDCFF] focus-within:ring-4 focus-within:ring-[#1E6FD9]/10 transition-all">
                <div className="p-3 pl-4 text-blue-700">
                  <Search className="h-4 sm:h-5 w-4 sm:w-5" />
                </div>
                <input
                  type="text"
                  placeholder="Search help center..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (activeArticleId) setActiveArticleId(null); // return to lists
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (filteredArticles.length > 0) {
                        setActiveArticleId(filteredArticles[0].id);
                        (e.target as HTMLInputElement).blur();
                      }
                    }
                  }}
                  className="flex-1 px-1 py-1.5 sm:py-2.5 bg-transparent text-xs sm:text-sm focus:outline-none text-slate-900 placeholder:text-slate-400 font-bold"
                />
                
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="p-2 text-slate-400 hover:text-slate-600 transition-colors mr-2 cursor-pointer"
                  >
                    <XIcon className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Suggestions quick tags */}
              <div className="flex flex-wrap items-center gap-2 mt-4 text-[10px] sm:text-xs">
                <span className="text-[#0F4C81] font-black opacity-85 uppercase tracking-wider text-[9px]">Try:</span>
                {['welcome', 'invite', 'custom fields', 'proposals', '3d planners'].map(term => (
                  <button
                    key={term}
                    onClick={() => {
                      setSearchQuery(term);
                      if (activeArticleId) setActiveArticleId(null);
                    }}
                    className="px-2.5 py-0.5 rounded-full bg-blue-50 border border-[#BDDCFF] text-[#1E6FD9] font-extrabold hover:bg-blue-100 transition-colors cursor-pointer text-[10px]"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>

            {/* Right Artwork: Premium Open Book with Purple Bookmark ribbon */}
            <div className="hidden lg:flex items-center justify-center w-64 h-48 select-none relative shrink-0">
              {/* Elegant open book SVG with pristine shadow, purple book ribbon and green hardcover */}
              <svg viewBox="0 0 240 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-xl transform -rotate-2">
                {/* Book outer hardcover border support */}
                <path d="M12 165 C70 160, 110 165, 120 172 C130 165, 170 160, 228 165 L224 25 C166 20, 130 25, 120 32 C110 25, 74 20, 16 25 Z" fill="#114C93" stroke="#0C3970" strokeWidth="2.5" />
                
                {/* 3D paper layers edge depth block */}
                <path d="M18 160 C72 155, 108 160, 118 167 C128 160, 164 155, 218 160 L220 28 C166 23, 130 28, 120 35 C110 28, 74 23, 20 28 Z" fill="#E3EFFD" />
                
                {/* Left Page (White side) */}
                <path d="M22 155 C74 150, 108 153, 118 162 L120 30 C110 23, 76 20, 24 25 Z" fill="#FFFFFF" />
                <path d="M118 162 L120 30 L115 30 L113 162 Z" fill="#F0F6FD" />
                
                {/* Right Page (Slight shaded side) */}
                <path d="M122 162 C132 153, 166 150, 218 155 L216 25 C164 20, 130 23, 120 30 Z" fill="#FAFCFB" />
                <path d="M118 30 C119 50, 119 140, 122 162" stroke="#BDDCFF" strokeWidth="2" />
                
                {/* Writing Guidelines representation on left page matching attached image book */}
                <path d="M34 50 H98" stroke="#CFDFD6" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M34 65 H102" stroke="#CFDFD6" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M34 80 H96" stroke="#CFDFD6" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M34 95 H100" stroke="#CFDFD6" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M34 110 H92" stroke="#CFDFD6" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M34 125 H98" stroke="#CFDFD6" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M34 140 H80" stroke="#CFDFD6" strokeWidth="1.5" strokeLinecap="round" />

                {/* Writing Guidelines representation on right page */}
                <path d="M138 51 H202" stroke="#CFDFD6" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M138 66 H196" stroke="#CFDFD6" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M138 81 H204" stroke="#CFDFD6" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M138 96 H190" stroke="#CFDFD6" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M138 111 H200" stroke="#CFDFD6" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M138 126 H194" stroke="#CFDFD6" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M138 141 H160" stroke="#CFDFD6" strokeWidth="1.5" strokeLinecap="round" />

                {/* Royal Violet Bookmark ribbon draped over the Left Page (inspired exactly by user reference) */}
                <path d="M58 20 L68 20 L68 94 L63 87 L58 94 Z" fill="#6366F1" />
                <path d="M58 20 L68 20 L68 22 L58 22 Z" fill="#4F46E5" />
              </svg>
            </div>

          </div>
        </div>
      )}

      {/* ── 3. DETAILED SUB-VIEW DIRECT SWITCHES ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 flex-grow w-full">
        
        {/* TAB 1: KNOWLEDGE BASE HANDBOOK EXPLORER */}
        {activeSubTab === 'kb' && (
          <div className="lg:col-span-8 flex flex-col gap-6">
            
            {/* Category selection bar */}
            {!activeArticle && (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                  <h2 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-[#1E6FD9]" />
                    Browse topics by department
                  </h2>
                  {selectedCategory && (
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className="text-[10px] font-extrabold text-[#1E6FD9] hover:text-[#1154A8] bg-blue-50 border border-blue-100 flex items-center gap-1 px-3 py-1 rounded-full cursor-pointer transition-colors"
                    >
                      Reset category <XIcon className="h-3 w-3" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 px-1">
                  {KNOWLEDGE_CATEGORIES.map((cat) => {
                    const CatIcon = cat.icon;
                    const isSelected = selectedCategory === cat.id;

                    return (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(isSelected ? null : cat.id)}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/50 shadow-sm ring-2 ring-blue-600/10'
                            : 'border-slate-100 hover:border-blue-200 hover:bg-slate-50/80 bg-white'
                        }`}
                      >
                        <div className={`p-2.5 rounded-lg ${cat.bgColor} ${cat.color} mb-2`}>
                          <CatIcon className="h-4 w-4" />
                        </div>
                        <span className="text-[10px] sm:text-xs font-black text-slate-800 leading-snug">
                          {cat.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* List vs Single active article reader */}
            {!activeArticle ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between pb-2">
                  <h2 className="text-lg font-black text-slate-800 tracking-tight">
                    {searchQuery 
                      ? 'Filtered Results' 
                      : selectedCategory 
                        ? `${KNOWLEDGE_CATEGORIES.find(c => c.id === selectedCategory)?.name} Guides` 
                        : 'Articles & Handbooks'}
                  </h2>
                  <span className="text-xs text-slate-500 font-extrabold bg-slate-100 px-3 py-1 rounded-full">
                    {filteredArticles.length} {filteredArticles.length === 1 ? 'Article' : 'Articles'}
                  </span>
                </div>

                {filteredArticles.length === 0 ? (
                  <div className="bg-white rounded-2xl p-10 text-center border border-slate-150 flex flex-col items-center justify-center">
                    <HelpCircle className="h-12 w-12 text-slate-350 mb-3 animate-pulse" />
                    <h3 className="text-sm font-black text-slate-700">No matching search query found</h3>
                    <p className="text-xs text-slate-400 max-w-sm mt-1.5 leading-relaxed">
                      Please check the keywords or click 'Reset search' below. You can also chat with the ProSpaces Assistant on the panel side.
                    </p>
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedCategory(null);
                      }}
                      className="mt-4 px-4 py-2 bg-[#1E6FD9] text-white hover:bg-[#1154A8] text-xs font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      Clear Search Flags
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {filteredArticles.map((art) => {
                      const catInfo = KNOWLEDGE_CATEGORIES.find(c => c.id === art.category);
                      const CatIcon = catInfo ? catInfo.icon : FileText;

                      return (
                        <div
                          key={art.id}
                          onClick={() => setActiveArticleId(art.id)}
                          className="p-5 rounded-xl bg-white border border-slate-205/60 hover:border-blue-350 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group active:scale-98"
                        >
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider ${catInfo?.bgColor || 'bg-slate-50'} ${catInfo?.color || 'text-slate-500'}`}>
                                <CatIcon className="h-2.5 w-2.5" />
                                {catInfo?.name || art.category}
                              </span>
                              <span className="text-[10px] text-slate-400 font-bold">
                                {art.readTime}
                              </span>
                            </div>

                            <h3 className="text-xs sm:text-sm font-black text-slate-800 group-hover:text-[#1E6FD9] transition-colors leading-snug">
                              {art.title}
                            </h3>

                            <p className="text-[11px] text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                              {art.content}
                            </p>
                          </div>

                          <div className="border-t border-slate-50 mt-4 pt-3 flex justify-between items-center text-[10px]">
                            <span className="text-slate-400 font-semibold">
                              Updated {art.lastUpdated}
                            </span>
                            <span className="font-extrabold text-[#1E6FD9] flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                              Read <ChevronRight className="h-3 w-3" />
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Popular Guides bottom panel */}
                {!searchQuery && !selectedCategory && (
                  <div className="mt-4 pt-2">
                    <h3 className="text-xs font-black uppercase text-slate-450 tracking-wider mb-3 flex items-center gap-1.5">
                      <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500" />
                      Frequently Read Articles
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {popularArticles.map((art) => (
                        <div
                          key={art.id}
                          onClick={() => setActiveArticleId(art.id)}
                          className="p-3.5 rounded-xl bg-white border border-slate-200/80 hover:border-[#1E6FD9]/35 hover:shadow-sm cursor-pointer transition-all flex items-center gap-3"
                        >
                          <div className="h-8 w-8 shrink-0 rounded-lg bg-blue-50 text-blue-800 flex items-center justify-center">
                            <BookOpen className="h-4 w-4" />
                          </div>
                          <div className="overflow-hidden">
                            <h4 className="text-[11.5px] font-black text-slate-700 leading-snug hover:text-[#1E6FD9] truncate">
                              {art.title}
                            </h4>
                            <span className="text-[9px] text-slate-400 font-semibold block mt-0.5">
                              {art.readTime} • Setup guide
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            ) : (
              
              /* ── SINGLE ARTICLE DETAILED READS ── */
              <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200/80 flex flex-col">
                
                {/* Back Breadcrumbs */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 flex-wrap gap-2 text-[10px] sm:text-xs">
                  <button
                    onClick={() => setActiveArticleId(null)}
                    className="flex items-center gap-1.5 font-bold text-slate-500 hover:text-[#1E6FD9] transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="h-4 w-4 stroke-[3]" /> Back to index list
                  </button>
                  <div className="text-slate-400 font-semibold flex items-center gap-1">
                    <span>Help</span>
                    <ChevronRight className="h-3 w-3" />
                    <span className="capitalize">{activeArticle.category.replace('-', ' ')}</span>
                  </div>
                </div>

                {/* Sub headers details */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-black bg-blue-50 text-blue-800 uppercase tracking-wider">
                    {KNOWLEDGE_CATEGORIES.find(c => c.id === activeArticle.category)?.name || activeArticle.category}
                  </span>
                  <span className="text-slate-300 font-bold">•</span>
                  <span className="text-[10px] text-slate-400 font-bold">{activeArticle.readTime}</span>
                  <span className="text-slate-300 font-bold">•</span>
                  <span className="text-[10px] text-slate-400 font-bold">Updated {activeArticle.lastUpdated}</span>
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight mb-5 tracking-tight">
                  {activeArticle.title}
                </h2>

                {/* Main article content formatted cleanly */}
                <div className="text-slate-600 text-xs sm:text-sm leading-relaxed space-y-4 whitespace-pre-wrap pt-2 pb-6 border-b border-slate-100 font-medium">
                  {activeArticle.content}
                </div>

                {/* Tag list and helpful ratings */}
                <div className="pt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs">
                  
                  {/* Article tag buttons */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mr-1">Tags:</span>
                    {activeArticle.tags.map(tag => (
                      <span
                        key={tag}
                        onClick={() => {
                          setSearchQuery(tag);
                          setActiveArticleId(null);
                        }}
                        className="px-2.5 py-0.5 rounded bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-[#1E6FD9] cursor-pointer transition-colors font-semibold"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>

                  {/* Rating feedback button matching standard Help Centers */}
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-400 text-[10px] uppercase tracking-wider">Was this helpful?</span>
                    {feedbackSubmitted[activeArticle.id] ? (
                      <span className="text-[10px] font-black text-blue-850 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded flex items-center gap-1">
                        <Check className="h-3 w-3 stroke-[3]" /> Feedback saved!
                      </span>
                    ) : (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleFeedback(activeArticle.id, 'helpful')}
                          className="px-2.5 py-1 rounded border border-slate-205 text-slate-600 hover:bg-blue-50 hover:text-[#1E6FD9] hover:border-blue-250 text-[10px] font-extrabold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <ThumbsUp className="h-3 w-3" /> Yes
                        </button>
                        <button
                          onClick={() => handleFeedback(activeArticle.id, 'unhelpful')}
                          className="px-2.5 py-1 rounded border border-slate-205 text-slate-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-250 text-[10px] font-extrabold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <ThumbsDown className="h-3 w-3" /> No
                        </button>
                      </div>
                    )}
                  </div>

                </div>

                {/* Related matches panel */}
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mt-6">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2.5">
                    Other handbooks in this category
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {KNOWLEDGE_ARTICLES.filter(art => art.category === activeArticle.category && art.id !== activeArticle.id).slice(0, 2).map(r => (
                      <button
                        key={r.id}
                        onClick={() => setActiveArticleId(r.id)}
                        className="p-2.5 rounded bg-white text-left text-slate-700 hover:text-[#1E6FD9] border border-slate-150 flex justify-between items-center text-xs' cursor-pointer text-xs"
                      >
                        <span className="font-bold truncate">{r.title}</span>
                        <ChevronRight className="h-3 w-3 text-slate-400 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            )}

          </div>
        )}

        {/* TAB 2: SYSTEM UPTIME STATUS MONITOR */}
        {activeSubTab === 'status' && (
          <div className="lg:col-span-8 flex flex-col gap-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80">
              
              {/* Uptime Header status */}
              <div className="flex items-center justify-between pb-6 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-black text-slate-800">ProSpaces Live System Status</h3>
                  <p className="text-xs text-slate-400 font-bold block mt-0.5">Real-time status updates for the ProSpaces platform services.</p>
                </div>
                <div className="flex items-center gap-2 bg-blue-50 text-blue-800 px-3 py-1.5 rounded-full border border-blue-100">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-[11px] font-black uppercase tracking-wider">All Systems Operational</span>
                </div>
              </div>

              {/* Server Nodes Grid list */}
              <div className="py-6 space-y-4">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Individual portal servers</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {[
                    { name: 'Core CRM Database Sync', id: 'db', status: 'Optimal', delay: '12ms' },
                    { name: 'Gemini AI Assistant Service', id: 'ai', status: 'Optimal', delay: '74ms' },
                    { name: 'Customer Client Portals API', id: 'portal', status: 'Optimal', delay: '20ms' },
                    { name: '3D Deck & Kitchen Planners Engine', id: 'planners', status: 'Optimal', delay: '38ms' },
                    { name: 'Branded Estimates & PDF Compiler', id: 'pdf', status: 'Optimal', delay: '41ms' },
                    { name: 'Mail Dispatcher Notification Node', id: 'mail', status: 'Optimal', delay: '19ms' }
                  ].map(node => (
                    <div key={node.id} className="p-4 bg-slate-50 border border-slate-200/70 rounded-xl flex items-center justify-between shadow-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                          <Activity className="h-4 w-4" />
                        </div>
                        <div>
                          <span className="text-xs font-black text-slate-700 block">{node.name}</span>
                          <span className="text-[9px] text-slate-400 font-mono tracking-wide">Ping response: {node.delay}</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-extrabold text-blue-800 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded">
                        {node.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Incidents tracking log */}
              <div className="border-t border-slate-100 pt-6">
                <h4 className="text-[10px] font-black uppercase text-slate-450 tracking-wider mb-3">Historic Uptime Record (Last 90 days)</h4>
                
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col gap-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-bold">Overall Average SLA</span>
                    <span className="font-extrabold text-[#1E6FD9]">99.982%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden flex gap-0.5">
                    {Array.from({ length: 45 }).map((_, i) => (
                      <div key={i} className="flex-1 h-full bg-blue-500" title={`Day -${45 - i}: 100% operational`} />
                    ))}
                  </div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider text-center block mt-1">
                    No system degradation incidents reported in past months.
                  </span>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 3: CONTACT SUPPORT / SUBMIT TAPE FORM */}
        {activeSubTab === 'contact' && (
          <div className="lg:col-span-8 flex flex-col gap-6">
            <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-[#E2E8F0]">
              
              {/* Support submission header */}
              <div className="pb-6 border-b border-slate-100">
                <h3 className="text-base font-black text-slate-800">Submit a Support Ticket</h3>
                <p className="text-xs text-slate-400 font-bold block mt-1 leading-relaxed">
                  Have a direct question about CRM settings, bulk uploading lumber products, custom domains, or team seat overrides? Contact our helpful tech specialists.
                </p>
              </div>

              {ticketSubmitted ? (
                /* Success Ticketing animations */
                <motion.div 
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="py-12 flex flex-col items-center justify-center text-center max-w-sm mx-auto"
                >
                  <div className="h-14 w-14 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xl mb-4 shadow-sm">
                    ✓
                  </div>
                  <h4 className="text-sm font-extrabold text-slate-800">Support ticket compiled successfully!</h4>
                  <p className="text-xs text-slate-405 mt-2 leading-relaxed">
                    We&#39;ve registered your ticket category under <span className="font-bold text-slate-650">#{ticketCategory}</span>. A specialized help desks administrator will connect with you under 2 commercial hours.
                  </p>
                  <button 
                    onClick={() => setTicketSubmitted(false)}
                    className="mt-6 px-4 py-2 bg-[#1E6FD9] hover:bg-[#1154A8] text-white text-xs font-extrabold rounded-lg transition-colors cursor-pointer"
                  >
                    Send Another Ticket
                  </button>
                </motion.div>
              ) : (
                /* Submitting Ticket Form layout */
                <form onSubmit={handleTicketSubmit} className="py-6 space-y-4">
                  
                  {/* Subject Line */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider block">Subject Topic</label>
                    <input 
                      type="text"
                      required
                      placeholder="e.g. Setting up custom contact domain subdomain routing"
                      value={ticketSubject}
                      onChange={(e) => setTicketSubject(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-205 rounded-lg text-xs font-bold focus:outline-none focus:border-blue-600 focus:bg-white text-slate-800 placeholder:text-slate-400"
                    />
                  </div>

                  {/* Urgency Classification details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider block">Department Category</label>
                      <select 
                        value={ticketCategory}
                        onChange={(e) => setTicketCategory(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-205 rounded-lg text-xs font-bold focus:outline-none focus:border-blue-600 focus:bg-white text-slate-700"
                      >
                        <option value="Initial CRM Setups">Initial CRM Setups</option>
                        <option value="Billing & Pricing">Billing &amp; Pricing</option>
                        <option value="Custom API Integrations">Custom API Integrations</option>
                        <option value="3D Deck/Kitchen Planners">3D Deck/Kitchen Planners</option>
                        <option value="General Info">General Info</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider block font-sans font-black">Corporate Urgency</label>
                      <select 
                        defaultValue="Normal Response"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-205 rounded-lg text-xs font-bold focus:outline-none focus:border-blue-600 focus:bg-white text-slate-700"
                      >
                        <option value="Low: General Questions">Low: General Questions</option>
                        <option value="Normal Response">Normal: Under 2 Hours</option>
                        <option value="High: Blocking Issues">High: Direct Incident Callback</option>
                      </select>
                    </div>
                  </div>

                  {/* Body description */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider block">Detailed description of the issue</label>
                    <textarea 
                      required
                      placeholder="Please delineate step-by-step what occurred or list the spec features you require guidance with..."
                      rows={5}
                      value={ticketDescription}
                      onChange={(e) => setTicketDescription(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-205 rounded-lg text-xs font-bold focus:outline-none focus:border-blue-600 focus:bg-white text-slate-800 placeholder:text-slate-400"
                    />
                  </div>

                  {/* Action submit buttons */}
                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-[#1E6FD9] hover:bg-[#1154A8] text-white font-extrabold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                    >
                      <Send className="h-3.5 w-3.5" /> Submit Support Ticket
                    </button>
                  </div>

                </form>
              )}

            </div>
          </div>
        )}

        {/* ── 4. RIGHT COLUMN (4 cols): AI SUPPORT BOT SIDEBAR PANEL ── */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* ProSpaces Support AI Agent panel (Stays responsive right) */}
          <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-blue-950 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden flex flex-col max-h-[520px]">
            {/* Soft Ambient glowing light in corners */}
            <div className="absolute right-0 top-0 w-24 h-24 bg-blue-500/10 rounded-full blur-xl pointer-events-none" />
            
            <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-3 shrink-0">
              <div className="h-7 w-7 rounded bg-blue-600 flex items-center justify-center">
                <Sparkles className="h-3.5 w-3.5 text-cyan-330 fill-cyan-300 animate-pulse" />
              </div>
              <div>
                <h3 className="text-xs font-black tracking-tight font-sans">ProSpaces AI virtual Agent</h3>
                <span className="text-[9px] text-blue-300 font-extrabold flex items-center gap-1 mt-0.5">
                  <span className="w-1 h-1 rounded-full bg-blue-400 animate-pulse" /> Direct Document Searcher
                </span>
              </div>
            </div>

            {/* Simulated support logs lists */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-1 max-h-[290px] min-h-[190px] scrollbar-thin">
              {assistantMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col max-w-[85%] rounded xl:rounded-xl p-2.5 text-xs font-sans leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-[#1E6FD9] text-white self-end ml-auto rounded-tr-none font-bold'
                      : 'bg-white/15 text-slate-100 self-start mr-auto rounded-tl-none font-medium'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>
              ))}

              {isAssistantTyping && (
                <div className="bg-white/10 text-slate-200 self-start rounded-xl rounded-tl-none p-2.5 max-w-[45%] mr-auto text-xs flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.18s]" />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.36s]" />
                </div>
              )}
            </div>

            {/* Input Submission helper bar */}
            <form onSubmit={handleAssistantSubmit} className="mt-4 flex items-center gap-1.5 border-t border-white/10 pt-3 shrink-0">
              <input
                type="text"
                placeholder="Ask bot about estimates..."
                value={assistantInput}
                onChange={(e) => setAssistantInput(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 text-xs rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 placeholder:text-slate-500 font-semibold"
              />
              <button
                type="submit"
                disabled={!assistantInput.trim() || isAssistantTyping}
                className="p-2 rounded-lg bg-blue-600/90 border border-blue-500 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors cursor-pointer flex items-center justify-center shrink-0"
              >
                <Send className="h-3 w-3 stroke-[3.5]" />
              </button>
            </form>
          </div>

          {/* Quick Support channels */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col text-slate-800">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1 mb-2">
              <MessageSquare className="h-3.5 w-3.5 text-blue-650" />
              Direct Contacts Channel
            </h3>
            <p className="text-[11px] text-slate-400 font-semibold mb-4 leading-relaxed">
              If your request needs structural layout consultation, scheduling a screen-share session is often the fastest route.
            </p>

            <div className="space-y-2 text-xs font-black text-slate-700">
              <a
                href="mailto:support@prospaces.com"
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-slate-205 hover:bg-slate-50 transition-colors bg-white cursor-pointer"
              >
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                <span>support@prospaces.com</span>
              </a>
              <button
                onClick={() => setActiveSubTab('contact')}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-slate-205 text-slate-700 hover:bg-slate-50 transition-colors bg-white cursor-pointer"
              >
                <Video className="h-3.5 w-3.5 text-slate-400" />
                <span>Schedule live Zoom demo</span>
              </button>
            </div>
            <span className="text-[9px] text-slate-450 text-center font-bold italic mt-2.5 block">
              Global Support: Mon–Fri, 9am–5pm PST
            </span>
          </div>

        </div>

      </main>
    </div>
  );
}
