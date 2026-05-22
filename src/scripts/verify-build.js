#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const buildDir = path.resolve(__dirname, '../dist');
const publicDir = path.resolve(__dirname, '../public');

console.log('\n🔍 COMPREHENSIVE BUILD VERIFICATION\n');
console.log('='.repeat(60));

// First, check what's in the public directory
console.log('\n📂 PUBLIC DIRECTORY CHECK:');
console.log(`Location: ${publicDir}\n`);

if (fs.existsSync(publicDir)) {
  const publicFiles = fs.readdirSync(publicDir);
  console.log('Files in /public:');
  publicFiles.forEach(file => {
    const filePath = path.join(publicDir, file);
    const stats = fs.statSync(filePath);
    if (stats.isFile()) {
      console.log(`   📄 ${file.padEnd(30)} (${stats.size.toLocaleString()} bytes)`);
    }
  });
} else {
  console.error('❌ PUBLIC DIRECTORY DOES NOT EXIST!');
}

// Now check the build directory
console.log('\n' + '='.repeat(60));
console.log('\n📂 BUILD DIRECTORY CHECK:');
console.log(`Location: ${buildDir}\n`);

if (!fs.existsSync(buildDir)) {
  console.error('❌ BUILD DIRECTORY DOES NOT EXIST!\n');
  process.exit(1);
}

const requiredFiles = [
  'index.html',
  'favicon.ico',
  'favicon.svg',
  'favicon-16x16.png',
  'favicon-32x32.png',
  'manifest.json',
  'service-worker.js',
  'favicon-debug.html'
];

console.log('Required files verification:\n');

let allFilesPresent = true;
let missingFiles = [];

requiredFiles.forEach(file => {
  const filePath = path.join(buildDir, file);
  const exists = fs.existsSync(filePath);
  
  if (exists) {
    const stats = fs.statSync(filePath);
    console.log(`✅ ${file.padEnd(30)} (${stats.size.toLocaleString()} bytes)`);
  } else {
    console.log(`❌ ${file.padEnd(30)} MISSING!`);
    allFilesPresent = false;
    missingFiles.push(file);
  }
});

// List ALL files in build directory
console.log('\n' + '='.repeat(60));
console.log('\n📋 COMPLETE BUILD DIRECTORY LISTING:\n');

function listDirectory(dir, prefix = '') {
  const items = fs.readdirSync(dir);
  items.forEach(item => {
    const itemPath = path.join(dir, item);
    const stats = fs.statSync(itemPath);
    
    if (stats.isDirectory()) {
      console.log(`${prefix}📁 ${item}/`);
      listDirectory(itemPath, prefix + '  ');
    } else {
      const sizeKB = (stats.size / 1024).toFixed(2);
      console.log(`${prefix}📄 ${item} (${sizeKB} KB)`);
    }
  });
}

listDirectory(buildDir);

console.log('\n' + '='.repeat(60));

if (!allFilesPresent) {
  console.error('\n❌ BUILD VERIFICATION FAILED!');
  console.error('\nMissing files:');
  missingFiles.forEach(file => console.error(`   - ${file}`));
  console.error('\n⚠️  These files will result in 404 errors on the deployed site!\n');
  process.exit(1);
} else {
  console.log('\n✅ BUILD VERIFICATION PASSED!');
  console.log('✅ All required files are present in the build output.\n');
}