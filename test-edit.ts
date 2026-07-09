import fs from 'fs';
const code = fs.readFileSync('src/components/PermissionsManager.tsx', 'utf-8');
const index = code.indexOf('const [originalPermissions');
console.log(code.slice(index - 100, index + 200));
