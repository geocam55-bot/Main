const fs = require('fs');

function patchFile(file) {
  let code = fs.readFileSync(file, 'utf8');
  code = code.replace(
    /const totalMonitored = \(exactTotalCount && exactTotalCount !== 1000\) \? exactTotalCount : 20543;/g,
    "const totalMonitored = (exactTotalCount && exactTotalCount !== 1000) ? exactTotalCount : ((!filters?.search && (!filters?.category || filters.category === 'all')) ? 20543 : exactTotalCount);"
  );
  fs.writeFileSync(file, code);
}

patchFile('src/utils/competitive-pricing-client.ts');
