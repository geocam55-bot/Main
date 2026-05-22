#!/bin/bash

# Clear Vite cache and rebuild
# This script fixes module resolution errors

echo "🧹 Clearing Vite cache..."
rm -rf dist
rm -rf node_modules/.vite
rm -rf .vite

echo "✅ Cache cleared!"
echo ""
echo "Now run:"
echo "  npm run dev    (for development)"
echo "  npm run build  (for production)"
