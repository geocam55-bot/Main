import { createClient } from './src/utils/supabase/client';

// We import syncOneDriveFileOnBackend from server via require/import since it is exported!
import { syncOneDriveFileOnBackend } from './server';

async function main() {
  const supabase = createClient();
  const taskId = 'task-wyftk9dbb';
  
  const { data } = await supabase
    .from('kv_store_8405be07')
    .select('value')
    .eq('key', 'import_export_tasks')
    .maybeSingle();

  const tasks = data?.value || [];
  const task = tasks.find((t: any) => t.id === taskId);
  if (!task) {
    console.error(`Task "${taskId}" not found.`);
    return;
  }

  console.log('Task object:', JSON.stringify(task, null, 2));

  console.log('\n--- EXECUTING syncOneDriveFileOnBackend LIVE CONTROLLERS ---');
  try {
    const res = await syncOneDriveFileOnBackend(task);
    console.log('SUCCESS!');
    console.log('Buffer length downloaded:', res.buffer?.length);
    console.log('Base64 length returned:', res.base64Url?.length);
    process.exit(0);
  } catch (err: any) {
    console.error('FAILURE DETECTED LIVE:', err);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
