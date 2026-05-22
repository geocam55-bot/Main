#!/bin/bash

# Pre-Deployment Validation Script
# Run this BEFORE deploying to catch common issues

echo "🔍 Pre-Deployment Validation Check"
echo "==================================="
echo ""

ERRORS=0
WARNINGS=0

# Check 1: Verify we're in project root
echo "✓ Checking project structure..."
if [ ! -d "supabase/functions/server" ]; then
    echo "  ❌ ERROR: supabase/functions/server directory not found"
    echo "     Make sure you're in the project root directory"
    ERRORS=$((ERRORS + 1))
else
    echo "  ✅ Project structure OK"
fi
echo ""

# Check 2: Verify index.ts exists
echo "✓ Checking entrypoint file..."
if [ ! -f "supabase/functions/server/index.ts" ]; then
    echo "  ❌ ERROR: supabase/functions/server/index.ts not found"
    echo "     This file is required for deployment"
    ERRORS=$((ERRORS + 1))
else
    echo "  ✅ index.ts exists"
    
    # Check if Deno.serve is present
    if ! grep -q "Deno.serve" supabase/functions/server/index.ts; then
        echo "  ⚠️  WARNING: index.ts doesn't contain 'Deno.serve'"
        echo "     The function may not start correctly"
        WARNINGS=$((WARNINGS + 1))
    fi
fi
echo ""

# Check 3: Verify required route files exist
echo "✓ Checking route files..."
ROUTE_FILES=(
    "supabase/functions/server/nylas-oauth.ts"
    "supabase/functions/server/azure-oauth-init.ts"
    "supabase/functions/server/azure-oauth-callback.ts"
    "supabase/functions/server/background-jobs.ts"
)

for file in "${ROUTE_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo "  ⚠️  WARNING: $file not found"
        WARNINGS=$((WARNINGS + 1))
    fi
done

if [ $WARNINGS -eq 0 ]; then
    echo "  ✅ All route files present"
fi
echo ""

# Check 4: Verify config.toml
echo "✓ Checking configuration..."
if [ ! -f "supabase/config.toml" ]; then
    echo "  ⚠️  WARNING: supabase/config.toml not found"
    WARNINGS=$((WARNINGS + 1))
else
    if ! grep -q "\[functions.server\]" supabase/config.toml; then
        echo "  ⚠️  WARNING: config.toml missing [functions.server] section"
        WARNINGS=$((WARNINGS + 1))
    else
        echo "  ✅ config.toml OK"
    fi
fi
echo ""

# Check 5: Verify Node/npm is installed
echo "✓ Checking dependencies..."
if ! command -v npm &> /dev/null; then
    echo "  ❌ ERROR: npm not found"
    echo "     Install Node.js and npm before proceeding"
    ERRORS=$((ERRORS + 1))
else
    echo "  ✅ npm installed ($(npm --version))"
fi

if ! command -v npx &> /dev/null; then
    echo "  ❌ ERROR: npx not found"
    ERRORS=$((ERRORS + 1))
else
    echo "  ✅ npx available"
fi
echo ""

# Check 6: Check if Supabase CLI is installed
echo "✓ Checking Supabase CLI..."
if npx supabase --version &> /dev/null; then
    VERSION=$(npx supabase --version 2>&1)
    echo "  ✅ Supabase CLI available ($VERSION)"
else
    echo "  ⚠️  WARNING: Supabase CLI not installed"
    echo "     Run: npm install --save-dev supabase"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

# Check 7: Verify package.json exists
echo "✓ Checking package.json..."
if [ ! -f "package.json" ]; then
    echo "  ⚠️  WARNING: package.json not found"
    echo "     You may need to initialize npm: npm init -y"
    WARNINGS=$((WARNINGS + 1))
else
    echo "  ✅ package.json exists"
fi
echo ""

# Check 8: Validate index.ts syntax (basic)
echo "✓ Validating index.ts content..."
if [ -f "supabase/functions/server/index.ts" ]; then
    REQUIRED_IMPORTS=("Hono" "cors" "logger" "Deno.serve")
    MISSING=0
    
    for import in "${REQUIRED_IMPORTS[@]}"; do
        if ! grep -q "$import" supabase/functions/server/index.ts; then
            echo "  ⚠️  WARNING: '$import' not found in index.ts"
            MISSING=$((MISSING + 1))
        fi
    done
    
    if [ $MISSING -eq 0 ]; then
        echo "  ✅ index.ts has required imports"
    else
        WARNINGS=$((WARNINGS + MISSING))
    fi
fi
echo ""

# Summary
echo "==================================="
echo "📊 Validation Summary"
echo "==================================="
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo "✅ All checks passed!"
    echo ""
    echo "You're ready to deploy. Run:"
    echo "  npm install --save-dev supabase  # If not already installed"
    echo "  npx supabase login"
    echo "  npx supabase link --project-ref YOUR_PROJECT_REF"
    echo "  npx supabase functions deploy server --no-verify-jwt"
    echo ""
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo "⚠️  $WARNINGS warning(s) found"
    echo ""
    echo "You can proceed with deployment, but review the warnings above."
    echo "Some features may not work as expected."
    echo ""
    exit 0
else
    echo "❌ $ERRORS error(s) and $WARNINGS warning(s) found"
    echo ""
    echo "Please fix the errors before deploying."
    echo ""
    exit 1
fi
