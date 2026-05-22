import { useEffect, useMemo, useState } from 'react';
import { Download, FileDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Alert, AlertDescription } from '../ui/alert';
import { downloadTextFile, type CustomExportTemplate } from '../../utils/export-engine';
import { loadPlannerExportTemplates } from '../../utils/planner-export-templates';
import { createPlannerExportFile } from '../../utils/planner-export';

interface PlannerExportDialogProps {
  organizationId: string;
  projectType: string;
  materials: any[];
  totalCost: number;
  defaultDesignName?: string;
}

type BrowserWindowWithFileSystem = Window & typeof globalThis & {
  showSaveFilePicker?: (options?: Record<string, unknown>) => Promise<{
    createWritable: () => Promise<{
      write: (data: Blob | string) => Promise<void>;
      close: () => Promise<void>;
    }>;
  }>;
};

export function PlannerExportDialog({
  organizationId,
  projectType,
  materials,
  totalCost,
  defaultDesignName,
}: PlannerExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'xml' | 'custom'>('csv');
  const [customTemplateId, setCustomTemplateId] = useState('');
  const [exportTemplates, setExportTemplates] = useState<CustomExportTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [designName, setDesignName] = useState(defaultDesignName || `${projectType}-design`);

  const browserWindow = window as BrowserWindowWithFileSystem;
  const supportsSaveFilePicker = typeof browserWindow.showSaveFilePicker === 'function';

  useEffect(() => {
    setDesignName(defaultDesignName || `${projectType}-design`);
  }, [defaultDesignName, projectType]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    const loadTemplates = async () => {
      setIsLoadingTemplates(true);
      try {
        const templates = await loadPlannerExportTemplates(organizationId);
        if (!cancelled) {
          setExportTemplates(templates);
          if (templates.length > 0) {
            setCustomTemplateId((current) => current || templates[0].id);
          }
        }
      } catch {
        if (!cancelled) {
          setExportTemplates([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingTemplates(false);
        }
      }
    };

    loadTemplates();

    return () => {
      cancelled = true;
    };
  }, [open, organizationId]);

  const exportSummary = useMemo(
    () => ({
      lineCount: Array.isArray(materials) ? materials.length : 0,
      total: totalCost || 0,
    }),
    [materials, totalCost]
  );

  const handleExport = async () => {
    const normalizedName = designName.trim() || `${projectType}-design`;
    const exportResult = createPlannerExportFile(
      {
        name: normalizedName,
        description: 'Current planner export',
        total_cost: totalCost,
        materials,
        created_at: new Date().toISOString(),
      },
      projectType,
      exportFormat,
      exportTemplates,
      customTemplateId
    );

    if (!exportResult.ok) {
      toast.error(exportResult.error);
      return;
    }

    setIsExporting(true);
    const { file } = exportResult;

    try {
      if (supportsSaveFilePicker) {
        try {
          const saveHandle = await browserWindow.showSaveFilePicker?.({
            suggestedName: file.filename,
          });

          if (saveHandle) {
            const writable = await saveHandle.createWritable();
            await writable.write(new Blob([file.content], { type: file.mimeType }));
            await writable.close();
            toast.success('Export saved to your device');
            setOpen(false);
            return;
          }
        } catch (error: any) {
          if (error?.name === 'AbortError') {
            return;
          }
        }
      }

      downloadTextFile(file.content, file.filename, file.mimeType);
      toast.success('Export downloaded to your device');
      setOpen(false);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        className="flex items-center gap-2"
        onClick={() => setOpen(true)}
      >
        <FileDown className="h-4 w-4" />
        Export Design
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl bg-background">
          <DialogHeader>
            <DialogTitle>Export Design</DialogTitle>
            <DialogDescription>
              Export the current {projectType} design to your computer as CSV, XML, or a custom template file.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="planner-export-name">File Name</Label>
                <Input
                  id="planner-export-name"
                  value={designName}
                  onChange={(event) => setDesignName(event.target.value)}
                  placeholder={`${projectType}-design`}
                />
              </div>

              <div className="space-y-2">
                <Label>Export Type</Label>
                <Select value={exportFormat} onValueChange={(value: 'csv' | 'xml' | 'custom') => setExportFormat(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select export type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="xml">XML</SelectItem>
                    <SelectItem value="custom">Custom Template</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {exportFormat === 'custom' && (
              <div className="space-y-2">
                <Label>Custom Template</Label>
                <Select value={customTemplateId} onValueChange={setCustomTemplateId}>
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingTemplates ? 'Loading templates...' : 'Select custom template'} />
                  </SelectTrigger>
                  <SelectContent>
                    {exportTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                <p className="text-sm font-medium">Export Summary</p>
                <p className="text-sm text-muted-foreground">Material lines: {exportSummary.lineCount}</p>
                <p className="text-sm text-muted-foreground">
                  Estimated total: ${exportSummary.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>

              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <div>
                  <p className="text-sm font-medium">Save Location</p>
                  <p className="text-sm text-muted-foreground">
                    Your browser will prompt you to choose where to save this file on your computer.
                  </p>
                </div>
                {!supportsSaveFilePicker && (
                  <p className="text-xs text-muted-foreground">
                    Your browser does not support the modern save dialog, so export will download using the standard browser flow.
                  </p>
                )}
              </div>
            </div>

            <Alert>
              <AlertDescription>
                Export writes the current materials-based design to your local computer. If folder access is not supported by your browser, the app falls back to the standard save or download flow.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isExporting}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleExport()}
              disabled={
                isExporting ||
                (exportFormat === 'custom' && (!customTemplateId || exportTemplates.length === 0))
              }
              className="flex items-center gap-2"
            >
              {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Export to Device
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}