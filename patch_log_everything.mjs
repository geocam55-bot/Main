import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf-8');

const target = "      const { data: invRows, error: invErr } = await itemsQuery.range(start, end);";
const replacement = `
      console.log("=== API DASHBOARD REQUEST ===");
      console.log("Search term:", search);
      console.log("Generated andClause:", typeof search === 'string' ? buildInventoryAndSearchClause(search) : 'N/A');
      console.log("Range:", start, end);
      const { data: invRows, error: invErr } = await itemsQuery.range(start, end);
      console.log("Result rows:", invRows ? invRows.length : 0);
      console.log("Result error:", invErr);
      console.log("============================");
`;
code = code.replace(target, replacement);
fs.writeFileSync('server.ts', code);
