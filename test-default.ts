import { normalizePermissionRecords, getSpacePermissionKey } from './src/utils/permissions.ts';

const records = [
  { role: 'admin', module: 'space:sales', visible: true, add: true, change: true, delete: true }
  // designer has no records!
];

console.log(normalizePermissionRecords(records as any).filter(r => r.role === 'designer' && r.module === 'space:sales'));
