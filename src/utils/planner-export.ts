import {
  buildCsv,
  buildXml,
  buildCustomText,
  downloadTextFile,
  sanitizeFilename,
  type CustomExportTemplate,
  type ExportFormat
} from './export-engine';

export interface PlannerExportData {
  name: string;
  description?: string;
  total_cost?: number;
  materials?: any[];
  created_at?: string;
  [key: string]: any;
}

export interface PlannerExportResult {
  ok: boolean;
  error?: string;
  file?: {
    filename: string;
    content: string;
    mimeType: string;
  };
}

export function buildPlannerExportRows(design: PlannerExportData, projectType: string): Record<string, unknown>[] {
  const designMeta = {
    project_type: projectType,
    design_name: design.name || `${projectType}-design`,
    description: design.description || '',
    total_cost: design.total_cost ?? 0,
    saved_at: design.created_at || new Date().toISOString(),
    material_count: Array.isArray(design.materials) ? design.materials.length : 0,
  };

  if (!Array.isArray(design.materials) || design.materials.length === 0) {
    return [{
      ...designMeta,
      material_name: '',
      sku: '',
      category: '',
      quantity: '',
      unit_price: '',
      line_total: '',
      unit_of_measure: '',
    }];
  }

  return design.materials.map((item: any) => {
    const quantity = item.quantity ?? item.qty ?? '';
    const unitPrice = item.unit_price ?? item.unitPrice ?? item.price ?? '';
    const lineTotal = item.total ?? item.line_total ?? (Number(quantity || 0) * Number(unitPrice || 0));
    const unit = item.unit_of_measure || item.unitOfMeasure || item.unit || item.uom || '';

    return {
      ...designMeta,
      material_name: item.name || item.material || item.description || '',
      description: item.description || '',
      sku: item.sku || '',
      category: item.category || '',
      quantity,
      unit_price: unitPrice,
      line_total: Number.isFinite(lineTotal) ? lineTotal : '',
      unit_of_measure: unit,
      unit,
      units: unit,
    };
  });
}

export function createPlannerExportFile(
  design: PlannerExportData,
  projectType: string,
  exportFormat: ExportFormat,
  exportTemplates?: CustomExportTemplate[],
  customTemplateId?: string
): PlannerExportResult {
  try {
    const rows = buildPlannerExportRows(design, projectType);
    const safeName = sanitizeFilename(design.name || `${projectType}-design`);
    const datePart = new Date().toISOString().split('T')[0];

    if (exportFormat === 'custom' && customTemplateId && exportTemplates) {
      const template = exportTemplates.find((t) => t.id === customTemplateId);
      if (!template) {
        return { ok: false, error: 'Custom template not found.' };
      }
      const ext = template.file_extension ? `.${template.file_extension.replace(/^\./, '')}` : '.txt';
      const filename = `${safeName}-${datePart}${ext}`;
      const content = buildCustomText(rows, template);
      return {
        ok: true,
        file: {
          filename,
          content,
          mimeType: 'text/plain;charset=utf-8',
        },
      };
    }

    if (exportFormat === 'xml') {
      const filename = `${safeName}-${datePart}.xml`;
      const content = buildXml(rows, 'planner_export', 'item');
      return {
        ok: true,
        file: {
          filename,
          content,
          mimeType: 'application/xml;charset=utf-8',
        },
      };
    }

    // Default: CSV
    const filename = `${safeName}-${datePart}.csv`;
    const content = buildCsv(rows);
    return {
      ok: true,
      file: {
        filename,
        content,
        mimeType: 'text/csv;charset=utf-8',
      },
    };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Export generation failed.' };
  }
}

export function exportPlannerDesign(
  design: PlannerExportData,
  projectType: string,
  exportFormat: ExportFormat,
  exportTemplates?: CustomExportTemplate[],
  customTemplateId?: string
): PlannerExportResult {
  const result = createPlannerExportFile(design, projectType, exportFormat, exportTemplates, customTemplateId);
  if (result.ok && result.file) {
    downloadTextFile(result.file.content, result.file.filename, result.file.mimeType);
  }
  return result;
}
