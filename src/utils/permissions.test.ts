// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';
import {
  canAdd,
  canAccessSpace,
  canChange,
  canView,
  getDefaultPermission,
  getDefaultSpacePermission,
  getSpacePermissionKey,
  normalizePermissionRecords,
  permissionToAccessLevel,
  refreshPermissionsFromStorage,
} from './permissions';

describe('space-based permissions', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('currentOrgId', 'org_001');
    refreshPermissionsFromStorage();
  });

  it('migrates legacy module permissions into space-level records', () => {
    const migrated = normalizePermissionRecords([
      { module: 'contacts', role: 'marketing', visible: true, add: true, change: true, delete: false },
      { module: 'email', role: 'marketing', visible: true, add: true, change: true, delete: false },
      { module: 'security', role: 'marketing', visible: false, add: false, change: false, delete: false },
    ]);

    expect(migrated.some((record) => record.module === getSpacePermissionKey('marketing') && record.role === 'marketing')).toBe(true);
    expect(migrated.some((record) => record.module === getSpacePermissionKey('sales') && record.role === 'marketing')).toBe(true);
    expect(migrated.some((record) => record.module === 'contacts' && record.role === 'marketing')).toBe(true);
    expect(migrated.some((record) => record.module === 'email' && record.role === 'marketing')).toBe(true);
  });

  it('turns a view-only space into read-only module access', () => {
    localStorage.setItem(
      'permissions_org_001',
      JSON.stringify([
        { module: getSpacePermissionKey('sales'), role: 'manager', visible: true, add: false, change: false, delete: false },
        { module: getSpacePermissionKey('marketing'), role: 'manager', visible: false, add: false, change: false, delete: false },
        { module: getSpacePermissionKey('design'), role: 'manager', visible: false, add: false, change: false, delete: false },
      ])
    );

    refreshPermissionsFromStorage();

    expect(canView('contacts', 'manager')).toBe(true);
    expect(canAdd('contacts', 'manager')).toBe(false);
    expect(canChange('contacts', 'manager')).toBe(false);
  });

  it('applies explicit space grants to modules in that space', () => {
    localStorage.setItem(
      'permissions_org_001',
      JSON.stringify([
        { module: getSpacePermissionKey('sales'), role: 'marketing', visible: true, add: false, change: false, delete: false },
        { module: getSpacePermissionKey('marketing'), role: 'marketing', visible: true, add: true, change: true, delete: true },
      ])
    );

    refreshPermissionsFromStorage();

    expect(canView('contacts', 'marketing')).toBe(true);
    expect(canAdd('contacts', 'marketing')).toBe(true);
    expect(canView('bids', 'marketing')).toBe(true);
    expect(canAdd('bids', 'marketing')).toBe(false);
  });

  it('keeps core Sales modules visible for standard users', () => {
    refreshPermissionsFromStorage();

    expect(canView('bids', 'standard_user')).toBe(true);
    expect(canView('email', 'standard_user')).toBe(true);
    expect(canView('tasks', 'standard_user')).toBe(true);
    expect(canView('appointments', 'standard_user')).toBe(true);
    expect(canView('notes', 'standard_user')).toBe(true);
  });

  it('does not grant unrelated spaces from shared module visibility', () => {
    refreshPermissionsFromStorage();

    expect(canAccessSpace('sales', 'standard_user', 'view')).toBe(true);
    expect(canAccessSpace('design', 'standard_user', 'view')).toBe(true);
    expect(canAccessSpace('marketing', 'standard_user', 'view')).toBe(false);
    expect(canAccessSpace('insights', 'standard_user', 'view')).toBe(false);
    expect(canAccessSpace('inventory', 'standard_user', 'view')).toBe(false);
    expect(canAccessSpace('it', 'standard_user', 'view')).toBe(false);
  });

  it('requires space access before a module override can grant access', () => {
    localStorage.setItem(
      'permissions_org_001',
      JSON.stringify([
        { module: getSpacePermissionKey('sales'), role: 'standard_user', visible: false, add: false, change: false, delete: false },
        { module: getSpacePermissionKey('marketing'), role: 'standard_user', visible: false, add: false, change: false, delete: false },
        { module: 'email', role: 'standard_user', visible: true, add: true, change: true, delete: false },
      ])
    );

    refreshPermissionsFromStorage();

    expect(canView('email', 'standard_user')).toBe(false);
  });

  it('does not allow direct marketing module access when Marketing Space is denied', () => {
    localStorage.setItem(
      'permissions_org_001',
      JSON.stringify([
        { module: getSpacePermissionKey('marketing'), role: 'standard_user', visible: false, add: false, change: false, delete: false },
        { module: 'marketing', role: 'standard_user', visible: true, add: true, change: true, delete: true },
      ])
    );

    refreshPermissionsFromStorage();

    expect(canAccessSpace('marketing', 'standard_user', 'view')).toBe(false);
    expect(canView('marketing', 'standard_user')).toBe(false);
    expect(canAdd('marketing', 'standard_user')).toBe(false);
    expect(canChange('marketing', 'standard_user')).toBe(false);
  });

  it('keeps option overrides read-only when the parent space is view only', () => {
    localStorage.setItem(
      'permissions_org_001',
      JSON.stringify([
        { module: getSpacePermissionKey('sales'), role: 'manager', visible: true, add: false, change: false, delete: false },
        { module: 'tasks', role: 'manager', visible: true, add: true, change: true, delete: false },
      ])
    );

    refreshPermissionsFromStorage();

    expect(canView('tasks', 'manager')).toBe(true);
    expect(canAdd('tasks', 'manager')).toBe(false);
    expect(canChange('tasks', 'manager')).toBe(false);
  });

  it('enforces the Design Space access matrix by role', () => {
    const expected = {
      super_admin: 'full',
      admin: 'full',
      director: 'full',
      manager: 'none',
      marketing: 'none',
      designer: 'full',
      standard_user: 'full',
    } as const;

    (Object.entries(expected) as Array<[keyof typeof expected, (typeof expected)[keyof typeof expected]]>)
      .forEach(([role, level]) => {
        expect(permissionToAccessLevel(getDefaultSpacePermission('design', role))).toBe(level);
      });
  });

  it('keeps direct module overrides constrained when there is no space-level grant', () => {
    const normalized = normalizePermissionRecords([
      { module: 'project-wizards', role: 'manager', visible: true, add: true, change: true, delete: true },
      { module: getSpacePermissionKey('design'), role: 'marketing', visible: true, add: true, change: true, delete: true },
    ]);

    const managerProjectWizards = normalized.find((entry) => entry.module === 'project-wizards' && entry.role === 'manager');
    const marketingDesignSpace = normalized.find((entry) => entry.module === getSpacePermissionKey('design') && entry.role === 'marketing');

    expect(permissionToAccessLevel(managerProjectWizards)).toBe('none');
    expect(permissionToAccessLevel(marketingDesignSpace)).toBe('full');
  });

  it('keeps standard user full capability for Design Space modules', () => {
    expect(permissionToAccessLevel(getDefaultPermission('project-wizards', 'standard_user'))).toBe('full');
    expect(permissionToAccessLevel(getDefaultPermission('kitchen-planner', 'standard_user'))).toBe('full');
  });

  it('deduplicates duplicate role+module records using the latest value', () => {
    const normalized = normalizePermissionRecords([
      { module: getSpacePermissionKey('inventory'), role: 'manager', visible: true, add: false, change: false, delete: false },
      { module: getSpacePermissionKey('inventory'), role: 'manager', visible: true, add: true, change: true, delete: true },
    ]);

    const inventoryRows = normalized.filter(
      (entry) => entry.module === getSpacePermissionKey('inventory') && entry.role === 'manager'
    );

    expect(inventoryRows).toHaveLength(1);
    expect(permissionToAccessLevel(inventoryRows[0])).toBe('full');
  });

  it('applies an explicit inventory space grant for standard users after save and reload', () => {
    localStorage.setItem(
      'permissions_org_001',
      JSON.stringify([
        { module: getSpacePermissionKey('inventory'), role: 'standard_user', visible: true, add: true, change: true, delete: true },
      ])
    );

    refreshPermissionsFromStorage();

    expect(canAccessSpace('inventory', 'standard_user', 'view')).toBe(true);
    expect(canView('inventory', 'standard_user')).toBe(true);
    expect(canAdd('inventory', 'standard_user')).toBe(true);
    expect(canChange('inventory', 'standard_user')).toBe(true);
  });

  it('applies an explicit IT space grant for standard users after save and reload', () => {
    localStorage.setItem(
      'permissions_org_001',
      JSON.stringify([
        { module: getSpacePermissionKey('it'), role: 'standard_user', visible: true, add: true, change: true, delete: true },
      ])
    );

    refreshPermissionsFromStorage();

    expect(canAccessSpace('it', 'standard_user', 'view')).toBe(true);
    expect(canView('security', 'standard_user')).toBe(true);
    expect(canView('users', 'standard_user')).toBe(true);
  });

  it('allows inventory space access from module-only records when space records are absent', () => {
    localStorage.setItem(
      'permissions_org_001',
      JSON.stringify([
        { module: 'inventory', role: 'standard_user', visible: true, add: true, change: true, delete: true },
      ])
    );

    refreshPermissionsFromStorage();

    expect(canAccessSpace('inventory', 'standard_user', 'view')).toBe(true);
    expect(canAccessSpace('inventory', 'standard_user', 'full')).toBe(true);
  });

  it('does not infer Marketing Space from shared legacy modules', () => {
    localStorage.setItem(
      'permissions_org_001',
      JSON.stringify([
        { module: 'contacts', role: 'standard_user', visible: true, add: true, change: true, delete: false },
        { module: 'messages', role: 'standard_user', visible: true, add: true, change: true, delete: false },
        { module: 'email', role: 'standard_user', visible: true, add: true, change: true, delete: false },
      ])
    );

    refreshPermissionsFromStorage();

    expect(canAccessSpace('marketing', 'standard_user', 'view')).toBe(false);
    expect(canView('marketing', 'standard_user')).toBe(false);
  });
});
