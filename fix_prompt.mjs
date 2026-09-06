import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf-8');

content = content.replace(/vs Kent and Home Depot in Halifax/g, 'vs ${comp1} and ${comp2} in ${searchMarket}');
fs.writeFileSync('server.ts', content);
