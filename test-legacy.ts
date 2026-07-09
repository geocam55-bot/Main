import { applyPermissionRecords, initializePermissions, canAccessSpace } from './src/utils/permissions.ts';

// Test legacy logic
async function test() {
  await initializePermissions('designer');
  
  // Need a way to inject applyPermissionRecords but it's not exported.
  // Let's just test normalizePermissionRecords and see.
}
