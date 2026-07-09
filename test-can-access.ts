import { canAccessSpace, initializePermissions } from './src/utils/permissions.ts';
async function test() {
  await initializePermissions('designer');
  console.log(canAccessSpace('sales', 'designer', 'view'));
}
test();
