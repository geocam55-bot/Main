import { canAccessSpace, initializePermissions, getSpacePermission, permissionToAccessLevel } from './src/utils/permissions.ts';

async function test() {
  await initializePermissions('designer');
  const spacePerm = getSpacePermission('sales', 'designer');
  console.log('spacePerm', spacePerm);
  console.log('accessLevel', permissionToAccessLevel(spacePerm));
  console.log('legacyModuleOnlyDatasetLoaded', (globalThis as any).legacyModuleOnlyDatasetLoaded);
  console.log(canAccessSpace('sales', 'designer', 'view'));
}
test();
