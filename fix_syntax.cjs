const fs = require('fs');
let content = fs.readFileSync('src/components/logistics-app/components/TelematicsDashboard.tsx', 'utf8');

const target = `  }, [trucks, rawVehicles]);
  }, [rawVehicles, trucks]);`;
const replacement = `  }, [trucks, rawVehicles]);`;

if (content.includes(target)) {
    fs.writeFileSync('src/components/logistics-app/components/TelematicsDashboard.tsx', content.replace(target, replacement));
    console.log("Fixed syntax!");
}
