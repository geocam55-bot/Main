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
  
  let maxRow = 0;
  for (const key of Object.keys(sheet)) {
    if (key.startsWith('!')) continue;
    const match = key.match(/\d+$/);
    if (match) {
      const row = parseInt(match[0], 10);
      if (row > maxRow) maxRow = row;
    }
  }
  
  console.log('Sheet !ref is:', sheet['!ref']);
  console.log('Maximum physical row index found in keys:', maxRow);
}

main().catch(console.error);
