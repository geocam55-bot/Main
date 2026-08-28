const fs = require('fs');
let content = fs.readFileSync('src/components/logistics-app/components/TelematicsDashboard.tsx', 'utf8');

const targetRegex = /  const getVehicleDriverName = useCallback\(\(v: VehicleRecord \| null \| undefined\): string => \{[\s\S]*?\}, \[trucks\]\);/;

const replacement = `  const getVehicleDriverName = useCallback((v: VehicleRecord | null | undefined): string => {
    if (!v) return 'Unassigned';
    if (v.driver?.name && v.driver.name !== 'Assigned Driver') {
      return v.driver.name.trim();
    }
    if (v.activeRoute?.driverName && v.activeRoute.driverName !== 'Assigned Driver') {
      return v.activeRoute.driverName.trim();
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
