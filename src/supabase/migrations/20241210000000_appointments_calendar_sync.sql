-- Add calendar sync fields to appointments table
-- This allows two-way sync between ProSpaces CRM and external calendars (Gmail, Outlook)

-- Add calendar sync columns if they don't exist
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS calendar_event_id TEXT,
ADD COLUMN IF NOT EXISTS calendar_provider TEXT,
ADD COLUMN IF NOT EXISTS attendees TEXT;

-- Add index for calendar_event_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_appointments_calendar_event_id ON appointments(calendar_event_id);

-- Add comment for documentation
COMMENT ON COLUMN appointments.calendar_event_id IS 'External calendar event ID from Nylas/Google Calendar/Outlook';
COMMENT ON COLUMN appointments.calendar_provider IS 'Calendar provider (gmail, outlook, apple)';
COMMENT ON COLUMN appointments.attendees IS 'Comma-separated list of attendee emails';
