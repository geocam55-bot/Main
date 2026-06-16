import { createClient } from './src/utils/supabase/client';

async function main() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('kv_store_8405be07')
    .select('value')
    .eq('key', 'import_export_history')
    .maybeSingle();

  if (error) {
    console.error('Error fetching import history:', error);
    return;
  }

  if (!data || !data.value) {
    console.log('No import/export history found in kv_store.');
    return;
  }

  console.log('--- IMPORT/EXPORT PROCESS LOG DETAILS ---');
  const historyList = Array.isArray(data.value) ? data.value : [];
  console.log(`Found ${historyList.length} total logs.`);
  
  // Show the last 15 logs
  historyList.slice(0, 15).forEach((log: any, idx: number) => {
    console.log(`\n[Log ${idx + 1}]
    - ID: ${log.id}
    - Task: ${log.taskName} (${log.taskId})
    - Module: ${log.module} / Action: ${log.actionType}
    - Status: ${log.status}
    - Records count: ${log.recordCount}
    - Time: ${log.timestamp}
    - Storage / File Name: ${log.fileStorage} / ${log.fileName}
    - Message: ${log.message}`);
  });
}

main().catch(console.error);
