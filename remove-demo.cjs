const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const startMarker = "      // Generate a realistic 5-point historical progression";
const endMarker = "      res.json(demoHistory);";

const startIndex = code.indexOf(startMarker);
const endIndex = code.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
  const replacement = "      res.json([]);";
  code = code.substring(0, startIndex) + replacement + code.substring(endIndex + endMarker.length);
  fs.writeFileSync('server.ts', code);
  console.log("Successfully removed demo fallback!");
} else {
  console.error("Markers not found!");
}
