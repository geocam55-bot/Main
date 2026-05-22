import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Copy, Database, CheckCircle, AlertTriangle, ExternalLink, RefreshCw } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { copyToClipboard as clipboardCopy } from '../utils/clipboard';

interface AddMissingColumnsProps {
  onComplete?: () => void;
}

export function AddMissingColumns({ onComplete }: AddMissingColumnsProps) {
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const MIGRATION_SQL = `-- ProSpaces CRM - Add Missing Columns Migration
-- This script safely adds missing columns without dropping existing data
-- Run this in Supabase SQL Editor

-- ============================================================================
-- Enable required extensions
-- ============================================================================

-- Enable pgcrypto extension for password encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- Add missing columns to profiles table
-- ============================================================================

-- Add needs_password_change column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'needs_password_change'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN needs_password_change boolean DEFAULT false;
    RAISE NOTICE 'Added needs_password_change column to profiles';
  ELSE
    RAISE NOTICE 'Column needs_password_change already exists in profiles';
  END IF;
END $$;

-- Add temp_password column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'temp_password'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN temp_password text;
    RAISE NOTICE 'Added temp_password column to profiles';
  ELSE
    RAISE NOTICE 'Column temp_password already exists in profiles';
  END IF;
END $$;

-- Add temp_password_created_at column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'temp_password_created_at'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN temp_password_created_at timestamptz;
    RAISE NOTICE 'Added temp_password_created_at column to profiles';
  ELSE
    RAISE NOTICE 'Column temp_password_created_at already exists in profiles';
  END IF;
END $$;

-- Add avatar_url column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN avatar_url text;
    RAISE NOTICE 'Added avatar_url column to profiles';
  ELSE
    RAISE NOTICE 'Column avatar_url already exists in profiles';
  END IF;
END $$;

-- ============================================================================
-- Add missing columns to bids table
-- ============================================================================

-- Add created_by column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'bids' 
    AND column_name = 'created_by'
  ) THEN
    ALTER TABLE public.bids 
    ADD COLUMN created_by uuid;
    RAISE NOTICE 'Added created_by column to bids';
  ELSE
    RAISE NOTICE 'Column created_by already exists in bids';
  END IF;
END $$;

-- ============================================================================
-- Add missing columns to inventory table
-- ============================================================================

-- Add image_url column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'inventory' 
    AND column_name = 'image_url'
  ) THEN
    ALTER TABLE public.inventory 
    ADD COLUMN image_url text;
    RAISE NOTICE 'Added image_url column to inventory';
  ELSE
    RAISE NOTICE 'Column image_url already exists in inventory';
  END IF;
END $$;

-- ============================================================================
-- Create/Update Password Reset Function
-- ============================================================================

-- Drop the old function if it exists
DROP FUNCTION IF EXISTS public.set_user_temporary_password(text, text);

-- Create the password reset function with proper column support
CREATE OR REPLACE FUNCTION public.set_user_temporary_password(
  user_email text,
  temp_password text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_encrypted_password text;
  v_auth_rows_updated int;
  v_profile_rows_updated int;
  v_column_exists boolean;
BEGIN
  -- Find the user by email in auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = user_email;

  -- Check if user exists
  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;

  -- Encrypt the password using Supabase's crypt function
  v_encrypted_password := crypt(temp_password, gen_salt('bf'));

  -- Update the password in auth.users
  UPDATE auth.users
  SET 
    encrypted_password = v_encrypted_password,
    updated_at = now()
  WHERE id = v_user_id;
  
  GET DIAGNOSTICS v_auth_rows_updated = ROW_COUNT;

  -- Check if needs_password_change column exists
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'needs_password_change'
  ) INTO v_column_exists;

  -- Update profiles table only if the columns exist
  IF v_column_exists THEN
    UPDATE public.profiles
    SET 
      needs_password_change = true,
      temp_password = temp_password,
      temp_password_created_at = now(),
      updated_at = now()
    WHERE id = v_user_id;
    
    GET DIAGNOSTICS v_profile_rows_updated = ROW_COUNT;
  ELSE
    -- If column doesn't exist, just try basic update
    UPDATE public.profiles
    SET updated_at = now()
    WHERE id = v_user_id;
    
    v_profile_rows_updated := 0;
  END IF;

  -- Return success with debug info
  RETURN json_build_object(
    'success', true,
    'user_id', v_user_id,
    'message', 'Temporary password set successfully',
    'auth_rows_updated', v_auth_rows_updated,
    'profile_rows_updated', v_profile_rows_updated,
    'columns_available', v_column_exists,
    'debug_info', json_build_object(
      'user_email', user_email,
      'user_id_found', v_user_id IS NOT NULL
    )
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.set_user_temporary_password(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_temporary_password(text, text) TO service_role;

-- ============================================================================
-- Refresh schema cache
-- ============================================================================

-- Notify PostgREST to reload the schema cache
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- Verification
-- ============================================================================

-- Show which columns were added
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('profiles', 'bids', 'inventory')
  AND column_name IN (
    'needs_password_change', 'temp_password', 'temp_password_created_at', 'avatar_url',
    'created_by', 'image_url'
  )
ORDER BY table_name, column_name;`;

  const copyToClipboard = async () => {
    const success = await clipboardCopy(MIGRATION_SQL);
    if (success) {
      setCopied(true);
      toast.success('Migration SQL copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } else {
      fallbackCopyToClipboard();
    }
  };

  const fallbackCopyToClipboard = () => {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = MIGRATION_SQL;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      textArea.remove();
      
      if (successful) {
        setCopied(true);
        toast.success('Migration SQL copied to clipboard!');
        setTimeout(() => setCopied(false), 2000);
      } else {
        toast.error('Copy failed. Please manually select and copy the SQL script.');
      }
    } catch (err) {
      toast.error('Copy failed. Please manually select and copy the SQL script.');
    }
  };

  const openSupabaseSQL = () => {
    window.open('https://supabase.com/dashboard/project/_/sql/new', '_blank');
  };

  const refreshPage = () => {
    setRefreshing(true);
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Database Migration Required</h1>
          <p className="text-muted-foreground">Add missing columns to existing tables</p>
        </div>

        <Card className="border-orange-200 bg-background shadow-lg">
          <CardHeader className="bg-gradient-to-r from-orange-50 to-yellow-50 border-b border-orange-100">
            <CardTitle className="flex items-center gap-2 text-orange-900">
              <Database className="h-6 w-6" />
              Missing Database Columns Detected
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <Alert className="bg-amber-50 border-amber-300">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-900">
                <strong>Schema Issue:</strong> Some required columns are missing from your database tables. 
                This migration will safely add them without losing any existing data.
              </AlertDescription>
            </Alert>

            <div className="bg-gradient-to-br from-orange-50 to-yellow-50 border border-orange-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Columns to be Added:</h3>
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium text-orange-900 mb-2">📋 Profiles Table:</h4>
                  <ul className="text-sm text-foreground space-y-1 ml-4">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <code className="bg-muted px-2 py-0.5 rounded">needs_password_change</code> - Password reset flag
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <code className="bg-muted px-2 py-0.5 rounded">temp_password</code> - Temporary password storage
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <code className="bg-muted px-2 py-0.5 rounded">temp_password_created_at</code> - Password expiry tracking
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <code className="bg-muted px-2 py-0.5 rounded">avatar_url</code> - User profile pictures
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-orange-900 mb-2">💼 Bids Table:</h4>
                  <ul className="text-sm text-foreground space-y-1 ml-4">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <code className="bg-muted px-2 py-0.5 rounded">created_by</code> - Track bid creator
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-orange-900 mb-2">📦 Inventory Table:</h4>
                  <ul className="text-sm text-foreground space-y-1 ml-4">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <code className="bg-muted px-2 py-0.5 rounded">image_url</code> - Product images
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Migration SQL Script</h3>
                <div className="flex gap-2">
                  <Button
                    onClick={copyToClipboard}
                    size="sm"
                    variant="outline"
                    className="gap-2"
                  >
                    {copied ? (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy SQL
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={openSupabaseSQL}
                    size="sm"
                    className="gap-2 bg-gradient-to-r from-orange-600 to-yellow-600 hover:from-orange-700 hover:to-yellow-700"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open SQL Editor
                  </Button>
                </div>
              </div>

              <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-xs max-h-[400px] overflow-y-auto">
                {MIGRATION_SQL}
              </pre>

              <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-2 border-orange-300 rounded-lg p-6">
                <h4 className="font-semibold text-orange-900 flex items-center gap-2 mb-4">
                  <span className="bg-gradient-to-r from-orange-600 to-yellow-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">!</span>
                  Quick Migration Steps
                </h4>
                <ol className="space-y-3">
                  <li className="flex gap-3">
                    <span className="text-orange-600 font-semibold shrink-0">1.</span>
                    <span className="text-foreground">
                      Click <strong>"Copy SQL"</strong> above
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-orange-600 font-semibold shrink-0">2.</span>
                    <span className="text-foreground">
                      Click <strong>"Open SQL Editor"</strong> to open Supabase
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-orange-600 font-semibold shrink-0">3.</span>
                    <span className="text-foreground">
                      Paste the SQL and click <strong>"Run"</strong>
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-orange-600 font-semibold shrink-0">4.</span>
                    <span className="text-foreground">
                      Click <strong>"Refresh App"</strong> below
                      <span className="block text-sm text-muted-foreground mt-1">
                        ✅ Your existing data will remain intact!
                      </span>
                    </span>
                  </li>
                </ol>
              </div>

              <div className="flex justify-center pt-4">
                <Button
                  onClick={refreshPage}
                  size="lg"
                  disabled={refreshing}
                  className="gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg"
                >
                  {refreshing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      Refreshing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-5 w-5" />
                      Refresh App
                    </>
                  )}
                </Button>
              </div>
            </div>

            <Alert className="bg-green-50 border-green-300">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-900">
                <strong>Safe Migration:</strong> This script only adds new columns and never deletes or modifies existing data.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}