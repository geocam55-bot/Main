import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Search, Plus, Edit, Trash2, MoreVertical, Building2, Shield, AlertCircle, 
  Key, Copy, Pencil, Check, X, RefreshCw, Upload, Download, FileText, Filter, Eye,
  CheckCircle2, AlertTriangle, Sparkles, ArrowLeft, Loader2, Zap, Package, 
  Image as ImageIcon, ShoppingCart, Tag, MapPin, Barcode, Clipboard
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';
import { PermissionGate } from './PermissionGate';
import { DatabaseInit } from './DatabaseInit';
import { InventoryOptimizationBanner } from './InventoryOptimizationBanner';
import { CompetitivePricingDashboard } from './inventory/CompetitivePricingDashboard';
import { CompetitivePricingAdmin } from './inventory/CompetitivePricingAdmin';
import { CompetitivePricingPanel } from './inventory/CompetitivePricingPanel';
import { createClient } from '../utils/supabase/client';
import { getServerHeaders } from '../utils/server-headers';
import { useDebounce } from '../utils/useDebounce';
import { projectId } from '../utils/supabase/info';
import { decodeHtmlEntities, sanitizeItem } from '../utils/sanitize';
import { inventoryAPI } from '../utils/api';
import { ensureUserProfile } from '../utils/ensure-profile';
import { InventoryIndexFixer } from './InventoryIndexFixer';
import { InventoryDiagnostic } from './InventoryDiagnostic';
import { InventoryModuleHelp } from './InventoryModuleHelp';
import { ShoppingListSubModule } from './inventory/ShoppingListSubModule';
import { canAdd, canChange, canDelete } from '../utils/permissions';

