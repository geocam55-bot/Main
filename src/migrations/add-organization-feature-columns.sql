-- ============================================================================
-- Add Organization Feature Toggle Columns Migration
-- ============================================================================
-- This migration adds module toggle columns to the organizations table.
-- Run this in your Supabase SQL Editor if you already have an organizations table.
-- ============================================================================

-- Add feature toggle columns to organizations table
ALTER TABLE public.organizations 
  ADD COLUMN IF NOT EXISTS ai_suggestions_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS marketing_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS inventory_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS import_export_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS documents_enabled boolean DEFAULT true;

-- Update existing organizations to have default values
UPDATE public.organizations
SET 
  ai_suggestions_enabled = COALESCE(ai_suggestions_enabled, false),
  marketing_enabled = COALESCE(marketing_enabled, true),
  inventory_enabled = COALESCE(inventory_enabled, true),
  import_export_enabled = COALESCE(import_export_enabled, true),
  documents_enabled = COALESCE(documents_enabled, true);

-- ============================================================================
-- Migration Complete!
-- ============================================================================
