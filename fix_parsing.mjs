import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf-8');

content = content.replace(/\|\| "\$\{comp1\}";/g, '|| comp1;');
content = content.replace(/\|\| "\$\{comp2\}";/g, '|| comp2;');
content = content.replace(/\|\| "Bayers Lake";/g, '|| searchMarket;');
content = content.replace(/\|\| "Halifax Lacewood";/g, '|| searchMarket;');

fs.writeFileSync('server.ts', content);
