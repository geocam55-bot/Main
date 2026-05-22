#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.resolve(__dirname, '../public');

console.log('\n🔍 Checking favicon files in /public...\n');

// Read the existing 16x16 PNG as our template
const source16x16 = path.join(publicDir, 'favicon-16x16.png');

if (!fs.existsSync(source16x16)) {
  console.error('❌ Source file favicon-16x16.png not found!');
  process.exit(1);
}

const sourceBuffer = fs.readFileSync(source16x16);
console.log(`✅ Read favicon-16x16.png (${sourceBuffer.length} bytes)`);

// Files to create by copying the 16x16 version
const filesToCreate = [
  'favicon-32x32.png',
  'favicon-48x48.png',
  'favicon-192x192.png',
  'favicon-512x512.png',
  'apple-touch-icon.png'
];

let created = 0;
let existing = 0;

filesToCreate.forEach(filename => {
  const destPath = path.join(publicDir, filename);
  
  if (fs.existsSync(destPath)) {
    console.log(`⏭️  ${filename} already exists`);
    existing++;
  } else {
    // Copy the 16x16 file as a placeholder
    fs.writeFileSync(destPath, sourceBuffer);
    console.log(`✅ Created ${filename} (${sourceBuffer.length} bytes)`);
    created++;
  }
});

console.log(`\n📊 Summary: ${created} created, ${existing} already existed\n`);
