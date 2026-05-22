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

  const getFieldValue = (row: Record<string, unknown>, field: CustomExportField): string => {
    if ((field.source || 'field') === 'text') {
      return String(field.text ?? '');
    }
    return String(row[field.key] ?? '');
  };

  const getFieldHeader = (field: CustomExportField): string => {
    if (field.label) return field.label;
    if ((field.source || 'field') === 'text') return field.text || 'text';
    return field.key;
  };

  if (!detailFields.length) {
    return [...headerLines, ...rows.map(() => '')].join('\n');
  }

  if (layoutMode === 'delimited') {
    const delimiter = template.delimiter || '|';
    const includeHeaders = includeColumnHeaders !== false;
    const output: string[] = [...headerLines];

    if (includeHeaders) {
      output.push(detailFields.map((field) => getFieldHeader(field)).join(delimiter));
    }

    for (const row of rows) {
      output.push(detailFields.map((field) => getFieldValue(row, field)).join(delimiter));
    }

    return output.join('\n');
  }

  detailFields.sort((a, b) => (a.start || 1) - (b.start || 1));
  const output: string[] = [...headerLines];

  for (const row of rows) {
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
    output.push(line);
  }

  return output.join('\n');
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
