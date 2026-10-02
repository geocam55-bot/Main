import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

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

    // Remove any stop signal
    try {
      const stopFile = path.join(process.cwd(), 'pricing-agent-stop.signal');
      if (fs.existsSync(stopFile)) fs.unlinkSync(stopFile);
    } catch (e) {}

    // 1. Fetch current status if available
    let currentItem = 0;
    let totalItems = 20543;
    let matchesFound = 1174;

    try {
      const { data: kvData } = await supabase
        .from('kv_store_8405be07')
        .select('value')
        .eq('key', 'pricing_agent:status')
        .maybeSingle();

      if (kvData?.value) {
        const parsed = typeof kvData.value === 'string' ? JSON.parse(kvData.value) : kvData.value;
        if (parsed?.progress?.current) currentItem = parsed.progress.current;
        if (parsed?.progress?.total) totalItems = parsed.progress.total;
        if (parsed?.progress?.matchesFound) matchesFound = parsed.progress.matchesFound;
      }
    } catch (e) {}

    const initialStatus = {
      isRunning: true,
      progress: {
        current: currentItem,
        total: totalItems,
        percent: Number(((currentItem / totalItems) * 100).toFixed(1)),
        matchesFound,
        currentSku: 'Starting...',
        currentName: `Catalog sweep starting (${totalItems} items)`,
        startedAt: nowIso,
        lastUpdated: nowIso
      }
    };

    await supabase.from('kv_store_8405be07').upsert({
      key: 'pricing_agent:status',
      value: initialStatus
    });

    await supabase.from('kv_store_8405be07').upsert({
      key: 'pricing_agent:control',
      value: { action: 'start', timestamp: nowIso }
    });

    // Update local file if available
    try {
      const statusPath = path.join(process.cwd(), 'pricing-agent-status.json');
      fs.writeFileSync(statusPath, JSON.stringify(initialStatus, null, 2));
    } catch (e) {}

    // 2. Launch background runner or signal client sweep runner for serverless
    const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT);
    let serverWorkerStarted = false;

    if (!isServerless) {
      try {
        const cjsPath = path.join(process.cwd(), 'dist', 'pricing-agent.cjs');
        const tsPath = path.join(process.cwd(), 'src', 'scripts', 'pricing-agent.ts');
        const scriptPath = fs.existsSync(cjsPath) ? cjsPath : (fs.existsSync(tsPath) ? tsPath : null);

        if (scriptPath) {
          const logPath = path.join(process.cwd(), 'pricing-agent-diagnostic.log');
          const outFd = fs.openSync(logPath, 'a');
          const cmd = scriptPath.endsWith('.ts') ? 'npx' : 'node';
          const args = scriptPath.endsWith('.ts') ? ['tsx', scriptPath] : [scriptPath];

          const child = spawn(cmd, args, {
            detached: true,
            stdio: ['ignore', outFd, outFd],
            env: {
              ...process.env,
              SUPABASE_URL: url,
              SUPABASE_ANON_KEY: anonKey,
              VITE_SUPABASE_URL: url,
              VITE_SUPABASE_ANON_KEY: anonKey
            }
          });
          child.unref();
          serverWorkerStarted = true;

          // Also trigger in-process as dual redundancy
          try {
            if (fs.existsSync(cjsPath)) {
              import(cjsPath).then(m => {
                if (m && typeof m.runCompetitivePricing === 'function') {
                  m.runCompetitivePricing().catch(err => console.error('[Pricing Agent Error]:', err));
                }
              }).catch(() => {});
            }
          } catch (e) {}
        }
      } catch (procErr) {
        console.log('[Agent Start] Server worker spawn skipped; defaulting to client sweep runner');
      }
    }

    return res.status(200).json({
      success: true,
      serverless: isServerless || !serverWorkerStarted,
      runner: serverWorkerStarted ? 'server' : 'client',
      message: serverWorkerStarted
        ? 'High-speed pricing agent started successfully in background.'
        : 'Pricing agent initialized in cloud mode. High-speed client sweep runner active.',
      status: initialStatus
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to start pricing agent.' });
  }
}
