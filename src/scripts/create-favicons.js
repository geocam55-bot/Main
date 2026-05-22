#!/usr/bin/env node
/**
 * This script creates placeholder favicon files if they don't exist
 * Use this as a temporary solution until you can generate proper favicons
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.resolve(__dirname, '../public');

console.log('\n🎨 Creating favicon placeholders...\n');

// Create a simple 1x1 purple PNG as base64
// This is a minimal valid PNG file (purple pixel)
const base64PurplePNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';

// ProSpaces branded PNG (16x16 purple gradient with "P")
const favicon16Base64 = 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAEcSURBVDiNpdM9S8NAGMDx/5WkNhEUFAoODi4dXNzUxU/g4OLXEBwc/AAOfoGCC+Lk4uTgS0GQDi4dHAqCQ6HQoYMgKEhralJzx5EmTVpb9IGD4+75cfc8xzFCCPwXBlAAKoAzGAO9fwIYwCzgTzx3gHK/b03EATwCG/8F+AS2ptoR4AArgDMZPADmgCKwBZSBFeAd2P5VADgHSkDhJ2cFWAUcYAG4BjaBU+AUOALugRvgEngQQnjTApwBl8DDl0cCgTz0A3gCOoP8BeANaI0K1AB36hlSA+aBI2BlrK0D68BJ8jwEroQQsSaEEJ/APXCQVJB0kF9fSSECYA9Yksq/7XtjDaxk+gm0RpofQG3Y1wBrNBuDg7PA+wq2f/5c3yR5bfHw7xZ2AAAAAElFTkSuQmCC';

// Larger favicon (32x32)
const favicon32Base64 = 'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAIcSURBVFiF7ZY9aBRBFMd/s7e3yV4SJYKFhWIhKFhYWFhYWFpYWGghWAiCjY2FjYWNjY2FjY2FjYWIjYWFhYWFhYWFhYWFhYWFhYWFhYWFhY2NjY2FjY2NxWV3b3dnbzMXQQvxwcLOzL7f//3fvJk3K6qK/2kE/3sA/yOBxQSUlJQsKykpWVZaWjqvtLR0HkBpaem8kpKSZSUlJcv+BYElAGVlZQvLysrmVVRUzCsrK5tXXl4+r7Kysj6otBTk/fv3b4GNwDKgs7Pzw/3799+1t7fXDQ8PL+jo6FgAnOnp6cPPnz//fPny5afW1tYPmRRRVc1YHRUVFc0CqKqqWlBVVbWgurp6QU1NzYLa2toF9fX1CxoaGhY0NjYuaGpqWrBo0aIFzc3NC1paWhYsWbJkQWtr64LBwcEFy5cvX7Bq1aoFq1evXrBmzZoFa9euXbBu3boF69evX7BhwwaAZ/b7bW1tbW1qalqQDyAUCgUCgUA42xfMsrKyJNDZ2fnhzZs3b1+/fv22paXl7cuXL9++ePHi7fPnz98+ffr07ZMnT95OTU29ffTo0dsHDx68vX///tuJiYm34+Pjb+/du/d2bGzs7djY2NuxsbG3Y2Njb8fGxt6OjY29vXv37luxby+6u7s/53S6urrOAQwMDJwZHR09U19ff6a+vv5Mb2/vmZ6enjPd3d1nenp6zvT09Jzp7u4+09PTc6anp+dMV1fXmZ6enjO9vb1nenp6zvT29p7p6+s709fXd6a/v/9Mf3//mf7+fjP25ezs7N/ym7xQ/QLWJluGH/BXGQAAAABJRU5ErkJggg==';

// 48x48
const favicon48Base64 = favicon32Base64; // Reuse for now

// Apple touch icon (180x180) - simple purple square
const appleTouchBase64 = favicon32Base64; // Reuse for now

// 192x192
const favicon192Base64 = favicon32Base64; // Reuse for now

// 512x512
const favicon512Base64 = favicon32Base64; // Reuse for now

const favicons = {
  'favicon-16x16.png': favicon16Base64,
  'favicon-32x32.png': favicon32Base64,
  'favicon-48x48.png': favicon48Base64,
  'apple-touch-icon.png': appleTouchBase64,
  'favicon-192x192.png': favicon192Base64,
  'favicon-512x512.png': favicon512Base64
};

let created = 0;
let skipped = 0;

Object.entries(favicons).forEach(([filename, base64Data]) => {
  const filePath = path.join(publicDir, filename);
  
  if (fs.existsSync(filePath)) {
    console.log(`⏭️  ${filename} already exists, skipping...`);
    skipped++;
  } else {
    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(filePath, buffer);
    console.log(`✅ Created ${filename}`);
    created++;
  }
});

console.log(`\n📊 Summary:`);
console.log(`   ✅ Created: ${created}`);
console.log(`   ⏭️  Skipped: ${skipped}`);
console.log(`\n✅ Done! All favicon files are now in place.\n`);
