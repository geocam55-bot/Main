import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const dbPath = 'data/crm_database.json';
  if (!fs.existsSync(dbPath)) {
    console.error('File data/crm_database.json does not exist!');
    return;
  }

  const fileContent = fs.readFileSync(dbPath, 'utf-8');
  console.log(`Loaded crm_database.json (${fileContent.length} bytes)`);

  const searchIds = [
    '4fe36e86-ceaf-46f9-81c0-2160ae2d3dd0',
    'caa2ab3d-775b-4b11-8ba0-165cc9b9b6e7',
    'a85f749a-c4be-4a98-b3e9-25f96d2d6cd5'
  ];

  console.log('\nScanning for target IDs...');
  for (const id of searchIds) {
    const index = fileContent.indexOf(id);
    if (index !== -1) {
      console.log(`ID ${id} found at index ${index}!`);
      // Extract a portion around it
      const start = Math.max(0, index - 200);
      const end = Math.min(fileContent.length, index + 300);
      console.log(`--- Context for ${id} ---`);
      console.log(fileContent.substring(start, end));
      console.log('-------------------------');
    } else {
      console.log(`ID ${id} not found in the file.`);
    }
  }

  // Also parse as JSON to inspect its structure if it's not too huge
  try {
    const data = JSON.parse(fileContent);
    console.log('\nDatabase top-level keys:', Object.keys(data));
    
    // Check if there is an inventory table in crm_database.json
    if (data.inventory) {
      const inv = data.inventory;
      console.log(`Inventory table size in json: ${inv.length}`);
      
      const foundItems = inv.filter((item: any) => searchIds.includes(item.id));
      console.log(`Found ${foundItems.length} matching items:`);
      console.log(JSON.stringify(foundItems, null, 2));
    }
  } catch (err: any) {
    console.error('Error parsing JSON:', err.message);
  }
}

main().catch(console.error);
