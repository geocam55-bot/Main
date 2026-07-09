import { normalizePermissionRecords } from './src/utils/permissions.ts';

const records = [
  { role: 'designer', module: 'space:sales', visible: false, add: false, change: false, delete: false },
  // What else would be saved? The modules for sales space.
  { role: 'designer', module: 'contacts', visible: false, add: false, change: false, delete: false }
];

const normalized = normalizePermissionRecords(records as any);
console.log(normalized.filter(r => r.role === 'designer' && r.module === 'space:sales'));
