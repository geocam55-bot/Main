import * as fs from 'fs';

const filePath = 'src/components/logistics-app/App.tsx';
let code = fs.readFileSync(filePath, 'utf8');

// 1. Add import
if (!code.includes("import DriverMobileApp")) {
  code = code.replace(
    "import EnterpriseHub from './components/EnterpriseHub';",
    "import EnterpriseHub from './components/EnterpriseHub';\nimport DriverMobileApp from './components/DriverMobileApp';"
  );
}

// 2. Remove 'epod' from the EnterpriseHub block
code = code.replace(
  "['enterprise-hub', 'epod', 'inspections', 'fuel', 'safety', 'compliance', 'maintenance', 'routes'].includes(activeTab)",
  "['enterprise-hub', 'inspections', 'fuel', 'safety', 'compliance', 'maintenance', 'routes'].includes(activeTab)"
);

// 3. Add the activeTab === 'epod' block
const scanStationBlock = "{activeTab === 'scanner' && (";
const driverAppBlock = `
          {activeTab === 'epod' && (
            <DriverMobileApp 
              deliveries={deliveries}
              trucks={trucks}
              users={users}
              currentUser={currentUser}
              onAddOrUpdateDelivery={handleAddOrUpdateDelivery}
            />
          )}
          `;
          
code = code.replace(scanStationBlock, driverAppBlock + scanStationBlock);

fs.writeFileSync(filePath, code);
console.log('App.tsx patched successfully.');
