import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf-8');

content = content.replace(/try {\n      const comp1 = \(competitors/m, 'try {\n      // comp1 already defined');
fs.writeFileSync('server.ts', content);
