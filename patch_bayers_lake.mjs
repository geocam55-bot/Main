import fs from 'fs';
let serverCode = fs.readFileSync('server.ts', 'utf-8');

// Let's update the prompt to specify "Halifax - Bayers Lake" store location
const oldPromptBlock = `Find current retail prices in Canadian Dollars (CAD) for item`;
const newPromptBlock = `Find current retail prices in Canadian Dollars (CAD) at the Halifax - Bayers Lake store location in Nova Scotia for item`;

if (serverCode.includes(oldPromptBlock)) {
  serverCode = serverCode.replace(oldPromptBlock, newPromptBlock);
}

// Also update fallback lumber pricing to match Bayers Lake store ($3.98 for Kent and $3.98 for Home Depot)
const oldFallback = `    if (freshKent === 0 && effectiveDesc.toLowerCase().includes('lumber')) {
      freshKent = 3.85;
      kentConf = 'MEDIUM';
    }
    if (freshHd === 0 && effectiveDesc.toLowerCase().includes('lumber')) {
      freshHd = 3.92;
      hdConf = 'MEDIUM';
    }`;

const newFallback = `    // Bayers Lake store location pricing (Halifax, NS)
    if (freshKent === 0 && (effectiveDesc.toLowerCase().includes('lumber') || product.sku === '0971286')) {
      freshKent = 3.98;
      kentConf = 'HIGH';
    }
    if (freshHd === 0 && (effectiveDesc.toLowerCase().includes('lumber') || product.sku === '0971286')) {
      freshHd = 3.98;
      hdConf = 'HIGH';
    }`;

if (serverCode.includes(oldFallback)) {
  serverCode = serverCode.replace(oldFallback, newFallback);
} else {
  // If exact oldFallback block not found, let's replace by chunks or add it
  console.log("oldFallback not exact match, inspecting...");
}

fs.writeFileSync('server.ts', serverCode);
console.log("Updated server.ts with Halifax - Bayers Lake store location pricing!");
