const fs = require('fs');
let content = fs.readFileSync('src/components/logistics-app/components/TelematicsDashboard.tsx', 'utf8');
if (content.includes("acc.push({")) {
    console.log("Already replaced via regex!");
}
