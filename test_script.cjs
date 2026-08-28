const fs = require('fs');
let content = fs.readFileSync('src/components/logistics-app/components/TelematicsDashboard.tsx', 'utf8');

const targetRegex = /            driverName: matchedTruck\.driver \|\| v\.activeRoute\?\.driverName \|\| "Unassigned"/;
const replacement = `            driverName: (matchedTruck.driver && !['no driver', 'unassigned', 'driver', 'assigned driver', ''].includes(matchedTruck.driver.trim().toLowerCase())) ? matchedTruck.driver : (v.activeRoute?.driverName || "Unassigned")`;

if (targetRegex.test(content)) {
    content = content.replace(targetRegex, replacement);
    fs.writeFileSync('src/components/logistics-app/components/TelematicsDashboard.tsx', content);
    console.log("Replaced successfully via regex!");
} else {
    console.log("Could not find it via regex.");
}
