import { createClient } from './src/utils/supabase/client';
import * as XLSX from 'xlsx';

async function main() {
  const supabase = createClient();
  let offset = 0;
  const PAGE = 100;
  let found = false;

  console.log('Searching all keys in kv_store for "84895031"...');

  while (true) {
    const { data, error } = await supabase
      .from('kv_store_8405be07')
      .select('key, value')
      .range(offset, offset + PAGE - 1);

    if (error) {
      console.error('Error fetching batch:', error);
      break;
    }
    if (!data || data.length === 0) break;

    for (const item of data) {
      const valStr = JSON.stringify(item.value);
      if (valStr.includes('84895031')) {
        console.log(`Found reference in key "${item.key}"!`);
        found = true;
        // If it starts with import_export_file_content:, let's parse it as excel/csv
        if (item.key.startsWith('import_export_file_content:')) {
          const v = item.value;
          if (v.base64) {
            try {
              const buf = Buffer.from(v.base64, 'base64');
              const workbook = XLSX.read(buf, { type: 'buffer' });
              console.log(`- Sheet names: ${workbook.SheetNames}`);
              workbook.SheetNames.forEach(sheetName => {
                const sheet = workbook.Sheets[sheetName];
                const rows: any[] = XLSX.utils.sheet_to_json(sheet);
                const mat = rows.filter(r => JSON.stringify(r).includes('84895031'));
                if (mat.length > 0) {
                  console.log(`  - Match in sheet "${sheetName}":`, JSON.stringify(mat, null, 2));
                }
              });
            } catch (err: any) {
              console.error(`  - Failed to parse base64 for key ${item.key}:`, err.message);
            }
          } else if (v.content) {
            console.log(`  - Plain text match in key:`, v.content.substring(0, 500) + '...');
          }
        }
      }
    }

    if (data.length < PAGE) break;
    offset += PAGE;
  }

  if (!found) {
    console.log('No virtual files contain "84895031".');
  }
}

main().catch(console.error);
