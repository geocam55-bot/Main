import { permissionToAccessLevel } from './src/utils/permissions.ts';
console.log(permissionToAccessLevel({ visible: false, add: false, change: false, delete: false }));
