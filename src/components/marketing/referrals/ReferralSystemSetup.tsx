import { useState } from 'react';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../ui/card';
import { CheckCircle2, Copy, AlertTriangle, Database } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { copyToClipboard as clipboardCopy } from '../../../utils/clipboard';

export function ReferralSystemSetup({ onComplete }: { onComplete: () => void }) {
  const [copied, setCopied] = useState(false);

  const sql = `
-- 1. Add referral_code to contacts
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS referral_code TEXT;
CREATE INDEX IF NOT EXISTS idx_contacts_referral_code ON contacts(referral_code);

-- 2. Create referrals table if it doesn't exist
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL,
  referrer_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  referred_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  referred_lead_name TEXT,
  referred_lead_email TEXT,
  referred_lead_phone TEXT,
  status TEXT DEFAULT 'new',
  reward_amount NUMERIC DEFAULT 0,
  reward_type TEXT DEFAULT 'cash',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT referrals_status_check CHECK (status IN ('new', 'engaged', 'inactive', 'converted', 'reward_due', 'reward_paid'))
);

-- 3. Drop existing policies to allow column modifications
DROP POLICY IF EXISTS "Users can view their organization's referrals" ON referrals;
DROP POLICY IF EXISTS "Users can insert their organization's referrals" ON referrals;
DROP POLICY IF EXISTS "Users can update their organization's referrals" ON referrals;
DROP POLICY IF EXISTS "Users can delete their organization's referrals" ON referrals;

-- 4. Ensure organization_id is text (fix for potential schema mismatch if table already exists)
ALTER TABLE referrals ALTER COLUMN organization_id TYPE TEXT;

-- 5. Update status check constraint to match Marketing Audience Segments
ALTER TABLE referrals DROP CONSTRAINT IF EXISTS referrals_status_check;
ALTER TABLE referrals ADD CONSTRAINT referrals_status_check CHECK (status IN ('new', 'engaged', 'inactive', 'converted', 'reward_due', 'reward_paid'));

-- 6. Enable RLS
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- 7. Recreate Policies
CREATE POLICY "Users can view their organization's referrals" ON referrals
  FOR SELECT USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert their organization's referrals" ON referrals
  FOR INSERT WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their organization's referrals" ON referrals
  FOR UPDATE USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete their organization's referrals" ON referrals
  FOR DELETE USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
`;

  const copyToClipboard = async () => {
    try {
      const success = await clipboardCopy(sql);
      if (success) {
        setCopied(true);
        toast.success('SQL copied to clipboard');
        setTimeout(() => setCopied(false), 2000);
      } else {
        toast.error('Failed to copy. Please select and copy manually.');
      }
    } catch (err) {
      toast.error('Failed to copy. Please select and copy manually.');
    }
  };

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="bg-orange-100 p-2 rounded-full">
            <Database className="h-6 w-6 text-orange-600" />
          </div>
          <div>
            <CardTitle className="text-orange-900">Referral System Setup Required</CardTitle>
            <CardDescription className="text-orange-700">
              The referrals table is missing. Please run this SQL in your Supabase SQL Editor.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative rounded-md bg-slate-950 p-4">
          <code className="text-sm text-slate-50 font-mono whitespace-pre-wrap block overflow-x-auto max-h-[300px]">
            {sql}
          </code>
          <Button
            size="sm"
            variant="secondary"
            className="absolute top-4 right-4 h-8"
            onClick={copyToClipboard}
          >
            {copied ? <CheckCircle2 className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
            {copied ? 'Copied' : 'Copy SQL'}
          </Button>
        </div>
        
        <div className="flex items-center justify-end gap-3">
          <div className="text-sm text-orange-800 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span>After running the SQL, click Refresh</span>
          </div>
          <Button onClick={onComplete}>
            Refresh & Verify
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}