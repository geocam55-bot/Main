const fs = require('fs');
let content = fs.readFileSync('src/components/logistics-app/components/TelematicsDashboard.tsx', 'utf8');

const targetRegex = /            name: matchedTruck\.driver \|\| v\.driver\?\.name \|\| "Unassigned"/;
const replacement = `            name: (matchedTruck.driver && !['no driver', 'unassigned', 'driver', 'assigned driver', ''].includes(matchedTruck.driver.trim().toLowerCase())) ? matchedTruck.driver : (v.driver?.name || "Unassigned")`;

if (targetRegex.test(content)) {
    content = content.replace(targetRegex, replacement);
    fs.writeFileSync('src/components/logistics-app/components/TelematicsDashboard.tsx', content);
    console.log("Replaced successfully via regex 2!");
} else {
    console.log("Could not find it via regex 2.");
}
