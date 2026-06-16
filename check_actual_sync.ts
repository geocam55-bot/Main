import { createClient } from './src/utils/supabase/client';
import * as XLSX from 'xlsx';

async function main() {
  const supabase = createClient();
  const { data } = await supabase
    .from('kv_store_8405be07')
    .select('value')
    .eq('key', 'import_export_file_content:Product_Export_List.xlsx')
    .maybeSingle();

  if (!data?.value?.base64) {
    console.log('No virtual file found under Product_Export_List.xlsx');
    return;
  }

  const buf = Buffer.from(data.value.base64, 'base64');
  const wb = XLSX.read(buf, { type: 'buffer' });
  const sheet = wb.Sheets['Sheet1'];
  const rows = XLSX.utils.sheet_to_json(sheet);
  console.log(`Current cached file row count: ${rows.length}, firstSheet ref: "${sheet['!ref']}"`);
}

main().catch(console.error);
