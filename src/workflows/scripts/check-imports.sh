#!/bin/bash

# ProSpaces CRM - Import Validation Script
# Checks for invalid versioned imports and incorrect paths

echo "🔍 Checking ProSpaces CRM imports..."

# Initialize error counter
errors=0

# Check for versioned imports (excluding allowed packages)
echo ""
echo "📦 Checking for versioned imports..."
versioned_imports=$(grep -r "from ['\"].*@[0-9]" src/ --include="*.tsx" --include="*.ts" 2>/dev/null || true)

if [ -n "$versioned_imports" ]; then
  # Filter out allowed versioned imports
  invalid_imports=$(echo "$versioned_imports" | grep -v "react-hook-form@7.55.0" | grep -v "sonner@2.0.3" || true)
  
  if [ -n "$invalid_imports" ]; then
    echo "❌ Found invalid versioned imports:"
    echo "$invalid_imports"
    echo ""
    echo "⚠️  Only these versioned imports are allowed:"
    echo "   - react-hook-form@7.55.0"
    echo "   - sonner@2.0.3"
    echo ""
    errors=$((errors + 1))
  else
    echo "✅ All versioned imports are valid"
  fi
else
  echo "✅ No versioned imports found (or only allowed ones)"
fi

# Check CSS imports in main.tsx
echo ""
echo "🎨 Checking CSS imports in main.tsx..."
if [ -f "src/main.tsx" ]; then
  if grep -q "globals\.css" src/main.tsx 2>/dev/null; then
    echo "❌ Found 'globals.css' import in main.tsx"
    echo "   Expected: import './index.css'"
    errors=$((errors + 1))
  elif ! grep -q "import ['\"]\.\/index\.css['\"]" src/main.tsx 2>/dev/null; then
    echo "⚠️  Warning: No './index.css' import found in main.tsx"
  else
    echo "✅ CSS imports are correct"
  fi
else
  echo "⚠️  Warning: src/main.tsx not found"
fi

# Check for absolute imports
echo ""
echo "📂 Checking for incorrect absolute imports..."
absolute_imports=$(grep -r "from ['\"][^\.@].*\/.*['\"]" src/ --include="*.tsx" --include="*.ts" 2>/dev/null | grep -v "node_modules" | grep -v "from '@" | grep -v "from 'react" | grep -v "from 'lucide" | grep -v "from 'date-fns" | grep -v "from 'clsx" | grep -v "from 'uuid" | grep -v "from 'sonner" | grep -v "from 'recharts" || true)

if [ -n "$absolute_imports" ]; then
  echo "⚠️  Warning: Found potential absolute imports:"
  echo "$absolute_imports" | head -20
  echo ""
  echo "   Consider using relative imports for local files"
else
  echo "✅ No problematic absolute imports found"
fi

# Summary
echo ""
echo "=" | head -c 60
echo ""
if [ $errors -eq 0 ]; then
  echo "✅ All import checks passed!"
  exit 0
else
  echo "❌ Found $errors error(s). Please fix before deploying."
  exit 1
fi
