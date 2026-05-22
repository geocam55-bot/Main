import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { 
  AlertCircle, 
  CheckCircle2, 
  Package, 
  Database,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Info,
  Wrench,
  ArrowRight,
  Shield,
  Search,
  ChevronDown,
  ChevronUp,
  Table2,
  Bug,
  Zap,
  Play,
  Clock,
  FileSpreadsheet,
  Rocket,
  Trash2
} from 'lucide-react';
import { projectId } from '../utils/supabase/info';
import { getServerHeaders } from '../utils/server-headers';
import type { User } from '../App';
import { toast } from 'sonner@2.0.3';

interface InventoryDiagnosticProps {
  user: User;
}

interface DiagnosticData {
  user: {
    email: string;
    orgId: string;
    role: string;
    userId: string;
  };
  counts: {
    totalInDatabase: number;
    inUserOrg: number;
    withNullOrg: number;
    inOtherOrgs: number;
  };
  orgBreakdown: { org_id: string; count: number; is_user_org: boolean }[];
  orgResolutionLog?: string[];
  queryErrors?: Record<string, string>;
  rawSample?: any;
  samples: {
    userOrg: any[];
    nullOrg: any[];
    otherOrgs: any[];
  };
  recentJobs: any[];
  diagnosis: {
    issue: string;
    severity: 'none' | 'warning' | 'critical';
    recommendation: string;
  };
}

interface PendingJobsData {
  totalJobs: number;
  pendingCount: number;
  totalPendingRecords: number;
  jobs: any[];
}

