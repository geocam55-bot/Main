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
    console.error('File not found');
    return;
  }

  const buf = Buffer.from(data.value.base64, 'base64');
  const workbook = XLSX.read(buf, { type: 'buffer' });
  const sheet = workbook.Sheets['Sheet1'];
  const rows = XLSX.utils.sheet_to_json(sheet);
  
  console.log(`Total rows in Sheet1: ${rows.length}`);
  console.log('--- Last 10 rows in Sheet1 ---');
  console.log(JSON.stringify(rows.slice(-10), null, 2));
}

main().catch(console.error);
