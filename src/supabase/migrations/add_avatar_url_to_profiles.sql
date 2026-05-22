-- Add avatar_url column to profiles table
-- This column stores the user's profile picture (base64 string or URL)

-- Add the column if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add a comment to document the column
COMMENT ON COLUMN profiles.avatar_url IS 'User profile picture - can be base64 encoded image or URL';

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';
