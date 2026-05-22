
import { useState, useEffect } from 'react';
import { projectId } from '../utils/supabase/info';

export function DebugPanel() {
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-8405be07/debug-subscriptions`);
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (err: any) {
      setLogs([`Error: ${err.message}`]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  if (loading) return <div className="fixed bottom-4 right-4 bg-background p-4 border rounded shadow-lg z-50">Loading debug logs...</div>;

  return (
    <div className="fixed bottom-4 right-4 bg-background p-4 border rounded shadow-lg z-50 max-h-96 overflow-auto max-w-lg text-xs font-mono">
      <h3 className="font-bold mb-2">Debug Subscriptions</h3>
      <button onClick={fetchLogs} className="mb-2 bg-muted px-2 py-1 rounded">Refresh</button>
      {logs.map((log, i) => (
        <div key={i} className="whitespace-pre-wrap mb-1">{log}</div>
      ))}
    </div>
  );
}
