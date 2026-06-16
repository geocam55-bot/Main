import { createClient } from './src/utils/supabase/client';
import * as XLSX from 'xlsx';

async function main() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('kv_store_8405be07')
    .select('value')
    .eq('key', 'import_export_file_content:Product_Export_List.xlsx')
    .maybeSingle();

  if (error || !data || !data.value || !data.value.base64) {
    console.error('File not found or base64 missing');
    return;
  }

  const buf = Buffer.from(data.value.base64, 'base64');
  const workbook = XLSX.read(buf, { type: 'buffer' });
  const sheet = workbook.Sheets['Sheet1'];

  console.log('Original !ref:', sheet['!ref']);
  
  // Let's search all keys in sheet object to see if there are row keys higher than 15001 (like A15002, etc.)
  let maxRowFound = 1;
  const cellKeys = Object.keys(sheet).filter(k => !k.startsWith('!'));
  
  for (const k of cellKeys) {
    const row = parseInt(k.replace(/^[A-Z]+/, ''), 10);
    if (!isNaN(row) && row > maxRowFound) {
      maxRowFound = row;
    }
  }

  console.log(`Max row key found in sheet object: ${maxRowFound}`);
}

main().catch(console.error);
