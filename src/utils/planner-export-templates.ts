import { settingsAPI } from './api';
import { filterTemplatesByModule, type CustomExportTemplate } from './export-engine';

export async function loadPlannerExportTemplates(organizationId: string): Promise<CustomExportTemplate[]> {
  try {
    if (!organizationId) return [];
    const settings = await settingsAPI.getOrganizationSettings(organizationId);
    const rawTemplates = settings?.export_templates || settings?.exportTemplates || [];
    return filterTemplatesByModule(rawTemplates, 'planners');
  } catch (err) {
    console.warn('Failed to load planner export templates:', err);
    return [];
  }
}
