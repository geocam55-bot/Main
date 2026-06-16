import { createClient } from './src/utils/supabase/client';
import { executeSupabaseScheduledTask } from './server';

async function main() {
  const supabase = createClient();
  const taskId = 'task-wyftk9dbb';
  
  // Fetch task from database (it resides in kv_store or we can query it)
  const { data, error } = await supabase
    .from('kv_store_8405be07')
    .select('value')
    .eq('key', 'import_export_tasks')
    .maybeSingle();

  if (error || !data?.value) {
    console.error('Failed to load tasks:', error);
    return;
  }

  const tasks = data.value;
  const task = tasks.find((t: any) => t.id === taskId);
  if (!task) {
    console.error(`Task with ID "${taskId}" not found.`);
    return;
  }

  console.log(`Manually triggering Task: "${task.name}" (${task.id}) via executeSupabaseScheduledTask...`);
  const result = await executeSupabaseScheduledTask(task, supabase);
  console.log('--- RE-SYNC COMPLETED ---');
  console.log('Task Execution Result:', result);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
