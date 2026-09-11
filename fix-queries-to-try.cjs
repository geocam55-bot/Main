const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  `const queriesToTry = [cleanDesc, kentSearchQuery, lumberNormalized, effectiveDesc, effectiveUpc, effectiveMfg].filter(Boolean);`,
  `const queriesToTry = [effectiveUpc, effectiveMfg, effectiveName, kentSearchQuery, lumberNormalized, cleanDesc, effectiveDesc].filter(Boolean);`
);

code = code.replace(
  `const hdQueriesToTry = [cleanDesc, hdSearchQuery, lumberNormalizedHd, effectiveDesc, effectiveUpc, effectiveMfg].filter(Boolean);`,
  `const hdQueriesToTry = [effectiveUpc, effectiveMfg, effectiveName, hdSearchQuery, lumberNormalizedHd, cleanDesc, effectiveDesc].filter(Boolean);`
);

fs.writeFileSync('server.ts', code);
console.log("Updated queriesToTry successfully!");
