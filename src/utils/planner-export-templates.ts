import { settingsAPI } from './api';
import { filterTemplatesByModule, type CustomExportTemplate } from './export-engine';

function normalizeOrganizationId(organizationId: string): string {
  const raw = (organizationId || '').trim();
  if (!raw || raw === 'undefined' || raw === 'null') {
    return localStorage.getItem('currentOrgId') || '';
  }
  return raw;
}

function normalizeTemplate(template: any): CustomExportTemplate | null {
  if (!template || !template.id) return null;

  const detailFields = Array.isArray(template.detail_fields)
    ? template.detail_fields
    : (Array.isArray(template.detailFields) ? template.detailFields : []);

  const headerLines = Array.isArray(template.header_lines)
    ? template.header_lines
    : (Array.isArray(template.headerLines) ? template.headerLines : []);

  return {
    ...template,
    file_extension: template.file_extension ?? template.fileExtension,
    layout_mode: template.layout_mode ?? template.layoutMode ?? 'delimited',
    header_lines: headerLines,
    detail_fields: detailFields,
    include_column_headers: template.include_column_headers ?? template.includeColumnHeaders,
  } as CustomExportTemplate;
}

function coerceTemplateArray(value: unknown): CustomExportTemplate[] {
  if (Array.isArray(value)) return value as CustomExportTemplate[];

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed as CustomExportTemplate[];
      if (parsed && typeof parsed === 'object' && Array.isArray((parsed as any).exportTemplates)) {
        return (parsed as any).exportTemplates as CustomExportTemplate[];
      }
    } catch {
      return [];
    }
  }

  if (value && typeof value === 'object') {
    const maybeObject = value as any;
    if (Array.isArray(maybeObject.exportTemplates)) return maybeObject.exportTemplates as CustomExportTemplate[];
    if (Array.isArray(maybeObject.export_templates)) return maybeObject.export_templates as CustomExportTemplate[];
  }

  return [];
}

function getLocalExportTemplates(organizationId: string): CustomExportTemplate[] {
  const collected = new Map<string, CustomExportTemplate>();

  const collectTemplatesFromStorageValue = (stored: string | null) => {
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored);
      const templates = coerceTemplateArray(parsed.exportTemplates ?? parsed.export_templates ?? parsed);

      for (const template of templates) {
        if (template?.id) {
          collected.set(template.id, template);
        }
      }
    } catch {
      // Ignore malformed local cache entries.
    }
  };

  try {
    const orgId = localStorage.getItem('currentOrgId') || organizationId;
    collectTemplatesFromStorageValue(localStorage.getItem(`global_settings_${orgId}`));

    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key || !key.startsWith('global_settings_') || key === `global_settings_${orgId}`) {
        continue;
      }

      collectTemplatesFromStorageValue(localStorage.getItem(key));
    }

    return Array.from(collected.values());
  } catch {
    return Array.from(collected.values());
  }
}

function mergeTemplates(
  serverTemplates: CustomExportTemplate[],
  localTemplates: CustomExportTemplate[]
): CustomExportTemplate[] {
  const merged = new Map<string, CustomExportTemplate>();

  for (const template of serverTemplates) {
    if (template?.id) merged.set(template.id, template);
  }

  for (const template of localTemplates) {
    if (template?.id) merged.set(template.id, template);
  }

  return Array.from(merged.values());
}

export async function loadPlannerExportTemplates(organizationId: string): Promise<CustomExportTemplate[]> {
  const normalizedOrganizationId = normalizeOrganizationId(organizationId);
  const localTemplates = getLocalExportTemplates(normalizedOrganizationId);

  const normalizePlannerTemplates = (templates: CustomExportTemplate[]): CustomExportTemplate[] => {
    const normalizedTemplates = templates
      .map((template) => normalizeTemplate(template))
      .filter((template): template is CustomExportTemplate => Boolean(template));

    const plannerTemplates = filterTemplatesByModule(normalizedTemplates, 'planners');
    if (plannerTemplates.length > 0) return plannerTemplates;

    return normalizedTemplates.filter((template) => template?.enabled !== false);
  };

  if (!normalizedOrganizationId) {
    return normalizePlannerTemplates(localTemplates);
  }

  try {
    const settings = await settingsAPI.getOrganizationSettings(normalizedOrganizationId);
    const serverTemplates = coerceTemplateArray(settings?.export_templates);

    return normalizePlannerTemplates(mergeTemplates(serverTemplates, localTemplates));
  } catch {
    return normalizePlannerTemplates(localTemplates);
  }
}