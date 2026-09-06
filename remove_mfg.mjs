const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const oldBlock = `    if (!cleanSearchQuery) {
      const cleanDesc = effectiveDesc.replace(/\*.*?\*/g, '').trim();
      if (cleanDesc && cleanDesc.length > 3) {
        cleanSearchQuery = cleanDesc;
        // If mfg has letters (like a model number DCD771, LUS28Z) and isn't already in cleanDesc, include it
        if (effectiveMfg && /[a-zA-Z]/.test(effectiveMfg) && !cleanDesc.toLowerCase().includes(effectiveMfg.toLowerCase())) {
          cleanSearchQuery = `${cleanDesc} ${effectiveMfg}`.trim();
        }
      } else if (effectiveName) {
        cleanSearchQuery = effectiveName;
        if (effectiveMfg) cleanSearchQuery += ` ${effectiveMfg}`;
      } else {
        cleanSearchQuery = effectiveMfg || effectiveUpc || product.sku || '';
      }
    }`;

const newBlock = `    if (!cleanSearchQuery) {
      const cleanDesc = effectiveDesc.replace(/\*.*?\*/g, '').trim();
      if (cleanDesc && cleanDesc.length > 3) {
        cleanSearchQuery = cleanDesc;
      } else if (effectiveName) {
        cleanSearchQuery = effectiveName;
      } else {
        cleanSearchQuery = effectiveUpc || product.sku || '';
      }
    }`;

if (content.includes(oldBlock)) {
  content = content.replace(oldBlock, newBlock);
  fs.writeFileSync('server.ts', content, 'utf8');
  console.log('Successfully removed MFG # from search query logic.');
} else {
  console.log('Could not find oldBlock precisely.');
}
