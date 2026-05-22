#!/bin/bash

# Nylas OAuth Backend - Quick Deploy Script
# Run this in your GitHub Codespace

set -e  # Exit on error

echo "🚀 Nylas OAuth Backend Deployment"
echo "=================================="
echo ""

# Check if we're in the right directory
if [ ! -d "supabase/functions/server" ]; then
    echo "❌ Error: supabase/functions/server directory not found"
    echo "   Make sure you're in the project root directory"
    exit 1
fi

# Check if index.ts exists
if [ ! -f "supabase/functions/server/index.ts" ]; then
    echo "❌ Error: supabase/functions/server/index.ts not found"
    exit 1
fi

echo "✅ Project structure verified"
echo ""

# Step 1: Install Supabase CLI locally
echo "📦 Step 1: Installing Supabase CLI..."
if ! command -v npx &> /dev/null; then
    echo "❌ Error: npm/npx not found. Please install Node.js first."
    exit 1
fi

npm install --save-dev supabase --quiet

echo "✅ Supabase CLI installed"
echo ""

# Step 2: Check if already logged in
echo "🔐 Step 2: Checking Supabase authentication..."
if npx supabase projects list &> /dev/null; then
    echo "✅ Already logged in to Supabase"
else
    echo "⚠️  Not logged in. Running login command..."
    npx supabase login
fi
echo ""

# Step 3: Ask for project reference
echo "🔗 Step 3: Link Supabase project"
echo ""
read -p "Enter your Supabase Project Reference ID: " PROJECT_REF

if [ -z "$PROJECT_REF" ]; then
    echo "❌ Project reference cannot be empty"
    exit 1
fi

echo ""
echo "Linking to project: $PROJECT_REF"
npx supabase link --project-ref "$PROJECT_REF"

echo "✅ Project linked"
echo ""

# Step 4: Deploy function
echo "🚢 Step 4: Deploying server function..."
echo ""

npx supabase functions deploy server --no-verify-jwt

echo ""
echo "✅ Deployment complete!"
echo ""

# Step 5: Test deployment
echo "🧪 Step 5: Testing deployment..."
echo ""

# Extract project ID from the link command output or ask user
read -p "Enter your Supabase Project ID (e.g., abcdefgh): " PROJECT_ID

if [ -z "$PROJECT_ID" ]; then
    echo "⚠️  Skipping health check test"
else
    HEALTH_URL="https://${PROJECT_ID}.supabase.co/functions/v1/server/health"
    echo "Testing: $HEALTH_URL"
    
    if command -v curl &> /dev/null; then
        echo ""
        RESPONSE=$(curl -s "$HEALTH_URL")
        echo "Response: $RESPONSE"
        
        if echo "$RESPONSE" | grep -q "ok"; then
            echo ""
            echo "✅ Health check passed!"
        else
            echo ""
            echo "⚠️  Health check returned unexpected response"
        fi
    else
        echo "⚠️  curl not found, skipping health check"
    fi
fi

echo ""
echo "=================================="
echo "🎉 Deployment Complete!"
echo "=================================="
echo ""
echo "Next steps:"
echo "1. Verify Nylas callback URL in Nylas Dashboard:"
echo "   https://${PROJECT_ID}.supabase.co/functions/v1/nylas-callback"
echo ""
echo "2. Test OAuth flow in your app:"
echo "   - Go to Settings → Email Accounts"
echo "   - Click 'Connect Email'"
echo "   - Select a provider and authorize"
echo ""
echo "3. Check logs if issues occur:"
echo "   npx supabase functions logs server"
echo ""
echo "📖 Full documentation: See NYLAS_DEPLOYMENT_GUIDE.md"
echo ""
