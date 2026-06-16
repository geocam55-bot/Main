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
  const rows: any[] = XLSX.utils.sheet_to_json(sheet);
  
  console.log(`Searching for SKU "84895031" in ${rows.length} rows of Product_Export_List.xlsx...`);
  
  const matches = rows.filter(r => {
    const skuStr = String(r.SKU || r.sku || '').trim();
    return skuStr === '84895031' || skuStr.includes('84895031');
  });

  if (matches.length > 0) {
    console.log(`Found ${matches.length} matches:`);
    console.log(JSON.stringify(matches, null, 2));
  } else {
    console.log('No matches found for "84895031".');
    
    // Let's print some close SKUs starting with 8489
    const closeMatches = rows.filter(r => {
      const skuStr = String(r.SKU || r.sku || '').trim();
      return skuStr.startsWith('8489');
    });
    console.log(`Found ${closeMatches.length} close match SKUs starting with "8489":`);
    console.log(closeMatches.slice(0, 10).map(m => m.SKU));
  }
}

main().catch(console.error);
