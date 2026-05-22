import {
  buildCsv,
  buildCustomText,
  buildXml,
  downloadTextFile,
  sanitizeFilename,
  type CustomExportTemplate,
} from './export-engine';

export interface PlannerSavedDesignLike {
  name: string;
  description?: string | null;
  total_cost?: number;
  materials?: any[];
  created_at?: string;
}

export interface PlannerExportFile {
  content: string;
  filename: string;
  mimeType: string;
}

export function buildPlannerExportRows(design: PlannerSavedDesignLike, projectType: string): Record<string, unknown>[] {
  const createdAt = design.created_at || '';
  const normalizedTotal = Number(design.total_cost ?? 0);
  const designMeta = {
    project_type: projectType,
    design_name: design.name,
    title: design.name,
    quote_number: `${projectType.toUpperCase()}-${String(new Date(createdAt || Date.now()).getTime()).slice(-6)}`,
    description: design.description || '',
    total_cost: normalizedTotal,
    total: normalizedTotal,
    created_at: createdAt,
    updated_at: createdAt,
    saved_at: createdAt,
    material_count: Array.isArray(design.materials) ? design.materials.length : 0,
  };

  if (!Array.isArray(design.materials) || design.materials.length === 0) {
    return [
      {
        ...designMeta,
        material_name: '',
        sku: '',
        category: '',
        quantity: '',
        unit_price: '',
        line_total: '',
      },
    ];
  }

  return design.materials.map((item: any) => {
    const quantity = item.quantity ?? item.qty ?? '';
    const unitPrice = item.unit_price ?? item.unitPrice ?? item.price ?? '';
    const lineTotalRaw =
      item.total ?? item.line_total ?? item.lineTotal ?? (Number(quantity || 0) * Number(unitPrice || 0));
    const lineTotalNumber = Number(lineTotalRaw);
    const normalizedLineTotal = Number.isFinite(lineTotalNumber)
      ? lineTotalNumber
      : (lineTotalRaw ?? '');
    const materialName = item.name || item.material || item.description || item.itemName || '';
    const itemId = item.itemId || item.id || item.sku || '';

    return {
      ...designMeta,
      material_name: materialName,
      itemName: materialName,
      item_name: materialName,
      sku: item.sku || '',
      itemId,
      item_id: itemId,
      category: item.category || '',
      quantity,
      qty: quantity,
      unit_price: unitPrice,
      unitPrice,
      line_total: normalizedLineTotal,
      lineTotal: normalizedLineTotal,
    };
  });
}

export function exportPlannerDesign(
  design: PlannerSavedDesignLike,
  projectType: string,
  format: 'csv' | 'xml' | 'custom',
  templates: CustomExportTemplate[],
  customTemplateId?: string
): { ok: boolean; error?: string } {
  const result = createPlannerExportFile(design, projectType, format, templates, customTemplateId);
  if (!result.ok) {
    return result;
  }

  downloadTextFile(result.file.content, result.file.filename, result.file.mimeType);
  return { ok: true };
}

export function createPlannerExportFile(
  design: PlannerSavedDesignLike,
  projectType: string,
  format: 'csv' | 'xml' | 'custom',
  templates: CustomExportTemplate[],
  customTemplateId?: string
): { ok: true; file: PlannerExportFile } | { ok: false; error: string } {
  const rows = buildPlannerExportRows(design, projectType);
  const safeName = sanitizeFilename(design.name || `${projectType}-design`);
  const datePart = new Date().toISOString().split('T')[0];

  if (format === 'xml') {
    const xmlContent = buildXml(rows, `${projectType}_designs`, 'design_row');
    return {
      ok: true,
      file: {
        content: xmlContent,
        filename: `${safeName}_${datePart}.xml`,
        mimeType: 'application/xml;charset=utf-8;',
      },
    };
  }

  if (format === 'custom') {
    const template = templates.find((item) => item.id === customTemplateId);
    if (!template) {
      return { ok: false, error: 'Choose a custom export template before exporting.' };
    }

    const content = buildCustomText(rows, template);
    const extension = (template.file_extension || 'txt').replace(/^\./, '');
    const templateName = sanitizeFilename(template.name || 'custom');
    return {
      ok: true,
      file: {
        content,
        filename: `${safeName}_${templateName}_${datePart}.${extension}`,
        mimeType: 'text/plain;charset=utf-8;',
      },
    };
  }

  const csvContent = buildCsv(rows);
  return {
    ok: true,
    file: {
      content: csvContent,
      filename: `${safeName}_${datePart}.csv`,
      mimeType: 'text/csv;charset=utf-8;',
    },
  };
}