export function Inventory({ user, onNavigate }: { user: any; onNavigate?: (view: string) => void }) {
  const [tableExists, setTableExists] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [isRegeneratingAllKeywords, setIsRegeneratingAllKeywords] = useState(false);
  const [keywordRegenProgress, setKeywordRegenProgress] = useState<any>(null);
  const [lostInventory, setLostInventory] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('items');
  const [notification, setNotification] = useState<{type: 'success'|'error', message: string} | null>(null);
  const notificationTimeoutRef = React.useRef<number | null>(null);
  const [shoppingListCount, setShoppingListCount] = useState(0);
  const updateShoppingListCount = useCallback(() => { try { const storageKey = `shopping_list_${projectId}`; const saved = localStorage.getItem(storageKey); if (saved) { const list = JSON.parse(saved); setShoppingListCount(list.length || 0); } else { setShoppingListCount(0); } } catch (e) { setShoppingListCount(0); } }, []);
  useEffect(() => { updateShoppingListCount(); window.addEventListener('shopping-list-updated', updateShoppingListCount); return () => window.removeEventListener('shopping-list-updated', updateShoppingListCount); }, [updateShoppingListCount]);
  const handleAddToShoppingList = useCallback((item: any) => { try { const storageKey = `shopping_list_${projectId}`; const saved = localStorage.getItem(storageKey); let list = saved ? JSON.parse(saved) : []; const existingItem = list.find((i: any) => i.inventoryId === item.id); if (existingItem) { existingItem.quantity = (existingItem.quantity || 1) + 1; } else { list.push({ id: `sl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, inventoryId: item.id, sku: item.sku || '', name: item.name, description: item.description, manufacturer: item.manufacturer, mfgPartNumber: item.mfgPartNumber, category: item.category, quantity: 1, addedAt: new Date().toISOString() }); } localStorage.setItem(storageKey, JSON.stringify(list)); setNotification({ type: 'success', message: `${item.name} added to shopping list` }); if (notificationTimeoutRef.current) window.clearTimeout(notificationTimeoutRef.current); notificationTimeoutRef.current = window.setTimeout(() => setNotification(null), 3000); window.dispatchEvent(new Event('shopping-list-updated')); } catch (err) { console.error('Error adding to shopping list:', err); setNotification({ type: 'error', message: 'Failed to add item to shopping list' }); } }, []);

  const isAdminOrSuperAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const showAlert = (type: string, msg: string, timeout = 5000) => { console.log(`[${type}] ${msg}`); };
  const loadInventory = async () => {};
  const handleOpenDialog = (item: any) => {};

  const handleRecoverLostInventory = async () => {
    if (!confirm('Recover pending import jobs and insert them into your inventory. This may take a few minutes. Continue?')) return;
    setIsRecovering(true);
setIsRecovering(true);
    try {
      showAlert('success', 'Processing pending jobs...');
      const headers = await getServerHeaders();
      const { data: { user } } = await supabase.auth.getUser();
      const profile = await ensureUserProfile(user?.id || '');
      const organizationId = profile.organization_id;

      // Call the process-all-pending endpoint repeatedly until done
      let done = false;
      let totalInserted = 0;
      let resumeOffset = 0;
      let currentJobId = null;

      while (!done) {
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-8405be07/inventory-diagnostic/process-all-pending`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ 
            targetOrgId: organizationId,
            batchLimit: 500,
            resumeOffset,
            currentJobId
          }),
        });

        if (!response.ok) throw new Error('Processing failed: ' + response.statusText);
        
        const data = await response.json();
        done = data.done;
        resumeOffset = data.nextOffset || 0;
        currentJobId = data.currentJobId;
        totalInserted = data.cumulativeInserted || (totalInserted + data.batchInserted);
        
        
      }
      
      showAlert('success', `Successfully processed pending jobs! Added ${totalInserted} items.`);
      loadInventory();
      
    } catch (err: any) {
      showAlert('error', 'Processing failed: ' + err.message);
    } finally {
      setIsRecovering(false);
    }
  };

  const handleRegenerateAllKeywords = async () => {
    if (!confirm('Regenerate search keywords for all SKUs in your organization? This may take a few minutes.')) return;

    setIsRegeneratingAllKeywords(true);
    setKeywordRegenProgress({ processed: 0, total: 0, updated: 0, failed: 0, percent: 0 });
    try {
      const result = await inventoryAPI.regenerateAllKeywords((progress) => {
        setKeywordRegenProgress(progress);
      });
      if (result.failed > 0) {
        const failureSummary = result.failureDetails?.length
          ? ` First issues: ${result.failureDetails.join(' | ')}`
          : '';
        showAlert('error', `Regenerated keywords for ${result.updated} SKUs, but ${result.failed} failed.${failureSummary}`, 15000);
      } else {
        showAlert('success', `Regenerated keywords for ${result.updated} SKUs`);
      }
      await loadInventory();
    } catch (error: any) {
      showAlert('error', error?.message || 'Failed to regenerate keywords for all SKUs', 15000);
    } finally {
      setIsRegeneratingAllKeywords(false);
      setKeywordRegenProgress(null);
    }
  };

  const handleExportCSV = () => {
    // Generate CSV content
    const headers = [
      'ID',
      'Name',
      'Description',
      'SKU',
      'Category',
      'Quantity',
      'Price',
      'Cost',
      'Location',
      'Department',
      'Unit of Measure'
    ];

    const csvRows = [headers.join(',')];

    // If no items, we still export the headers as a template
    if (items.length > 0) {
      items.forEach(item => {
        const row = [
          item.id,
          `"${(item.name || '').replace(/"/g, '""')}"`,
          `"${(item.description || '').replace(/"/g, '""')}"`,
          `"${(item.sku || '').replace(/"/g, '""')}"`,
          `"${(item.category || '').replace(/"/g, '""')}"`,
          item.quantity || 0,
          item.unit_price || 0,
          item.cost || 0,
          `"${(item.location || '').replace(/"/g, '""')}"`,
          `"${(item.department_code || '').replace(/"/g, '""')}"`,
          `"${(item.unit_of_measure || '').replace(/"/g, '""')}"`
        ];
        csvRows.push(row.join(','));
      });
    }

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `inventory_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      if (items.length === 0) {
        toast.info('Exported empty template (no items found)');
      } else {
        toast.success(`Exported ${items.length} items to CSV`);
      }
    }
  };

  const handleOpenInventoryImport = () => {
    sessionStorage.setItem('prospaces_import_export_focus', 'inventory-import');
    sessionStorage.setItem('prospaces_import_export_scope', 'inventory-only');
    setShowImportExportWindow(true);
  };

  const handleManualScan = async () => {
    setIsRecovering(true);
    try {
      showAlert('success', 'Scanning for lost inventory...');
      const headers = await getServerHeaders();
      const { data: { user } } = await supabase.auth.getUser();
      const profile = await ensureUserProfile(user?.id || '');
      
      const diagRes = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-8405be07/inventory-diagnostic/run`, { 
        method: 'POST',
        headers,
        body: JSON.stringify({ email: user?.email, role: profile.role })
      });
      
      if (diagRes.ok) {
        const diagData = await diagRes.json();
        
        const nullCount = diagData.counts?.withNullOrg || 0;
        const otherCount = diagData.counts?.inOtherOrgs || 0;
        const totalInDb = diagData.counts?.totalInDatabase || 0;
        const inUserOrg = diagData.counts?.inUserOrg || 0;
        const inStaging = diagData.counts?.inStaging || 0;
        
        // Detailed report
        let message = `Scan Complete:\n`;
        message += `• Total Items in DB: ${totalInDb.toLocaleString()}\n`;
        message += `• Items in Your Org (${diagData.user?.orgId || 'None'}): ${inUserOrg.toLocaleString()}\n`;
        message += `• Orphaned Items: ${nullCount.toLocaleString()}\n`;
        message += `• Items in Other Orgs: ${otherCount.toLocaleString()}\n`;
        message += `• Items in Staging Area: ${inStaging.toLocaleString()}`;
        
        if (diagData.orgBreakdown && diagData.orgBreakdown.length > 0) {
           message += `\n\nOrg Breakdown:\n` + diagData.orgBreakdown.map((o: any) => 
             `- ${o.org_id}: ${o.count} items${o.is_user_org ? ' (YOURS)' : ''}`
           ).join('\n');
        }

        if (diagData.backupTables && Object.keys(diagData.backupTables).length > 0) {
           message += `\n\n⚠️ FOUND BACKUP TABLES:`;
           Object.entries(diagData.backupTables).forEach(([table, count]) => {
             message += `\n- ${table}: ${count} items`;
           });
           message += `\nAsk an admin to restore from one of these tables if needed.`;
        }

        if (inStaging > 0) {
           message += `\n\n⚠️ FOUND ${inStaging.toLocaleString()} ITEMS IN STAGING AREA!`;
           message += `\nThese items were imported but not fully processed.`;
           setLostInventory({
             total: inStaging,
             nullOrg: 0,
             otherOrgs: 0,
             found: true
           }); // This triggers the banner too
           
           showAlert('error', `Found ${inStaging} stuck items in staging!`);
           setScanResult({
             title: 'Stuck Items Found',
             message,
             type: 'error'
           });
           return;
        }

        if (nullCount > 0 || otherCount > 0) {
           setLostInventory({
            total: nullCount + otherCount,
            nullOrg: nullCount,
            otherOrgs: otherCount,
            found: true
           });
           showAlert('success', `Found ${nullCount + otherCount} lost items! See banner above.`);
           setScanResult({
             title: 'Lost Inventory Found',
             message,
             type: 'error'
           });
        } else {
          // If DB is clean but empty, check for pending jobs
          if (totalInDb === 0) {
             const jobsRes = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-8405be07/inventory-diagnostic/find-pending-jobs`, { headers, method: 'POST' });
             if (jobsRes.ok) {
                const jobsData = await jobsRes.json();
                
                // Filter for inventory-related jobs
                const isInvJob = (j: any) => j.data_type === 'inventory' || j.job_type === 'inventory_import' || (j.file_name && (j.file_name.toLowerCase().includes('inventory') || j.file_name.toLowerCase().includes('.csv') || j.file_name.toLowerCase().includes('.xlsx')));
                const recentJobs = (jobsData.jobs || []).filter(isInvJob);
                
                const pendingJobs = recentJobs.filter((j: any) => j.status === 'pending' || j.status === 'processing');
                const failedJobs = recentJobs.filter((j: any) => j.status === 'failed');
                const emptyJobs = recentJobs.filter((j: any) => j.status === 'completed' && (!j.record_count || j.record_count === 0));

                if (pendingJobs.length > 0) {
                   const count = pendingJobs.length;
                   const records = pendingJobs.reduce((acc: number, j: any) => acc + (j.recordsInFileData || 0), 0);
                   
                   message += `\n\n⚠️ FOUND ${count} PENDING IMPORT JOBS with ${records.toLocaleString()} records!`;
                   message += `\nThese items are stuck in the queue. Please contact an admin or use the Diagnostic tab (if available) to process them.`;
                   message += `\n\nClick 'Proceed' to start processing these jobs now.`;
                   showAlert('error', `Found ${count} stuck import jobs!`);
                   setScanResult({
                     title: 'Pending Import Jobs Found',
                     message,
                     type: 'error',
                     action: () => handleProcessPendingJobs()
                   });
                   return; // Exit early as we're handling jobs
                } 
                
                if (failedJobs.length > 0) {
                   const job = failedJobs[0];
                   message += `\n\n❌ FOUND ${failedJobs.length} FAILED IMPORT JOBS`;
                   message += `\nThe most recent job '${job.file_name}' failed with error:`;
                   message += `\n"${job.error_message || 'Unknown error'}"`;
                   message += `\n\nPlease check your file and try importing again.`;
                   
                   setScanResult({
                     title: 'Import Failed',
                     message,
                     type: 'error'
                   });
                   return;
                }

                if (emptyJobs.length > 0) {
                   const job = emptyJobs[0];
                   message += `\n\n⚠️ FOUND EMPTY IMPORT JOBS`;
                   message += `\nThe most recent job '${job.file_name}' completed but imported 0 records.`;
                   message += `\nThis usually means the column mapping was incorrect or the file was empty.`;
                   
                   setScanResult({
                     title: 'Empty Import Found',
                     message,
                     type: 'info'
                   });
                   return;
                }

                message += `\n\nNo pending, failed, or empty import jobs found.`;
                message += `\nIt looks like no inventory data has been uploaded yet, or it was deleted.`;
                showAlert('success', 'Database is clean and empty.');
             }
          } else {
             showAlert('success', 'No lost inventory found. Database is clean.');
          }
          setScanResult({
            title: 'Scan Complete',
            message,
            type: 'success'
          });
        }
      } else {
        throw new Error('Scan failed: ' + diagRes.statusText);
      }
    } catch (e: any) {
      showAlert('error', 'Scan failed: ' + e.message);
    } finally {
      setIsRecovering(false);
    }
  };

  // Show database setup if table doesn't exist
  if (!tableExists && !isLoading) {
    return <DatabaseInit onComplete={loadInventory} currentUser={user} />;
  }

  return (
    <PermissionGate user={user} module="inventory" action="view">
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground hidden sm:block">Inventory Management</h2>
        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 w-full sm:w-auto">
          <Button variant="outline" onClick={handleExportCSV} className="flex-1 sm:flex-none">
            <Download className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Export CSV</span>
            <span className="sm:hidden ml-2">Export</span>
          </Button>
          <Button variant="outline" onClick={handleOpenInventoryImport} className="flex-1 sm:flex-none">
            <Upload className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Import CSV</span>
            <span className="sm:hidden ml-2">Import</span>
          </Button>
          {canAdd('inventory', user.role) && (
          <Button onClick={() => handleOpenDialog()} className="flex-1 sm:flex-none" data-tour="inventory-add">
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Add Item</span>
            <span className="sm:hidden ml-2">Add</span>
          </Button>
          )}
        </div>
      </div>

      {/* Notification Alert */}
      {notification && (
        <Alert variant={notification.type === 'error' ? 'destructive' : 'default'}>
          <div className="flex w-full items-start gap-3">
            {notification.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 mt-0.5" />
            ) : (
              <AlertCircle className="h-4 w-4 mt-0.5" />
            )}
            <AlertDescription className="flex-1">{notification.message}</AlertDescription>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={() => {
                if (notificationTimeoutRef.current) {
                  window.clearTimeout(notificationTimeoutRef.current);
                  notificationTimeoutRef.current = null;
                }
                setNotification(null);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Alert>
      )}

      {/* Scan Result Dialog */}
      <Dialog open={!!scanResult} onOpenChange={(open) => !open && setScanResult(null)}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[80vh] flex flex-col p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {scanResult?.type === 'error' ? <AlertTriangle className="h-5 w-5 text-red-500" /> : <Sparkles className="h-5 w-5 text-blue-500" />}
              {scanResult?.title || 'Scan Result'}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Detailed results of the inventory deep scan operation
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-4">
            <div className="bg-muted p-4 rounded-md border text-sm font-mono whitespace-pre-wrap">
              {scanResult?.message}
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setScanResult(null)} className="w-full sm:w-auto">Close</Button>
            {scanResult?.action && (
              <Button onClick={() => {
                scanResult.action?.();
                setScanResult(null);
              }} className="w-full sm:w-auto">
                Proceed
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showImportExportWindow} onOpenChange={setShowImportExportWindow}>
        <DialogContent className="fixed right-0 left-auto top-0 bottom-0 h-screen w-full sm:w-[700px] !max-w-[100vw] sm:!max-w-[700px] !translate-x-0 !translate-y-0 !m-0 !rounded-none sm:border-l shadow-2xl p-0 flex flex-col overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-100">
          <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2 border-b bg-background sticky top-0 z-10">
            <div className="flex items-center justify-between gap-3">
              <DialogTitle>Import and Export</DialogTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowImportExportWindow(false)}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </div>
            <DialogDescription className="sr-only">
              Import and export inventory without leaving the Inventory module.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            <button
              className="px-4 py-2 bg-cyan-600 text-white rounded-lg mt-4"
              onClick={() => window.open('/?view=project-wizards&module=import-export', '_blank')}
            >
              Open Import/Export Module
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex w-auto min-w-full">
            <TabsTrigger value="items" className="whitespace-nowrap">All Items</TabsTrigger>
            <TabsTrigger value="low-stock" className="whitespace-nowrap">
              Out of Stock
              {displayLowStockCount > 0 && (
                <Badge className="ml-2 bg-red-100 text-red-700">{displayLowStockCount.toLocaleString()}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="shopping-list" className="whitespace-nowrap">
              Shopping List
              {shoppingListCount > 0 && (
                <Badge className="ml-2 bg-emerald-100 text-emerald-700 border-emerald-200">{shoppingListCount.toLocaleString()}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="competitive-pricing" className="whitespace-nowrap">
              Competitive Pricing
            </TabsTrigger>

            {isAdminOrSuperAdmin && (
              <TabsTrigger value="diagnostic" className="whitespace-nowrap">
                Diagnostic
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        <TabsContent value="items" className="space-y-4 mt-6">
          {/* Lost Inventory Recovery Banner - Highest Priority */}
          {isAdminOrSuperAdmin && lostInventory && lostInventory.found && lostInventory.total > 0 && (
            <Alert className="border-orange-300 bg-orange-50">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <AlertDescription className="ml-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="font-semibold text-orange-900 mb-1">
                      Found {lostInventory.total.toLocaleString()} Imported Items Not Showing in Your Inventory
                    </p>
                    <p className="text-sm text-orange-800">
                      {lostInventory.nullOrg > 0 && `${lostInventory.nullOrg} items have no organization assigned. `}
                      {lostInventory.otherOrgs > 0 && `${lostInventory.otherOrgs} items are in other organizations. `}
                      Click the button to recover these items.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 sm:flex-shrink-0 w-full sm:w-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveTab('diagnostic')}
                      className="border-orange-400 text-orange-700 hover:bg-orange-100 w-full sm:w-auto"
                    >
                      View Details
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleRecoverInventory}
                      disabled={isRecovering}
                      className="bg-orange-600 hover:bg-orange-700 w-full sm:w-auto"
                    >
                      {isRecovering ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Recovering...
                        </>
                      ) : (
                        <>
                          <Zap className="h-4 w-4 mr-2" />
                          Recover Items
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Database Performance Fix - Show prominently if slow */}
          {loadTimeMs > 5000 && (
            <InventoryIndexFixer />
          )}
          
          {/* Performance Optimization Banner - Only show if not critically slow */}
          {loadTimeMs > 0 && loadTimeMs <= 5000 && (
            <InventoryOptimizationBanner 
              organizationId={user.organizationId}
              itemCount={items.length}
              loadTimeMs={loadTimeMs}
            />
          )}
          

          
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              {/* Lost Inventory Recovery Banner */}
              {isAdminOrSuperAdmin && lostInventory && lostInventory.found && (
                <Alert className="mb-6 border-orange-200 bg-orange-50">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  <AlertDescription>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <h4 className="font-semibold text-orange-900">Missing Inventory Found</h4>
                        <p className="text-orange-800 mt-1">
                          We found <strong>{lostInventory.total.toLocaleString()}</strong> inventory items that are not visible.
                          {lostInventory.otherOrgs > 0 ? ` They appear to be assigned to a different organization ID.` : ' They appear to be orphaned (no organization).'}
                        </p>
                      </div>
                      <Button 
                        onClick={handleRecoverInventory} 
                        disabled={isRecovering}
                        variant="default"
                        className="bg-orange-600 hover:bg-orange-700 text-white shrink-0 w-full sm:w-auto"
                      >
                        {isRecovering ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Recovering...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Recover Items Now
                          </>
                        )}
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
              
              {/* Manual Scan Button (only visible if list is empty and no banner) */}
              {!lostInventory?.found && items.length === 0 && (
                <div className="mb-6 flex justify-end">
                   <Button variant="outline" size="sm" onClick={handleManualScan} disabled={isRecovering} className="w-full sm:w-auto">
                      {isRecovering ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Search className="mr-2 h-3 w-3" />}
                      Deep Scan for Lost Items
                   </Button>
                </div>
              )}

              <div className="space-y-4">
                {/* Search Mode Toggle */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-foreground">Search</h3>
                    {useAdvancedSearch && (
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                        <Sparkles className="h-3 w-3 mr-1" />
                        AI-Powered
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <InventoryModuleHelp
                      userId={user.id}
                      totalItems={totalCount}
                      lowStockItems={displayLowStockCount}
                      onSearchExample={(query) => {
                        setUseAdvancedSearch(true);
                        setSearchQuery(query);
                        setCurrentPage(1);
                        setActiveTab('items');
                      }}
                      onFilterByStatus={(status) => {
                        setStatusFilter(status);
                        setCurrentPage(1);
                        setActiveTab('items');
                      }}
                      onShowOutOfStock={() => {
                        setActiveTab('low-stock');
                        setCurrentPage(1);
                      }}
                      onClearFilters={() => {
                        setSearchQuery('');
                        setCategoryFilter('all');
                        setStatusFilter('all');
                        setCurrentPage(1);
                        setActiveTab('items');
                      }}
                      onOpenAddItem={() => {
                        setActiveTab('items');
                        handleOpenDialog();
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setUseAdvancedSearch(!useAdvancedSearch)}
                      className="text-xs"
                    >
                      {useAdvancedSearch ? (
                        <>
                          <Zap className="h-3 w-3 mr-1" />
                          Advanced: ON
                        </>
                      ) : (
                        'Basic Search'
                      )}
                    </Button>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <div className="flex-1 relative min-w-0" data-tour="inventory-search">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={useAdvancedSearch 
                        ? "Try: 'tools under $50', 'red paint in stock'..." 
                        : "Search by name, SKU, or description..."
                      }
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                      className="pl-10 w-full min-w-0"
                    />
                    
                    {/* Search Suggestions */}
                    {showSuggestions && searchSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-background border border-border rounded-md shadow-lg">
                        {searchSuggestions.map((suggestion, idx) => (
                          <button
                            key={idx}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-muted first:rounded-t-md last:rounded-b-md"
                            onClick={() => {
                              setSearchQuery(suggestion);
                              setShowSuggestions(false);
                            }}
                          >
                            <Search className="h-3 w-3 inline mr-2 text-muted-foreground shrink-0" />
                            <span className="truncate">{suggestion}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                <div className="flex flex-col xs:flex-row sm:flex-row gap-2 sm:gap-4 w-full sm:w-auto">
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue placeholder="Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="discontinued">Discontinued</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Search Info */}
              {useAdvancedSearch && searchQuery && (
                <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-md overflow-hidden">
                  <p className="text-sm text-purple-900 break-words">
                    <Sparkles className="h-4 w-4 inline mr-1 shrink-0 align-text-bottom" />
                    <strong>AI Assistant:</strong> {aiExplanation || "Using fuzzy matching, semantic understanding, and natural language processing..."}
                  </p>
                  <p className="text-xs text-purple-700 mt-1 break-words">
                    Try: "tools under $50" • "red paint" • "low stock items" • "screws or bolts" • "cheap materials"
                  </p>
                </div>
              )}
            </div>
            </CardContent>
          </Card>

          {/* Search Results Summary */}
          {searchQuery && totalCount > 0 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground px-2">
              <span>
                Found <strong>{totalCount}</strong> {totalCount === 1 ? 'item' : 'items'}
                {useAdvancedSearch && ' (server-side search)'}
              </span>
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchQuery('')}
                  className="text-xs"
                >
                  Clear search
                </Button>
              )}
            </div>
          )}

          {/* Items List */}
          <div className="grid grid-cols-1 gap-4" data-tour="inventory-list">
            {isLoading ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Loading inventory...
                </CardContent>
              </Card>
            ) : filteredItems.length === 0 ? (
              <Card data-tour="inventory-list">
                <CardContent className="py-12 text-center">
                  <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-muted-foreground">
                    {searchQuery ? 'No items match your search' : 'No inventory items found'}
                  </p>
                  {searchQuery && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Try using different keywords or{' '}
                      <button
                        onClick={() => setSearchQuery('')}
                        className="text-purple-600 hover:underline"
                      >
                        clear your search
                      </button>
                    </p>
                  )}
                  <Button className="mt-4" onClick={() => handleOpenDialog()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Item
                  </Button>
                </CardContent>
              </Card>
            ) : (
              filteredItems.map((item: any) => (
                <Card key={item.id} className={
                  item.quantityOnHand <= 0
                    ? 'border-red-300' 
                    : (item._searchScore && item._searchScore > 0.8 ? 'border-purple-200' : '')
                }>
                  <CardContent className="pt-4 sm:pt-6">
                    <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                      {/* Product Header & Image Mobile Row */}
                      <div className="flex gap-4 lg:hidden">
                        {/* Mobile Image */}
                        <div className="w-20 h-20 sm:w-32 sm:h-32 flex-shrink-0">
                          {item.imageUrl ? (
                            <img 
                              src={item.imageUrl} 
                              className="w-full h-full object-contain rounded border bg-muted" 
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center rounded border bg-muted">
                              <ImageIcon className="h-8 w-8 sm:h-12 sm:w-12 text-gray-300" />
                            </div>
                          )}
                        </div>
                        
                        {/* Mobile Title & Basics */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex gap-1 shrink-0">
                                {canChange('inventory', user.role) && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                  onClick={() => handleRegenerateKeywords(item.id, item.name)}
                                  title="Regenerate Search Keywords"
                                >
                                  <RefreshCw className="h-4 w-4" />
                                </Button>
                                )}
                              {canChange('inventory', user.role) && (
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => handleOpenDialog(item)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              )}
                              {canDelete('inventory', user.role) && (
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(item.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                              )}
                            </div>
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground truncate mt-1">SKU: {item.sku}</p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${
                              item.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' :
                              item.status === 'inactive' ? 'bg-muted text-foreground border-border' :
                              'bg-red-50 text-red-700 border-red-200'
                            }`}>
                              {item.status}
                            </Badge>
                            {item.quantityOnHand <= 0 && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-red-50 text-red-700 border-red-200">
                                Out of Stock
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Desktop Image */}
                      <div className="hidden lg:block w-32 h-32 flex-shrink-0">
                        {item.imageUrl ? (
                          <img 
                            src={item.imageUrl} 
                            className="w-full h-full object-contain rounded border bg-muted" 
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center rounded border bg-muted">
                            <ImageIcon className="h-12 w-12 text-gray-300" />
                          </div>
                        )}
                      </div>
                      
                      {/* Left Section - Item Info */}
                      <div className="flex-1">
                        <div className="hidden lg:flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={
                                item.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' :
                                item.status === 'inactive' ? 'bg-muted text-foreground border-border' :
                                'bg-red-50 text-red-700 border-red-200'
                              }>
                                {item.status}
                              </Badge>
                              {item.quantityOnHand <= 0 && (
                                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Out of Stock
                                </Badge>
                              )}
                              {/* Search Match Indicators */}
                              {useAdvancedSearch && item._matchType && searchQuery && (
                                <Badge variant="outline" className={
                                  item._matchType === 'exact' ? 'bg-purple-100 text-purple-800 border-purple-300' :
                                  item._matchType === 'fuzzy' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                                  item._matchType === 'semantic' ? 'bg-green-100 text-green-800 border-green-300' :
                                  'bg-muted text-foreground border-border'
                                }>
                                  {item._matchType === 'exact' && '🎯 Exact'}
                                  {item._matchType === 'fuzzy' && '✨ Fuzzy'}
                                  {item._matchType === 'semantic' && '🧠 Smart'}
                                  {item._matchType === 'partial' && '📝 Match'}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">SKU: {item.sku}</p>
                            {item.description && (<p className="text-sm text-muted-foreground mt-1">{decodeHtmlEntities(item.description)}</p>)}
                            {/* Show matched fields for advanced search */}
                            {useAdvancedSearch && item._matchedFields && item._matchedFields.length > 0 && searchQuery && (
                              <p className="text-xs text-purple-600 mt-2">
                                <Sparkles className="h-3 w-3 inline mr-1" />
                                Matched in: {item._matchedFields.join(', ')}
                                {item._searchScore && (
                                  <span className="ml-2 text-purple-500">
                                    ({Math.round(item._searchScore * 100)}% relevant)
                                  </span>
                                )}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAddToShoppingList(item)}
                              title="Add to Shopping List"
                              className="border-emerald-200 hover:bg-emerald-50 text-emerald-700"
                            >
                              <ShoppingCart className="h-4 w-4" />
                            </Button>
                            {canChange('inventory', user.role) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRegenerateKeywords(item.id, item.name)}
                              title="Regenerate Search Keywords"
                            >
                              <RefreshCw className="h-4 w-4 text-blue-600" />
                            </Button>
                            )}
                            {canChange('inventory', user.role) && (
                            <Button variant="outline" size="sm" onClick={() => handleOpenDialog(item)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            )}
                            {canDelete('inventory', user.role) && (
                            <Button variant="outline" size="sm" onClick={() => handleDelete(item.id)}>
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                            )}
                          </div>
                        </div>

                        {/* Mobile Description & Matches */}
                        <div className="lg:hidden mt-2">
                          {item.description && (<p className="text-sm text-muted-foreground mt-1">{decodeHtmlEntities(item.description)}</p>)}
                          {/* Search Match Indicators */}
                          {useAdvancedSearch && item._matchType && searchQuery && (
                            <Badge variant="outline" className={`mt-2 text-[10px] px-1.5 py-0 ${
                              item._matchType === 'exact' ? 'bg-purple-100 text-purple-800 border-purple-300' :
                              item._matchType === 'fuzzy' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                              item._matchType === 'semantic' ? 'bg-green-100 text-green-800 border-green-300' :
                              'bg-muted text-foreground border-border'
                            }`}>
                              {item._matchType === 'exact' && '🎯 Exact'}
                              {item._matchType === 'fuzzy' && '✨ Fuzzy'}
                              {item._matchType === 'semantic' && '🧠 Smart'}
                              {item._matchType === 'partial' && '📝 Match'}
                            </Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4 mt-4 bg-muted lg:bg-transparent p-3 lg:p-0 rounded-md">
                          <div>
                            <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">Dept / Category</p>
                            <p className="text-xs sm:text-sm text-foreground mt-0.5 truncate" title={item.departmentCode ? `Dept: ${item.departmentCode}` : 'Category'}>
                              {item.departmentCode ? `${item.departmentCode} / ` : ''}{item.category || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">Qty On Hand</p>
                            <p className="text-xs sm:text-sm text-foreground mt-0.5">
                              <span className={item.quantityOnHand <= 0 ? "text-red-600 font-semibold" : "font-medium"}>
                                {item.quantityOnHand}
                              </span>
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">Unit of Measure</p>
                            <p className="text-xs sm:text-sm text-foreground mt-0.5 uppercase">{item.unitOfMeasure || 'ea'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">Qty On Order</p>
                            <p className="text-xs sm:text-sm text-foreground mt-0.5">{item.quantityOnOrder || 0}</p>
                          </div>
                          <div>
                            <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">Reorder Lvl</p>
                            <p className="text-xs sm:text-sm text-foreground mt-0.5">{item.reorderLevel}</p>
                          </div>
                          <div>
                            <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">Cost</p>
                            <p className="text-xs sm:text-sm text-foreground mt-0.5 font-medium">${item.cost.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">Unit Price</p>
                            <p className="text-xs sm:text-sm text-foreground mt-0.5 font-medium text-cyan-700">${item.unitPrice.toFixed(2)}</p>
                          </div>
                        </div>

                        {/* Additional Details */}
                        <div className="flex flex-wrap gap-2 sm:gap-4 mt-3">
                          {item.supplier && (
                            <div className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                              <Tag className="h-3 w-3 text-muted-foreground" />
                              <span className="truncate max-w-[200px] sm:max-w-none">
                                <span className="font-semibold text-muted-foreground mr-1">Supplier:</span>
                                {item.supplier} {item.supplierSKU ? `(SKU: ${item.supplierSKU})` : ''}
                              </span>
                            </div>
                          )}
                          {item.location && (
                            <div className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              <span className="truncate max-w-[150px] sm:max-w-none">
                                <span className="font-semibold text-muted-foreground mr-1">Location:</span>
                                {item.location}
                              </span>
                            </div>
                          )}
                          {item.barcode && (
                            <div className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                              <Barcode className="h-3 w-3 text-muted-foreground" />
                              <span className="truncate max-w-[200px] sm:max-w-none">
                                <span className="font-semibold text-muted-foreground mr-1">UPC / Barcode:</span>
                                {item.barcode}
                              </span>
                            </div>
                          )}
                          {item.notes && (
                            <div className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                              <span className="font-semibold text-muted-foreground mr-1">Notes:</span>
                              <span className="truncate max-w-[250px] sm:max-w-none">{item.notes}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right Section - Pricing Tiers */}
                      <div className="lg:w-80 border-t lg:border-t-0 lg:border-l pt-4 lg:pt-0 lg:pl-4 mt-2 lg:mt-0">
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-xs sm:text-sm text-foreground font-medium lg:font-normal">Price Tiers</p>
                          <div className="lg:hidden p-1 px-2 bg-blue-50 rounded text-[10px] sm:text-xs text-blue-700 font-medium">
                            Margin: {item.cost > 0 ? ((item.priceTier1 - item.cost) / item.cost * 100).toFixed(1) : 0}%
                          </div>
                        </div>
                        {(() => {
                          const activeTiers = getActiveTierNumbers();
                          // Adjust grid columns based on screen size and number of tiers
                          const gridCols = `grid-cols-${Math.min(activeTiers.length, 3)} sm:grid-cols-${Math.min(activeTiers.length, 5)}`;
                          
                          return (
                        <div className={`grid ${gridCols} gap-1.5 sm:gap-2`}>
                          {activeTiers.map((tier) => {
                            const label = getPriceTierLabel(tier);
                            const tierValue = item[`priceTier${tier}` as keyof InventoryItem] as number;
                            const activeTierValues = activeTiers.map(t => item[`priceTier${t}` as keyof InventoryItem] as number);
                            const allSame = activeTierValues.every(v => v === activeTierValues[0]);
                            const isDistinct = !allSame && tier > activeTiers[0] && tierValue !== item.priceTier1;
                            return (
                              <div key={tier} className="text-center">
                                <div className={`rounded px-2 py-1 ${
                                  isDistinct ? 'bg-green-50 border border-green-200' : 'bg-muted'
                                }`}>
                                  <p className={`text-xs ${isDistinct ? 'text-green-700 font-medium' : 'text-muted-foreground'}`} title={`T${tier} — ${label}`}>{label}</p>
                                  <p className={`text-sm mt-1 ${
                                    isDistinct ? 'text-green-900 font-semibold' : 'text-foreground'
                                  }`}>
                                    {`$${tierValue?.toFixed(2) || '0.00'}`}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                          );
                        })()}
                        <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-700">
                          Margin: {item.cost > 0 ? ((item.priceTier1 - item.cost) / item.cost * 100).toFixed(1) : 0}%
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Pagination */}
          {totalCount > itemsPerPage && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 p-4 bg-muted rounded-lg">
              <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 w-full sm:w-auto text-center sm:text-left">
                <div className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} items
                </div>
                <Select value={itemsPerPage.toString()} onValueChange={(value) => {
                  setItemsPerPage(Number(value));
                  setCurrentPage(1); // Reset to first page when changing items per page
                }}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25 / page</SelectItem>
                    <SelectItem value="50">50 / page</SelectItem>
                    <SelectItem value="100">100 / page</SelectItem>
                    <SelectItem value="200">200 / page</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(1)}
                >
                  First
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                >
                  Previous
                </Button>
                
                {/* Page numbers */}
                <div className="hidden sm:flex items-center gap-1">
                  {(() => {
                    const totalPages = Math.ceil(totalCount / itemsPerPage);
                    const pages = [];
                    const maxVisible = 5;
                    
                    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
                    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
                    
                    if (endPage - startPage < maxVisible - 1) {
                      startPage = Math.max(1, endPage - maxVisible + 1);
                    }
                    
                    if (startPage > 1) {
                      pages.push(
                        <Button
                          key={1}
                          variant="outline"
                          size="sm"
                          className={currentPage === 1 ? 'bg-blue-50 border-blue-300' : ''}
                          onClick={() => setCurrentPage(1)}
                        >
                          1
                        </Button>
                      );
                      if (startPage > 2) {
                        pages.push(<span key="ellipsis1" className="px-2">...</span>);
                      }
                    }
                    
                    for (let i = startPage; i <= endPage; i++) {
                      pages.push(
                        <Button
                          key={i}
                          variant="outline"
                          size="sm"
                          className={currentPage === i ? 'bg-blue-50 border-blue-300' : ''}
                          onClick={() => setCurrentPage(i)}
                        >
                          {i}
                        </Button>
                      );
                    }
                    
                    if (endPage < totalPages) {
                      if (endPage < totalPages - 1) {
                        pages.push(<span key="ellipsis2" className="px-2">...</span>);
                      }
                      pages.push(
                        <Button
                          key={totalPages}
                          variant="outline"
                          size="sm"
                          className={currentPage === totalPages ? 'bg-blue-50 border-blue-300' : ''}
                          onClick={() => setCurrentPage(totalPages)}
                        >
                          {totalPages}
                        </Button>
                      );
                    }
                    
                    return pages;
                  })()}
                </div>
                
                <span className="mx-2 text-sm sm:hidden">
                  Page {currentPage} of {Math.ceil(totalCount / itemsPerPage)}
                </span>
                
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage * itemsPerPage >= totalCount}
                  onClick={() => setCurrentPage(currentPage + 1)}
                >
                  Next
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage * itemsPerPage >= totalCount}
                  onClick={() => setCurrentPage(Math.ceil(filteredItems.length / itemsPerPage))}
                >
                  Last
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="low-stock" className="space-y-4 mt-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Items with zero or negative quantity on hand.
              {displayLowStockCount > lowStockItems.length && (
                <span className="ml-1 font-medium">
                  Showing {lowStockItems.length} on this page — {displayLowStockCount.toLocaleString()} total across all pages.
                </span>
              )}
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 gap-4">
            {lowStockItems.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  {displayLowStockCount > 0 ? (
                    <>
                      <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
                      <p className="text-muted-foreground">{displayLowStockCount.toLocaleString()} out-of-stock items exist but none are on this page.</p>
                      <p className="text-sm text-muted-foreground mt-1">Try searching or browsing other pages to find them.</p>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                      <p className="text-muted-foreground">All items are properly stocked!</p>
                    </>
                  )}
                </CardContent>
              </Card>
            ) : (
              lowStockItems.map(item => (
                <Card key={item.id} className="border-red-300">
                  <CardContent className="pt-4 sm:pt-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
                          <Badge variant="outline" className="bg-red-50 text-red-700 shrink-0">
                            Out of Stock
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 truncate">SKU: {item.sku}</p>
                        <div className="flex flex-wrap gap-4 sm:gap-6 mt-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Current Stock</p>
                            <p className="text-sm text-red-600 font-medium mt-1">{item.quantityOnHand} {item.unitOfMeasure}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Category</p>
                            <p className="text-sm text-foreground mt-1 truncate max-w-[150px]">{item.category || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Cost</p>
                            <p className="text-sm text-foreground mt-1">${item.cost.toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto mt-4 sm:mt-0">
                        <Button 
                          variant="outline"
                          onClick={() => handleAddToShoppingList(item)}
                          className="w-full sm:w-auto border-emerald-200 hover:bg-emerald-50 text-emerald-700"
                        >
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          Add to Shopping List
                        </Button>
                        {canChange('inventory', user.role) && (
                          <Button className="w-full sm:w-auto" onClick={() => handleOpenDialog(item)}>
                            Update Stock
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="shopping-list" className="space-y-4 mt-6">
          <ShoppingListSubModule 
            user={user} 
            items={items} 
            availableCategories={availableCategories}
            searchQuery={searchQuery}
            onNavigateToCatalog={() => setActiveTab('items')} 
          />
        </TabsContent>

        <TabsContent value="competitive-pricing" className="space-y-6 mt-6">
          <div className="space-y-6">
            <CompetitivePricingDashboard
              onSelectProduct={(productId) => {
                const item = items.find((i) => i.id === productId || i.sku === productId);
                if (item) {
                  handleOpenDialog(item);
                }
              }}
            />

            {(user.role === 'admin' || user.role === 'super_admin') && (
              <div className="pt-6 border-t">
                <CompetitivePricingAdmin />
              </div>
            )}
          </div>
        </TabsContent>



        {(user.role === 'admin' || user.role === 'super_admin') && (
          <TabsContent value="diagnostic" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Admin Keyword Tools</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    Rebuild AI search keywords for all inventory SKUs in your organization.
                  </p>
                  <Button
                    onClick={handleRegenerateAllKeywords}
                    disabled={isRegeneratingAllKeywords}
                    className="w-full sm:w-auto"
                  >
                    {isRegeneratingAllKeywords ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Regenerating...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Regenerate Keywords for All SKUs
                      </>
                    )}
                  </Button>
                </div>

                {isRegeneratingAllKeywords && keywordRegenProgress && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {keywordRegenProgress.processed.toLocaleString()} / {keywordRegenProgress.total.toLocaleString()} SKUs processed
                      </span>
                      <span>{keywordRegenProgress.percent}%</span>
                    </div>
                    <Progress value={keywordRegenProgress.percent} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      Updated: {keywordRegenProgress.updated.toLocaleString()}
                      {keywordRegenProgress.failed > 0 ? ` • Failed: ${keywordRegenProgress.failed.toLocaleString()}` : ''}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
            <InventoryDiagnostic user={user} />
          </TabsContent>
        )}
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto bg-background p-4 sm:p-6" onPaste={handleImagePaste}>
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Item' : 'Add New Item'}</DialogTitle>
            <DialogDescription>
              {editingItem ? 'Update the details of an existing inventory item.' : 'Add a new item to your inventory.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-sm text-foreground">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-foreground font-medium">Item Name / Name *</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter item name"
                  />
                </div>
                <div>
                  <label className="text-sm text-foreground">SKU *</label>
                  <Input
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="Enter SKU"
                  />
                </div>
                <div>
                  <label className="text-sm text-foreground">Category</label>
                  <Input
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="Enter category"
                  />
                </div>
                <div>
                  <label className="text-sm text-foreground font-medium">Unit of Measure / Unit_of_Measure</label>
                  <Select value={formData.unitOfMeasure} onValueChange={(value) => setFormData({ ...formData, unitOfMeasure: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ea">Each (ea)</SelectItem>
                      <SelectItem value="box">Box</SelectItem>
                      <SelectItem value="case">Case</SelectItem>
                      <SelectItem value="lb">Pound (lb)</SelectItem>
                      <SelectItem value="kg">Kilogram (kg)</SelectItem>
                      <SelectItem value="ft">Foot (ft)</SelectItem>
                      <SelectItem value="m">Meter (m)</SelectItem>
                      <SelectItem value="gal">Gallon (gal)</SelectItem>
                      <SelectItem value="l">Liter (l)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm text-foreground">Description</label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter item description"
                    rows={2}
                  />
                </div>
              </div>
            </div>

            {/* Stock Information */}
            <div className="space-y-4">
              <h3 className="text-sm text-foreground">Stock Information</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm text-foreground">Quantity On Hand</label>
                  <Input
                    type="number"
                    value={formData.quantityOnHand}
                    onChange={(e) => setFormData({ ...formData, quantityOnHand: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="text-sm text-foreground font-medium">Quantity On Order / Quantity_on_order</label>
                  <Input
                    type="number"
                    value={formData.quantityOnOrder}
                    onChange={(e) => setFormData({ ...formData, quantityOnOrder: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="text-sm text-foreground font-medium">Reorder Level / Reorder_level</label>
                  <Input
                    type="number"
                    value={formData.reorderLevel}
                    onChange={(e) => setFormData({ ...formData, reorderLevel: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="text-sm text-foreground">Min Stock</label>
                  <Input
                    type="number"
                    value={formData.minStock}
                    onChange={(e) => setFormData({ ...formData, minStock: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-foreground">Max Stock</label>
                  <Input
                    type="number"
                    value={formData.maxStock}
                    onChange={(e) => setFormData({ ...formData, maxStock: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>

            {/* Pricing Information */}
            <div className="space-y-4">
              <h3 className="text-sm text-foreground">Pricing (Multi-Tier)</h3>
              <p className="text-xs text-muted-foreground">Tier 1 is also used as the base Unit Price. Set each tier independently for tiered pricing.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm text-foreground">Cost (Base)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: Number(e.target.value) })}
                    placeholder="0.00"
                  />
                </div>
                {getActiveTierNumbers().map(tier => {
                  const tierKey = `priceTier${tier}` as keyof typeof formData;
                  return (
                    <div key={tier}>
                      <label className="text-sm text-foreground">T{tier} — {getPriceTierLabel(tier)}</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData[tierKey] as number}
                        onChange={(e) => setFormData({ ...formData, [tierKey]: Number(e.target.value) })}
                        placeholder="0.00"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Competitive Pricing Panel (for existing items) */}
            {editingItem && (
              <div className="pt-2">
                <CompetitivePricingPanel
                  productId={editingItem.id}
                  sku={editingItem.sku}
                  productName={editingItem.name}
                  description={editingItem.description}
                  currentPrice={editingItem.unitPrice || editingItem.priceTier1 || 0}
                  unitOfMeasure={editingItem.unitOfMeasure || 'EA'}
                  manufacturerPartNumber={editingItem.supplierSKU || (editingItem as any).supplier_sku || editingItem.mfgPartNumber}
                  upc={editingItem.upc || (editingItem as any).barcode}
                  category={editingItem.category}
                />
              </div>
            )}

            {/* Supplier Information */}
            <div className="space-y-4">
              <h3 className="text-sm text-foreground">Supplier Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm text-foreground font-medium">Supplier / Supplier</label>
                  <Input
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    placeholder="Supplier name"
                  />
                </div>
                <div>
                  <label className="text-sm text-foreground font-medium">Supplier SKU / Supplier_SKU</label>
                  <Input
                    value={formData.supplierSKU}
                    onChange={(e) => setFormData({ ...formData, supplierSKU: e.target.value })}
                    placeholder="Supplier SKU"
                  />
                </div>
                <div>
                  <label className="text-sm text-foreground">Lead Time (days)</label>
                  <Input
                    type="number"
                    value={formData.leadTimeDays}
                    onChange={(e) => setFormData({ ...formData, leadTimeDays: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>

            {/* Additional Details */}
            <div className="space-y-4">
              <h3 className="text-sm text-foreground">Additional Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm text-foreground font-medium">UPC / Barcode</label>
                  <Input
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    placeholder="Enter barcode"
                  />
                </div>
                <div>
                  <label className="text-sm text-foreground">Location/Bin</label>
                  <Input
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g., Aisle 5, Bin 12"
                  />
                </div>
                <div>
                  <label className="text-sm text-foreground">Status</label>
                  <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="discontinued">Discontinued</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm text-foreground">Price Levels</label>
                  <Input
                    value={formData.priceLevels}
                    onChange={(e) => setFormData({ ...formData, priceLevels: e.target.value })}
                    placeholder="Enter price levels"
                  />
                </div>
                <div>
                  <label className="text-sm text-foreground font-medium">Department Code / Department_code</label>
                  <Input
                    value={formData.departmentCode}
                    onChange={(e) => setFormData({ ...formData, departmentCode: e.target.value })}
                    placeholder="Enter department code"
                  />
                </div>
                <div className="sm:col-span-2 md:col-span-3">
                  <label className="text-sm text-foreground">Tags (comma-separated)</label>
                  <Input
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="e.g., electronics, featured, on-sale"
                  />
                </div>
                <div className="sm:col-span-2 md:col-span-3">
                  <label className="text-sm text-foreground">Notes</label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes about this item"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Product Image */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-foreground">Product Image</h3>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground font-medium">Image URL</label>
                  <Input
                    type="text"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    placeholder="https://example.com/image.png"
                  />
                </div>
                <div className="flex gap-2">
                  <label className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file);
                      }}
                      className="hidden"
                    />
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      type="button" 
                      onClick={(e) => {
                        const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                        input?.click();
                      }}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Image
                    </Button>
                  </label>
                  <Button 
                    variant="outline" 
                    type="button"
                    onClick={() => {
                      toast.info('Press Ctrl+V (or Cmd+V on Mac) to paste an image');
                    }}
                    title="Paste image from clipboard"
                  >
                    <Clipboard className="h-4 w-4" />
                  </Button>
                </div>
                {formData.imageUrl && (
                  <div className="relative mt-2">
                    <img 
                      src={formData.imageUrl} 
                      alt="Product" 
                      className="w-full h-48 object-contain rounded border bg-muted" 
                    />
                    <Button
                      size="sm"
                      variant="destructive"
                      className="absolute top-2 right-2"
                      onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Upload an image or paste from clipboard (Ctrl+V / Cmd+V)
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 mt-6 pt-6 border-t">
            <Button variant="outline" onClick={() => setShowDialog(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button onClick={handleSave} className="w-full sm:w-auto">
              {editingItem ? 'Update Item' : 'Create Item'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </PermissionGate>
  );
}