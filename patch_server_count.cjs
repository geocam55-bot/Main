const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace(
  /const totalMonitored = \(exactTotalCount && exactTotalCount !== 1000\) \? exactTotalCount : 20543;/g,
  "const totalMonitored = (exactTotalCount && exactTotalCount !== 1000) ? exactTotalCount : ((!search && (!category || category === 'all')) ? 20543 : exactTotalCount);"
);
fs.writeFileSync('server.ts', code);
