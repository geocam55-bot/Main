import fs from 'fs';
import path from 'path';

// Extract Base64 from src/components/LogoBase64.ts if available
const logoBase64Path = path.join(process.cwd(), 'src/components/LogoBase64.ts');
let crmLogoBuffer = null;
let logisticsLogoBuffer = null;
let faviconPngBuffer = null;

if (fs.existsSync(logoBase64Path)) {
  try {
    const fileContent = fs.readFileSync(logoBase64Path, 'utf8');
    
    // Extract CRM Logo Base64
    const crmMatch = fileContent.match(/PROSPACES_CRM_LOGO\s*=\s*['"]data:image\/[^;]+;base64,([^'"]+)['"]/) ||
                     fileContent.match(/APPLE_ICON_BASE64\s*=\s*['"]data:image\/[^;]+;base64,([^'"]+)['"]/);
    if (crmMatch && crmMatch[1]) {
      crmLogoBuffer = Buffer.from(crmMatch[1], 'base64');
      console.log(`[Prebuild] Extracted CRM logo buffer from LogoBase64.ts: ${crmLogoBuffer.length} bytes`);
    }

    // Extract Logistics Logo Base64
    const logMatch = fileContent.match(/PROSPACES_LOGISTICS_LOGO\s*=\s*['"]data:image\/[^;]+;base64,([^'"]+)['"]/);
    if (logMatch && logMatch[1]) {
      logisticsLogoBuffer = Buffer.from(logMatch[1], 'base64');
      console.log(`[Prebuild] Extracted Logistics logo buffer from LogoBase64.ts: ${logisticsLogoBuffer.length} bytes`);
    }

    // Extract FAVICON_BASE64
    const faviconMatch = fileContent.match(/FAVICON_BASE64\s*=\s*['"]data:image\/[^;]+;base64,([^'"]+)['"]/);
    if (faviconMatch && faviconMatch[1]) {
      faviconPngBuffer = Buffer.from(faviconMatch[1], 'base64');
      console.log(`[Prebuild] Extracted favicon buffer from LogoBase64.ts: ${faviconPngBuffer.length} bytes`);
    }
  } catch (err) {
    console.warn('[Prebuild] Failed to parse LogoBase64.ts:', err);
  }
}

// Target destinations for logo and favicon
const allDestDirs = [
  path.join(process.cwd(), 'public'),
  path.join(process.cwd(), 'public/images'),
  path.join(process.cwd(), 'src/public'),
  path.join(process.cwd(), 'src/public/images'),
  path.join(process.cwd(), 'dist'),
  path.join(process.cwd(), 'dist/images'),
  path.join(process.cwd(), 'src/assets'),
  path.join(process.cwd(), 'src/assets/images'),
  path.join(process.cwd(), 'src/components/logistics-app/assets/images')
];

for (const dir of allDestDirs) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Write CRM Logo buffers
if (crmLogoBuffer) {
  const crmTargets = [
    'public/logo.jpg',
    'public/logo.png',
    'public/prospaces-crm-logo.jpg',
    'src/public/logo.jpg',
    'src/public/logo.png',
    'dist/logo.jpg',
    'dist/logo.png',
    'src/assets/logo.png',
    'src/assets/prospaces_crm_logo.jpg'
  ];
  for (const t of crmTargets) {
    const fullPath = path.join(process.cwd(), t);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(fullPath, crmLogoBuffer);
    console.log(`[Prebuild] Wrote CRM logo to ${t}`);
  }
}

// Write Logistics Logo buffers
const effectiveLogisticsBuffer = logisticsLogoBuffer || crmLogoBuffer;
if (effectiveLogisticsBuffer) {
  const logisticsTargets = [
    'public/logistics-logo.jpg',
    'public/prospaces-logistics-logo.jpg',
    'public/images/logo_no_border_tight_1783077241511.jpg',
    'src/public/logistics-logo.jpg',
    'src/public/images/logo_no_border_tight_1783077241511.jpg',
    'dist/logistics-logo.jpg',
    'dist/images/logo_no_border_tight_1783077241511.jpg',
    'src/assets/prospaces_logistics_logo.jpg',
    'src/components/logistics-app/assets/images/logo_no_border_tight_1783077241511.jpg'
  ];
  for (const t of logisticsTargets) {
    const fullPath = path.join(process.cwd(), t);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(fullPath, effectiveLogisticsBuffer);
    console.log(`[Prebuild] Wrote Logistics logo to ${t}`);
  }
}

if (faviconPngBuffer) {
  const faviconTargets = [
    'public/logistics-favicon.jpg',
    'public/favicon.jpg',
    'public/favicon.ico',
    'public/favicon.png',
    'src/public/logistics-favicon.jpg',
    'src/public/favicon.jpg',
    'src/public/favicon.ico',
    'src/public/favicon.png',
    'dist/logistics-favicon.jpg',
    'dist/favicon.jpg',
    'dist/favicon.ico',
    'dist/favicon.png',
    'src/components/logistics-app/assets/images/favicon_no_border_tight_1783077277593.jpg'
  ];
  for (const t of faviconTargets) {
    const fullPath = path.join(process.cwd(), t);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(fullPath, faviconPngBuffer);
    console.log(`[Prebuild] Wrote brand favicon to ${t}`);
  }
}

// Sync existing hero scenes or other logistics assets
const assetSyncMap = [
  ['src/assets/images/light_map_view_1785321141916.jpg', 'src/components/logistics-app/assets/images/prospaces_hero_scene_1783169931786.jpg'],
  ['src/assets/images/light_map_view_1785321141916.jpg', 'src/public/images/prospaces_hero_scene_1783169931786.jpg'],
  ['src/assets/images/light_map_view_1785321141916.jpg', 'src/public/images/logistics_map_screen.jpg'],
  ['src/assets/images/light_map_view_1785321141916.jpg', 'public/images/prospaces_hero_scene_1783169931786.jpg'],
  ['src/assets/images/light_map_view_1785321141916.jpg', 'public/images/logistics_map_screen.jpg'],
  ['src/assets/images/light_map_view_1785321141916.jpg', 'public/logistics-map-view.jpg'],
  ['src/assets/images/light_map_view_1785321141916.jpg', 'dist/images/prospaces_hero_scene_1783169931786.jpg'],
  ['src/assets/images/light_map_view_1785321141916.jpg', 'dist/images/logistics_map_screen.jpg'],
  ['src/assets/images/light_map_view_1785321141916.jpg', 'dist/logistics-map-view.jpg']
];

for (const [srcRel, destRel] of assetSyncMap) {
  const srcPath = path.join(process.cwd(), srcRel);
  const destPath = path.join(process.cwd(), destRel);
  if (fs.existsSync(srcPath)) {
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    fs.copyFileSync(srcPath, destPath);
    console.log(`[Prebuild] Synced asset to: ${destRel}`);
  }
}
