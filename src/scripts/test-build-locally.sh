#!/bin/bash

echo "================================================"
echo "🧪 LOCAL BUILD TEST SCRIPT"
echo "================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Clean build directory
echo "📁 Step 1: Cleaning build directory..."
rm -rf build
if [ -d "build" ]; then
  echo -e "${RED}❌ Failed to clean build directory${NC}"
  exit 1
else
  echo -e "${GREEN}✅ Build directory cleaned${NC}"
fi
echo ""

# Step 2: Run build
echo "🔨 Step 2: Running build..."
npm run build
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Build failed${NC}"
  exit 1
else
  echo -e "${GREEN}✅ Build completed${NC}"
fi
echo ""

# Step 3: Check for required files
echo "🔍 Step 3: Checking for required files in build..."
echo ""

required_files=(
  "index.html"
  "favicon.ico"
  "favicon.svg"
  "favicon-16x16.png"
  "favicon-32x32.png"
  "manifest.json"
  "service-worker.js"
  "favicon-debug.html"
)

all_present=true

for file in "${required_files[@]}"; do
  if [ -f "build/$file" ]; then
    size=$(ls -lh "build/$file" | awk '{print $5}')
    echo -e "  ${GREEN}✅ $file${NC} ($size)"
  else
    echo -e "  ${RED}❌ $file MISSING!${NC}"
    all_present=false
  fi
done

echo ""

# Step 4: List all files in build
echo "📋 Step 4: Complete build directory listing..."
echo ""
ls -lhR build/ | head -50
echo ""

# Step 5: Summary
echo "================================================"
if [ "$all_present" = true ]; then
  echo -e "${GREEN}✅ BUILD TEST PASSED!${NC}"
  echo ""
  echo "All required files are present in the build output."
  echo "You can now deploy to Vercel with confidence."
  echo ""
  echo "After deploying, test these URLs:"
  echo "  • https://prospacescrm.com/favicon-debug.html"
  echo "  • https://prospacescrm.com/favicon.ico"
  echo "  • https://prospacescrm.com/favicon.svg"
else
  echo -e "${RED}❌ BUILD TEST FAILED!${NC}"
  echo ""
  echo "Some required files are missing from the build output."
  echo "Check the Vite configuration and try again."
fi
echo "================================================"
