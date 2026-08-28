const fs = require('fs');
let content = fs.readFileSync('src/components/logistics-app/components/TelematicsDashboard.tsx', 'utf8');

const targetRegex = /  \/\/ Filter vehicles to strictly match Supabase trucks if trucks prop is provided[\s\S]*?\}, \[trucks, rawVehicles\]\);/;

const replacement = `  // Filter vehicles to strictly match Supabase trucks if trucks prop is provided
  const vehicles = useMemo(() => {
    if (!trucks) return rawVehicles;
    if (trucks.length === 0) return [];
    
    return rawVehicles.reduce((acc, v) => {
      const vId = (v.vehicleId || '').toLowerCase();
      const vName = (v.truckName || '').toLowerCase();
      const vVin = (v.vin || '').toLowerCase();
      
      const vUnitMatch = vName.match(/\\d+/) || vId.match(/\\d+/);
      const vUnitNum = vUnitMatch ? vUnitMatch[0] : null;

      const matchedTruck = trucks.find(t => {
        const tId = (t.id || '').toLowerCase();
        const tName = (t.name || '').toLowerCase();
        const tVin = (t.vin || '').toLowerCase();
        const tGpsId = (t.gpsDeviceId || '').toLowerCase();
        const tGpsName = (t.gpsDeviceName || '').toLowerCase();
        
        const tUnitMatch = tName.match(/\\d+/) || tId.match(/\\d+/);
        const tUnitNum = tUnitMatch ? tUnitMatch[0] : null;

        return (
          tId === vId ||
          tName === vName ||
          (tVin && vVin && tVin === vVin) ||
          (tGpsId && tGpsId === vId) ||
          (tGpsName && tGpsName === vName) ||
          (vUnitNum && tUnitNum && vUnitNum === tUnitNum)
        );
      });

      if (matchedTruck) {
        acc.push({
          ...v,
          truckId: matchedTruck.id,
          driver: {
            ...(v.driver || {}),
            name: matchedTruck.driver || v.driver?.name || 'Unassigned'
          },
          activeRoute: {
            ...(v.activeRoute || {}),
            driverName: matchedTruck.driver || v.activeRoute?.driverName || 'Unassigned'
          }
        });
      }
      return acc;
    }, [] as typeof rawVehicles);
  }, [trucks, rawVehicles]);`;

if (targetRegex.test(content)) {
    content = content.replace(targetRegex, replacement);
    fs.writeFileSync('src/components/logistics-app/components/TelematicsDashboard.tsx', content);
    console.log("Replaced successfully via regex!");
} else {
    console.log("Still could not find it via regex.");
}
