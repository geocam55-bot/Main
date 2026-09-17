const fs = require('fs');
let code = fs.readFileSync('src/utils/api.ts', 'utf8');
code = code.replace(
  /const res = await fetch\(\`\/api\/competitive-pricing\/dashboard\$\{qs \? \`\?\$\{qs\}\` : ''\}\`, \{ headers \}\);/g,
  "if (qs) query.set('_t', Date.now().toString()); else query.set('_t', Date.now().toString()); qs = query.toString(); const res = await fetch(`/api/competitive-pricing/dashboard?${qs}`, { headers, cache: 'no-store' });"
);
fs.writeFileSync('src/utils/api.ts', code);
