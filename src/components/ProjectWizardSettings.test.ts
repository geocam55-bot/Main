import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import type { ProjectWizardDefault } from '../utils/project-wizard-defaults-client';
import { buildRowsToDelete, parseDefaultsKey } from './ProjectWizardSettings';

describe('ProjectWizardSettings save helpers', () => {
  it('parses hyphenated material types correctly', () => {
    expect(parseDefaultsKey('garage-fiber-cement-siding-accessories')).toEqual({
      plannerType: 'garage',
      materialType: 'fiber-cement',
      category: 'siding-accessories',
    });

    expect(parseDefaultsKey('deck-aluminum-white-railing')).toEqual({
      plannerType: 'deck',
      materialType: 'aluminum-white',
      category: 'railing',
    });

    expect(parseDefaultsKey('deck-aluminum-black-railing-tempered-glass-panels-by-size')).toEqual({
      plannerType: 'deck',
      materialType: 'aluminum-black',
      category: 'railing-tempered-glass-panels-by-size',
    });
  });

  it('returns rows to delete when defaults were cleared to none', () => {
    const loadedDefaults: ProjectWizardDefault[] = [
      {
        id: 'row-1',
        organization_id: 'org-1',
        planner_type: 'garage',
        material_type: 'fiber-cement',
        material_category: 'siding-accessories',
        inventory_item_id: 'item-a',
      },
      {
        id: 'row-2',
        organization_id: 'org-1',
        planner_type: 'deck',
        material_type: 'aluminum-white',
        material_category: 'railing',
        inventory_item_id: 'item-b',
      },
    ];

    const defaultConfigs: ProjectWizardDefault[] = [
      {
        organization_id: 'org-1',
        planner_type: 'deck',
        material_type: 'aluminum-white',
        material_category: 'railing',
        inventory_item_id: 'item-b',
      },
    ];

    const rowsToDelete = buildRowsToDelete(loadedDefaults, defaultConfigs);

    expect(rowsToDelete).toHaveLength(1);
    expect(rowsToDelete[0].id).toBe('row-1');
    expect(rowsToDelete[0].planner_type).toBe('garage');
    expect(rowsToDelete[0].material_type).toBe('fiber-cement');
  });
});
