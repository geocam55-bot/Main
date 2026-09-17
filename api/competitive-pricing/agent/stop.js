import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const FALLBACK_SUPABASE_URL = "https://usorqldwroecyxucmtuw.supabase.co";
const FALLBACK_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzb3JxbGR3cm9lY3l4dWNtdHV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2NjI2NzksImV4cCI6MjA3ODIzODY3OX0.cpSQZHkDI_yod4HSPsjUIhwSkkJX98PVJ7HjTe0i6qM";

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

  try {
    const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL).trim();
    const anonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY).trim();
    const supabase = createClient(url, anonKey);

    const nowIso = new Date().toISOString();

    // 1. Write stop signal file for any local process
    try {
      const stopPath = path.join(process.cwd(), 'pricing-agent-stop.signal');
      fs.writeFileSync(stopPath, 'stop');
    } catch (e) {}

    // 2. Mark as stopped in Supabase kv_store
    const { data: currentData } = await supabase
      .from('kv_store_8405be07')
      .select('value')
      .eq('key', 'pricing_agent:status')
      .maybeSingle();

    const existingStatus = currentData?.value
      ? (typeof currentData.value === 'string' ? JSON.parse(currentData.value) : currentData.value)
      : null;

    const stoppedStatus = {
      isRunning: false,
      stoppedAt: nowIso,
      progress: existingStatus?.progress ? {
        ...existingStatus.progress,
        currentSku: 'Paused',
        currentName: 'Catalog sweep paused',
        lastUpdated: nowIso
      } : {
        current: 0,
        total: 20543,
        percent: 0,
        matchesFound: 1174,
        currentSku: 'Paused',
        currentName: 'Catalog sweep paused',
        startedAt: nowIso,
        lastUpdated: nowIso
      }
    };

    await supabase.from('kv_store_8405be07').upsert({
      key: 'pricing_agent:status',
      value: stoppedStatus
    });

    await supabase.from('kv_store_8405be07').upsert({
      key: 'pricing_agent:control',
      value: { action: 'stop', timestamp: nowIso }
    });

    // Update local file if available
    try {
      const statusPath = path.join(process.cwd(), 'pricing-agent-status.json');
      fs.writeFileSync(statusPath, JSON.stringify(stoppedStatus, null, 2));
    } catch (e) {}

    return res.status(200).json({
      success: true,
      message: 'Pricing agent stopped.',
      status: stoppedStatus
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to stop pricing agent.' });
  }
}
