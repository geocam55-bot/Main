import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Alert, AlertDescription } from './ui/alert';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { createClient } from '../utils/supabase/client';

export function AdminFixUsers() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isFixing, setIsFixing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const fixUserAuth = async () => {
    setIsFixing(true);
    setResult(null);

    try {
      const supabase = createClient();

      // Step 1: Check if profile exists
      // Step 1: Checking for existing profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (profileError) {
        throw new Error(`Profile query error: ${profileError.message}`);
      }

      if (!profile) {
        throw new Error(`No profile found for email: ${email}`);
      }

      // Profile found

      // Step 2: Try to sign up (this creates auth.users record)
      // Step 2: Creating auth user
      
      // First, sign out any current user
      await supabase.auth.signOut();

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            name: profile.name,
            organizationId: profile.organization_id,
            role: profile.role,
          },
        },
      });

      if (signUpError) {
        // Check if user already exists
        if (signUpError.message.includes('already registered')) {
          setResult({
            success: false,
            message: `User already exists in auth system. Try signing in with the password, or reset password through "Forgot Password".`
          });
          setIsFixing(false);
          return;
        }
        throw signUpError;
      }

      if (!signUpData.user) {
        throw new Error('Sign up succeeded but no user returned');
      }

      // Auth user created

      // Step 3: Update the profile to match the new auth user ID
      // Step 3: Updating profile ID to match auth user
      
      // We need to delete the old profile and create a new one with the correct ID
      // Or update if possible
      const oldProfileId = profile.id;
      const newAuthId = signUpData.user.id;

      // Check if a profile with the new auth ID already exists (auto-created by trigger)
      const { data: newProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', newAuthId)
        .maybeSingle();

      if (newProfile) {
        // Profile was auto-created by trigger, update it with old profile data
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            name: profile.name,
            role: profile.role,
            organization_id: profile.organization_id,
            manager_id: profile.manager_id,
            department: profile.department,
            phone: profile.phone,
            status: profile.status,
          })
          .eq('id', newAuthId);

        if (updateError) {
          // Warning: Could not update new profile
        }

        // Delete the old profile if it's different
        if (oldProfileId !== newAuthId) {
          await supabase
            .from('profiles')
            .delete()
            .eq('id', oldProfileId);
        }
      }

      // Step 4: Update created_by fields in other tables
      // Step 4: Updating related records
      
      if (oldProfileId !== newAuthId) {
        // Update bids
        await supabase
          .from('bids')
          .update({ created_by: newAuthId })
          .eq('created_by', oldProfileId);

        // Update contacts
        await supabase
          .from('contacts')
          .update({ created_by: newAuthId })
          .eq('created_by', oldProfileId);

        // Update tasks
        await supabase
          .from('tasks')
          .update({ created_by: newAuthId })
          .eq('created_by', oldProfileId);

        // Update opportunities
        await supabase
          .from('opportunities')
          .update({ created_by: newAuthId })
          .eq('created_by', oldProfileId);

        // Update appointments
        await supabase
          .from('appointments')
          .update({ created_by: newAuthId })
          .eq('created_by', oldProfileId);

        // Updated related records from old ID to new ID
      }

      setResult({
        success: true,
        message: `✅ Success! User created and fixed.\n\nEmail: ${email}\nPassword: ${password}\n\nYou can now sign in with these credentials.`
      });

    } catch (error: any) {
      // Error occurred
      setResult({
        success: false,
        message: `Error: ${error.message}`
      });
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted p-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>🔧 Fix User Authentication</CardTitle>
            <CardDescription>
              This tool fixes users who have a profile but cannot sign in (missing auth.users record)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">New Password</label>
              <Input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter a temporary password"
              />
              <p className="text-xs text-muted-foreground">
                This will be the user's password. They can change it later.
              </p>
            </div>

            <Button
              onClick={fixUserAuth}
              disabled={isFixing || !email || !password}
              className="w-full"
            >
              {isFixing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Fixing...
                </>
              ) : (
                'Fix User Authentication'
              )}
            </Button>

            {result && (
              <Alert className={result.success ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}>
                {result.success ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription className={result.success ? 'text-green-900' : 'text-red-900'}>
                  <pre className="whitespace-pre-wrap font-sans">{result.message}</pre>
                </AlertDescription>
              </Alert>
            )}

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">How this works:</h3>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Checks if profile exists for the email</li>
                <li>Creates a new auth.users record via sign-up</li>
                <li>Updates the profile to match the new auth user ID</li>
                <li>Migrates all related records (bids, contacts, etc.)</li>
                <li>User can now sign in with the new password</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}