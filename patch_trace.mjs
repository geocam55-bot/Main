import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf-8');

const target = "      const { data: invRows, error: invErr } = await itemsQuery.range(start, end);";
const replacement = target + `
      console.log("DASHBOARD SEARCH QUERY:", search, andClause || 'none');
      console.log("DB INVENTORY FETCH:", invErr, invRows ? invRows.length : 0);
`;

code = code.replace(target, replacement);
fs.writeFileSync('server.ts', code);
