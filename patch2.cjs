const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  `              if (displayPrice && Number(displayPrice) > 0) {
                freshHd = Number(displayPrice);
                hdConf = 'HIGH';
                console.log(\`[Home Depot Direct Scraping] Store \${st || 'national'} Matched "\${query}" -> \${hdTitle}: \$\${freshHd} (SKU: \${hdSku})\`);
                break;
              }`,
  `              if (displayPrice && Number(displayPrice) > 0) {
                freshHd = Number(displayPrice);
                hdConf = 'HIGH';
                if (query === effectiveUpc && effectiveUpc) hdMethod = 'UPC';
                else if (query === effectiveMfg && effectiveMfg) hdMethod = 'MANUFACTURER_PART_NUMBER';
                else hdMethod = 'DESCRIPTION';
                console.log(\`[Home Depot Direct Scraping] Store \${st || 'national'} Matched "\${query}" -> \${hdTitle}: \$\${freshHd} (SKU: \${hdSku})\`);
                break;
              }`
);

fs.writeFileSync('server.ts', code);
