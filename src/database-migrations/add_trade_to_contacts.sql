-- Add Trade field to contacts table
-- Safe to run multiple times
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS trade TEXT;
