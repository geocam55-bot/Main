import fs from 'fs';
let serverCode = fs.readFileSync('server.ts', 'utf-8');

const resolveSearchOld = `      if (!invItem && pidStr.length > 2) {
        const { data } = await supabase
          .from('inventory')
          .select('*')
          .or(\`description.ilike.%\${pidStr}%,name.ilike.%\${pidStr}%\`)
          .limit(1)
          .maybeSingle();
        invItem = data;
      }`;
const resolveSearchNew = `      if (!invItem && pidStr.length > 2) {
        const andClause = buildInventoryAndSearchClause(pidStr);
        let query = supabase.from('inventory').select('*').limit(1);
        if (andClause) {
          query = query.or(andClause);
        } else {
          query = query.eq('id', '00000000-0000-0000-0000-000000000000');
        }
        const { data } = await query.maybeSingle();
        invItem = data;
      }`;

if (serverCode.includes(resolveSearchOld)) {
  serverCode = serverCode.replace(resolveSearchOld, resolveSearchNew);
  console.log("Patched resolveProductRecord search!");
} else {
  console.log("Failed to find resolveSearchOld");
}

fs.writeFileSync('server.ts', serverCode);
