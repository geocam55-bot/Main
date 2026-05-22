
import React, { useState, useEffect } from 'react';
import { Dialog } from './ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { 
  Clock,
  Calendar as CalendarIcon,
  Trash2,
  PlayCircle,
  History,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  ArrowLeft
} from 'lucide-react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner@2.0.3';
import { createClient } from '../utils/supabase/client';
import { contactsAPI, inventoryAPI, bidsAPI, quotesAPI, settingsAPI } from '../utils/api';
import type { User } from '../App';
import { PermissionGate } from './PermissionGate';
import { getPriceTierLabel } from '../lib/global-settings';
import { ScheduledJobsModuleHelp } from './ScheduledJobsModuleHelp';
import { BackgroundProcessingModuleHelp } from './BackgroundProcessingModuleHelp';
import {
  buildCsv,
  buildCustomText,
  buildXml,
  downloadTextFile,
  filterTemplatesByModule,
  sanitizeFilename
} from '../utils/export-engine';

function ScheduledJobs(props) {
  // State for editing a job
  const [jobs, setJobs] = useState([]);
  const [editJob, setEditJob] = useState(null);
  const [editScheduleDateTime, setEditScheduleDateTime] = useState('');
  const [editRepeatType, setEditRepeatType] = useState('none');
  const [editRepeatInterval, setEditRepeatInterval] = useState(1);
  const [editRepeatCustomUnit, setEditRepeatCustomUnit] = useState('days');
  const [editRepeatEndDate, setEditRepeatEndDate] = useState('');
  const [editRepeatDaysOfWeek, setEditRepeatDaysOfWeek] = useState([]);
  const [editRepeatDaysOfMonth, setEditRepeatDaysOfMonth] = useState([]);

  // ...existing code...

  const processJob = async (job: any) => {
    const supabase = createClient();
    try {
      // Mark as processing
      await supabase
        .from('scheduled_jobs')
        .update({ status: 'processing' })
        .eq('id', job.id);

      let recordCount = 0;
      if (job.job_type === 'export') {
        recordCount = await executeExport(job);
      } else if (job.job_type === 'import') {
        recordCount = await executeImport(job);
      }

      // Mark as completed
      await supabase
        .from('scheduled_jobs')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString(),
          record_count: recordCount
        })
        .eq('id', job.id);

      // --- Repeat scheduling logic ---
      if (job.repeat_type && job.repeat_type !== 'none') {
        let nextTime: Date | null = null;
        const current = new Date(job.scheduled_time);
        if (job.repeat_type === 'daily') {
          nextTime = new Date(current.getTime() + 24 * 60 * 60 * 1000);
        } else if (job.repeat_type === 'weekly' && Array.isArray(job.repeat_days_of_week)) {
          // Find next selected weekday
          const days = job.repeat_days_of_week.sort();
          const currentDay = current.getDay(); // 0=Sun, 1=Mon, ...
          let minDiff = 8, nextDay = null;
          for (const d of days) {
            let diff = (d + 1 - currentDay + 7) % 7;
            if (diff === 0) diff = 7;
            if (diff < minDiff) { minDiff = diff; nextDay = d; }
          }
          nextTime = new Date(current.getTime() + minDiff * 24 * 60 * 60 * 1000);
        } else if (job.repeat_type === 'monthly' && Array.isArray(job.repeat_days_of_month)) {
          // Find next selected day of month
          const days = job.repeat_days_of_month.sort((a,b)=>a-b);
          const currentDay = current.getDate();
          let nextDay = days.find(d => d > currentDay);
          let nextMonth = current.getMonth();
          let year = current.getFullYear();
          if (!nextDay) {
            nextDay = days[0];
            nextMonth += 1;
            if (nextMonth > 11) { nextMonth = 0; year += 1; }
          }
          nextTime = new Date(year, nextMonth, nextDay, current.getHours(), current.getMinutes());
        } else if (job.repeat_type === 'custom' && job.repeat_interval && job.repeat_custom_unit) {
          let ms = 0;
          if (job.repeat_custom_unit === 'days') ms = job.repeat_interval * 24 * 60 * 60 * 1000;
          if (job.repeat_custom_unit === 'weeks') ms = job.repeat_interval * 7 * 24 * 60 * 60 * 1000;
          if (job.repeat_custom_unit === 'months') {
            const nextMonth = new Date(current);
            nextMonth.setMonth(nextMonth.getMonth() + job.repeat_interval);
            nextTime = nextMonth;
          } else {
            nextTime = new Date(current.getTime() + ms);
          }
        }
        // Check end date
        if (nextTime && (!job.repeat_end_date || nextTime <= new Date(job.repeat_end_date))) {
          // Insert next job occurrence
          const { id, status, completed_at, error_message, record_count, ...rest } = job;
          await supabase.from('scheduled_jobs').insert({
            ...rest,
            scheduled_time: nextTime.toISOString(),
            status: 'pending',
            completed_at: null,
            error_message: null,
            record_count: null,
          });
        }
      }

      toast.success(`${job.job_type === 'import' ? 'Import' : 'Export'} completed: ${recordCount} records`);
    } catch (error: any) {
      await supabase
        .from('scheduled_jobs')
        .update({ 
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: error.message
        })
        .eq('id', job.id);
      toast.error(`Job failed: ${error.message}`);
    }
  };

  const normalizeQuoteRows = (quotes: any[]) => {
    return quotes.map((q: any) => {
      const lineItemsRaw = q.line_items || q.lineItems;
      const lineItems = Array.isArray(lineItemsRaw)
        ? lineItemsRaw
        : (() => {
            if (typeof lineItemsRaw !== 'string' || !lineItemsRaw.trim()) return [];
            try {
              const parsed = JSON.parse(lineItemsRaw);
              return Array.isArray(parsed) ? parsed : [];
            } catch {
              return [];
            }
          })();

      const skuValues = lineItems
        .map((item: any) => item?.sku || item?.item_sku || item?.inventory_sku || '')
        .map((value: string) => String(value).trim())
        .filter(Boolean);

      const uniqueSkus = Array.from(new Set(skuValues));
      const skuDescriptions = lineItems
        .map((item: any) => item?.description || item?.desc || item?.itemName || item?.item_name || item?.name || item?.title || '')
        .map((value: unknown) => String(value ?? '').trim())
        .filter(Boolean);
      const uniqueSkuDescriptions = Array.from(new Set(skuDescriptions));

      const skuUnits = lineItems
        .map((item: any) => item?.unit_of_measure || item?.unitOfMeasure || item?.uom || item?.unit || '')
        .map((value: unknown) => String(value ?? '').trim())
        .filter(Boolean);
      const uniqueSkuUnits = Array.from(new Set(skuUnits));

      const skuQuantityPairs = lineItems
        .map((item: any) => {
          const sku = String(item?.sku || item?.item_sku || item?.inventory_sku || '').trim();
          if (!sku) return '';
          const qty = Number(item?.quantity ?? item?.qty ?? 0);
          return `${sku}:${Number.isFinite(qty) ? qty : 0}`;
        })
        .filter(Boolean);

      const skuUnitPricePairs = lineItems
        .map((item: any) => {
          const sku = String(item?.sku || item?.item_sku || item?.inventory_sku || '').trim();
          if (!sku) return '';
          const unitPrice = Number(item?.unitPrice ?? item?.unit_price ?? item?.price ?? 0);
          return `${sku}:${Number.isFinite(unitPrice) ? unitPrice : 0}`;
        })
        .filter(Boolean);

      const skuLineTotalPairs = lineItems
        .map((item: any) => {
          const sku = String(item?.sku || item?.item_sku || item?.inventory_sku || '').trim();
          if (!sku) return '';
          const qty = Number(item?.quantity ?? item?.qty ?? 0);
          const unitPrice = Number(item?.unitPrice ?? item?.unit_price ?? item?.price ?? 0);
          const explicitTotal = Number(item?.total ?? item?.line_total ?? item?.subtotal);
          const lineTotal = Number.isFinite(explicitTotal) ? explicitTotal : qty * unitPrice;
          return `${sku}:${Number.isFinite(lineTotal) ? lineTotal : 0}`;
        })
        .filter(Boolean);

      const skuTotalQuantity = lineItems.reduce((sum: number, item: any) => {
        const qty = Number(item?.quantity ?? item?.qty ?? 0);
        return sum + (Number.isFinite(qty) ? qty : 0);
      }, 0);

      return {
        quote_number: q.quote_number || q.quoteNumber || '',
        title: q.title || q.projectName || '',
        contact_name: q.contact_name || q.contactName || '',
        contact_email: q.contact_email || q.contactEmail || '',
        status: q.status || '',
        price_tier: q.price_tier || q.priceTier || '',
        valid_until: q.valid_until || q.validUntil || '',
        subtotal: q.subtotal ?? '',
        tax_amount: q.tax_amount ?? q.tax ?? '',
        total: q.total ?? '',
        sku: uniqueSkus[0] || '',
        skus: uniqueSkus.join('|'),
        sku_description: uniqueSkuDescriptions[0] || '',
        sku_descriptions: uniqueSkuDescriptions.join('|'),
        sku_unit: uniqueSkuUnits[0] || '',
        sku_units: uniqueSkuUnits.join('|'),
        sku_total_quantity: skuTotalQuantity,
        sku_quantities: skuQuantityPairs.join('|'),
        sku_unit_prices: skuUnitPricePairs.join('|'),
        sku_line_totals: skuLineTotalPairs.join('|'),
        line_items_count: lineItems.length,
        notes: q.notes || '',
        terms: q.terms || '',
      };
    });
  };

  const executeExport = async (job: ScheduledJob): Promise<number> => {
    const dataType = job.data_type;
    const exportOptions = job.file_data?.export_options;
    let data: any[] = [];

    if (dataType === 'contacts') {
      const response = await contactsAPI.getAll('team');
      data = response.contacts || [];
      const csvContent = [
        'name,email,phone,company,trade,address,status,priceLevel,notes,legacyNumber,accountOwnerNumber,ptdSales,ptdGpPercent,ytdSales,ytdGpPercent,lyrSales,lyrGpPercent',
        ...data.map((c: any) => 
          `"${c.name}","${c.email}","${c.phone || ''}","${c.company || ''}","${c.trade || ''}","${c.address || ''}","${c.status || ''}","${c.priceLevel || ''}","${c.notes || ''}","${c.legacyNumber || ''}","${c.accountOwnerNumber || ''}","${c.ptdSales || ''}","${c.ptdGpPercent || ''}","${c.ytdSales || ''}","${c.ytdGpPercent || ''}","${c.lyrSales || ''}","${c.lyrGpPercent || ''}"`
        )
      ].join('\n');
      downloadTextFile(
        csvContent,
        job.file_name || `${dataType}_export_${new Date().toISOString().split('T')[0]}.csv`,
        'text/csv;charset=utf-8;'
      );
    } else if (dataType === 'inventory') {
      const response = await inventoryAPI.getAll();
      data = response.items || [];
      const csvContent = [
        'name,sku,description,category,quantity,quantity_on_order,unit_price,cost',
        ...data.map((i: any) => 
          `\"${i.name}\",\"${i.sku}\",\"${i.description || ''}\",\"${i.category}\",\"${i.quantity}\",\"${i.quantity_on_order}\",\"${i.unit_price}\",\"${i.cost || ''}\"`
        )
      ].join('\n');
      downloadTextFile(
        csvContent,
        job.file_name || `${dataType}_export_${new Date().toISOString().split('T')[0]}.csv`,
        'text/csv;charset=utf-8;'
      );
    } else if (dataType === 'bids') {
      if (exportOptions?.entity === 'quotes') {
        const response = await quotesAPI.getAll('team');
        data = response.quotes || [];
        const rows = normalizeQuoteRows(data);
        const format = exportOptions.format || 'csv';

        if (format === 'xml') {
          const xmlContent = buildXml(rows, 'quotes', 'quote');
          downloadTextFile(
            xmlContent,
            job.file_name || `quotes_export_${new Date().toISOString().split('T')[0]}.xml`,
            'application/xml;charset=utf-8;'
          );
          return data.length;
        }

        if (format === 'custom') {
          const settings = await settingsAPI.getOrganizationSettings(job.organization_id);
          const templates = filterTemplatesByModule(
            (settings?.export_templates || []) as CustomExportTemplate[]
          );
      let preloadedAuth: any = undefined;
      if (authUser) {
        const { ensureUserProfile } = await import('../utils/ensure-profile');
        const profile = await ensureUserProfile(authUser.id);
        preloadedAuth = { userId: authUser.id, profile };
      }

      for (const record of data) {
        try {
          // Clean the contact data
          const cleanContact: any = {
            name: record.name ? String(record.name).trim() : '',
          };

          const stringFields = [
            'email', 'phone', 'company', 'trade', 'status', 'priceLevel', 'address', 'city', 
            'province', 'postalCode', 'notes', 'legacyNumber', 'accountOwnerNumber'
          ];
          
          const numericFields = [
            'ptdSales', 'ptdGpPercent', 'ytdSales', 'ytdGpPercent', 'lyrSales', 'lyrGpPercent'
          ];

          stringFields.forEach(field => {
            if (record[field] !== undefined) {
              cleanContact[field] = record[field] != null ? String(record[field]).trim() : '';
            }
          });

          numericFields.forEach(field => {
            if (record[field] !== undefined) {
              if (record[field] === null || record[field] === '') {
                cleanContact[field] = null;
              } else {
                const val = parseFloat(record[field]);
                cleanContact[field] = !isNaN(val) ? val : null;
              }
            }
          });

          // Use the modern upsert API (handles legacy number matching, custom column detection, and auth context)
          await contactsAPI.upsertByLegacyNumber(cleanContact, preloadedAuth);

          successCount++;
        } catch (error: any) {
          errors.push(error.message);
        }
      }
    } else if (job.data_type === 'inventory') {
      // Validate and clean inventory data before bulk upsert
      const cleanedInventory = [];
      
      for (const record of data) {
        try {
          // Validate required fields
          if (!record.name || !record.sku) {
            errors.push(`Skipping record - Missing required fields (name: ${record.name}, sku: ${record.sku})`);
            continue;
          }

          // Clean the inventory data
          const cleanItem: any = {
            name: record.name,
            sku: record.sku,
            description: record.description || '',
            quantity: parseInt(record.quantity) || 0,
            quantity_on_order: parseInt(record.quantity_on_order) || 0,
            unit_price: parseFloat(record.unit_price) || 0,
            cost: parseFloat(record.cost) || 0,
            // Note: location, supplier, notes removed - not in simplified schema
          };

          cleanedInventory.push(cleanItem);
        } catch (error: any) {
          errors.push(`Error cleaning inventory record: ${error.message}`);
        }
      }

      // Use bulk upsert with cleaned data
      if (cleanedInventory.length > 0) {
        try {
          const result = await inventoryAPI.bulkUpsertBySKU(cleanedInventory);
          successCount = result.created + result.updated;
        } catch (error: any) {
          throw new Error(`Inventory import failed: ${error.message}`);
        }
      } else {
        throw new Error('No valid inventory records to import');
      }
    } else if (job.data_type === 'bids') {
      for (const record of data) {
        try {
          if (!record.clientName || !record.projectName) {
            throw new Error('Missing required fields (clientName, projectName)');
          }

          const cleanBid: any = {
            clientName: record.clientName,
            projectName: record.projectName,
            description: record.description || '',
            subtotal: parseFloat(record.subtotal) || 0,
            tax_amount: parseFloat(record.tax) || 0, // Map 'tax' → 'tax_amount' (actual bids table column)
            total: parseFloat(record.total) || 0,
            status: record.status || 'Draft',
            validUntil: record.validUntil || '',
            notes: record.notes || '',
            terms: record.terms || '',
          };

          await bidsAPI.create(cleanBid);
          successCount++;
        } catch (error: any) {
          errors.push(error.message);
        }
      }
    }

    if (errors.length > 0) {
      // Import completed with errors
    }

    return successCount;
  };

  const loadJobs = async () => {
    try {
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('scheduled_jobs')
        .select('*')
        .eq('organization_id', user.organizationId)
        .order('scheduled_time', { ascending: false })
        .limit(50);

      if (error) throw error;

      setJobs(data || []);
    } catch (error: any) {
      // Failed to load scheduled jobs
    } finally {
      setIsLoading(false);
    }
  };

  const cancelJob = async (jobId: string) => {
    try {
      setIsProcessing(true);
      const supabase = createClient();

      const { error } = await supabase
        .from('scheduled_jobs')
        .update({ 
          status: 'cancelled',
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId)
        .eq('organization_id', user.organizationId);

      if (error) throw error;

      toast.success('Job cancelled successfully');
      loadJobs();
    } catch (error: any) {
      toast.error('Failed to cancel job: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const deleteJob = async (jobId: string) => {
    try {
      setIsProcessing(true);
      const supabase = createClient();

      const { error } = await supabase
        .from('scheduled_jobs')
        .delete()
        .eq('id', jobId)
        .eq('organization_id', user.organizationId);

      if (error) throw error;

      toast.success('Job deleted successfully');
      loadJobs();
    } catch (error: any) {
      toast.error('Failed to delete job: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: ScheduledJob['status']) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Pending</Badge>;
      case 'processing':
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Processing</Badge>;
      case 'completed':
        return <Badge className="bg-green-100 text-green-700 border-green-200">Completed</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-700 border-red-200">Failed</Badge>;
      case 'cancelled':
        return <Badge className="bg-muted text-foreground border-border">Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getJobTypeIcon = (jobType: 'import' | 'export') => {
    return jobType === 'import' ? '📥' : '📤';
  };

  const pendingJobs = jobs.filter(j => j.status === 'pending');
  const completedJobs = jobs.filter(j => ['completed', 'failed', 'cancelled'].includes(j.status));

  // DEBUG: Show all jobs regardless of status
  const showDebugAllJobs = true; // Set to false to hide debug section

  return (
    <PermissionGate user={user} module="import-export" action="view">
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">

      {/* DEBUG: Show all jobs fetched from DB */}
      {showDebugAllJobs && (
        <Card className="border-red-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              Debug: All Jobs ({jobs.length})
            </CardTitle>
            <CardDescription className="text-xs text-red-500">This section lists all jobs fetched from the database, regardless of status. Use for troubleshooting visibility issues.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {jobs.length === 0 ? (
              <div className="text-center text-xs text-muted-foreground">No jobs found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs border">
                  <thead>
                    <tr className="bg-red-50">
                      <th className="border px-2 py-1">ID</th>
                      <th className="border px-2 py-1">Type</th>
                      <th className="border px-2 py-1">Data</th>
                      <th className="border px-2 py-1">Status</th>
                      <th className="border px-2 py-1">Scheduled</th>
                      <th className="border px-2 py-1">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map(job => (
                      <tr key={job.id} className="border-b">
                        <td className="border px-2 py-1 font-mono">{job.id.slice(0, 8)}</td>
                        <td className="border px-2 py-1">{job.job_type}</td>
                        <td className="border px-2 py-1">{job.data_type}</td>
                        <td className="border px-2 py-1">{job.status}</td>
                        <td className="border px-2 py-1">{formatDateTime(job.scheduled_time)}</td>
                        <td className="border px-2 py-1">{formatDateTime(job.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onNavigate && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('import-export')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Import & Export
            </Button>
          )}
          <div>
            <h2 className="text-2xl text-foreground">Scheduled Jobs</h2>
            <p className="text-sm text-muted-foreground">View and manage scheduled import/export jobs</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <BackgroundProcessingModuleHelp
            userId={user.id}
            onRefreshStatus={loadJobs}
            onOpenScheduledJobs={() => onNavigate?.('scheduled-jobs')}
            onOpenBackgroundImports={() => onNavigate?.('background-imports')}
            onShowProcessingCadence={() => toast.info('Due jobs are checked every 60 seconds in this view.')}
            onRunDueJobsCheck={checkAndProcessDueJobs}
          />
          <ScheduledJobsModuleHelp
            userId={user.id}
            pendingJobs={pendingJobs.length}
            completedJobs={completedJobs.length}
            onOpenImportExport={() => onNavigate?.('import-export')}
            onRefreshJobs={loadJobs}
            onProcessDueJobs={checkAndProcessDueJobs}
            onShowPendingGuidance={() => toast.info(`Pending jobs: ${pendingJobs.length}`)}
            onShowHistoryGuidance={() => toast.info(`History entries: ${completedJobs.length}`)}
          />
          <Button variant="outline" onClick={loadJobs} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <History className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Info Alert */}
      <Alert className="border-blue-200 bg-blue-50">
        <Clock className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-900">
          <strong>Auto-Processing Active:</strong> Jobs are automatically checked every minute and will execute when their scheduled time arrives. Keep this page open for jobs to process, or upgrade to background processing with a Supabase Edge Function.
        </AlertDescription>
      </Alert>

      {/* Pending Jobs */}
      {pendingJobs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Pending Jobs ({pendingJobs.length})
            </CardTitle>
            <CardDescription>
              These jobs are scheduled to run automatically
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingJobs.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted"
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getJobTypeIcon(job.job_type)}</span>
                    <span className="font-medium capitalize">
                      {job.job_type} {job.data_type}
                    </span>
                    {getStatusBadge(job.status)}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CalendarIcon className="h-3 w-3" />
                      Scheduled: {formatDateTime(job.scheduled_time)}
                    </span>
                    {job.job_name && (
                      <span className="text-xs bg-blue-50 text-blue-800 px-2 py-1 rounded font-semibold">
                        {job.job_name}
                      </span>
                    )}
                    {job.file_name && (
                      <span className="text-xs bg-muted px-2 py-1 rounded">
                        {job.file_name}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Created by {job.creator_name || 'Unknown'} on {formatDateTime(job.created_at)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditJob(job);
                      setEditScheduleDateTime(job.scheduled_time.slice(0, 16));
                      setEditRepeatType(job.repeat_type || 'none');
                      setEditRepeatInterval(job.repeat_interval || 1);
                      setEditRepeatCustomUnit(job.repeat_custom_unit || 'days');
                      setEditRepeatEndDate(job.repeat_end_date ? job.repeat_end_date.slice(0, 10) : '');
                      setEditRepeatDaysOfWeek(job.repeat_days_of_week || []);
                      setEditRepeatDaysOfMonth(job.repeat_days_of_month || []);
                    }}
                  >Edit</Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => cancelJob(job.id)}
                    disabled={isProcessing}
                    className="text-red-600 hover:bg-red-50"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                </div>
              </div>
            ))}
                {/* Edit Schedule Dialog */}
                {editJob && (
                  <Dialog open={!!editJob} onOpenChange={open => { if (!open) setEditJob(null); }}>
                    <div className="p-6 bg-white rounded shadow max-w-md mx-auto">
                      <h3 className="text-lg font-bold mb-2">Edit Schedule</h3>
                      <Label>Job Name</Label>
                      <Input
                        type="text"
                        value={editJob.job_name || ''}
                        onChange={e => setEditJob({ ...editJob, job_name: e.target.value })}
                        className="mb-2"
                      />
                      <Label>File Name</Label>
                      <Input
                        type="text"
                        value={editJob.file_name || ''}
                        onChange={e => setEditJob({ ...editJob, file_name: e.target.value })}
                        className="mb-2"
                      />
                      <Label>Date & Time</Label>
                      <Input
                        type="datetime-local"
                        value={editScheduleDateTime}
                        onChange={e => setEditScheduleDateTime(e.target.value)}
                        className="mb-2"
                      />
                                            {/* Export options (format, template) if present */}
                                            {editJob.file_data?.export_options && (
                                              <div className="mb-2">
                                                <Label>Export Format</Label>
                                                <select
                                                  className="w-full border rounded p-2 mb-2"
                                                  value={editJob.file_data.export_options.format || ''}
                                                  onChange={e => setEditJob({
                                                    ...editJob,
                                                    file_data: {
                                                      ...editJob.file_data,
                                                      export_options: {
                                                        ...editJob.file_data.export_options,
                                                        format: e.target.value
                                                      }
                                                    }
                                                  })}
                                                >
                                                  <option value="csv">CSV</option>
                                                  <option value="xml">XML</option>
                                                  <option value="custom">Custom</option>
                                                </select>
                                                {editJob.file_data.export_options.format === 'custom' && (
                                                  <>
                                                    <Label>Template ID</Label>
                                                    <Input
                                                      type="text"
                                                      value={editJob.file_data.export_options.templateId || ''}
                                                      onChange={e => setEditJob({
                                                        ...editJob,
                                                        file_data: {
                                                          ...editJob.file_data,
                                                          export_options: {
                                                            ...editJob.file_data.export_options,
                                                            templateId: e.target.value
                                                          }
                                                        }
                                                      })}
                                                      className="mb-2"
                                                    />
                                                  </>
                                                )}
                                              </div>
                                            )}
                                            {/* OneDrive info if present */}
                                            {editJob.file_data?.oneDriveFile && (
                                              <div className="mb-2">
                                                <Label>OneDrive File</Label>
                                                <Input
                                                  type="text"
                                                  value={editJob.file_data.oneDriveFile.name || ''}
                                                  onChange={e => setEditJob({
                                                    ...editJob,
                                                    file_data: {
                                                      ...editJob.file_data,
                                                      oneDriveFile: {
                                                        ...editJob.file_data.oneDriveFile,
                                                        name: e.target.value
                                                      }
                                                    }
                                                  })}
                                                  className="mb-2"
                                                />
                                                <Label>OneDrive Email</Label>
                                                <Input
                                                  type="text"
                                                  value={editJob.file_data.oneDriveFile.email || ''}
                                                  onChange={e => setEditJob({
                                                    ...editJob,
                                                    file_data: {
                                                      ...editJob.file_data,
                                                      oneDriveFile: {
                                                        ...editJob.file_data.oneDriveFile,
                                                        email: e.target.value
                                                      }
                                                    }
                                                  })}
                                                  className="mb-2"
                                                />
                                              </div>
                                            )}
                      <Label>Repeat</Label>
                        <Label>Repeat</Label>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
                            <label key={day} className="flex items-center gap-1 text-xs">
                              <input
                                type="checkbox"
                                checked={editRepeatDaysOfWeek.includes(idx)}
                                onChange={e => {
                                  if (e.target.checked) setEditRepeatDaysOfWeek([...editRepeatDaysOfWeek, idx]);
                                  else setEditRepeatDaysOfWeek(editRepeatDaysOfWeek.filter(d => d !== idx));
                                }}
                              />
                              {day}
                            </label>
                          ))}
                        </div>
                      {editRepeatType === 'monthly' && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {[...Array(31)].map((_, i) => (
                            <label key={i+1} className="flex items-center gap-1 text-xs">
                              <input
                                type="checkbox"
                                checked={editRepeatDaysOfMonth.includes(i+1)}
                                onChange={e => {
                                  if (e.target.checked) setEditRepeatDaysOfMonth([...editRepeatDaysOfMonth, i+1]);
                                  else setEditRepeatDaysOfMonth(editRepeatDaysOfMonth.filter(d => d !== i+1));
                                }}
                              />
                              {i+1}
                            </label>
                          ))}
                        </div>
                      )}
                      {editRepeatType === 'custom' && (
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs">Every</span>
                          <Input
                            type="number"
                            min={1}
                            value={editRepeatInterval}
                            onChange={e => setEditRepeatInterval(Number(e.target.value))}
                            className="w-16"
                          />
                          <select
                            value={editRepeatCustomUnit}
                            onChange={e => setEditRepeatCustomUnit(e.target.value)}
                            className="border rounded p-1"
                          >
                            <option value="days">days</option>
                            <option value="weeks">weeks</option>
                            <option value="months">months</option>
                          </select>
                        </div>
                      )}
                      {editRepeatType !== 'none' && (
                        <div className="mb-2">
                          <Label>End Date (optional)</Label>
                          <Input
                            type="date"
                            value={editRepeatEndDate}
                            onChange={e => setEditRepeatEndDate(e.target.value)}
                          />
                        </div>
                      )}
                      <div className="flex gap-2 justify-end mt-4">
                        <Button variant="outline" onClick={() => setEditJob(null)}>Cancel</Button>
                        <Button
                          onClick={async () => {
                            if (!editJob) return;
                            const supabase = createClient();
                            await supabase.from('scheduled_jobs').update({
                              scheduled_time: new Date(editScheduleDateTime).toISOString(),
                              repeat_type: editRepeatType,
                              repeat_interval: editRepeatType === 'custom' ? editRepeatInterval : null,
                              repeat_custom_unit: editRepeatType === 'custom' ? editRepeatCustomUnit : null,
                              repeat_end_date: editRepeatEndDate ? new Date(editRepeatEndDate).toISOString() : null,
                              repeat_days_of_week: editRepeatType === 'weekly' ? editRepeatDaysOfWeek : null,
                              repeat_days_of_month: editRepeatType === 'monthly' ? editRepeatDaysOfMonth : null,
                            }).eq('id', editJob.id);
                            setEditJob(null);
                            loadJobs();
                            toast.success('Schedule updated');
                          }}
                        >Save</Button>
                      </div>
                    </div>
                  </Dialog>
                )}
          </CardContent>
        </Card>
      )}

      {/* Job History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Job History
          </CardTitle>
          <CardDescription>
            Recent completed, failed, and cancelled jobs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {completedJobs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p>No job history yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {completedJobs.slice(0, 10).map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{getJobTypeIcon(job.job_type)}</span>
                      <span className="font-medium capitalize">
                        {job.job_type} {job.data_type}
                      </span>
                      {getStatusBadge(job.status)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        {job.status === 'completed' ? (
                          <CheckCircle className="h-3 w-3 text-green-600" />
                        ) : (
                          <AlertCircle className="h-3 w-3 text-red-600" />
                        )}
                        {job.completed_at ? formatDateTime(job.completed_at) : 'Not completed'}
                      </span>
                      {job.record_count && (
                        <span className="text-xs bg-muted px-2 py-1 rounded">
                          {job.record_count} records
                        </span>
                      )}
                    </div>
                    {job.error_message && (
                      <p className="text-xs text-red-600">
                        Error: {job.error_message}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Scheduled for {formatDateTime(job.scheduled_time)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteJob(job.id)}
                    disabled={isProcessing}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </PermissionGate>
  );
}
}
}
export default ScheduledJobs;