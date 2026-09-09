import fs from 'fs';
let serverCode = fs.readFileSync('server.ts', 'utf-8');

const targetFallback = `        // Fallback for unmatched items so all 20,327 products show robust competitive intelligence
        if (lowestCompPrice === null && yourPrice > 0) {
          lowestCompPrice = Number((yourPrice * 0.96).toFixed(2));
          compName = 'KENT Building Supplies';
          competitorCount = 2;
          conf = 'HIGH';
          lastCheckedAt = new Date().toISOString();
        }`;

if (serverCode.includes(targetFallback)) {
  serverCode = serverCode.replace(targetFallback, '');
  fs.writeFileSync('server.ts', serverCode);
  console.log("Successfully removed fallback pricing block from server.ts!");
} else {
  console.error("Target fallback block not found!");
}
