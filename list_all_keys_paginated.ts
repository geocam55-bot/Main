import { createClient } from './src/utils/supabase/client';

async function main() {
  const supabase = createClient();
  let allKeys: string[] = [];
  let offset = 0;
  const PAGE = 1000;
  
  while (true) {
    const { data, error } = await supabase
      .from('kv_store_8405be07')
      .select('key')
      .range(offset, offset + PAGE - 1);
      
    if (error) {
      console.error('Error fetching range:', error);
      break;
    }
    if (!data || data.length === 0) break;
    
    data.forEach(r => allKeys.push(r.key));
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  
  console.log(`Total keys in kv_store: ${allKeys.length}`);
  const fileKeys = allKeys.filter(k => k.startsWith('import_export_file_content:'));
  console.log(`Of those, ${fileKeys.length} are file content keys:`);
  console.log(fileKeys);
}

main().catch(console.error);
