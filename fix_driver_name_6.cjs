const fs = require('fs');
let content = fs.readFileSync('src/components/logistics-app/components/TelematicsDashboard.tsx', 'utf8');

const targetRegex = /  const getVehicleDriverName = useCallback\(\(v: VehicleRecord \| null \| undefined\): string => \{[\s\S]*?\}, \[\]\);/;

const replacement = `  const getVehicleDriverName = useCallback((v: VehicleRecord | null | undefined): string => {
    if (!v) return 'Unassigned';
    
    // Normalize and check the main driver field
    if (v.driver?.name) {
       const normName = v.driver.name.trim().toLowerCase();
       if (!['no driver', 'unassigned', 'driver', 'assigned driver', ''].includes(normName)) {
           return v.driver.name.trim();
       }
    }
    
    // Normalize and check the active route driver field
    if (v.activeRoute?.driverName) {
       const normRouteName = v.activeRoute.driverName.trim().toLowerCase();
       if (!['no driver', 'unassigned', 'driver', 'assigned driver', ''].includes(normRouteName)) {
           return v.activeRoute.driverName.trim();
       }
    }
    
    return 'Unassigned';
  }, []);`;

if (targetRegex.test(content)) {
    content = content.replace(targetRegex, replacement);
    fs.writeFileSync('src/components/logistics-app/components/TelematicsDashboard.tsx', content);
    console.log("Replaced successfully via regex!");
} else {
    console.log("Could not find it via regex.");
}
