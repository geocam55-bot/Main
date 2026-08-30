import fs from 'fs';
import path from 'path';

// Load images directly from disk
const crmLogoPath = path.join(process.cwd(), 'src/assets/images/prospaces_crm_logo_official_1787828035951.jpg');
const logisticsLogoPath = path.join(process.cwd(), 'src/assets/images/prospaces_logistics_logo_official_1787828611440.jpg');
const faviconPath = path.join(process.cwd(), 'src/assets/images/prospaces_favicon_raw_1782083332396.jpg');

let crmLogoBuffer = fs.existsSync(crmLogoPath) ? fs.readFileSync(crmLogoPath) : null;
let logisticsLogoBuffer = fs.existsSync(logisticsLogoPath) ? fs.readFileSync(logisticsLogoPath) : null;
let faviconPngBuffer = fs.existsSync(faviconPath) ? fs.readFileSync(faviconPath) : null;

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

// Ensure logistics PNG logos exist and are synchronized across all public and dist directories
const syncFileToTargets = (sourceRelativePath, targets) => {
  const src = path.join(process.cwd(), sourceRelativePath);
  if (fs.existsSync(src)) {
    const buf = fs.readFileSync(src);
    for (const t of targets) {
      const dest = path.join(process.cwd(), t);
      const dir = path.dirname(dest);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(dest, buf);
    }
  }
};

// Sync transparent logistics PNG logos
syncFileToTargets('public/logistics-logo.png', [
  'src/public/logistics-logo.png',
  'src/public/prospaces-logistics-logo.png',
  'dist/logistics-logo.png',
  'dist/prospaces-logistics-logo.png',
  'src/assets/logistics-logo.png',
  'src/assets/prospaces-logistics-logo.png'
]);

syncFileToTargets('public/logistics-logo-dark.png', [
  'src/public/logistics-logo-dark.png',
  'src/public/prospaces-logistics-logo-dark.png',
  'dist/logistics-logo-dark.png',
  'dist/prospaces-logistics-logo-dark.png',
  'src/assets/logistics-logo-dark.png',
  'src/assets/prospaces-logistics-logo-dark.png'
]);

// Write CRM Logo buffers
if (crmLogoBuffer) {
  const crmTargets = [
    'public/logo.jpg',
    'public/prospaces-crm-logo.jpg',
    'src/public/logo.jpg',
    'src/public/prospaces-crm-logo.jpg',
    'dist/logo.jpg',
    'dist/prospaces-crm-logo.jpg',
    'src/assets/logo.jpg',
    'src/assets/prospaces_crm_logo.jpg'
  ];
  for (const t of crmTargets) {
    const fullPath = path.join(process.cwd(), t);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(fullPath, crmLogoBuffer);
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
    'src/public/prospaces-logistics-logo.jpg',
    'src/public/images/logo_no_border_tight_1783077241511.jpg',
    'dist/logistics-logo.jpg',
    'dist/prospaces-logistics-logo.jpg',
    'dist/images/logo_no_border_tight_1783077241511.jpg',
    'src/assets/prospaces_logistics_logo.jpg',
    'src/components/logistics-app/assets/images/logo_no_border_tight_1783077241511.jpg'
  ];
  for (const t of logisticsTargets) {
    const fullPath = path.join(process.cwd(), t);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(fullPath, effectiveLogisticsBuffer);
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
  }
}

// Sync all images from src/assets/images to public/images, src/public/images, and dist/images
const imagesSrcDir = path.join(process.cwd(), 'src/assets/images');
if (fs.existsSync(imagesSrcDir)) {
  const files = fs.readdirSync(imagesSrcDir);
  for (const file of files) {
    const srcFile = path.join(imagesSrcDir, file);
    if (fs.statSync(srcFile).isFile()) {
      const destTargets = [
        path.join(process.cwd(), 'public/images', file),
        path.join(process.cwd(), 'src/public/images', file),
        path.join(process.cwd(), 'dist/images', file)
      ];
      for (const dest of destTargets) {
        const destDir = path.dirname(dest);
        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
        fs.copyFileSync(srcFile, dest);
      }
    }
  }
}

console.log('[Prebuild] Successfully synchronized all assets and transparent logos.');
