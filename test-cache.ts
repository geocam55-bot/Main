import { initializePermissions, getSpacePermission } from './src/utils/permissions.ts';

async function test() {
  (globalThis as any).localStorage = {
    getItem: (key) => {
      if (key === 'permissions_org_001') {
        return JSON.stringify([
          { role: 'designer', module: 'space:sales', visible: false, add: false, change: false, delete: false },
          { role: 'designer', module: 'contacts', visible: false, add: false, change: false, delete: false }
        ]);
      }
      return 'org_001';
    },
    setItem: () => {}
  };
  await initializePermissions('designer');
  console.log('Space Perm:', getSpacePermission('sales', 'designer'));
}
test();
