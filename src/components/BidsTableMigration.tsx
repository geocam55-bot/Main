import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { createClient } from '../utils/supabase/client';
import { CheckCircle2, XCircle, Loader2, Database, Copy, Check } from 'lucide-react';
import { copyToClipboard } from '../utils/clipboard';

export function BidsTableMigration() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const supabase = createClient();

  // SQL to add missing columns to bids table
  const migrations = [
    {
      name: 'Add notes column',
      sql: `ALTER TABLE public.bids ADD COLUMN IF NOT EXISTS notes TEXT;`
    },
    {
      name: 'Add line_items column',
      sql: `ALTER TABLE public.bids ADD COLUMN IF NOT EXISTS line_items JSONB;`
    },
    {
      name: 'Add subtotal column',
      sql: `ALTER TABLE public.bids ADD COLUMN IF NOT EXISTS subtotal NUMERIC(12,2);`
    },
    {
      name: 'Add discount_percent column',
      sql: `ALTER TABLE public.bids ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5,2);`
    },
    {
      name: 'Add discount_amount column',
      sql: `ALTER TABLE public.bids ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12,2);`
    },
    {
      name: 'Add tax_percent column',
      sql: `ALTER TABLE public.bids ADD COLUMN IF NOT EXISTS tax_percent NUMERIC(5,2);`
    },
    {
      name: 'Add tax_amount column',
      sql: `ALTER TABLE public.bids ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(12,2);`
    },
    {
      name: 'Add total column',
      sql: `ALTER TABLE public.bids ADD COLUMN IF NOT EXISTS total NUMERIC(12,2);`
    },
    {
      name: 'Add valid_until column',
      sql: `ALTER TABLE public.bids ADD COLUMN IF NOT EXISTS valid_until TIMESTAMPTZ;`
    },
    {
      name: 'Add project_manager_id column',
      sql: `ALTER TABLE public.bids ADD COLUMN IF NOT EXISTS project_manager_id UUID REFERENCES public.project_managers(id);`
    },
    {
      name: 'Add created_by column',
      sql: `ALTER TABLE public.bids ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);`
    }
  ];

  const fullMigrationSQL = migrations.map(m => `-- ${m.name}\n${m.sql}`).join('\n\n');

  const copyToClipboard_fn = async () => {
    try {
      const success = await copyToClipboard(fullMigrationSQL);
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        // Failed to copy to clipboard
      }
    } catch (err) {
      // Failed to copy
    }
  };

  const runMigration = async () => {
    setIsRunning(true);
    setError(null);
    setResults([]);

    try {
      // Check current schema
      setResults(prev => [...prev, '🔍 Checking current bids table schema...']);
      
      const { data: sampleBid } = await supabase
        .from('bids')
        .select('*')
        .limit(1);
      
      if (sampleBid && sampleBid.length > 0) {
        const columns = Object.keys(sampleBid[0]);
        setResults(prev => [...prev, `📋 Current columns: ${columns.join(', ')}`]);
      }

      setResults(prev => [...prev, '\n📝 Running migrations...']);
      
      // Try using the exec_sql RPC function (if it exists)
      for (const migration of migrations) {
        try {
          const { error: migrationError } = await supabase.rpc('exec_sql', {
            sql: migration.sql
          });

          if (migrationError) {
            // If the RPC doesn't exist (42883 = function not found)
            if (migrationError.code === '42883' || migrationError.message?.includes('could not find')) {
              setResults(prev => [...prev, `\n⚠️ Automatic migration not available - exec_sql function not found.`]);
              setResults(prev => [...prev, `\n📋 Please run the SQL commands manually in Supabase SQL Editor:\n`]);
              setResults(prev => [...prev, `Go to: Supabase Dashboard → SQL Editor → New Query\n`]);
              migrations.forEach(m => {
                setResults(prev => [...prev, `-- ${m.name}`]);
                setResults(prev => [...prev, m.sql]);
                setResults(prev => [...prev, '']);
              });
              setResults(prev => [...prev, '\n💡 Use the "Copy SQL" button below for easy copying.']);
              break;
            }
            throw migrationError;
          }
          
          setResults(prev => [...prev, `✅ ${migration.name}`]);
        } catch (err: any) {
          setResults(prev => [...prev, `❌ ${migration.name}: ${err.message}`]);
        }
      }

      setResults(prev => [...prev, '\n✨ Migration process complete! Please refresh the page.']);
    } catch (err: any) {
      setError(err.message);
      setResults(prev => [...prev, `\n❌ Migration failed: ${err.message}`]);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Deals Table Migration (Internal: Bids Table)
        </CardTitle>
        <CardDescription>
          Add missing columns to the deals (bids) table to support line items, notes, and tax calculations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Alert>
          <AlertDescription className="text-sm">
            <strong>⚠️ Important:</strong> The automatic migration requires the <code>exec_sql</code> RPC function in Supabase.
            {' '}<strong>Recommended approach:</strong> Copy the SQL below and run it manually in Supabase SQL Editor.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            This migration will add the following columns to the bids table:
          </p>
          <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
            <li><code>notes</code> - Text notes for the deal</li>
            <li><code>line_items</code> - JSON array of line items</li>
            <li><code>subtotal</code> - Deal subtotal before tax</li>
            <li><code>discount_percent</code> - Discount percentage</li>
            <li><code>discount_amount</code> - Calculated discount amount</li>
            <li><code>tax_percent</code> - Tax percentage</li>
            <li><code>tax_amount</code> - Calculated tax amount</li>
            <li><code>total</code> - Final total amount</li>
            <li><code>valid_until</code> - Deal expiration date</li>
            <li><code>project_manager_id</code> - Reference to project manager</li>
            <li><code>created_by</code> - User who created the deal</li>
          </ul>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">SQL Migration Script:</p>
            <Button
              onClick={copyToClipboard_fn}
              variant="outline"
              size="sm"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy SQL
                </>
              )}
            </Button>
          </div>
          <div className="bg-gray-900 rounded-lg p-4 max-h-64 overflow-y-auto">
            <pre className="text-xs text-gray-100 font-mono whitespace-pre-wrap">
              {fullMigrationSQL}
            </pre>
          </div>
        </div>

        <Button 
          onClick={runMigration} 
          disabled={isRunning}
          className="w-full"
          variant="secondary"
        >
          {isRunning ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Running Migration...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Try Automatic Migration
            </>
          )}
        </Button>

        {results.length > 0 && (
          <div className="bg-muted rounded-lg p-4 space-y-1 max-h-96 overflow-y-auto">
            <p className="text-xs font-mono text-foreground whitespace-pre-wrap">
              {results.map((result, index) => (
                <div key={index}>{result}</div>
              ))}
            </p>
          </div>
        )}

        <Alert>
          <AlertDescription className="text-sm">
            <strong>Manual Steps:</strong> (1) Click "Copy SQL" button above, (2) Go to Supabase Dashboard → SQL Editor, (3) Click "New Query", (4) Paste the SQL and click "Run", (5) Refresh this page.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}