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
    console.error('File not found or has no base64 value.');
    return;
;
  }

  const base64Str = data.value.base64;
  console.log(`Base64 string length: ${base64Str.length}`);
  const buf = Buffer.from(base64Str, 'base64');
  console.log(`Decoded buffer byte length: ${buf.length}`);
  
  const workbook = XLSX.read(buf, { type: 'buffer' });
  console.log('Sheet Names:', workbook.SheetNames);
  
  const sheet = workbook.Sheets['Sheet1'];
  console.log('Sheet1 reference range (!ref):', sheet['!ref']);
  
  const rowsDefault = XLSX.utils.sheet_to_json(sheet);
  console.log(`Parsed rows (default sheet_to_json): ${rowsDefault.length}`);
  
  // Let's also check if there are empty rows or cells at the end
  const range = XLSX.utils.decode_range(sheet['!ref']!);
  console.log(`Decoded Range: rows 0 to ${range.e.r} (total ${range.e.r + 1} rows), cols 0 to ${range.e.c}`);
}

main().catch(console.error);
