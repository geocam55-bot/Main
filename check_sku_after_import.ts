import * as fs from 'fs';

function main() {
  const content = fs.readFileSync('onedrive/onedrive_inventory_import.csv', 'utf8');
  const lines = content.split('\n');
  const headers = lines[0];
  console.log('Headers:', headers);
  const match = lines.find(l => l.includes('00275932'));
  console.log('Match:', match);
}

main();
