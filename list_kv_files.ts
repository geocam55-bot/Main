import { createClient } from './src/utils/supabase/client';

async function main() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('kv_store_8405be07')
    .select('key');

  if (error) {
    console.error('Error fetching keys:', error);
    return;
  }

  const fileKeys = data.filter(r => r.key.startsWith('import_export_file_content:'));
  console.log(`Found ${fileKeys.length} file keys in kv_store:`);
  
  for (const k of fileKeys) {
    const { data: valData } = await supabase
      .from('kv_store_8405be07')
      .select('key, value')
      .eq('key', k.key)
      .single();
      
    if (valData && valData.value) {
      const v = valData.value;
      const base64Len = v.base64 ? v.base64.length : 0;
      const textLen = v.content ? v.content.length : 0;
      console.log(`- ${valData.key}: base64 length=${base64Len}, isBinary=${v.isBinary}, text length=${textLen}`);
    }
  }

  // Also read local_files list catalog
  const { data: localFiles } = await supabase
    .from('kv_store_8405be07')
    .select('value')
    .eq('key', 'import_export_local_files')
    .maybeSingle();
  console.log(`\nimport_export_local_files catalog:`, JSON.stringify(localFiles?.value, null, 2));

  // Also read onedrive_files list catalog
  const { data: odFiles } = await supabase
    .from('kv_store_8405be07')
    .select('value')
    .eq('key', 'import_export_onedrive_files')
    .maybeSingle();
  console.log(`\nimport_export_onedrive_files catalog:`, JSON.stringify(odFiles?.value, null, 2));
}

main().catch(console.error);
