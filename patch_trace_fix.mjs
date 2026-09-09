import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf-8');

const target = `      console.log("DASHBOARD SEARCH QUERY:", search, andClause || 'none');`;
const replacement = `      console.log("DASHBOARD SEARCH QUERY:", search);`;

code = code.replace(target, replacement);
fs.writeFileSync('server.ts', code);
