import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf-8');

const target = "console.warn('[Competitive Pricing] Supabase inventory fetch error:', invErr);";
const replacement = "console.warn('[Competitive Pricing] Supabase inventory fetch error:', invErr); return res.status(500).json({ error: 'Supabase Error', details: invErr });";

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('server.ts', code);
  console.log("Patched server.ts to return error");
} else {
  console.log("Not found");
}
