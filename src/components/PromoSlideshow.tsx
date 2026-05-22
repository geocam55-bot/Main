import React, { useState, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { Play, Pause, ChevronRight, ChevronLeft, X, ArrowRight, DollarSign, TrendingUp, Briefcase, Activity, User, MessageSquare, FileText, Calendar, PieChart, HardDrive, Megaphone, PenTool, Folder, Plus, Search, MoreHorizontal, Mail, Shield, Filter, Upload, Download, LayoutGrid, Clock } from 'lucide-react';
import { MetricCard } from './MetricCard';
import { DealsKanban } from './DealsKanban';
import { Logo } from './Logo';

import { Kitchen3DRenderer } from './kitchen/Kitchen3DRenderer';
import { Deck3DRenderer } from './deck/Deck3DRenderer';
import { Garage3DRenderer } from './garage/Garage3DRenderer';

// --- MOCK DATA FOR SCREENS ---
const mockQuotes: any[] = [
  { id: '1', title: 'Smith Kitchen Remodel', status: 'sent', total: 24500, contactName: 'John Smith', createdAt: new Date().toISOString() },
  { id: '2', title: 'Johnson Deck Addition', status: 'accepted', total: 8200, contactName: 'Alice Johnson', createdAt: new Date().toISOString() },
  { id: '3', title: 'Williams Garage', status: 'draft', total: 42000, contactName: 'Robert Williams', createdAt: new Date().toISOString() },
  { id: '4', title: 'Davis Roof', status: 'completed', total: 12400, contactName: 'Mary Davis', createdAt: new Date().toISOString() },
];

const mockKitchenConfig: any = {
  roomWidth: 12, roomLength: 14, roomHeight: 8, layoutStyle: 'L-shape',
  cabinets: [
    { id: '1', type: 'base', width: 36, depth: 24, height: 34.5, x: 24, y: 0, rotation: 0, wall: 'north' }
  ], 
  appliances: [], countertops: [],
  cabinetFinish: 'Oak', countertopMaterial: 'Granite',
  hasIsland: true, hasPantry: false, hasBacksplash: false,
  gridSize: 12, showGrid: true, viewMode: '3D', unit: 'feet'
};

const mockDeckConfig: any = {
  width: 16, length: 20, height: 3, shape: 'rectangle',
  hasStairs: true, stairSide: 'front', railingSides: ['left', 'right', 'front'],
  railingStyle: 'Treated', deckingPattern: 'perpendicular', joistSpacing: 16,
  deckingType: 'Composite', unit: 'feet'
};

const mockGarageConfig: any = {
  width: 24, length: 24, height: 10,
  bays: 2, roofStyle: 'gable', roofPitch: 6, wallFraming: '2x4',
  doors: [
    { id: '1', type: 'overhead', width: 9, height: 8, position: 'front', offsetFromLeft: 2 },
    { id: '2', type: 'overhead', width: 9, height: 8, position: 'front', offsetFromLeft: 13 }
  ],
  windows: [], hasWalkDoor: true, walkDoorPosition: 'side',
  sidingType: 'vinyl', roofingMaterial: 'asphalt-shingle',
  hasAtticTrusses: false, isInsulated: false, hasElectrical: false, unit: 'feet'
};

// --- ACTUAL CRM UI COMPONENTS SCALED ---

const NotesMock = () => (
  <div className="w-full h-full flex flex-col p-8 bg-muted relative z-10">
    <div className="flex justify-between items-center mb-8 shrink-0">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Notes & Logs</h2>
        <p className="text-muted-foreground text-lg mt-1">Manage project notes and customer interactions</p>
      </div>
      <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-colors">
        <Plus className="w-5 h-5" /> Add Note
      </button>
    </div>
    <div className="flex-1 grid grid-cols-3 gap-6 overflow-hidden">
      {[
        { title: 'Kitchen Remodel Sync', date: 'Oct 24, 2023', content: 'Customer wants to change the countertop material from Quartz to Granite. Need to update the quote by tomorrow.', tag: 'important' },
        { title: 'Deck Measurements', date: 'Oct 22, 2023', content: 'Site visit completed. The yard has a slight slope, might need longer posts for the far end. Photos uploaded to Docs.', tag: 'site-visit' },
        { title: 'Supplier Call', date: 'Oct 20, 2023', content: 'Lumber delivery is delayed by 2 days due to weather. Will notify the framing crew.', tag: 'general' },
        { title: 'Initial Consultation', date: 'Oct 18, 2023', content: 'Discussed budget and timeline. They are looking to start within 3 weeks. Prefers Trex composite.', tag: 'sales' },
        { title: 'Permit Status', date: 'Oct 15, 2023', content: 'City approved the garage plans. Sent email to client. Ready to schedule the foundation pour.', tag: 'admin' },
      ].map((note, i) => (
        <div key={i} className="bg-background p-6 rounded-xl border border-border shadow-sm flex flex-col gap-4 hover:shadow-md transition-shadow h-64">
          <div className="flex justify-between items-start">
            <h3 className="font-bold text-xl text-foreground line-clamp-1">{note.title}</h3>
            <button><MoreHorizontal className="w-5 h-5 text-muted-foreground" /></button>
          </div>
          <p className="text-muted-foreground flex-1 line-clamp-4 leading-relaxed">{note.content}</p>
          <div className="flex justify-between items-center mt-auto pt-4 border-t border-border">
            <span className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Clock className="w-4 h-4"/> {note.date}</span>
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              note.tag === 'important' ? 'bg-red-100 text-red-700' :
              note.tag === 'site-visit' ? 'bg-amber-100 text-amber-700' :
              note.tag === 'sales' ? 'bg-emerald-100 text-emerald-700' :
              'bg-muted text-muted-foreground'
            }`}>{note.tag}</span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const DocsMock = () => (
  <div className="w-full h-full flex flex-col p-8 bg-muted relative z-10">
    <div className="flex justify-between items-center mb-8 shrink-0">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Document Storage</h2>
        <p className="text-muted-foreground text-lg mt-1">12.4 GB used of 50 GB limit</p>
      </div>
      <div className="flex gap-4">
        <div className="relative">
          <Search className="w-5 h-5 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2" />
          <input type="text" placeholder="Search files..." className="pl-12 pr-4 py-3 bg-background border border-border rounded-lg w-64 focus:outline-blue-500" />
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-colors">
          <Upload className="w-5 h-5" /> Upload Files
        </button>
      </div>
    </div>
    
    <h3 className="text-xl font-bold text-foreground mb-4 shrink-0">Recent Folders</h3>
    <div className="grid grid-cols-4 gap-6 mb-8 shrink-0">
      {['Permits & Approvals', 'Client Contracts', 'Site Photos', 'Supplier Invoices'].map((f, i) => (
        <div key={i} className="bg-background p-5 rounded-xl border border-border flex items-center gap-4 cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all">
          <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center text-blue-500">
            <Folder className="w-6 h-6 fill-current opacity-80" />
          </div>
          <div>
            <div className="font-bold text-foreground">{f}</div>
            <div className="text-sm text-muted-foreground">{12 + i * 3} items</div>
          </div>
        </div>
      ))}
    </div>

    <div className="flex justify-between items-center mb-4 shrink-0">
      <h3 className="text-xl font-bold text-foreground">All Files</h3>
      <div className="flex gap-2">
        <button className="p-2 bg-background border border-border rounded text-muted-foreground"><LayoutGrid className="w-5 h-5" /></button>
        <button className="p-2 bg-muted border border-border rounded text-foreground"><MoreHorizontal className="w-5 h-5" /></button>
      </div>
    </div>
    
    <div className="flex-1 bg-background border border-border rounded-xl overflow-hidden flex flex-col">
      <div className="grid grid-cols-12 gap-4 p-4 border-b border-border bg-muted font-bold text-muted-foreground uppercase tracking-wider text-sm">
        <div className="col-span-5">Name</div>
        <div className="col-span-2">Modified</div>
        <div className="col-span-2">Size</div>
        <div className="col-span-2">Owner</div>
        <div className="col-span-1 text-right">Actions</div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {[
          { icon: <FileText className="w-5 h-5 text-indigo-500" />, name: 'Smith_Kitchen_Quote_v2.pdf', date: 'Oct 24, 2023', size: '2.4 MB', owner: 'Sarah Jenkins' },
          { icon: <FileText className="w-5 h-5 text-indigo-500" />, name: 'Johnson_Deck_Contract_Signed.pdf', date: 'Oct 23, 2023', size: '1.8 MB', owner: 'Marcus Chen' },
          { icon: <PenTool className="w-5 h-5 text-emerald-500" />, name: 'Site_Plan_Revision_A.dwg', date: 'Oct 21, 2023', size: '15.6 MB', owner: 'David Kim' },
          { icon: <MessageSquare className="w-5 h-5 text-amber-500" />, name: 'Client_Requirements_List.docx', date: 'Oct 20, 2023', size: '45 KB', owner: 'Emily White' },
          { icon: <FileText className="w-5 h-5 text-indigo-500" />, name: 'Building_Permit_Approved.pdf', date: 'Oct 15, 2023', size: '3.1 MB', owner: 'Sarah Jenkins' },
        ].map((file, i) => (
          <div key={i} className="grid grid-cols-12 gap-4 p-4 border-b border-slate-50 hover:bg-muted items-center transition-colors">
            <div className="col-span-5 flex items-center gap-3 font-medium text-foreground">
              {file.icon}
              {file.name}
            </div>
            <div className="col-span-2 text-muted-foreground">{file.date}</div>
            <div className="col-span-2 text-muted-foreground">{file.size}</div>
            <div className="col-span-2 text-foreground flex items-center gap-2">
              <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center text-xs font-bold">{file.owner.split(' ').map(n=>n[0]).join('')}</div>
              {file.owner}
            </div>
            <div className="col-span-1 flex justify-end gap-2">
              <button className="p-1.5 text-muted-foreground hover:text-blue-600"><Download className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const ImportExportMock = () => (
  <div className="w-full h-full flex flex-col p-8 bg-muted relative z-10 items-center">
    <div className="w-full max-w-5xl">
      <div className="mb-10 text-center">
        <h2 className="text-3xl font-bold text-foreground mb-2">Import & Export Data</h2>
        <p className="text-muted-foreground text-lg">Migrate your contacts, inventory, and historical deals seamlessly.</p>
      </div>

      <div className="grid grid-cols-2 gap-8">
        <div className="bg-background p-8 rounded-2xl border border-border shadow-sm flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6">
            <Upload className="w-10 h-10" />
          </div>
          <h3 className="text-2xl font-bold text-foreground mb-2">Import Data</h3>
          <p className="text-muted-foreground mb-8">Upload CSV or Excel files to populate your CRM with existing contacts and products.</p>
          
          <div className="w-full border-2 border-dashed border-border rounded-xl p-8 bg-muted mb-6">
            <div className="text-muted-foreground mb-2"><FileText className="w-8 h-8 mx-auto" /></div>
            <div className="font-medium text-foreground">Drag & drop your files here</div>
            <div className="text-sm text-muted-foreground">or click to browse</div>
          </div>
          
          <button className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors">
            Start Import Process
          </button>
        </div>

        <div className="bg-background p-8 rounded-2xl border border-border shadow-sm flex flex-col">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-6">
              <Download className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-2">Export Data</h3>
            <p className="text-muted-foreground">Download your CRM data for external reporting or backups.</p>
          </div>

          <div className="flex-1 flex flex-col gap-4">
            {['Contacts & Leads', 'Inventory & Materials', 'Quotes & Bids'].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-4 border border-border rounded-xl hover:border-emerald-300 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${i===0?'bg-blue-500':i===1?'bg-purple-500':'bg-amber-500'}`}></div>
                  <span className="font-bold text-foreground">{item}</span>
                </div>
                <button className="text-emerald-600 font-bold text-sm bg-emerald-50 px-4 py-2 rounded-lg hover:bg-emerald-100">
                  Export CSV
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

const ReportsMock = () => (
  <div className="w-full h-full flex flex-col p-8 bg-muted relative z-10">
    <div className="flex justify-between items-center mb-8 shrink-0">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Advanced Reports</h2>
        <p className="text-muted-foreground text-lg mt-1">Analytics for Q4 2023</p>
      </div>
      <div className="flex gap-4">
        <button className="bg-background border border-border text-foreground px-4 py-2 rounded-lg font-bold flex items-center gap-2">
          <Filter className="w-4 h-4" /> This Quarter
        </button>
        <button className="bg-background border border-border text-foreground px-4 py-2 rounded-lg font-bold flex items-center gap-2">
          <Download className="w-4 h-4" /> Export PDF
        </button>
      </div>
    </div>

    <div className="grid grid-cols-4 gap-6 mb-8 shrink-0">
      <div className="bg-background p-6 rounded-xl border border-border shadow-sm">
        <div className="text-muted-foreground font-medium mb-1">Total Revenue</div>
        <div className="text-3xl font-black text-foreground mb-2">$845,200</div>
        <div className="text-sm font-bold text-emerald-600 flex items-center gap-1"><TrendingUp className="w-4 h-4"/> +18.2%</div>
      </div>
      <div className="bg-background p-6 rounded-xl border border-border shadow-sm">
        <div className="text-muted-foreground font-medium mb-1">Deals Closed</div>
        <div className="text-3xl font-black text-foreground mb-2">142</div>
        <div className="text-sm font-bold text-emerald-600 flex items-center gap-1"><TrendingUp className="w-4 h-4"/> +5.4%</div>
      </div>
      <div className="bg-background p-6 rounded-xl border border-border shadow-sm">
        <div className="text-muted-foreground font-medium mb-1">Avg Deal Cycle</div>
        <div className="text-3xl font-black text-foreground mb-2">18 Days</div>
        <div className="text-sm font-bold text-emerald-600 flex items-center gap-1"><TrendingUp className="w-4 h-4"/> -2.1%</div>
      </div>
      <div className="bg-background p-6 rounded-xl border border-border shadow-sm">
        <div className="text-muted-foreground font-medium mb-1">Conversion Rate</div>
        <div className="text-3xl font-black text-foreground mb-2">42.8%</div>
        <div className="text-sm font-bold text-emerald-600 flex items-center gap-1"><TrendingUp className="w-4 h-4"/> +8.9%</div>
      </div>
    </div>

    <div className="flex-1 grid grid-cols-3 gap-6">
      <div className="col-span-2 bg-background p-6 rounded-xl border border-border shadow-sm flex flex-col">
        <h3 className="font-bold text-lg text-foreground mb-6">Revenue Trend</h3>
        <div className="flex-1 flex items-end gap-4">
          {[40, 55, 45, 70, 65, 85, 80, 100, 95, 110, 105, 120].map((h, i) => (
            <div key={i} className="flex-1 bg-blue-100 rounded-t-sm relative group" style={{ height: `${h}%` }}>
              <div className="absolute bottom-0 w-full bg-blue-600 rounded-t-sm transition-all" style={{ height: `${h * 0.8}%` }}></div>
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-4 text-sm font-medium text-muted-foreground border-t border-border pt-4">
          <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span>
        </div>
      </div>
      <div className="col-span-1 bg-background p-6 rounded-xl border border-border shadow-sm flex flex-col">
        <h3 className="font-bold text-lg text-foreground mb-6">Deals by Product</h3>
        <div className="flex-1 flex flex-col gap-6 justify-center">
          {[
            { label: 'Kitchen Remodels', percent: 45, color: 'bg-blue-600' },
            { label: 'Deck Additions', percent: 30, color: 'bg-emerald-500' },
            { label: 'Garages / Sheds', percent: 15, color: 'bg-indigo-500' },
            { label: 'Roofing', percent: 10, color: 'bg-amber-500' },
          ].map((item, i) => (
            <div key={i}>
              <div className="flex justify-between text-sm font-bold text-foreground mb-2">
                <span>{item.label}</span>
                <span>{item.percent}%</span>
              </div>
              <div className="w-full bg-muted h-3 rounded-full overflow-hidden">
                <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.percent}%` }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const MarketingMock = () => (
  <div className="w-full h-full flex flex-col p-8 bg-muted relative z-10">
    <div className="flex justify-between items-center mb-8 shrink-0">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Marketing Campaigns</h2>
        <p className="text-muted-foreground text-lg mt-1">Automated email sequences and broadcasts</p>
      </div>
      <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-colors">
        <Plus className="w-5 h-5" /> New Campaign
      </button>
    </div>

    <div className="flex gap-6 mb-8 shrink-0">
      <div className="flex-1 bg-gradient-to-br from-indigo-600 to-blue-700 p-6 rounded-xl text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 transform translate-x-1/4 -translate-y-1/4">
          <Megaphone className="w-48 h-48" />
        </div>
        <div className="relative z-10">
          <div className="text-blue-100 font-medium mb-1">Active Subscribers</div>
          <div className="text-4xl font-black mb-4">12,450</div>
          <div className="flex gap-4 text-sm font-medium">
            <span className="bg-background/20 px-3 py-1 rounded-full">+450 this month</span>
          </div>
        </div>
      </div>
      <div className="flex-1 bg-background p-6 rounded-xl border border-border shadow-sm flex flex-col justify-center">
        <div className="text-muted-foreground font-medium mb-1">Avg. Open Rate</div>
        <div className="text-4xl font-black text-foreground mb-2">34.2%</div>
        <div className="w-full bg-muted h-2 rounded-full overflow-hidden mt-2">
          <div className="h-full bg-emerald-500 rounded-full w-[34.2%]"></div>
        </div>
      </div>
      <div className="flex-1 bg-background p-6 rounded-xl border border-border shadow-sm flex flex-col justify-center">
        <div className="text-muted-foreground font-medium mb-1">Avg. Click Rate</div>
        <div className="text-4xl font-black text-foreground mb-2">12.8%</div>
        <div className="w-full bg-muted h-2 rounded-full overflow-hidden mt-2">
          <div className="h-full bg-blue-500 rounded-full w-[12.8%]"></div>
        </div>
      </div>
    </div>

    <h3 className="text-xl font-bold text-foreground mb-4 shrink-0">Recent Broadcasts</h3>
    <div className="flex-1 bg-background border border-border rounded-xl overflow-hidden flex flex-col">
      <div className="grid grid-cols-12 gap-4 p-4 border-b border-border bg-muted font-bold text-muted-foreground uppercase tracking-wider text-sm">
        <div className="col-span-4">Campaign Name</div>
        <div className="col-span-2">Status</div>
        <div className="col-span-2">Sent To</div>
        <div className="col-span-2">Open Rate</div>
        <div className="col-span-2 text-right">Actions</div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {[
          { name: 'Fall Decking Promo', status: 'Sent', date: 'Oct 15', sent: '4,200', open: 38, click: 14 },
          { name: 'Monthly Newsletter - Oct', status: 'Sent', date: 'Oct 01', sent: '12,400', open: 32, click: 11 },
          { name: 'Garage Storage Guide', status: 'Draft', date: '-', sent: '-', open: 0, click: 0 },
          { name: 'End of Summer Clearance', status: 'Sent', date: 'Sep 15', sent: '12,100', open: 41, click: 18 },
        ].map((camp, i) => (
          <div key={i} className="grid grid-cols-12 gap-4 p-5 border-b border-slate-50 hover:bg-muted items-center transition-colors">
            <div className="col-span-4">
              <div className="font-bold text-foreground text-lg">{camp.name}</div>
              <div className="text-sm text-muted-foreground">Created: {camp.date}</div>
            </div>
            <div className="col-span-2">
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${camp.status === 'Sent' ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>
                {camp.status}
              </span>
            </div>
            <div className="col-span-2 font-medium text-foreground">{camp.sent}</div>
            <div className="col-span-2">
              {camp.status === 'Sent' ? (
                <div>
                  <div className="font-bold text-foreground">{camp.open}%</div>
                  <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden mt-1">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${camp.open}%` }}></div>
                  </div>
                </div>
              ) : (
                <span className="text-muted-foreground">-</span>
              )}
            </div>
            <div className="col-span-2 flex justify-end gap-2">
              <button className="px-4 py-2 border border-border text-foreground font-bold rounded hover:bg-muted transition-colors">View</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const TeamManagementMock = () => (
  <div className="w-full h-full flex flex-col p-8 bg-muted relative z-10">
    <div className="flex justify-between items-center mb-8 shrink-0">
      <div>
        <h2 className="text-3xl font-bold text-foreground">User Management</h2>
        <p className="text-muted-foreground text-lg mt-1">Manage team access and roles</p>
      </div>
      <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-colors">
        <Plus className="w-5 h-5" /> Add User
      </button>
    </div>
    <div className="flex border-b border-border mb-6 shrink-0">
      <div className="px-6 py-3 border-b-2 border-blue-600 text-blue-600 font-bold">User Management</div>
      <div className="px-6 py-3 text-muted-foreground font-medium">Space Access</div>
      <div className="px-6 py-3 text-muted-foreground font-medium">User Recovery</div>
    </div>
    
    <div className="flex justify-between items-center bg-background p-4 rounded-xl border border-border shadow-sm mb-6 shrink-0">
      <div className="relative w-96">
        <Search className="w-5 h-5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
        <input type="text" placeholder="Search users..." className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-blue-500" />
      </div>
    </div>

    <div className="flex-1 bg-background rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
      <div className="grid grid-cols-12 gap-4 p-4 border-b border-border bg-muted font-bold text-muted-foreground uppercase tracking-wider text-sm">
        <div className="col-span-3">User</div>
        <div className="col-span-3">Email</div>
        <div className="col-span-2">Role</div>
        <div className="col-span-2">Status</div>
        <div className="col-span-2 text-right">Actions</div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {[
          { name: 'Sarah Jenkins', email: 'sarah@prospaces.com', role: 'Admin', status: 'Active', initials: 'SJ', color: 'bg-blue-100 text-blue-700' },
          { name: 'Marcus Chen', email: 'marcus@prospaces.com', role: 'Sales Rep', status: 'Active', initials: 'MC', color: 'bg-indigo-100 text-indigo-700' },
          { name: 'David Kim', email: 'david@prospaces.com', role: 'Sales Rep', status: 'Active', initials: 'DK', color: 'bg-emerald-100 text-emerald-700' },
          { name: 'Emily White', email: 'emily@prospaces.com', role: 'Manager', status: 'Invited', initials: 'EW', color: 'bg-amber-100 text-amber-700' },
          { name: 'James Wilson', email: 'james@prospaces.com', role: 'Sales Rep', status: 'Inactive', initials: 'JW', color: 'bg-muted text-foreground' },
        ].map((user, i) => (
          <div key={i} className="grid grid-cols-12 gap-4 p-4 border-b border-slate-50 hover:bg-muted items-center transition-colors">
            <div className="col-span-3 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border border-white shadow-sm ${user.color}`}>
                {user.initials}
              </div>
              <div className="font-bold text-foreground">{user.name}</div>
            </div>
            <div className="col-span-3 text-muted-foreground">{user.email}</div>
            <div className="col-span-2">
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                user.role === 'Admin' ? 'bg-indigo-100 text-indigo-700' :
                user.role === 'Manager' ? 'bg-blue-100 text-blue-700' :
                'bg-muted text-foreground'
              }`}>{user.role}</span>
            </div>
            <div className="col-span-2">
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                user.status === 'Active' ? 'bg-emerald-100 text-emerald-700' :
                user.status === 'Invited' ? 'bg-amber-100 text-amber-700' :
                'bg-red-100 text-red-700'
              }`}>{user.status}</span>
            </div>
            <div className="col-span-2 flex justify-end">
              <button className="p-2 hover:bg-muted rounded transition-colors"><MoreHorizontal className="w-5 h-5 text-muted-foreground" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const LoginScreen = () => (
  <div className="w-full h-full bg-muted overflow-hidden relative">
    <div className="w-[250%] h-[250%] scale-[0.4] origin-top-left flex items-center justify-center bg-muted p-8 relative">
      
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-3xl bg-background rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-border relative z-10">
        <div className="p-16 flex flex-col items-center border-b border-border bg-slate-900 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20"></div>
          <div className="mb-8 relative z-10">
            <Logo size="xl" className="h-20 w-20" />
          </div>
          <h2 className="text-5xl font-bold mb-4 relative z-10">ProSpaces Identity</h2>
          <p className="text-2xl text-blue-200 relative z-10">Enterprise Secure Access</p>
        </div>
        
        <div className="p-16 flex flex-col gap-8 bg-muted/50">
          <button className="w-full bg-slate-900 text-white font-bold text-2xl py-6 rounded-2xl shadow-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-4">
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
            Sign in with ProSpaces SSO
          </button>

          <div className="flex items-center gap-8 my-4">
            <div className="flex-1 h-[2px] bg-muted"></div>
            <span className="text-muted-foreground font-bold text-lg uppercase tracking-widest">Enterprise Providers</span>
            <div className="flex-1 h-[2px] bg-muted"></div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <button className="flex items-center justify-center gap-4 bg-background border-2 border-border px-8 py-6 rounded-2xl text-xl font-bold text-foreground hover:bg-muted hover:border-border transition-all shadow-sm">
              <svg className="w-7 h-7" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg"><path fill="#f25022" d="M0 0h10v10H0z"/><path fill="#7fba00" d="M11 0h10v10H11z"/><path fill="#00a4ef" d="M0 11h10v10H0z"/><path fill="#ffb900" d="M11 11h10v10H11z"/></svg>
              Microsoft Entra ID
            </button>
            <button className="flex items-center justify-center gap-4 bg-background border-2 border-border px-8 py-6 rounded-2xl text-xl font-bold text-foreground hover:bg-muted hover:border-border transition-all shadow-sm">
              <svg className="w-7 h-7" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/><path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/><path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/><path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/></svg>
              Google Workspace
            </button>
          </div>
          
          <button className="flex items-center justify-center gap-4 bg-background border-2 border-border text-foreground px-8 py-5 rounded-2xl text-xl font-bold hover:bg-muted transition-all shadow-sm w-full mt-2">
            Configure Custom SAML Provider
          </button>
        </div>
      </div>
      
    </div>
  </div>
);

const CalendarScreen = () => {
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');

  useEffect(() => {
    const views: ('month' | 'week' | 'day')[] = ['month', 'week', 'day'];
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % views.length;
      setView(views[idx]);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full h-full bg-muted overflow-hidden relative">
      <div className="w-[250%] h-[250%] scale-[0.4] origin-top-left flex bg-muted">
        
        {/* Sidebar */}
        <div className="w-64 bg-slate-900 text-white flex flex-col shrink-0">
          <div className="p-6 border-b border-slate-800">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Logo size="sm" className="w-8 h-8" />
              ProSpaces
            </h2>
          </div>
          <div className="flex-1 py-6 px-4 flex flex-col gap-2">
            <div className="text-muted-foreground hover:text-white hover:bg-slate-800 px-4 py-3 rounded-lg flex items-center gap-3 transition-colors cursor-pointer">
              <Activity className="w-5 h-5" />
              Dashboard
            </div>
            <div className="bg-blue-600/20 text-blue-400 px-4 py-3 rounded-lg flex items-center gap-3 font-medium">
              <Calendar className="w-5 h-5" />
              Calendar
            </div>
            <div className="text-muted-foreground hover:text-white hover:bg-slate-800 px-4 py-3 rounded-lg flex items-center gap-3 transition-colors cursor-pointer">
              <Briefcase className="w-5 h-5" />
              Deals
            </div>
            <div className="text-muted-foreground hover:text-white hover:bg-slate-800 px-4 py-3 rounded-lg flex items-center gap-3 transition-colors cursor-pointer">
              <User className="w-5 h-5" />
              Contacts
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-h-0 bg-muted relative overflow-hidden">
          {/* Header */}
          <div className="h-24 bg-background border-b border-border flex items-center justify-between px-10 shrink-0 shadow-sm z-10">
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-bold text-foreground">Team Calendar</h1>
              <div className="text-muted-foreground font-medium">Syncing with Outlook & Google Workspace</div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex bg-muted p-1 rounded-xl border border-border">
                <button className={`px-6 py-2 rounded-lg font-bold text-lg transition-colors ${view === 'month' ? 'bg-background shadow-sm text-blue-600' : 'text-muted-foreground hover:text-foreground'}`} onClick={() => setView('month')}>Month</button>
                <button className={`px-6 py-2 rounded-lg font-bold text-lg transition-colors ${view === 'week' ? 'bg-background shadow-sm text-blue-600' : 'text-muted-foreground hover:text-foreground'}`} onClick={() => setView('week')}>Week</button>
                <button className={`px-6 py-2 rounded-lg font-bold text-lg transition-colors ${view === 'day' ? 'bg-background shadow-sm text-blue-600' : 'text-muted-foreground hover:text-foreground'}`} onClick={() => setView('day')}>Day</button>
              </div>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold text-lg flex items-center gap-2 transition-colors shadow-sm">
                + New Meeting
              </button>
            </div>
          </div>

          {/* Calendar Body Area */}
          <div className="flex-1 p-8 overflow-hidden relative flex flex-col">
            <div className="w-full flex-1 bg-background rounded-2xl border border-border shadow-sm flex flex-col overflow-hidden">
              <AnimatePresence mode="wait">
                {view === 'month' && (
                  <motion.div key="month" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.3}} className="flex-1 flex flex-col">
                    <div className="grid grid-cols-7 border-b border-border bg-muted shrink-0">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="py-4 text-center text-lg font-bold text-muted-foreground border-r border-border last:border-r-0">{day}</div>
                      ))}
                    </div>
                    <div className="flex-1 grid grid-cols-7 grid-rows-5">
                      {Array.from({length: 35}).map((_, i) => {
                        const isPrevMonth = i < 3;
                        const date = isPrevMonth ? 28 + i : i - 2;
                        return (
                          <div key={i} className={`border-r border-b border-border p-3 flex flex-col gap-1.5 ${isPrevMonth ? 'bg-muted text-muted-foreground' : 'bg-background text-foreground'}`}>
                            <div className={`font-bold text-lg ${i === 15 ? 'w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center' : ''}`}>{date}</div>
                            {i === 5 && <div className="bg-blue-50 border-l-4 border-blue-500 text-blue-700 text-sm font-bold px-3 py-1.5 rounded-r shadow-sm truncate">Site Visit - Smith</div>}
                            {i === 12 && <div className="bg-indigo-50 border-l-4 border-indigo-500 text-indigo-700 text-sm font-bold px-3 py-1.5 rounded-r shadow-sm truncate">Outlook Sync</div>}
                            {i === 15 && <div className="bg-emerald-50 border-l-4 border-emerald-500 text-emerald-700 text-sm font-bold px-3 py-1.5 rounded-r shadow-sm truncate mb-1">Kitchen Install</div>}
                            {i === 15 && <div className="bg-blue-50 border-l-4 border-blue-500 text-blue-700 text-sm font-bold px-3 py-1.5 rounded-r shadow-sm truncate">Sales Team (Google Meet)</div>}
                            {i === 18 && <div className="bg-amber-50 border-l-4 border-amber-500 text-amber-700 text-sm font-bold px-3 py-1.5 rounded-r shadow-sm truncate">Follow up call</div>}
                            {i === 22 && <div className="bg-blue-50 border-l-4 border-blue-500 text-blue-700 text-sm font-bold px-3 py-1.5 rounded-r shadow-sm truncate">Supplier Meeting</div>}
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
                {view === 'week' && (
                  <motion.div key="week" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.3}} className="flex-1 flex flex-col">
                    <div className="flex border-b border-border bg-muted shrink-0">
                      <div className="w-24 border-r border-border"></div>
                      <div className="flex-1 grid grid-cols-7">
                        {['Sun 12', 'Mon 13', 'Tue 14', 'Wed 15', 'Thu 16', 'Fri 17', 'Sat 18'].map((day, i) => (
                          <div key={day} className={`py-4 text-center border-r border-border last:border-r-0 ${i === 3 ? 'text-blue-600' : 'text-muted-foreground'}`}>
                            <div className="text-sm font-bold uppercase tracking-wide">{day.split(' ')[0]}</div>
                            <div className={`text-2xl font-bold mt-1 ${i === 3 ? 'w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto' : ''}`}>{day.split(' ')[1]}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex-1 flex overflow-hidden">
                      <div className="w-24 border-r border-border flex flex-col shrink-0 overflow-hidden">
                        {Array.from({length: 10}).map((_, i) => (
                          <div key={i} className="flex-1 border-b border-border text-sm text-muted-foreground font-bold text-right pr-4 pt-3">{i + 8}:00 AM</div>
                        ))}
                      </div>
                      <div className="flex-1 grid grid-cols-7 relative">
                        {Array.from({length: 7}).map((_, i) => (
                          <div key={i} className="border-r border-border last:border-r-0 relative">
                            {Array.from({length: 10}).map((_, j) => (
                              <div key={j} className="h-[10%] border-b border-border"></div>
                            ))}
                          </div>
                        ))}
                        {/* Event blocks overlaying the grid */}
                        <div className="absolute top-[10%] left-[14.28%] w-[14.28%] h-[15%] p-1">
                          <div className="w-full h-full bg-blue-50 border-l-4 border-blue-500 rounded-r shadow-sm p-2 overflow-hidden">
                            <div className="font-bold text-blue-800 text-sm truncate">Team Standup</div>
                            <div className="text-blue-600 text-xs mt-1">9:00 - 10:30 AM</div>
                          </div>
                        </div>
                        <div className="absolute top-[30%] left-[42.84%] w-[14.28%] h-[20%] p-1">
                          <div className="w-full h-full bg-indigo-50 border-l-4 border-indigo-500 rounded-r shadow-sm p-2 overflow-hidden">
                            <div className="font-bold text-indigo-800 text-sm truncate">Client Pres.</div>
                            <div className="text-indigo-600 text-xs mt-1">11:00 - 1:00 PM</div>
                            <div className="text-indigo-700 text-xs font-semibold mt-1 bg-indigo-100 inline-block px-1.5 py-0.5 rounded">Google Meet</div>
                          </div>
                        </div>
                        <div className="absolute top-[60%] left-[57.12%] w-[14.28%] h-[10%] p-1">
                          <div className="w-full h-full bg-emerald-50 border-l-4 border-emerald-500 rounded-r shadow-sm p-2 overflow-hidden">
                            <div className="font-bold text-emerald-800 text-sm truncate">Site Inspection</div>
                            <div className="text-emerald-600 text-xs mt-1">2:00 - 3:00 PM</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
                {view === 'day' && (
                  <motion.div key="day" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.3}} className="flex-1 flex flex-col overflow-hidden bg-background">
                    <div className="h-20 border-b border-border bg-muted flex items-center px-8 shrink-0">
                      <h2 className="text-3xl font-bold text-foreground">Wednesday, October 15th</h2>
                    </div>
                    <div className="flex-1 flex overflow-hidden">
                      <div className="w-32 border-r border-border flex flex-col shrink-0 bg-muted/50">
                        {Array.from({length: 10}).map((_, i) => (
                          <div key={i} className="flex-1 border-b border-border text-lg text-muted-foreground font-bold text-right pr-6 pt-4">{i + 8}:00 AM</div>
                        ))}
                      </div>
                      <div className="flex-1 relative">
                        {Array.from({length: 10}).map((_, j) => (
                          <div key={j} className="h-[10%] border-b border-border"></div>
                        ))}
                        <div className="absolute top-[10%] left-6 right-6 h-[15%] bg-blue-50 border-l-8 border-blue-500 rounded-r shadow-sm p-6 flex flex-col justify-center transition-transform hover:scale-[1.01] cursor-pointer">
                          <div className="text-blue-800 font-bold text-2xl mb-2 flex items-center gap-3">
                            Sales Sync <span className="bg-blue-100 text-blue-700 text-sm px-3 py-1 rounded-full border border-blue-200">Outlook</span>
                          </div>
                          <div className="text-blue-600 text-lg font-medium">9:00 AM - 10:30 AM • Microsoft Teams</div>
                        </div>
                        <div className="absolute top-[30%] left-6 right-6 h-[20%] bg-indigo-50 border-l-8 border-indigo-500 rounded-r shadow-sm p-6 flex flex-col justify-center transition-transform hover:scale-[1.01] cursor-pointer">
                          <div className="text-indigo-800 font-bold text-2xl mb-2 flex items-center gap-3">
                            Client Presentation <span className="bg-indigo-100 text-indigo-700 text-sm px-3 py-1 rounded-full border border-indigo-200">Google Workspace</span>
                          </div>
                          <div className="text-indigo-600 text-lg font-medium mb-3">11:00 AM - 1:00 PM • Google Meet</div>
                          <div className="text-indigo-700 text-lg font-bold flex items-center gap-2 bg-indigo-100/50 w-fit px-4 py-2 rounded-lg">
                            <User className="w-5 h-5"/> 4 Attendees accepted
                          </div>
                        </div>
                        <div className="absolute top-[60%] left-6 right-6 h-[10%] bg-emerald-50 border-l-8 border-emerald-500 rounded-r shadow-sm p-6 flex flex-col justify-center transition-transform hover:scale-[1.01] cursor-pointer">
                          <div className="text-emerald-800 font-bold text-2xl mb-2 flex items-center gap-3">
                            On-site Delivery Coordination <span className="bg-emerald-100 text-emerald-700 text-sm px-3 py-1 rounded-full border border-emerald-200">ProSpaces CRM</span>
                          </div>
                          <div className="text-emerald-600 text-lg font-medium">2:00 PM - 3:00 PM • 123 Main St</div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

const FeaturesScreen = () => {
  const [activeTab, setActiveTab] = useState<'notes' | 'documents' | 'import' | 'reports' | 'marketing'>('notes');

  useEffect(() => {
    const tabs: ('notes' | 'documents' | 'import' | 'reports' | 'marketing')[] = ['notes', 'documents', 'import', 'reports', 'marketing'];
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % tabs.length;
      setActiveTab(tabs[idx]);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const featureData = {
    notes: {
      title: 'Notes & Logs',
      icon: <PenTool className="w-5 h-5" />,
      component: <NotesMock />
    },
    documents: {
      title: 'Document Storage',
      icon: <Folder className="w-5 h-5" />,
      component: <DocsMock />
    },
    import: {
      title: 'Import & Export',
      icon: <HardDrive className="w-5 h-5" />,
      component: <ImportExportMock />
    },
    reports: {
      title: 'Advanced Reports',
      icon: <PieChart className="w-5 h-5" />,
      component: <ReportsMock />
    },
    marketing: {
      title: 'Marketing Campaigns',
      icon: <Megaphone className="w-5 h-5" />,
      component: <MarketingMock />
    }
  };

  return (
    <div className="w-full h-full bg-muted overflow-hidden relative">
      <div className="w-[250%] h-[250%] scale-[0.4] origin-top-left flex bg-muted">
        
        {/* Sidebar */}
        <div className="w-64 bg-slate-900 text-white flex flex-col shrink-0 border-r border-slate-800">
          <div className="p-6 border-b border-slate-800">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Logo size="sm" className="w-8 h-8" />
              ProSpaces
            </h2>
          </div>
          <div className="flex-1 py-6 px-4 flex flex-col gap-3">
            <div className="text-muted-foreground font-bold text-xs uppercase tracking-widest px-4 mb-2">Modules</div>
            {(Object.keys(featureData) as Array<keyof typeof featureData>).map((key) => (
              <div 
                key={key}
                className={`px-4 py-3 rounded-lg flex items-center gap-3 font-medium transition-all ${
                  activeTab === key 
                    ? 'bg-blue-600 text-white shadow-md scale-105' 
                    : 'text-muted-foreground hover:text-white hover:bg-slate-800'
                }`}
              >
                {featureData[key].icon}
                {featureData[key].title}
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col h-full overflow-hidden w-full relative bg-background">
          <div className="h-20 shrink-0 bg-background border-b border-border flex items-center justify-between px-8 z-10">
            <div className="flex items-center gap-4">
              {featureData[activeTab].icon}
              <h1 className="text-3xl font-bold text-foreground">{featureData[activeTab].title}</h1>
            </div>
            <div className="px-4 py-2 bg-blue-50 text-blue-700 font-bold rounded-lg border border-blue-200">
              ProSpaces CRM Suite
            </div>
          </div>
          
          <div className="flex-1 p-8 relative overflow-hidden bg-muted flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 1.05, y: -20 }}
                transition={{ duration: 0.4 }}
                className="w-full h-full max-w-5xl rounded-2xl overflow-hidden shadow-2xl border-4 border-white relative bg-background"
              >
                {featureData[activeTab].component}
                {/* Overlay gradient for a more 'app' look */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/10 to-transparent pointer-events-none"></div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

const TeamDashboardScreen = () => {
  const [view, setView] = useState<'overview' | 'team' | 'deals'>('overview');

  useEffect(() => {
    const views: ('overview' | 'team' | 'deals')[] = ['overview', 'team', 'deals'];
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % views.length;
      setView(views[idx]);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full h-full bg-muted overflow-hidden relative">
      <div className="w-[250%] h-[250%] scale-[0.4] origin-top-left flex bg-muted">
        
        {/* Sidebar */}
        <div className="w-64 bg-slate-900 text-white flex flex-col shrink-0">
          <div className="p-6 border-b border-slate-800">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Logo size="sm" className="w-8 h-8" />
              ProSpaces
            </h2>
          </div>
          <div className="flex-1 py-6 px-4 flex flex-col gap-2">
            <div className={`px-4 py-3 rounded-lg flex items-center gap-3 font-medium transition-colors ${view === 'overview' ? 'bg-blue-600/20 text-blue-400' : 'text-muted-foreground hover:text-white hover:bg-slate-800'}`}>
              <Activity className="w-5 h-5" />
              Overview
            </div>
            <div className={`px-4 py-3 rounded-lg flex items-center gap-3 font-medium transition-colors ${view === 'team' ? 'bg-blue-600/20 text-blue-400' : 'text-muted-foreground hover:text-white hover:bg-slate-800'}`}>
              <User className="w-5 h-5" />
              Team
            </div>
            <div className={`px-4 py-3 rounded-lg flex items-center gap-3 font-medium transition-colors ${view === 'deals' ? 'bg-blue-600/20 text-blue-400' : 'text-muted-foreground hover:text-white hover:bg-slate-800'}`}>
              <Briefcase className="w-5 h-5" />
              Deals
            </div>
            <div className="text-muted-foreground hover:text-white hover:bg-slate-800 px-4 py-3 rounded-lg flex items-center gap-3 transition-colors cursor-pointer mt-4">
              <FileText className="w-5 h-5" />
              Quotes
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col h-full overflow-hidden w-full relative">
          {/* Header */}
          <div className="h-20 shrink-0 bg-background border-b border-border flex items-center justify-between px-8 z-10 relative">
            <h1 className="text-2xl font-bold text-foreground capitalize">{view}</h1>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-100 text-blue-700 font-bold rounded-full flex items-center justify-center border-2 border-white shadow-sm overflow-hidden">
                SJ
              </div>
            </div>
          </div>

          <div className="flex-1 relative overflow-hidden bg-muted">
            <AnimatePresence mode="wait">
              {view === 'overview' && (
                <motion.div key="overview" initial={{opacity:0, y: 10}} animate={{opacity:1, y: 0}} exit={{opacity:0, y: -10}} className="absolute inset-0 p-8 flex flex-col gap-8">
                  {/* Top Metrics */}
                  <div className="grid grid-cols-4 gap-6 shrink-0 w-full">
                    <div className="bg-background rounded-xl border border-border p-6 shadow-sm flex flex-col justify-center">
                      <div className="flex items-center gap-3 text-muted-foreground mb-2">
                        <DollarSign className="w-5 h-5" />
                        <span className="font-semibold text-sm">Total Pipeline</span>
                      </div>
                      <div className="text-3xl font-black text-foreground">$1.2M</div>
                      <div className="text-sm font-medium text-green-600 mt-2 flex items-center gap-1">
                        <TrendingUp className="w-4 h-4" /> 12% from last month
                      </div>
                    </div>
                    <div className="bg-background rounded-xl border border-border p-6 shadow-sm flex flex-col justify-center">
                      <div className="flex items-center gap-3 text-muted-foreground mb-2">
                        <Activity className="w-5 h-5" />
                        <span className="font-semibold text-sm">Win Rate</span>
                      </div>
                      <div className="text-3xl font-black text-foreground">68%</div>
                      <div className="text-sm font-medium text-green-600 mt-2 flex items-center gap-1">
                        <TrendingUp className="w-4 h-4" /> 5% from last month
                      </div>
                    </div>
                    <div className="bg-background rounded-xl border border-border p-6 shadow-sm flex flex-col justify-center">
                      <div className="flex items-center gap-3 text-muted-foreground mb-2">
                        <Briefcase className="w-5 h-5" />
                        <span className="font-semibold text-sm">Open Deals</span>
                      </div>
                      <div className="text-3xl font-black text-foreground">42</div>
                    </div>
                    <div className="bg-background rounded-xl border border-border p-6 shadow-sm flex flex-col justify-center">
                      <div className="flex items-center gap-3 text-muted-foreground mb-2">
                        <TrendingUp className="w-5 h-5" />
                        <span className="font-semibold text-sm">Avg Deal Size</span>
                      </div>
                      <div className="text-3xl font-black text-foreground">$28.5k</div>
                      <div className="text-sm font-medium text-green-600 mt-2 flex items-center gap-1">
                        <TrendingUp className="w-4 h-4" /> 2% from last month
                      </div>
                    </div>
                  </div>

                  {/* Bottom Area */}
                  <div className="flex-1 grid grid-cols-3 gap-6 overflow-hidden w-full">
                    <div className="col-span-2 bg-background rounded-xl border border-border p-6 shadow-sm flex flex-col">
                      <h3 className="text-lg font-bold text-foreground mb-6 shrink-0">Revenue Overview</h3>
                      <div className="flex-1 bg-muted border border-border rounded-lg flex items-end p-4 gap-4">
                        {/* Mock Chart Bars */}
                        {[40, 60, 45, 80, 50, 90, 75, 100].map((h, i) => (
                          <div key={i} className="flex-1 bg-blue-100 rounded-t-sm relative group hover:bg-blue-200 transition-colors" style={{ height: `${h}%` }}>
                            <div className="absolute bottom-0 w-full bg-blue-600 rounded-t-sm" style={{ height: `${h * 0.7}%` }}></div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Recent Activity */}
                    <div className="bg-background rounded-xl border border-border p-6 shadow-sm flex flex-col">
                      <h3 className="text-lg font-bold text-foreground mb-6 shrink-0">Recent Activity</h3>
                      <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-6">
                        <div className="flex gap-4">
                          <div className="w-2 h-2 mt-2 rounded-full bg-blue-600 shrink-0 relative">
                            <div className="absolute top-4 left-1/2 -ml-[1px] w-[2px] h-12 bg-muted"></div>
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-foreground">Quote Accepted: Smith Kitchen</div>
                            <div className="text-xs text-muted-foreground">2 hours ago</div>
                          </div>
                        </div>
                        <div className="flex gap-4">
                          <div className="w-2 h-2 mt-2 rounded-full bg-indigo-500 shrink-0 relative">
                            <div className="absolute top-4 left-1/2 -ml-[1px] w-[2px] h-12 bg-muted"></div>
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-foreground">New Deal Created: Johnson Deck</div>
                            <div className="text-xs text-muted-foreground">5 hours ago</div>
                          </div>
                        </div>
                        <div className="flex gap-4">
                          <div className="w-2 h-2 mt-2 rounded-full bg-emerald-500 shrink-0 relative">
                            <div className="absolute top-4 left-1/2 -ml-[1px] w-[2px] h-12 bg-muted"></div>
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-foreground">Contract Signed: Williams Garage</div>
                            <div className="text-xs text-muted-foreground">Yesterday</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {view === 'team' && (
                <motion.div key="team" initial={{opacity:0, y: 10}} animate={{opacity:1, y: 0}} exit={{opacity:0, y: -10}} className="absolute inset-0">
                  <TeamManagementMock />
                </motion.div>
              )}

              {view === 'deals' && (
                <motion.div key="deals" initial={{opacity:0, y: 10}} animate={{opacity:1, y: 0}} exit={{opacity:0, y: -10}} className="absolute inset-0 p-8 flex flex-col bg-background">
                  <DealsKanban 
                    quotes={mockQuotes} 
                    onStatusChange={() => {}} 
                    onEdit={() => {}} 
                    onPreview={() => {}} 
                    onDelete={() => {}} 
                    onEmail={() => {}} 
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

const DashboardScreen = () => (
  <div className="w-full h-full bg-muted overflow-hidden relative">
    <div className="w-[250%] h-[250%] scale-[0.4] origin-top-left flex bg-muted">
      
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 text-white flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-800">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Logo size="sm" className="w-8 h-8" />
            ProSpaces
          </h2>
        </div>
        <div className="flex-1 py-6 px-4 flex flex-col gap-2">
          <div className="bg-blue-600/20 text-blue-400 px-4 py-3 rounded-lg flex items-center gap-3 font-medium">
            <Activity className="w-5 h-5" />
            Dashboard
          </div>
          <div className="text-muted-foreground hover:text-white hover:bg-slate-800 px-4 py-3 rounded-lg flex items-center gap-3 transition-colors cursor-pointer">
            <Briefcase className="w-5 h-5" />
            Deals
          </div>
          <div className="text-muted-foreground hover:text-white hover:bg-slate-800 px-4 py-3 rounded-lg flex items-center gap-3 transition-colors cursor-pointer">
            <User className="w-5 h-5" />
            Contacts
          </div>
          <div className="text-muted-foreground hover:text-white hover:bg-slate-800 px-4 py-3 rounded-lg flex items-center gap-3 transition-colors cursor-pointer">
            <FileText className="w-5 h-5" />
            Quotes
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden w-full">
        {/* Header */}
        <div className="h-20 shrink-0 bg-background border-b border-border flex items-center justify-between px-8">
          <h1 className="text-2xl font-bold text-foreground">Overview</h1>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center border-2 border-white shadow-sm">
              <span className="text-muted-foreground font-semibold text-sm">JS</span>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-8 overflow-hidden flex flex-col gap-8 w-full">
          {/* Top Metrics */}
          <div className="grid grid-cols-4 gap-6 shrink-0 w-full">
            <div className="bg-background rounded-xl border border-border p-6 shadow-sm flex flex-col justify-center">
              <div className="flex items-center gap-3 text-muted-foreground mb-2">
                <DollarSign className="w-5 h-5" />
                <span className="font-semibold text-sm">Total Pipeline</span>
              </div>
              <div className="text-3xl font-black text-foreground">$1.2M</div>
              <div className="text-sm font-medium text-green-600 mt-2 flex items-center gap-1">
                <TrendingUp className="w-4 h-4" /> 12% from last month
              </div>
            </div>
            <div className="bg-background rounded-xl border border-border p-6 shadow-sm flex flex-col justify-center">
              <div className="flex items-center gap-3 text-muted-foreground mb-2">
                <Activity className="w-5 h-5" />
                <span className="font-semibold text-sm">Win Rate</span>
              </div>
              <div className="text-3xl font-black text-foreground">68%</div>
              <div className="text-sm font-medium text-green-600 mt-2 flex items-center gap-1">
                <TrendingUp className="w-4 h-4" /> 5% from last month
              </div>
            </div>
            <div className="bg-background rounded-xl border border-border p-6 shadow-sm flex flex-col justify-center">
              <div className="flex items-center gap-3 text-muted-foreground mb-2">
                <Briefcase className="w-5 h-5" />
                <span className="font-semibold text-sm">Open Deals</span>
              </div>
              <div className="text-3xl font-black text-foreground">42</div>
            </div>
            <div className="bg-background rounded-xl border border-border p-6 shadow-sm flex flex-col justify-center">
              <div className="flex items-center gap-3 text-muted-foreground mb-2">
                <TrendingUp className="w-5 h-5" />
                <span className="font-semibold text-sm">Avg Deal Size</span>
              </div>
              <div className="text-3xl font-black text-foreground">$28.5k</div>
              <div className="text-sm font-medium text-green-600 mt-2 flex items-center gap-1">
                <TrendingUp className="w-4 h-4" /> 2% from last month
              </div>
            </div>
          </div>

          {/* Bottom Area */}
          <div className="flex-1 grid grid-cols-3 gap-6 overflow-hidden w-full">
            <div className="col-span-2 bg-background rounded-xl border border-border p-6 shadow-sm flex flex-col">
              <h3 className="text-lg font-bold text-foreground mb-6 shrink-0">Revenue Overview</h3>
              <div className="flex-1 bg-muted border border-border rounded-lg flex items-end p-4 gap-4">
                {/* Mock Chart Bars */}
                {[40, 60, 45, 80, 50, 90, 75, 100].map((h, i) => (
                  <div key={i} className="flex-1 bg-blue-100 rounded-t-sm relative group hover:bg-blue-200 transition-colors" style={{ height: `${h}%` }}>
                    <div className="absolute bottom-0 w-full bg-blue-600 rounded-t-sm" style={{ height: `${h * 0.7}%` }}></div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="col-span-1 bg-background rounded-xl border border-border p-6 shadow-sm flex flex-col overflow-hidden">
              <h3 className="text-lg font-bold text-foreground mb-6 shrink-0">Recent Activity</h3>
              <div className="space-y-6 overflow-y-auto pr-2">
                <div className="flex gap-4">
                  <div className="w-2 h-2 mt-2 rounded-full bg-blue-600 shrink-0 relative">
                    <div className="absolute top-4 left-1/2 -ml-[1px] w-[2px] h-12 bg-muted"></div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">Quote Accepted</div>
                    <div className="text-xs text-muted-foreground">Smith Kitchen Remodel • $24,500</div>
                    <div className="text-xs text-muted-foreground mt-1">2 hours ago</div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-2 h-2 mt-2 rounded-full bg-slate-300 shrink-0 relative">
                    <div className="absolute top-4 left-1/2 -ml-[1px] w-[2px] h-12 bg-muted"></div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">New Deal Created</div>
                    <div className="text-xs text-muted-foreground">Johnson Deck Addition</div>
                    <div className="text-xs text-muted-foreground mt-1">Yesterday</div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-2 h-2 mt-2 rounded-full bg-slate-300 shrink-0"></div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">Message Received</div>
                    <div className="text-xs text-muted-foreground">Robert Williams</div>
                    <div className="text-xs text-muted-foreground mt-1">Oct 15, 2023</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const QuotesScreen = () => (
  <div className="w-full h-full bg-muted p-4 lg:p-6 overflow-hidden flex flex-col gap-4 scale-[0.65] md:scale-[0.75] lg:scale-[0.80] origin-top-left w-[150%] h-[150%] md:w-[133%] md:h-[133%] lg:w-[125%] lg:h-[125%]">
    <div className="flex items-center justify-between">
      <h2 className="text-2xl font-bold text-foreground">Smart Bidding</h2>
      <Button size="sm" className="bg-blue-600">New Quote</Button>
    </div>
    <div className="flex-1 overflow-hidden pointer-events-none opacity-90">
      <DealsKanban 
        quotes={mockQuotes} 
        onStatusChange={() => {}} 
        onEdit={() => {}} 
        onPreview={() => {}} 
        onDelete={() => {}} 
        onEmail={() => {}} 
      />
    </div>
  </div>
);

const KitchenPlannerScreen = () => (
  <div className="w-full h-full bg-muted overflow-hidden relative">
    <div className="absolute top-4 left-4 z-10 bg-background/90 backdrop-blur px-3 py-1.5 rounded-lg shadow-sm font-semibold text-foreground text-sm">
      Kitchen Planner 3D View
    </div>
    <Suspense fallback={<div className="flex items-center justify-center h-full text-muted-foreground">Loading 3D Engine...</div>}>
      <div className="w-[150%] h-[150%] scale-[0.66] origin-top-left pointer-events-none">
        <Kitchen3DRenderer config={mockKitchenConfig} />
      </div>
    </Suspense>
  </div>
);

const GaragePlannerScreen = () => (
  <div className="w-full h-full bg-muted overflow-hidden relative">
    <div className="absolute top-4 left-4 z-10 bg-background/90 backdrop-blur px-3 py-1.5 rounded-lg shadow-sm font-semibold text-foreground text-sm">
      Garage Planner 3D View
    </div>
    <Suspense fallback={<div className="flex items-center justify-center h-full text-muted-foreground">Loading 3D Engine...</div>}>
      <div className="w-[150%] h-[150%] scale-[0.66] origin-top-left pointer-events-none">
        <Garage3DRenderer config={mockGarageConfig} />
      </div>
    </Suspense>
  </div>
);

const DeckPlannerScreen = () => (
  <div className="w-full h-full bg-muted overflow-hidden relative">
    <div className="absolute top-4 left-4 z-10 bg-background/90 backdrop-blur px-3 py-1.5 rounded-lg shadow-sm font-semibold text-foreground text-sm">
      Deck Configurator
    </div>
    <Suspense fallback={<div className="flex items-center justify-center h-full text-muted-foreground">Loading 3D Engine...</div>}>
      <div className="w-[150%] h-[150%] scale-[0.66] origin-top-left pointer-events-none">
        <Deck3DRenderer config={mockDeckConfig} />
      </div>
    </Suspense>
  </div>
);

const ContactPortalScreen = () => (
  <div className="w-full h-full bg-muted overflow-hidden relative">
    <div className="w-[250%] h-[250%] scale-[0.4] origin-top-left flex bg-muted">
      
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Logo size="sm" className="w-8 h-8" />
            ProSpaces
          </h2>
        </div>
        <div className="flex-1 py-6 px-4 flex flex-col gap-2">
          <div className="bg-blue-600/20 text-blue-400 px-4 py-3 rounded-lg flex items-center gap-3 font-medium">
            <User className="w-5 h-5" />
            Contact Portal
          </div>
          <div className="text-muted-foreground hover:text-white hover:bg-slate-800 px-4 py-3 rounded-lg flex items-center gap-3 transition-colors cursor-pointer">
            <FileText className="w-5 h-5" />
            Quotes & Invoices
          </div>
          <div className="text-muted-foreground hover:text-white hover:bg-slate-800 px-4 py-3 rounded-lg flex items-center gap-3 transition-colors cursor-pointer">
            <MessageSquare className="w-5 h-5" />
            Messages
            <span className="ml-auto bg-blue-600 text-white text-xs py-0.5 px-2 rounded-full">3</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="h-20 bg-background border-b border-border flex items-center justify-between px-8">
          <h1 className="text-2xl font-bold text-foreground">Project Overview</h1>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm font-semibold text-foreground">John Smith</div>
              <div className="text-xs text-muted-foreground">123 Oak Street</div>
            </div>
            <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center border-2 border-white shadow-sm">
              <User className="w-5 h-5 text-muted-foreground" />
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-8 grid grid-cols-3 gap-8">
          {/* Left Column (2/3) */}
          <div className="col-span-2 flex flex-col gap-8">
            <div className="bg-background rounded-xl border border-border p-8 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-foreground">New Deck Construction</h3>
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full uppercase tracking-wide">In Progress</span>
                  </div>
                  <p className="text-muted-foreground text-sm">Started Oct 12, 2023 • Expected Completion: Nov 30, 2023</p>
                </div>
                <div className="text-right">
                  <span className="text-4xl font-black text-blue-600">65%</span>
                </div>
              </div>
              <div className="w-full bg-muted h-3 rounded-full overflow-hidden mb-2">
                <div className="bg-blue-600 h-full w-[65%] rounded-full relative">
                  <div className="absolute inset-0 bg-background/20 w-full animate-pulse"></div>
                </div>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground font-medium">
                <span>Phase 1: Foundation (Complete)</span>
                <span>Phase 2: Framing (In Progress)</span>
                <span>Phase 3: Decking</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div className="bg-background rounded-xl border border-border p-6 shadow-sm flex items-start gap-4 hover:shadow-md transition-shadow cursor-pointer">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                  <FileText className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="font-bold text-foreground text-lg">Invoices & Quotes</h4>
                  <p className="text-sm text-muted-foreground mb-3">2 Pending Approval</p>
                  <button className="text-sm text-indigo-600 font-semibold hover:text-indigo-700">View Documents &rarr;</button>
                </div>
              </div>
              <div className="bg-background rounded-xl border border-border p-6 shadow-sm flex items-start gap-4 hover:shadow-md transition-shadow cursor-pointer">
                <div className="p-3 bg-teal-50 text-teal-600 rounded-lg">
                  <MessageSquare className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="font-bold text-foreground text-lg">Team Messages</h4>
                  <p className="text-sm text-muted-foreground mb-3">3 Unread Messages</p>
                  <button className="text-sm text-teal-600 font-semibold hover:text-teal-700">Open Chat &rarr;</button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (1/3) */}
          <div className="col-span-1 flex flex-col gap-8">
            <div className="bg-background rounded-xl border border-border p-6 shadow-sm flex-1">
              <h3 className="text-lg font-bold text-foreground mb-6">Recent Activity</h3>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-2 h-2 mt-2 rounded-full bg-blue-600 shrink-0 relative">
                    <div className="absolute top-4 left-1/2 -ml-[1px] w-[2px] h-12 bg-muted"></div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">Materials Delivered</div>
                    <div className="text-xs text-muted-foreground">Today, 9:00 AM</div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-2 h-2 mt-2 rounded-full bg-slate-300 shrink-0 relative">
                    <div className="absolute top-4 left-1/2 -ml-[1px] w-[2px] h-12 bg-muted"></div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">Framing Inspection Passed</div>
                    <div className="text-xs text-muted-foreground">Yesterday</div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-2 h-2 mt-2 rounded-full bg-slate-300 shrink-0"></div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">Payment Received</div>
                    <div className="text-xs text-muted-foreground">Oct 15, 2023</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

interface PromoSlideshowProps {
  onClose?: () => void;
}

interface Slide {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  uiComponent?: React.ReactNode;
  isCTA?: boolean;
}

const slides: Slide[] = [
  {
    id: 'intro',
    title: 'The Ultimate Solution for Home Renovation Centres and Lumber Yards',
    subtitle: 'Power up your sales floor and streamline operations from first contact to final delivery.',
    image: 'https://images.unsplash.com/photo-1595814432314-90095f342694?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxob21lJTIwaW1wcm92ZW1lbnR8ZW58MXx8fHwxNzcyNjY5MDY4fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    uiComponent: <DashboardScreen />,
  },
  {
    id: 'login',
    title: 'Enterprise-Grade Security',
    subtitle: 'Secure access with full support for SSO, SAML, and custom integrations out of the box.',
    image: 'https://images.unsplash.com/photo-1762341107847-d4d75c6da8c6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBvZmZpY2UlMjB0ZWNobm9sb2d5fGVufDF8fHx8MTc3MjU5OTEwNXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    uiComponent: <LoginScreen />,
  },
  {
    id: 'calendar',
    title: 'Seamless Email & Calendar Sync',
    subtitle: 'Stay on top of your schedule with native, real-time two-way syncing for Microsoft Outlook and Google Workspace.',
    image: 'https://images.unsplash.com/photo-1765648496243-46d14c502ff5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBvZmZpY2UlMjBzY2hlZHVsZXxlbnwxfHx8fDE3NzI2NzIyNzV8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    uiComponent: <CalendarScreen />,
  },
  {
    id: 'planners',
    title: 'Immersive 3D Planners',
    subtitle: 'Design Decks, Garages, Roofs, and Sheds right in front of your customer with our custom mini Three.js engine.',
    image: 'https://images.unsplash.com/photo-1742415106160-594d07f6cc23?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhcmNoaXRlY3R1cmFsJTIwYmx1ZXByaW50c3xlbnwxfHx8fDE3NzI2Njk1NzB8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    uiComponent: <GaragePlannerScreen />,
  },
  {
    id: 'bidding',
    title: 'Instant Quoting & Smart Bidding',
    subtitle: 'Turn those 3D designs into exact material lists and professional quotes instantly, completely error-free.',
    image: 'https://images.unsplash.com/photo-1754780960162-839cda44d736?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb250cmFjdG9yJTIwdGFibGV0JTIwYmx1ZXByaW50fGVufDF8fHx8MTc3MjY2NDg3Mnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    uiComponent: <QuotesScreen />,
  },
  {
    id: 'outdoor',
    title: 'Transform Outdoor Projects',
    subtitle: 'Help clients visualize their dream decks and outdoor spaces before construction even begins.',
    image: 'https://images.unsplash.com/photo-1764061148640-f08811bf9e4d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b29kZW4lMjBvdXRkb29yJTIwZGVja3xlbnwxfHx8fDE3NzI2NjQ4NzJ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    uiComponent: <DeckPlannerScreen />,
  },
  {
    id: 'portal',
    title: 'Dedicated Contact Portal',
    subtitle: 'Give your clients 24/7 access to project updates, 3D designs, quotes, and messages all in one sleek interface.',
    image: 'https://images.unsplash.com/photo-1670852714979-f73d21652a83?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjdXN0b21lciUyMHVzaW5nJTIwdGFibGV0JTIwbW9kZXJuJTIwb2ZmaWNlfGVufDF8fHx8MTc3MjY3MDAzMXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    uiComponent: <ContactPortalScreen />,
  },
  {
    id: 'team-dashboard',
    title: 'Empower Your Sales Team',
    subtitle: 'Monitor team performance, track win rates, and manage opportunities with real-time dynamic dashboards.',
    image: 'https://images.unsplash.com/photo-1760611656007-f767a8082758?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBvZmZpY2UlMjB0ZWFtJTIwbWVldGluZ3xlbnwxfHx8fDE3NzI2MTUzNTZ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    uiComponent: <TeamDashboardScreen />,
  },
  {
    id: 'features',
    title: 'All-in-One CRM Toolkit',
    subtitle: 'Access Notes, Document Storage, Import/Export, Advanced Reports, and Marketing campaigns in a single platform.',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidXNpbmVzcyUyMGRhc2hib2FyZCUyMGNoYXJ0cyUyMHJlcG9ydHN8ZW58MXx8fHwxNzcyNjczOTY5fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    uiComponent: <FeaturesScreen />,
  },
  {
    id: 'closing',
    title: 'ProSpaces CRM: Your Complete Platform',
    subtitle: 'Elevate your lumber yard or renovation centre today. Track opportunities, automate marketing, and close more deals.',
    image: 'https://images.unsplash.com/photo-1762245832990-f6f71b6b8c08?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxob21lJTIwcmVub3ZhdGlvbiUyMGV4dGVyaW9yfGVufDF8fHx8MTc3MjY2NDg3Mnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    uiComponent: <DashboardScreen />,
    isCTA: true,
  }
];

const SLIDE_DURATION = 9000;

export function PromoSlideshow({ onClose }: PromoSlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);

  // Auto-advance logic
  useEffect(() => {
    let animationFrame: ReturnType<typeof requestAnimationFrame>;
    let startTime = Date.now();

    const updateProgress = () => {
      if (!isPlaying) return;
      
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / SLIDE_DURATION) * 100, 100);
      
      setProgress(newProgress);

      if (elapsed >= SLIDE_DURATION) {
        setCurrentIndex((prev) => (prev + 1) % slides.length);
        startTime = Date.now();
        setProgress(0);
      } else {
        animationFrame = requestAnimationFrame(updateProgress);
      }
    };

    if (isPlaying) {
      animationFrame = requestAnimationFrame(updateProgress);
    }

    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [isPlaying, currentIndex]);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
    setProgress(0);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
    setProgress(0);
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      // Remove ?view=promo from the URL and navigate home
      const url = new URL(window.location.href);
      url.searchParams.delete('view');
      window.location.href = url.pathname + url.search;
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black text-white flex flex-col overflow-hidden font-sans cursor-pointer"
      onClick={() => setIsPlaying(!isPlaying)}
    >
      {/* Background Slides */}
      <AnimatePresence initial={false} mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, transition: { duration: 1 } }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute inset-0"
        >
          {/* Subtle slow zoom-in on the background image for cinematic effect */}
          <motion.div
            initial={{ scale: 1 }}
            animate={{ scale: 1.1 }}
            transition={{ duration: 15, ease: "linear" }}
            className="w-full h-full"
            style={{
              backgroundImage: `url(${slides[currentIndex].image})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          {/* Dark gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/20" />
        </motion.div>
      </AnimatePresence>

      {/* Top Controls */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-50">
        <div className="flex items-center gap-2 text-white/80">
          <span className="font-bold tracking-widest text-sm uppercase bg-background/10 px-3 py-1 rounded-full backdrop-blur-md border border-white/20">
            ProSpaces CRM
          </span>
        </div>
        <Button 
          onClick={(e) => {
            e.stopPropagation();
            handleClose();
          }}
          className="bg-background/10 hover:bg-background/20 text-white rounded-full backdrop-blur-md border border-white/20 transition-all z-50 flex items-center gap-2"
        >
          Visit ProSpaces CRM
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex items-center justify-between p-8 md:p-20 z-10 pb-32 relative">
        
        {/* Left Side: Text Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`text-${currentIndex}`}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
            className="w-full lg:w-[50%] xl:w-[55%] max-w-3xl flex flex-col justify-center relative z-30"
          >
            <h1 className="text-4xl md:text-5xl xl:text-6xl font-bold mb-6 leading-tight drop-shadow-lg">
              {slides[currentIndex].title}
            </h1>
            <p className="text-lg md:text-xl xl:text-2xl text-gray-200 mb-8 max-w-xl xl:max-w-2xl leading-relaxed drop-shadow-md">
              {slides[currentIndex].subtitle}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Right Side: Floating UI Screenshot or Real Component */}
        <AnimatePresence mode="wait">
          {(slides[currentIndex].uiComponent || slides[currentIndex].image) && (
            <motion.div
              key={`ui-${currentIndex}`}
              initial={{ opacity: 0, x: 50, rotateY: 15, rotateX: 5 }}
              animate={{ opacity: 1, x: 0, rotateY: -5, rotateX: 2 }}
              exit={{ opacity: 0, x: 20, transition: { duration: 0.5 } }}
              transition={{ duration: 1.2, delay: 0.4, type: "spring", stiffness: 40 }}
              className="hidden lg:block absolute top-24 right-6 lg:right-12 xl:right-20 w-[450px] xl:w-[550px] 2xl:w-[700px] aspect-[16/10] rounded-xl overflow-hidden shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)] border border-white/20 backdrop-blur-md z-20 bg-slate-900"
              style={{ perspective: "1000px" }}
            >
              {/* App Window Header Bar */}
              <div className="h-8 bg-background/10 backdrop-blur-md flex items-center px-4 gap-2 border-b border-white/10 absolute top-0 left-0 right-0 z-50">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400/90 shadow-sm"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400/90 shadow-sm"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-green-400/90 shadow-sm"></div>
              </div>
              {/* App Content */}
              <div className="w-full h-full pt-8 relative">
                {slides[currentIndex].uiComponent ? (
                  slides[currentIndex].uiComponent
                ) : (
                  <>
                    <img 
                      src={slides[currentIndex].image} 
                      alt="Application Interface Screenshot" 
                      className="w-full h-full object-cover opacity-95"
                    />
                    <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/10 to-blue-500/10 pointer-events-none"></div>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Controls & Progress */}
      <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 z-10 bg-gradient-to-t from-black to-transparent">
        <div className="max-w-7xl mx-auto flex flex-col gap-6">
          
          {/* Progress Bars */}
          <div className="flex gap-2 w-full">
            {slides.map((_, idx) => (
              <div 
                key={idx} 
                className="h-1.5 flex-1 bg-background/20 rounded-full overflow-hidden cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(idx);
                  setProgress(0);
                }}
              >
                <motion.div
                  className="h-full bg-background rounded-full"
                  initial={{ width: "0%" }}
                  animate={{ 
                    width: idx < currentIndex ? "100%" : idx === currentIndex ? `${progress}%` : "0%" 
                  }}
                  transition={{ duration: 0.1 }}
                />
              </div>
            ))}
          </div>

          {/* Navigation Controls */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPlaying(!isPlaying);
                }}
                className="p-3 bg-background/10 hover:bg-background/20 rounded-full backdrop-blur-md transition-colors"
              >
                {isPlaying ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white" />}
              </button>
              <span className="text-white/60 text-sm font-medium tracking-wide">
                {String(currentIndex + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
              </span>
            </div>

            <div className="flex gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrev();
                }}
                className="p-3 bg-background/10 hover:bg-background/20 rounded-full backdrop-blur-md transition-colors"
                aria-label="Previous Slide"
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
                className="p-3 bg-background/10 hover:bg-background/20 rounded-full backdrop-blur-md transition-colors"
                aria-label="Next Slide"
              >
                <ChevronRight className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
