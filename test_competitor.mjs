import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf-8');

content = content.replace(/const responseText = response\.text \|\| '';/g, 'const responseText = response?.text || \'\';');
fs.writeFileSync('server.ts', content);
