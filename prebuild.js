import fs from 'fs';
import path from 'path';

const base64File = path.join(process.cwd(), 'src/assets/logo.base64.txt');
const targets = [
  path.join(process.cwd(), 'src/assets/logo.png'),
  path.join(process.cwd(), 'src/public/logo.png')
];

if (fs.existsSync(base64File)) {
  try {
    const base64Content = fs.readFileSync(base64File, 'utf8').trim();
    if (base64Content.length > 100) {
      const buffer = Buffer.from(base64Content, 'base64');
      for (const t of targets) {
        // Ensure folder exists
        const dir = path.dirname(t);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(t, buffer);
        console.log(`[Prebuild Restorer] Restored binary from Base64 to: ${t} (${buffer.length} bytes)`);
      }
    } else {
      console.warn('[Prebuild Restorer] Base64 string is too short or empty!');
    }
  } catch (error) {
    console.error('[Prebuild Restorer] Failed to recreate binary image:', error);
  }
} else {
  console.warn('[Prebuild Restorer] Base64 file does not exist, skipping conversion.');
}
