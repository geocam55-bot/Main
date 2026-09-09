import fs from 'fs';
let serverCode = fs.readFileSync('server.ts', 'utf-8');

// Let's check where executeDynamicCompetitorSearch is located and update it
const targetStart = "async function executeDynamicCompetitorSearch(";
if (!serverCode.includes(targetStart)) {
  console.error("executeDynamicCompetitorSearch not found!");
  process.exit(1);
}

// We will replace the body of executeDynamicCompetitorSearch with tailored competitor query generation & robust fallback matching
console.log("Found executeDynamicCompetitorSearch in server.ts");
