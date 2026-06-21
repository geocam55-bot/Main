import { Jimp } from 'jimp';
import path from 'path';

async function run() {
  const filePath = path.join(process.cwd(), 'src/assets/images/prospaces_favicon_raw_1782083332396.jpg');
  const image = await Jimp.read(filePath);
  const w = image.width;
  const h = image.height;

  // Let's print out x coordinates around the left edge of the card
  console.log('--- Scanning left edge of card at y = 512 ---');
  for (let x = 80; x <= 160; x++) {
    const p = image.getPixelColor(x, 512);
    const r = (p >> 24) & 0xff;
    const g = (p >> 16) & 0xff;
    const b = (p >> 8) & 0xff;
    console.log(`x=${x}: RGB(${r},${g},${b})`);
  }

  // Let's print out x coordinates around the right edge of the card
  console.log('--- Scanning right edge of card at y = 512 ---');
  for (let x = 860; x <= 950; x++) {
    const p = image.getPixelColor(x, 512);
    const r = (p >> 24) & 0xff;
    const g = (p >> 16) & 0xff;
    const b = (p >> 8) & 0xff;
    console.log(`x=${x}: RGB(${r},${g},${b})`);
  }

  // Let's print out y coordinates around the top edge of the card
  console.log('--- Scanning top edge of card at x = 512 ---');
  for (let y = 80; y <= 160; y++) {
    const p = image.getPixelColor(512, y);
    const r = (p >> 24) & 0xff;
    const g = (p >> 16) & 0xff;
    const b = (p >> 8) & 0xff;
    console.log(`y=${y}: RGB(${r},${g},${b})`);
  }

  // Let's print out y coordinates around the bottom edge of the card
  console.log('--- Scanning bottom edge of card at x = 512 ---');
  for (let y = 860; y <= 950; y++) {
    const p = image.getPixelColor(512, y);
    const r = (p >> 24) & 0xff;
    const g = (p >> 16) & 0xff;
    const b = (p >> 8) & 0xff;
    console.log(`y=${y}: RGB(${r},${g},${b})`);
  }
}

run();
