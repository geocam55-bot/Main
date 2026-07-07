export type ExportFormat = 'csv' | 'xml' | 'custom';
export type ExportModule = 'quotes' | 'planners' | 'all';

export interface CustomExportField {
  source?: 'field' | 'text';
  key: string;
  text?: string;
  label?: string;
  start?: number;
  length?: number;
  align?: 'left' | 'right';
  pad_char?: string;
  zero_fill?: boolean;
  zero_fill_width?: number;
}

export interface CustomExportTemplate {
  id: string;
  name: string;
  description?: string;
  module?: ExportModule;
  enabled?: boolean;
  file_extension?: string;
  layout_mode: 'fixed' | 'delimited';
  delimiter?: string;
  header_lines?: string[];
  detail_fields: CustomExportField[];
  include_column_headers?: boolean;
}

function escapeCsv(value: unknown): string {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

export function buildCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];

  for (const row of rows) {
    lines.push(headers.map((key) => escapeCsv(row[key])).join(','));
  }

  return lines.join('\n');
}

function escapeXml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function buildXml(rows: Record<string, unknown>[], rootName = 'records', rowName = 'record'): string {
  const body = rows
    .map((row) => {
      const fields = Object.entries(row)
        .map(([key, value]) => `    <${key}>${escapeXml(value)}</${key}>`)
        .join('\n');
      return `  <${rowName}>\n${fields}\n  </${rowName}>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<${rootName}>\n${body}\n</${rootName}>`;
}

function padFixedValue(value: string, length: number, align: 'left' | 'right', padChar: string): string {
  const sliced = value.slice(0, length);
  if (sliced.length >= length) return sliced;
  const pad = padChar.repeat(length - sliced.length);
  return align === 'right' ? `${pad}${sliced}` : `${sliced}${pad}`;
}

export function buildCustomText(rows: Record<string, unknown>[], template: CustomExportTemplate): string {
  const templateWithLegacyFields = template as CustomExportTemplate & {
    headerLines?: string[];
    detailFields?: CustomExportField[];
    layoutMode?: 'fixed' | 'delimited';
    includeColumnHeaders?: boolean;
  };

  const headerLines = template.header_lines
    || templateWithLegacyFields.headerLines
    || [];
  const detailFields = [
    ...(
      template.detail_fields
      || templateWithLegacyFields.detailFields
      || []
    ),
  ];
  const layoutMode = template.layout_mode || templateWithLegacyFields.layoutMode || 'delimited';
  const includeColumnHeaders = template.include_column_headers ?? templateWithLegacyFields.includeColumnHeaders;

  const isEagle = (template.name || '').toLowerCase().includes('eagle') || 
                  (template.description || '').toLowerCase().includes('eagle');

  let processedRows = rows;
  if (isEagle && rows.length > 0) {
    // Inject category header rows for Eagle export
    const groupedRows: Record<string, unknown>[] = [];
    const designMeta = { ...rows[0] };
    let lastCategory = '';
    
    for (const row of rows) {
      if (row.is_category_row) {
        groupedRows.push(row);
        continue;
      }
      
      const category = String(row.category || '').trim();
      if (category && category.toLowerCase() !== lastCategory.toLowerCase()) {
        lastCategory = category;
        groupedRows.push({
          ...designMeta,
          sku: '',
          material_name: category.toUpperCase(),
          itemName: category.toUpperCase(),
          item_name: category.toUpperCase(),
          description: category.toUpperCase(),
          quantity: '',
          qty: '',
          unit_price: '',
          unitPrice: '',
          line_total: '',
          lineTotal: '',
          unit_of_measure: '',
          unit: '',
          units: '',
          is_category_row: true,
        });
      }
      groupedRows.push(row);
    }
    processedRows = groupedRows;
  }

  const getFieldValue = (row: Record<string, unknown>, field: CustomExportField): string => {
    const isCategoryRow = !!row.is_category_row;
    if (isCategoryRow) {
      if ((field.source || 'field') === 'text') {
        return String(field.text ?? '');
      }
      const isDescField = ['description', 'material_name', 'item_name', 'itemname'].includes(field.key.toLowerCase());
      if (isDescField) {
        return String(row.description || row.material_name || row.item_name || '');
      }
      return '';
    }

    if ((field.source || 'field') === 'text') {
      return String(field.text ?? '');
    }
    let val = '';
    const lookupKey = field.key;
    if (['unit', 'units', 'uom', 'unit_of_measure'].includes(lookupKey.toLowerCase())) {
      const possibleKeys = ['unit_of_measure', 'unitOfMeasure', 'unit_of_measure_val', 'unit', 'units', 'uom'];
      let foundVal: unknown = undefined;
      for (const k of possibleKeys) {
        if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
          foundVal = row[k];
          break;
        }
      }
      if (foundVal === undefined) {
        foundVal = row['unit_of_measure'] ?? row['unit'] ?? row['units'] ?? row['uom'] ?? '';
      }
      val = String(foundVal ?? '');
    } else {
      val = String(row[lookupKey] ?? '');
    }

    // Strip any HTML comment metadata (e.g. <!--metadata:{...}-->) from field values
    if (val.includes('<!--metadata:')) {
      const markerStart = "<!--metadata:";
      const markerEnd = "-->";
      const startIndex = val.lastIndexOf(markerStart);
      if (startIndex !== -1) {
        const endIndex = val.indexOf(markerEnd, startIndex + markerStart.length);
        if (endIndex !== -1) {
          const before = val.substring(0, startIndex);
          const after = val.substring(endIndex + markerEnd.length);
          val = (before + after).trim();
        } else {
          // If the comment is truncated, strip from the marker onwards
          val = val.substring(0, startIndex).trim();
        }
      }
    }

    // Replace newlines and extra spaces to keep the text row strictly on a single line
    val = val.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();

    const loweredKey = field.key.toLowerCase();

    // 1) Units from Inventory: 2 characters, capitalized
    if (['unit', 'units', 'uom', 'unit_of_measure'].includes(loweredKey)) {
      val = val.trim().toUpperCase();
      if (val.length > 2) {
        val = val.slice(0, 2);
      } else {
        val = val.padEnd(2, ' ');
      }
    }

    // 2) Zero-filled number field
    if (field.zero_fill) {
      const width = Math.max(1, field.zero_fill_width ?? 5);
      const floatVal = parseFloat(val);
      if (!isNaN(floatVal)) {
        if (Number.isInteger(floatVal)) {
          val = String(Math.round(floatVal)).padStart(width, '0');
        } else {
          const parts = String(val).split('.');
          parts[0] = parts[0].padStart(width, '0');
          val = parts.join('.');
        }
      } else {
        val = val.padStart(width, '0');
      }
    }

    return val;
  };

  const getFieldHeader = (field: CustomExportField): string => {
    if (field.label) return field.label;
    if ((field.source || 'field') === 'text') return field.text || 'text';
    return field.key;
  };

  if (!detailFields.length) {
    return [...headerLines, ...processedRows.map(() => '')].join('\n');
  }

  if (layoutMode === 'delimited') {
    const delimiter = template.delimiter || '|';
    const includeHeaders = includeColumnHeaders !== false;
    const output: string[] = isEagle ? [] : [...headerLines];

    if (isEagle) {
      let headerLine = 'H'.padEnd(384, ' ') + 'E';
      headerLine = headerLine.padEnd(495, ' ');
      output.push(headerLine);
    } else if (includeHeaders) {
      output.push(detailFields.map((field) => getFieldHeader(field)).join(delimiter));
    }

    for (const row of processedRows) {
      output.push(detailFields.map((field) => getFieldValue(row, field)).join(delimiter));
    }

    return output.join(isEagle ? '\r\n' : '\n');
  }

  detailFields.sort((a, b) => (a.start || 1) - (b.start || 1));
  const output: string[] = [];

  if (isEagle) {
    let headerLine = 'H'.padEnd(384, ' ') + 'E';
    headerLine = headerLine.padEnd(495, ' ');
    output.push(headerLine);
  } else {
    output.push(...headerLines);
  }

  for (const row of processedRows) {
    let line = '';
    for (const field of detailFields) {
      const start = Math.max(1, field.start || 1);
      const length = Math.max(1, field.length || 1);
      const align = field.align || 'left';
      const padChar = (field.pad_char || ' ').charAt(0);
      const value = getFieldValue(row, field);
      const formatted = padFixedValue(value, length, align, padChar);

      if (line.length < start - 1) {
        line += ' '.repeat(start - 1 - line.length);
      }

      const prefix = line.slice(0, start - 1);
      const suffixStart = start - 1 + length;
      const suffix = line.length > suffixStart ? line.slice(suffixStart) : '';
      line = `${prefix}${formatted}${suffix}`;
    }

    if (isEagle) {
      if (line.length < 481) {
        line = line.padEnd(481, ' ');
      } else if (line.length > 481) {
        line = line.slice(0, 481);
      }
    }

    output.push(line);
  }

  return output.join(isEagle ? '\r\n' : '\n');
}

export function downloadTextFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function sanitizeFilename(value: string): string {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '') || 'export';
}

export function filterTemplatesByModule(
  templates: CustomExportTemplate[] | undefined,
  module: ExportModule
): CustomExportTemplate[] {
  return (templates || []).filter((template) => {
    if (template.enabled === false) return false;
    if (!template.module || template.module === 'all') return true;
    // Backward compatibility: older templates defaulted to "quotes" in Settings,
    // but users also expect to use them in planners.
    if (module === 'planners' && template.module === 'quotes') return true;
    return template.module === module;
  });
}
