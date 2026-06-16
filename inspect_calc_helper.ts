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
  
  console.log('Book Sheet Names:', workbook.SheetNames);
  
  const calcHelperSheet = workbook.Sheets['Calc_Helper'];
  const rows = XLSX.utils.sheet_to_json(calcHelperSheet);
  console.log(`Calc_Helper contains ${rows.length} rows.`);
  
  console.log('--- Top 5 Rows in Calc_Helper ---');
  console.log(JSON.stringify(rows.slice(0, 5), null, 2));
  
  console.log('--- Bottom 5 Rows in Calc_Helper ---');
  console.log(JSON.stringify(rows.slice(-5), null, 2));

  // Let's print unique SKUs or columns in Calc_Helper
  const columns = new Set<string>();
  rows.forEach(r => Object.keys(r).forEach(k => columns.add(k)));
  console.log('Calc_Helper Columns:', Array.from(columns));
}

main().catch(console.error);
