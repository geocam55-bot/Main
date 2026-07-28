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

// Sync logistics static images into public folder
const logisticsImageMap = [
  ['src/components/logistics-app/assets/images/favicon_no_border_tight_1783077277593.jpg', 'src/public/logistics-favicon.jpg'],
  ['src/components/logistics-app/assets/images/logo_no_border_tight_1783077241511.jpg', 'src/public/logistics-logo.jpg'],
  ['src/components/logistics-app/assets/images/logo_no_border_tight_1783077241511.jpg', 'src/public/images/logo_no_border_tight_1783077241511.jpg'],
  ['src/components/logistics-app/assets/images/prospaces_hero_scene_1783169931786.jpg', 'src/public/images/prospaces_hero_scene_1783169931786.jpg'],
  ['src/components/logistics-app/assets/images/samantha_testimonial_1783169949359.jpg', 'src/public/images/samantha_testimonial_1783169949359.jpg'],
];

for (const [srcRel, destRel] of logisticsImageMap) {
  const srcPath = path.join(process.cwd(), srcRel);
  const destPath = path.join(process.cwd(), destRel);
  if (fs.existsSync(srcPath)) {
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    fs.copyFileSync(srcPath, destPath);
    console.log(`[Prebuild Restorer] Synced logistics asset to: ${destRel}`);
  }
}

