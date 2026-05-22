#!/bin/bash

echo "=================================================="
echo "  Direct OAuth Deployment Script (No Nylas!)"
echo "=================================================="
echo ""

# Check if we're in the right directory
if [ ! -d "supabase/functions/make-server" ]; then
  echo "❌ Error: Must run from project root directory"
  echo "   Current directory: $(pwd)"
  exit 1
fi

echo "✅ Found supabase/functions/make-server directory"
echo ""

# Check if Supabase CLI is available
if ! command -v npx &> /dev/null; then
  echo "❌ Error: npx not found. Please install Node.js"
  exit 1
fi

echo "📋 Checking current Supabase secrets..."
npx supabase secrets list
echo ""

# Prompt for secrets if needed
echo "🔑 Do you need to set OAuth credentials? (y/n)"
read -r SETUP_SECRETS

if [ "$SETUP_SECRETS" = "y" ]; then
  echo ""
  echo "Choose provider(s) to configure:"
  echo "1. Google (Gmail + Google Calendar)"
  echo "2. Microsoft (Outlook + Microsoft Calendar)"
  echo "3. Both"
  read -r PROVIDER_CHOICE

  if [ "$PROVIDER_CHOICE" = "1" ] || [ "$PROVIDER_CHOICE" = "3" ]; then
    echo ""
    echo "📝 Enter Google OAuth credentials:"
    echo "(Get from: https://console.cloud.google.com/apis/credentials)"
    echo ""
    read -p "Google Client ID: " GOOGLE_CLIENT_ID
    read -p "Google Client Secret: " GOOGLE_CLIENT_SECRET
    read -p "Redirect URI (e.g., https://yourapp.com/oauth-callback): " GOOGLE_REDIRECT_URI

    npx supabase secrets set GOOGLE_CLIENT_ID="$GOOGLE_CLIENT_ID"
    npx supabase secrets set GOOGLE_CLIENT_SECRET="$GOOGLE_CLIENT_SECRET"
    npx supabase secrets set GOOGLE_REDIRECT_URI="$GOOGLE_REDIRECT_URI"
    
    echo "✅ Google credentials set"
  fi

  if [ "$PROVIDER_CHOICE" = "2" ] || [ "$PROVIDER_CHOICE" = "3" ]; then
    echo ""
    echo "📝 Enter Microsoft OAuth credentials:"
    echo "(Get from: https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps)"
    echo ""
    read -p "Azure Client ID: " AZURE_CLIENT_ID
    read -p "Azure Client Secret: " AZURE_CLIENT_SECRET
    read -p "Azure Tenant ID (or 'common' for multi-tenant): " AZURE_TENANT_ID
    read -p "Redirect URI (e.g., https://yourapp.com/oauth-callback): " AZURE_REDIRECT_URI

    npx supabase secrets set AZURE_CLIENT_ID="$AZURE_CLIENT_ID"
    npx supabase secrets set AZURE_CLIENT_SECRET="$AZURE_CLIENT_SECRET"
    npx supabase secrets set AZURE_TENANT_ID="$AZURE_TENANT_ID"
    npx supabase secrets set AZURE_REDIRECT_URI="$AZURE_REDIRECT_URI"
    
    echo "✅ Microsoft credentials set"
  fi

  echo ""
  echo "📝 Set APP_URL (your application's base URL):"
  read -p "APP_URL: " APP_URL
  npx supabase secrets set APP_URL="$APP_URL"
  
  echo "✅ APP_URL set"
fi

echo ""
echo "🚀 Deploying Edge Function..."
echo ""

# Deploy the function
npx supabase functions deploy make-server --no-verify-jwt

if [ $? -eq 0 ]; then
  echo ""
  echo "=================================================="
  echo "  ✅ Deployment Successful!"
  echo "=================================================="
  echo ""
  echo "Your Edge Function is now live at:"
  echo "https://YOUR-PROJECT-ID.supabase.co/functions/v1/make-server-8405be07"
  echo ""
  echo "Available endpoints:"
  echo "  - /health"
  echo "  - /google-health"
  echo "  - /microsoft-health"
  echo "  - /google-oauth-init"
  echo "  - /google-oauth-exchange"
  echo "  - /microsoft-oauth-init"
  echo "  - /microsoft-oauth-exchange"
  echo "  - /sync-emails"
  echo "  - /send-email"
  echo "  - /sync-calendar"
  echo "  - /create-calendar-event"
  echo ""
  echo "📚 See DIRECT_OAUTH_SETUP.md for full documentation"
  echo ""
  echo "🧪 Test your deployment:"
  echo "curl https://YOUR-PROJECT-ID.supabase.co/functions/v1/make-server-8405be07/health"
  echo ""
else
  echo ""
  echo "=================================================="
  echo "  ❌ Deployment Failed"
  echo "=================================================="
  echo ""
  echo "Troubleshooting:"
  echo "1. Check if you're logged in: npx supabase login"
  echo "2. Check if project is linked: npx supabase link"
  echo "3. Check function syntax: cd supabase/functions/make-server && deno check index.tsx"
  echo ""
  exit 1
fi
