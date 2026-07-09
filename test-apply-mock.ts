import { normalizePermissionRecords, getSpacePermissionKey } from './src/utils/permissions.ts';

const records = [
  { role: 'designer', module: 'space:sales', visible: false, add: false, change: false, delete: false }
];

console.log(normalizePermissionRecords(records as any).filter(r => r.role === 'designer' && r.module === 'space:sales'));
