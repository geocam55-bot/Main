const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace(
  /app\.get\('\/api\/health', \(req, res\) => \{/,
  "app.get('/api/health', (req, res) => { res.json({ status: 'ok', v: 20543 }); return; "
);
fs.writeFileSync('server.ts', code);
