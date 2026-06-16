import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';

function findXlsxFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
        findXlsxFiles(filePath, fileList);
      }
    } else {
      if (file.endsWith('.xlsx') || file.endsWith('.xls')) {
        fileList.push(filePath);
      }
    }
  }
  return fileList;
}

async function main() {
  const searchPattern = '84895031';
  console.log('Finding all .xlsx/.xls files on the filesystem...');
  const files = findXlsxFiles('.');
  console.log(`Found ${files.length} Excel files:`, files);

  for (const file of files) {
    console.log(`\nScanning Excel file: ${file}`);
    try {
      const workbook = XLSX.readFile(file);
      console.log(`Sheets in ${file}:`, workbook.SheetNames);
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const rows: any[] = XLSX.utils.sheet_to_json(sheet);
        console.log(`Sheet "${sheetName}" has ${rows.length} rows.`);
        let found = false;
        rows.forEach((row, idx) => {
          const rowStr = JSON.stringify(row);
          if (rowStr.includes(searchPattern)) {
            console.log(`[FOUND in Row ${idx + 2} of sheet "${sheetName}"]:`, row);
            found = true;
          }
        });
        if (!found) {
          console.log(`SKU "${searchPattern}" NOT found in "${sheetName}".`);
        }
      }
    } catch (err: any) {
      console.error(`Error reading ${file}:`, err.message);
    }
  }
}

main().catch(console.error);