export function InventoryDiagnostic({ user }: InventoryDiagnosticProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [fixType, setFixType] = useState<string | null>(null);
  const [result, setResult] = useState<DiagnosticData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fixResult, setFixResult] = useState<{ success: boolean; updatedCount: number; batchErrors?: string[] } | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [tableCheckResult, setTableCheckResult] = useState<any>(null);
  const [isCheckingTable, setIsCheckingTable] = useState(false);
  const [rawCountResult, setRawCountResult] = useState<any>(null);
  const [isRawCounting, setIsRawCounting] = useState(false);
  const [customOrgId, setCustomOrgId] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Pending jobs state
  const [pendingJobs, setPendingJobs] = useState<PendingJobsData | null>(null);
  const [isFindingJobs, setIsFindingJobs] = useState(false);
  const [isProcessingJob, setIsProcessingJob] = useState(false);
  const [processingJobId, setProcessingJobId] = useState<string | null>(null);
  const [isProcessingAll, setIsProcessingAll] = useState(false);
  const [processResult, setProcessResult] = useState<any>(null);
  const [processProgress, setProcessProgress] = useState<{ current: number; total: number; percent: number; cumulative: number; jobLabel: string } | null>(null);
  const [isDeletingJob, setIsDeletingJob] = useState(false);
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  const getAuthHeaders = async () => {
    const headers = await getServerHeaders();
    if (!headers['X-User-Token']) {
      throw new Error('Not authenticated. Please log in again.');
    }
    return headers;
  };

  const baseUrl = `https://${projectId}.supabase.co/functions/v1/make-server-8405be07/inventory-diagnostic`;

  const runDiagnostic = async () => {
    setIsChecking(true);
    setError(null);
    setFixResult(null);

    try {
      const headers = await getAuthHeaders();
      // Running server-side inventory diagnostic

      const response = await fetch(`${baseUrl}/run`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          organizationId: user.organization_id || user.organizationId,
          email: user.email,
          role: user.role,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        let errMsg = `Server error: ${response.status}`;
        try {
          const errData = JSON.parse(errText);
          errMsg = errData.error || errData.message || errMsg;
        } catch {
          errMsg = errText || errMsg;
        }
        throw new Error(errMsg);
      }

      const data = await response.json();
      setResult(data);

      if (data.queryErrors && Object.keys(data.queryErrors).length > 0) {
        setShowDebug(true);
      }
    } catch (err: any) {
      setError(err.message);
      toast.error('Diagnostic failed: ' + err.message);
    } finally {
      setIsChecking(false);
    }
  };

  const checkTable = async () => {
    setIsCheckingTable(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${baseUrl}/check-table`, {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
      });
      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      const data = await response.json();
      setTableCheckResult(data);
      setShowDebug(true);
      toast.success('Table check complete');
    } catch (err: any) {
      toast.error('Table check failed: ' + err.message);
    } finally {
      setIsCheckingTable(false);
    }
  };

  const runRawCount = async () => {
    setIsRawCounting(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${baseUrl}/raw-count`, {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
      });
      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      const data = await response.json();
      setRawCountResult(data);
      setShowDebug(true);
      toast.success('Raw count complete');
    } catch (err: any) {
      toast.error('Raw count failed: ' + err.message);
    } finally {
      setIsRawCounting(false);
    }
  };

  const findPendingJobs = async () => {
    setIsFindingJobs(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${baseUrl}/find-pending-jobs`, {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
      });
      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      const data = await response.json();
      setPendingJobs(data);

      if (data.pendingCount > 0) {
        toast.success(`Found ${data.pendingCount} pending job(s) with ${data.totalPendingRecords.toLocaleString()} records!`);
      } else {
        toast.info('No pending import jobs found');
      }
    } catch (err: any) {
      toast.error('Find jobs failed: ' + err.message);
    } finally {
      setIsFindingJobs(false);
    }
  };

  const processJob = async (jobId: string) => {
    const targetOrg = customOrgId.trim() || result?.user.orgId || user.organization_id || user.organizationId;
    if (!targetOrg) {
      toast.error('No target organization ID. Set one in Advanced Options.');
      setShowAdvanced(true);
      return;
    }

    setIsProcessingJob(true);
    setProcessingJobId(jobId);
    setProcessResult(null);
    setProcessProgress(null);

    try {
      const headers = await getAuthHeaders();
      // Processing job -> target org (chunked)

      let batchOffset = 0;
      let totalInserted = 0;
      let totalUpdated = 0;
      let totalErrors = 0;
      let lastData: any = null;

      // Loop: call the endpoint in chunks until done
      while (true) {
        const response = await fetch(`${baseUrl}/process-job`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ jobId, targetOrgId: targetOrg, batchOffset, batchLimit: 500 }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || errData.message || `Server error: ${response.status}`);
        }

        const data = await response.json();
        lastData = data;

        totalInserted += data.batchInserted || 0;
        totalUpdated += data.batchUpdated || 0;
        totalErrors += data.batchErrors || 0;

        setProcessProgress({
          current: data.nextOffset || 0,
          total: data.totalRecords || 0,
          percent: data.progress || 0,
          cumulative: data.cumulativeInserted || (totalInserted + totalUpdated),
          jobLabel: `Job ${jobId.slice(0, 8)}...`,
        });

        if (data.done) break;
        batchOffset = data.nextOffset;
      }

      setProcessResult(lastData);

      const totalProcessed = totalInserted + totalUpdated;
      if (totalProcessed > 0) {
        const parts = [];
        if (totalInserted > 0) parts.push(`${totalInserted.toLocaleString()} inserted`);
        if (totalUpdated > 0) parts.push(`${totalUpdated.toLocaleString()} updated`);
        toast.success(`Job complete: ${parts.join(', ')}!`);
      } else {
        toast.warning(`Job processed but 0 items inserted/updated. ${totalErrors} errors.`);
      }

      // Refresh everything
      setTimeout(() => {
        runDiagnostic();
        findPendingJobs();
      }, 2000);
    } catch (err: any) {
      toast.error('Process job failed: ' + err.message);
    } finally {
      setIsProcessingJob(false);
      setProcessingJobId(null);
      setProcessProgress(null);
    }
  };

  const processAllPending = async () => {
    const targetOrg = customOrgId.trim() || result?.user.orgId || user.organization_id || user.organizationId;
    if (!targetOrg) {
      toast.error('No target organization ID. Set one in Advanced Options.');
      setShowAdvanced(true);
      return;
    }

    setIsProcessingAll(true);
    setProcessResult(null);
    setProcessProgress(null);

    try {
      const headers = await getAuthHeaders();
      // Processing ALL pending jobs (chunked polling)

      let grandTotalInserted = 0;
      let grandTotalUpdated = 0;
      let grandTotalErrors = 0;
      let jobsCompleted = 0;
      let lastData: any = null;
      // Track offset and current job for server-side resume (no 'progress' column in DB)
      let trackingOffset = 0;
      let trackingJobId: string | null = null;

      // Loop: each call processes one 500-record chunk from the first pending job.
      // When a job finishes, the next call picks up the next job automatically.
      while (true) {
        const response = await fetch(`${baseUrl}/process-all-pending`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            targetOrgId: targetOrg,
            batchLimit: 500,
            resumeOffset: trackingOffset,
            currentJobId: trackingJobId,
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || errData.message || `Server error: ${response.status}`);
        }

        const data = await response.json();
        lastData = data;
        grandTotalInserted += data.batchInserted || 0;
        grandTotalUpdated += data.batchUpdated || 0;
        grandTotalErrors += data.batchErrors || 0;
        if (data.currentJobDone) {
          jobsCompleted++;
          // Reset offset for the next job
          trackingOffset = 0;
          trackingJobId = null;
        } else {
          // Track offset so the next call resumes from where we left off
          trackingOffset = data.nextOffset || 0;
          trackingJobId = data.currentJobId || null;
        }

        setProcessProgress({
          current: data.progress || 0,
          total: 100,
          percent: data.progress || 0,
          cumulative: grandTotalInserted + grandTotalUpdated,
          jobLabel: data.currentJobId
            ? `Job ${data.currentJobId.slice(0, 8)}... (${data.remainingJobs} remaining)`
            : 'Finishing...',
        });

        if (data.done) break;
      }

      setProcessResult({
        ...lastData,
        totalInserted: grandTotalInserted,
        totalUpdated: grandTotalUpdated,
        totalErrors: grandTotalErrors,
        jobsProcessed: jobsCompleted,
      });

      const totalProcessed = grandTotalInserted + grandTotalUpdated;
      if (totalProcessed > 0) {
        const parts = [];
        if (grandTotalInserted > 0) parts.push(`${grandTotalInserted.toLocaleString()} inserted`);
        if (grandTotalUpdated > 0) parts.push(`${grandTotalUpdated.toLocaleString()} updated`);
        toast.success(`Inserted/Updated ${totalProcessed.toLocaleString()} total items from ${jobsCompleted} job(s)!`);
      } else {
        toast.warning(`Jobs processed but 0 items inserted/updated. Check errors.`);
      }

      // Refresh
      setTimeout(() => {
        runDiagnostic();
        findPendingJobs();
      }, 2000);
    } catch (err: any) {
      toast.error('Process all failed: ' + err.message);
    } finally {
      setIsProcessingAll(false);
      setProcessProgress(null);
    }
  };

  const deleteJob = async (jobId: string) => {
    if (!confirm('Are you sure you want to delete this job? This cannot be undone.')) return;

    setIsDeletingJob(true);
    setDeletingJobId(jobId);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${baseUrl}/delete-job`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ jobId }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || errData.message || `Server error: ${response.status}`);
      }

      toast.success('Job deleted successfully');
      await findPendingJobs();
    } catch (err: any) {
      toast.error('Delete failed: ' + err.message);
    } finally {
      setIsDeletingJob(false);
      setDeletingJobId(null);
    }
  };

  const deleteAllPending = async () => {
    if (!confirm('Are you sure you want to delete ALL pending jobs? This cannot be undone.')) return;

    setIsDeletingAll(true);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${baseUrl}/delete-all-pending`, {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || errData.message || `Server error: ${response.status}`);
      }

      const data = await response.json();
      toast.success(`Deleted ${data.deletedCount} pending job(s)`);
      await findPendingJobs();
    } catch (err: any) {
      toast.error('Delete all failed: ' + err.message);
    } finally {
      setIsDeletingAll(false);
    }
  };

  const runFix = async (type: 'null_to_user' | 'other_to_user' | 'all_to_user', sourceOrgId?: string) => {
    const targetOrg = customOrgId.trim() || result?.user.orgId;
    if (!targetOrg) {
      toast.error('No target organization ID. Please enter one in Advanced Options.');
      setShowAdvanced(true);
      return;
    }

    setIsFixing(true);
    setFixType(type);
    setFixResult(null);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${baseUrl}/fix-org-ids`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ fixType: type, targetOrgId: targetOrg, sourceOrgId }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || errData.message || `Server error: ${response.status}`);
      }

      const data = await response.json();
      setFixResult({ success: true, updatedCount: data.updatedCount, batchErrors: data.batchErrors });

      if (data.updatedCount > 0) {
        toast.success(`Fixed ${data.updatedCount.toLocaleString()} inventory items!`);
      } else {
        toast.info('No items were updated.');
      }

      setTimeout(() => runDiagnostic(), 2000);
    } catch (err: any) {
      toast.error('Fix failed: ' + err.message);
    } finally {
      setIsFixing(false);
      setFixType(null);
    }
  };

  useEffect(() => {
    runDiagnostic();
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'none': return 'border-green-200 bg-green-50 dark:bg-green-900/10';
      case 'warning': return 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10';
      case 'critical': return 'border-red-200 bg-red-50 dark:bg-red-900/10';
      default: return '';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'none': return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'critical': return <AlertCircle className="h-5 w-5 text-red-600" />;
      default: return <Info className="h-5 w-5" />;
    }
  };

  const targetOrgDisplay = customOrgId.trim() || result?.user.orgId || user.organization_id || user.organizationId || '(not set)';

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Inventory Diagnostic Tool
            <Badge variant="outline" className="ml-2">Server-Side</Badge>
          </CardTitle>
          <CardDescription>
            Bypasses RLS to check ALL inventory items, find stuck import jobs, and process them server-side
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick Start Guide */}
          {!result && !pendingJobs && (
            <Alert className="border-blue-200 bg-blue-50">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription>
                <p className="font-semibold text-blue-900 mb-2">Missing imported items? Follow these steps:</p>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Click <strong>"Run Diagnostic"</strong> to scan for all inventory in the database</li>
                  <li>Review the results to see where your items are located</li>
                  <li>Use the <strong>"Quick Fixes"</strong> buttons to reassign items to your organization</li>
                  <li>If items are stuck in imports, use <strong>"Find Pending Jobs"</strong> to process them</li>
                </ol>
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button onClick={runDiagnostic} disabled={isChecking} size="lg" className="flex-1 min-w-[180px] bg-blue-600 hover:bg-blue-700">
              {isChecking ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <RefreshCw className="mr-2 h-5 w-5" />}
              {isChecking ? 'Running...' : 'Run Diagnostic'}
            </Button>
            <Button onClick={checkTable} disabled={isCheckingTable} variant="outline" className="min-w-[160px]">
              {isCheckingTable ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Table2 className="mr-2 h-4 w-4" />}
              Check Tables
            </Button>
            <Button onClick={runRawCount} disabled={isRawCounting} variant="outline" className="min-w-[140px]">
              {isRawCounting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              Raw Count
            </Button>
            <Button onClick={findPendingJobs} disabled={isFindingJobs} variant="secondary" className="min-w-[180px]">
              {isFindingJobs ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Clock className="mr-2 h-4 w-4" />}
              Find Pending Jobs
            </Button>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="whitespace-pre-wrap">{error}</AlertDescription>
            </Alert>
          )}

          {/* Fix Result */}
          {fixResult && (
            <Alert className={fixResult.updatedCount > 0 ? "border-green-200 bg-green-50" : "border-yellow-200 bg-yellow-50"}>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <strong>{fixResult.updatedCount > 0 ? 'Fix Applied!' : 'No Changes'}</strong>{' '}
                {fixResult.updatedCount > 0
                  ? `Updated ${fixResult.updatedCount.toLocaleString()} inventory items.`
                  : 'No items matched the fix criteria.'}
                {fixResult.batchErrors && fixResult.batchErrors.length > 0 && (
                  <div className="mt-2 text-sm text-red-600">
                    <strong>Errors:</strong>
                    <ul className="list-disc pl-4 mt-1">
                      {fixResult.batchErrors.map((err, i) => <li key={i}>{err}</li>)}
                    </ul>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Live Progress Bar */}
          {processProgress && (isProcessingJob || isProcessingAll) && (
            <Alert className="border-blue-200 bg-blue-50">
              <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
              <AlertDescription>
                <strong>Processing: {processProgress.jobLabel}</strong>
                <div className="mt-2">
                  <Progress value={processProgress.percent} className="h-3" />
                </div>
                <div className="mt-1 text-sm text-muted-foreground flex justify-between">
                  <span>{processProgress.percent}% complete</span>
                  <span>{processProgress.cumulative.toLocaleString()} items inserted so far</span>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Process Result */}
          {processResult && (
            <Alert className={processResult.totalInserted > 0 || processResult.totalUpdated > 0 || processResult.insertedCount > 0 ? "border-green-200 bg-green-50" : "border-yellow-200 bg-yellow-50"}>
              <Rocket className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <strong>Import Processing Complete!</strong>
                <div className="mt-2 text-sm space-y-1">
                  {processResult.jobsProcessed !== undefined && (
                    <div>Jobs processed: <strong>{processResult.jobsProcessed}</strong></div>
                  )}
                  <div>Items inserted: <strong className="text-green-700">{(processResult.totalInserted || processResult.insertedCount || 0).toLocaleString()}</strong></div>
                  {(processResult.totalUpdated || 0) > 0 && (
                    <div>Items updated (existing SKUs): <strong className="text-blue-700">{(processResult.totalUpdated || 0).toLocaleString()}</strong></div>
                  )}
                  {(processResult.totalErrors || processResult.errorCount || 0) > 0 && (
                    <div>Errors: <strong className="text-red-600">{(processResult.totalErrors || processResult.errorCount || 0).toLocaleString()}</strong></div>
                  )}
                  {processResult.skippedCount > 0 && (
                    <div>Skipped: <strong>{processResult.skippedCount}</strong></div>
                  )}
                  <div>Target Org: <code className="bg-muted px-1 rounded">{processResult.targetOrgId}</code></div>
                </div>
                {processResult.errors && processResult.errors.length > 0 && (
                  <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                    <strong>Sample errors:</strong>
                    {processResult.errors.map((err: string, i: number) => <div key={i}>{err}</div>)}
                  </div>
                )}
                {processResult.jobResults && (
                  <div className="mt-2 text-xs bg-muted p-2 rounded">
                    {processResult.jobResults.map((jr: any, i: number) => (
                      <div key={i}>Job {jr.jobId?.substring(0, 8)}... : {jr.status} ({jr.insertedCount} inserted{jr.errorCount > 0 ? `, ${jr.errorCount} errors` : ''})</div>
                    ))}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* ============ PENDING JOBS SECTION ============ */}
          {pendingJobs && (
            <div className="rounded-lg border-2 border-purple-200 bg-purple-50 dark:bg-purple-900/10 p-4 space-y-4">
              <h3 className="font-semibold flex items-center gap-2 text-lg">
                <FileSpreadsheet className="h-5 w-5 text-purple-600" />
                Import Jobs Found
                <Badge variant="secondary">{pendingJobs.totalJobs} total</Badge>
                {pendingJobs.pendingCount > 0 && (
                  <Badge className="bg-purple-600">{pendingJobs.pendingCount} pending</Badge>
                )}
              </h3>

              {pendingJobs.totalPendingRecords > 0 && (
                <Alert className="border-purple-300 bg-purple-100">
                  <Rocket className="h-4 w-4 text-purple-600" />
                  <AlertDescription>
                    <strong>Found {pendingJobs.totalPendingRecords.toLocaleString()} records in pending jobs!</strong>{' '}
                    These are your 78K items sitting in the scheduled_jobs table as JSON data, waiting to be inserted into the inventory table.
                    <div className="mt-2 font-medium">
                      Target Org: <code className="bg-purple-200 px-1.5 py-0.5 rounded">{targetOrgDisplay}</code>
                      {customOrgId && <span className="text-green-700 ml-2">(custom override)</span>}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Process All Button */}
              {pendingJobs.pendingCount > 0 && (
                <Button
                  onClick={processAllPending}
                  disabled={isProcessingAll || isProcessingJob}
                  size="lg"
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {isProcessingAll ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Processing {pendingJobs.totalPendingRecords.toLocaleString()} records... (this may take a few minutes)
                    </>
                  ) : (
                    <>
                      <Rocket className="mr-2 h-5 w-5" />
                      Process ALL Pending Jobs ({pendingJobs.totalPendingRecords.toLocaleString()} records → {targetOrgDisplay})
                    </>
                  )}
                </Button>
              )}

              {/* Individual Jobs List */}
              <div className="space-y-2">
                {pendingJobs.jobs.map((job: any) => (
                  <div
                    key={job.id}
                    className={`rounded-lg border p-3 text-sm ${
                      job.status === 'pending' ? 'bg-background border-purple-200' :
                      job.status === 'completed' ? 'bg-green-50 border-green-200' :
                      job.status === 'failed' ? 'bg-red-50 border-red-200' :
                      job.status === 'processing' ? 'bg-blue-50 border-blue-200' :
                      'bg-muted'
                    }`}
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge
                          variant={
                            job.status === 'pending' ? 'outline' :
                            job.status === 'completed' ? 'default' :
                            job.status === 'failed' ? 'destructive' :
                            'secondary'
                          }
                        >
                          {job.status}
                        </Badge>
                        <span className="truncate font-medium">{job.file_name || job.data_type || 'Import Job'}</span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {job.recordsInFileData > 0 && (
                          <Badge variant="secondary" className="bg-purple-100">
                            {job.recordsInFileData.toLocaleString()} records
                          </Badge>
                        )}
                        {job.record_count > 0 && (
                          <Badge variant="secondary">
                            {job.record_count.toLocaleString()} processed
                          </Badge>
                        )}
                        {job.status === 'pending' && job.recordsInFileData > 0 && (
                          <Button
                            size="sm"
                            variant="default"
                            className="bg-purple-600 hover:bg-purple-700"
                            onClick={() => processJob(job.id)}
                            disabled={isProcessingJob || isProcessingAll}
                          >
                            {isProcessingJob && processingJobId === job.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                <Play className="h-3 w-3 mr-1" />
                                Process
                              </>
                            )}
                          </Button>
                        )}
                        {job.status === 'pending' && job.recordsInFileData > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600"
                            onClick={() => deleteJob(job.id)}
                            disabled={isDeletingJob && deletingJobId === job.id}
                          >
                            {isDeletingJob && deletingJobId === job.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                <Trash2 className="h-3 w-3 mr-1" />
                                Delete
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground mt-1.5 space-y-0.5">
                      <div>
                        Created: {new Date(job.created_at).toLocaleString()}
                        {job.organization_id && <> | Org: <code className="font-mono">{job.organization_id.substring(0, 20)}...</code></>}
                        {job.data_type && <> | Type: {job.data_type}</>}
                      </div>
                      {job.sampleRecord && (
                        <div className="mt-1 bg-muted p-1.5 rounded font-mono">
                          Sample: {JSON.stringify(job.sampleRecord).substring(0, 150)}...
                        </div>
                      )}
                      {job.error_message && (
                        <div className="text-red-600 mt-1">Error: {job.error_message}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {pendingJobs.pendingCount === 0 && pendingJobs.totalJobs > 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  No pending jobs. All jobs have been processed or completed.
                </p>
              )}

              {/* Delete All Button */}
              {pendingJobs.pendingCount > 0 && (
                <Button
                  onClick={deleteAllPending}
                  disabled={isDeletingAll}
                  size="lg"
                  className="w-full bg-red-600 hover:bg-red-700 text-white"
                >
                  {isDeletingAll ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Deleting all pending jobs...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-5 w-5" />
                      Delete ALL Pending Jobs
                    </>
                  )}
                </Button>
              )}
            </div>
          )}

          {/* Results Display */}
          {result && (
            <div className="space-y-4">
              {/* Diagnosis Summary */}
              <div className={`rounded-lg border-2 p-4 space-y-2 ${getSeverityColor(result.diagnosis.severity)}`}>
                <div className="flex items-start gap-3">
                  {getSeverityIcon(result.diagnosis.severity)}
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">
                      {result.diagnosis.severity === 'none' ? 'All Good!' :
                       result.diagnosis.severity === 'warning' ? 'Issue Found' :
                       'Critical Issue Found'}
                    </h3>
                    <p className="text-sm mt-1">{result.diagnosis.issue}</p>
                    <p className="text-sm mt-2 font-medium">{result.diagnosis.recommendation}</p>

                    {/* When total is 0, add the "find pending jobs" CTA */}
                    {result.counts.totalInDatabase === 0 && !pendingJobs && (
                      <div className="mt-3">
                        <Button
                          onClick={findPendingJobs}
                          disabled={isFindingJobs}
                          className="bg-purple-600 hover:bg-purple-700"
                        >
                          {isFindingJobs ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Clock className="mr-2 h-4 w-4" />}
                          Find Stuck Import Jobs
                        </Button>
                        <p className="text-xs mt-1 text-muted-foreground">
                          Your 78K items are likely stored as JSON data inside pending scheduled_jobs records.
                          This will find them and let you process them server-side.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* User Info */}
              <div className="rounded-lg border p-4 space-y-2">
                <h3 className="font-semibold flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Your Account
                </h3>
                <div className="text-sm space-y-1 font-mono bg-muted p-3 rounded">
                  <div><strong>Email:</strong> {result.user.email}</div>
                  <div><strong>User ID:</strong> {result.user.userId}</div>
                  <div><strong>Organization ID:</strong> {result.user.orgId || <span className="text-red-600">None</span>}</div>
                  <div><strong>Role:</strong> {result.user.role || 'N/A'}</div>
                </div>
                {result.orgResolutionLog && result.orgResolutionLog.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Org ID Resolution Chain:</p>
                    <div className="text-xs font-mono bg-muted p-2 rounded space-y-0.5">
                      {result.orgResolutionLog.map((log, i) => (
                        <div key={i} className={log.includes('FAILED') ? 'text-red-500' : 'text-green-600'}>
                          {i + 1}. {log}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Query Errors */}
              {result.queryErrors && Object.keys(result.queryErrors).length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Query Errors Detected:</strong>
                    <div className="mt-2 space-y-1 text-sm font-mono">
                      {Object.entries(result.queryErrors).map(([key, value]) => (
                        <div key={key}><strong>{key}:</strong> {value}</div>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Item Counts */}
              <div className="rounded-lg border p-4 space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Inventory Counts (Bypassing RLS)
                </h3>

                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 rounded bg-muted">
                    <span className="text-sm font-medium">Total items in database:</span>
                    <Badge variant="secondary" className="text-base px-3 py-1">{result.counts.totalInDatabase.toLocaleString()}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded bg-muted">
                    <span className="text-sm">Items in YOUR organization:</span>
                    <Badge variant={result.counts.inUserOrg > 0 ? 'default' : 'destructive'} className="text-base px-3 py-1">{result.counts.inUserOrg.toLocaleString()}</Badge>
                  </div>
                  {result.counts.withNullOrg > 0 && (
                    <div className="flex items-center justify-between p-3 rounded bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200">
                      <span className="text-sm">Orphaned (no org):</span>
                      <Badge variant="outline" className="text-base px-3 py-1 bg-yellow-100">{result.counts.withNullOrg.toLocaleString()}</Badge>
                    </div>
                  )}
                  {result.counts.inOtherOrgs > 0 && (
                    <div className="flex items-center justify-between p-3 rounded bg-orange-50 dark:bg-orange-900/10 border border-orange-200">
                      <span className="text-sm">In other orgs:</span>
                      <Badge variant="outline" className="text-base px-3 py-1 bg-orange-100">{result.counts.inOtherOrgs.toLocaleString()}</Badge>
                    </div>
                  )}

                  {result.counts.totalInDatabase === 0 && (
                    <Alert className="border-red-200 bg-red-50 mt-2">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-sm">
                        <strong>Inventory table is empty!</strong> Your import jobs are stuck in "pending" status.
                        The records are stored as JSON inside the <code className="bg-red-100 px-1 rounded">scheduled_jobs</code> table
                        but were never inserted into <code className="bg-red-100 px-1 rounded">inventory</code>.
                        {!pendingJobs && (
                          <span className="block mt-1 font-medium">Click "Find Pending Jobs" above to locate and process them.</span>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>

              {/* Organization Breakdown */}
              {result.orgBreakdown.length > 0 && (
                <div className="rounded-lg border p-4 space-y-3">
                  <h3 className="font-semibold">Organization Breakdown</h3>
                  <div className="space-y-2">
                    {result.orgBreakdown.map((org) => (
                      <div
                        key={org.org_id}
                        className={`flex items-center justify-between p-3 rounded text-sm ${
                          org.is_user_org ? 'bg-green-50 dark:bg-green-900/10 border border-green-200' : 'bg-muted'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="font-mono text-xs truncate">{org.org_id}</span>
                          {org.is_user_org && <Badge variant="default" className="text-xs shrink-0">YOUR ORG</Badge>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <Badge variant="secondary">{org.count.toLocaleString()} items</Badge>
                          {!org.is_user_org && (
                            <Button size="sm" variant="outline" onClick={() => runFix('other_to_user', org.org_id)} disabled={isFixing} className="text-xs">
                              {isFixing && fixType === 'other_to_user' ? <Loader2 className="h-3 w-3 animate-spin" /> : <><ArrowRight className="h-3 w-3 mr-1" />Move</>}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Fixes */}
              <div className="rounded-lg border-2 border-blue-200 bg-blue-50 dark:bg-blue-900/10 p-4 space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Wrench className="h-4 w-4" />
                  Quick Fixes
                </h3>
                <div className="space-y-2">
                  {result.counts.withNullOrg > 0 && (
                    <Button onClick={() => runFix('null_to_user')} disabled={isFixing} className="w-full justify-start" variant="outline">
                      {isFixing && fixType === 'null_to_user' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wrench className="mr-2 h-4 w-4" />}
                      Assign {result.counts.withNullOrg.toLocaleString()} Orphaned Items to My Org
                    </Button>
                  )}
                  {result.counts.inOtherOrgs > 0 && (
                    <Button onClick={() => runFix('all_to_user')} disabled={isFixing} variant="destructive" className="w-full justify-start">
                      {isFixing && fixType === 'all_to_user' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <AlertTriangle className="mr-2 h-4 w-4" />}
                      Reassign ALL {(result.counts.withNullOrg + result.counts.inOtherOrgs).toLocaleString()} Items to My Org
                    </Button>
                  )}
                  {result.counts.totalInDatabase > 0 && result.counts.inUserOrg < result.counts.totalInDatabase && result.counts.inOtherOrgs === 0 && result.counts.withNullOrg === 0 && (
                    <Button onClick={() => runFix('all_to_user')} disabled={isFixing} variant="destructive" className="w-full justify-start">
                      <Zap className="mr-2 h-4 w-4" />
                      Force Reassign ALL to My Org
                    </Button>
                  )}
                  {result.counts.totalInDatabase === 0 && (
                    <Alert className="border-amber-200 bg-amber-50">
                      <Info className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-sm">
                        <strong>Inventory table is empty.</strong> No items to reassign.
                        Use "Find Pending Jobs" to locate your import data and process it server-side.
                      </AlertDescription>
                    </Alert>
                  )}
                  {result.diagnosis.severity === 'none' && (
                    <Alert className="border-green-200 bg-green-50">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-sm">All items correctly assigned. No fixes needed!</AlertDescription>
                    </Alert>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Uses service role key to bypass RLS. Updates in batches of 1,000.</p>
              </div>

              {/* Advanced Options */}
              <div className="rounded-lg border p-4 space-y-3">
                <button onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center gap-2 font-semibold text-sm w-full text-left">
                  {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  Advanced Options
                </button>
                {showAdvanced && (
                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="text-sm font-medium block mb-1">Override Target Organization ID</label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Your current org is <code className="bg-muted px-1 rounded">{result.user.orgId || 'not set'}</code>.
                        Override it here if needed (used for all fix and import operations).
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={customOrgId}
                          onChange={(e) => setCustomOrgId(e.target.value)}
                          placeholder={result.user.orgId || 'Enter organization ID...'}
                          className="flex-1 px-3 py-2 border rounded text-sm font-mono bg-background"
                        />
                        {customOrgId && (
                          <Button size="sm" variant="outline" onClick={() => setCustomOrgId('')}>Clear</Button>
                        )}
                      </div>
                      {customOrgId && (
                        <p className="text-xs text-blue-600 mt-1">Using custom org ID: <strong>{customOrgId}</strong></p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Button onClick={() => runFix('null_to_user')} disabled={isFixing} variant="outline" className="w-full justify-start text-sm">
                        <Wrench className="mr-2 h-4 w-4" />
                        Fix NULL org items &rarr; {targetOrgDisplay}
                      </Button>
                      <Button onClick={() => runFix('all_to_user')} disabled={isFixing} variant="outline" className="w-full justify-start text-sm">
                        <Zap className="mr-2 h-4 w-4" />
                        Fix ALL items &rarr; {targetOrgDisplay}
                      </Button>
                    </div>

                    {/* Quick org ID buttons from jobs */}
                    {(pendingJobs?.jobs || result.recentJobs).length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Org IDs from Jobs (click to use):</p>
                        <div className="flex flex-wrap gap-1">
                          {[...new Set((pendingJobs?.jobs || result.recentJobs).map((j: any) => j.organization_id).filter(Boolean))].map((orgId: string) => (
                            <Button
                              key={orgId}
                              size="sm"
                              variant={customOrgId === orgId ? 'default' : 'outline'}
                              className="text-xs font-mono"
                              onClick={() => setCustomOrgId(orgId)}
                            >
                              {orgId.length > 20 ? orgId.substring(0, 16) + '...' : orgId}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Debug Information */}
              <div className="rounded-lg border p-4 space-y-3">
                <button onClick={() => setShowDebug(!showDebug)} className="flex items-center gap-2 font-semibold text-sm w-full text-left">
                  <Bug className="h-4 w-4" />
                  {showDebug ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  Debug Information
                </button>
                {showDebug && (
                  <div className="space-y-3 pt-2">
                    {result.rawSample && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Inventory Table Sample:</p>
                        <pre className="text-xs font-mono bg-muted p-3 rounded overflow-x-auto max-h-[200px] overflow-y-auto whitespace-pre-wrap">
                          {JSON.stringify(result.rawSample, null, 2)}
                        </pre>
                      </div>
                    )}
                    {tableCheckResult && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Table Check Results:</p>
                        <pre className="text-xs font-mono bg-muted p-3 rounded overflow-x-auto max-h-[300px] overflow-y-auto whitespace-pre-wrap">
                          {JSON.stringify(tableCheckResult, null, 2)}
                        </pre>
                      </div>
                    )}
                    {rawCountResult && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Raw Count Results:</p>
                        <pre className="text-xs font-mono bg-muted p-3 rounded overflow-x-auto max-h-[300px] overflow-y-auto whitespace-pre-wrap">
                          {JSON.stringify(rawCountResult, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Sample Items */}
              {result.samples.nullOrg.length > 0 && (
                <div className="rounded-lg border p-4 space-y-3">
                  <h3 className="font-semibold">Sample Orphaned Items</h3>
                  <div className="space-y-2">
                    {result.samples.nullOrg.map((item) => (
                      <div key={item.id} className="p-2 rounded bg-muted text-sm">
                        <div><strong>{item.name}</strong> (SKU: {item.sku})</div>
                        <div className="text-xs text-muted-foreground">
                          Cat: {item.category || 'None'} | Qty: {item.quantity} | Org: <span className="text-red-600">NULL</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.samples.otherOrgs.length > 0 && (
                <div className="rounded-lg border p-4 space-y-3">
                  <h3 className="font-semibold">Sample Items in Other Orgs</h3>
                  <div className="space-y-2">
                    {result.samples.otherOrgs.map((item) => (
                      <div key={item.id} className="p-2 rounded bg-muted text-sm">
                        <div><strong>{item.name}</strong> (SKU: {item.sku})</div>
                        <div className="text-xs text-muted-foreground">
                          Cat: {item.category || 'None'} | Org: <span className="text-orange-600 font-mono">{item.organization_id?.substring(0, 12)}...</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.samples.userOrg.length > 0 && (
                <div className="rounded-lg border p-4 space-y-3">
                  <h3 className="font-semibold">Sample Items in Your Org</h3>
                  <div className="space-y-2">
                    {result.samples.userOrg.map((item) => (
                      <div key={item.id} className="p-2 rounded bg-muted text-sm">
                        <div><strong>{item.name}</strong> (SKU: {item.sku})</div>
                        <div className="text-xs text-muted-foreground">Cat: {item.category || 'None'} | Qty: {item.quantity}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Import Jobs (from diagnostic) */}
              {result.recentJobs.length > 0 && !pendingJobs && (
                <div className="rounded-lg border p-4 space-y-3">
                  <h3 className="font-semibold">Recent Import Jobs</h3>
                  <div className="space-y-2">
                    {result.recentJobs.map((job) => (
                      <div key={job.id} className="p-2 rounded bg-muted text-sm">
                        <div className="flex items-center justify-between">
                          <span>{job.file_name || job.job_type || 'Import Job'}</span>
                          <Badge variant={job.status === 'completed' ? 'default' : job.status === 'failed' ? 'destructive' : 'outline'}>
                            {job.status}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(job.created_at).toLocaleString()}
                          {job.organization_id && ` | Org: ${job.organization_id.substring(0, 16)}...`}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* No results yet */}
          {!result && !error && !isChecking && (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Click "Run Diagnostic" to analyze your inventory data</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}