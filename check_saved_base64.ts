import * as fs from 'fs';
import path from 'path';

function run() {
  const file = path.join(process.cwd(), 'src/assets/logo.base64.txt');
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8').trim();
    console.log('Total length of logo.base64.txt:', content.length);
    console.log('First 150 chars:', content.substring(0, 150));
    console.log('Last 100 chars:', content.substring(content.length - 100));
  } else {
    console.log('logo.base64.txt does not exist!');
  }
}

run();
