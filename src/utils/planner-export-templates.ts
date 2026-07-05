import { settingsAPI } from './api';
import { filterTemplatesByModule, type CustomExportTemplate } from './export-engine';

function normalizeOrganizationId(organizationId?: string): string {
  const raw = String(organizationId || '').trim();
  if (!raw || raw === 'undefined' || raw === 'null' || raw === '[object Object]') {
    const cached = (localStorage.getItem('currentOrgId') || '').trim();
    if (cached && cached !== 'undefined' && cached !== 'null' && cached !== '[object Object]') {
      return cached;
    }
    return '';
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
    let cleaned = value.trim();
    // Handle double stringified values
    if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
      try {
        const unescaped = JSON.parse(cleaned);
        if (typeof unescaped === 'string') {
          cleaned = unescaped.trim();
        } else if (Array.isArray(unescaped)) {
          return unescaped as CustomExportTemplate[];
        }
      } catch (_) {}
    }

    try {
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) return parsed as CustomExportTemplate[];
      if (parsed && typeof parsed === 'object' && Array.isArray((parsed as any).exportTemplates)) {
        return (parsed as any).exportTemplates as CustomExportTemplate[];
      }
      if (parsed && typeof parsed === 'object' && Array.isArray((parsed as any).export_templates)) {
        return (parsed as any).export_templates as CustomExportTemplate[];
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

function getLocalExportTemplates(organizationId?: string): CustomExportTemplate[] {
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
    let orgId = localStorage.getItem('currentOrgId') || organizationId;
    orgId = String(orgId || '').trim();
    if (orgId === 'undefined' || orgId === 'null' || orgId === '[object Object]') {
      orgId = '';
    }

    if (orgId) {
      collectTemplatesFromStorageValue(localStorage.getItem(`global_settings_${orgId}`));
    }

    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key || !key.startsWith('global_settings_')) {
        continue;
      }
      if (orgId && key === `global_settings_${orgId}`) {
        continue;
      }
      if (key.includes('_undefined') || key.includes('_null') || key.includes('_[object Object]')) {
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

export async function loadPlannerExportTemplates(organizationId?: string): Promise<CustomExportTemplate[]> {
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

  const orgIdsToFetch = Array.from(new Set([
    normalizedOrganizationId,
    localStorage.getItem('currentOrgId'),
    'org_001',
  ].map((id) => String(id || '').trim())
   .filter((id) => id !== '' && id !== 'undefined' && id !== 'null' && id !== '[object Object]')));

  let allServerTemplates: CustomExportTemplate[] = [];

  try {
    const fetchPromises = orgIdsToFetch.map(async (orgId) => {
      try {
        const settings = await settingsAPI.getOrganizationSettings(orgId);
        if (settings?.export_templates) {
          return coerceTemplateArray(settings.export_templates);
        }
      } catch (err) {
        console.warn(`[loadPlannerExportTemplates] Error fetching settings for org ${orgId}:`, err);
      }
      return [];
    });

    const results = await Promise.all(fetchPromises);
    for (const serverTemplates of results) {
      if (serverTemplates.length > 0) {
        allServerTemplates = mergeTemplates(allServerTemplates, serverTemplates);
      }
    }
  } catch (err) {
    console.error('[loadPlannerExportTemplates] Failed parallel load of templates:', err);
  }

  return normalizePlannerTemplates(mergeTemplates(allServerTemplates, localTemplates));
}