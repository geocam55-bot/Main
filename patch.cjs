const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  `              kentConf = 'HIGH';
              console.log(\`[Kent AJAX Scraping] Matched "\${query}" -> \${kentTitle}: \$\${freshKent} (Bayers Lake)\`);`,
  `              kentConf = 'HIGH';
              if (query === effectiveUpc && effectiveUpc) kentMethod = 'UPC';
              else if (query === effectiveMfg && effectiveMfg) kentMethod = 'MANUFACTURER_PART_NUMBER';
              else kentMethod = 'DESCRIPTION';
              console.log(\`[Kent AJAX Scraping] Matched "\${query}" -> \${kentTitle}: \$\${freshKent} (Bayers Lake)\`);`
);

code = code.replace(
  `              freshHd = Number(displayPrice);
              hdConf = 'HIGH';
              console.log(\`[Home Depot Direct Scraping] Store \${st || 'national'} Matched "\${query}" -> \${hdTitle}: \$\${freshHd} (SKU: \${hdSku})\`);`,
  `              freshHd = Number(displayPrice);
              hdConf = 'HIGH';
              if (query === effectiveUpc && effectiveUpc) hdMethod = 'UPC';
              else if (query === effectiveMfg && effectiveMfg) hdMethod = 'MANUFACTURER_PART_NUMBER';
              else hdMethod = 'DESCRIPTION';
              console.log(\`[Home Depot Direct Scraping] Store \${st || 'national'} Matched "\${query}" -> \${hdTitle}: \$\${freshHd} (SKU: \${hdSku})\`);`
);

fs.writeFileSync('server.ts', code);
