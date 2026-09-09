import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf-8');

const target = `      // Fetch total count for metrics first
      const { count: totalItems } = await supabase
        .from('inventory')
        .select('id', { count: 'exact', head: true });`;

const replacement = `      // Fetch total count for metrics first
      let countQuery = supabase
        .from('inventory')
        .select('id', { count: 'exact', head: true });
      if (search && typeof search === 'string') {
        const andClause = buildInventoryAndSearchClause(search);
        if (andClause) {
          countQuery = countQuery.or(andClause);
        } else {
          countQuery = countQuery.eq('id', '00000000-0000-0000-0000-000000000000');
        }
      }
      if (category && category !== 'all') {
        countQuery = countQuery.eq('category', category);
      }
      const { count: totalItems } = await countQuery;`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('server.ts', code);
  console.log("Patched server.ts to fix countQuery!");
} else {
  console.log("Not found");
}
