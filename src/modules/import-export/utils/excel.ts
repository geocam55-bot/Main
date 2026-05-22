// Utilities for Excel file parsing and export


import * as XLSX from 'xlsx';


export async function parseExcelFile(file: File): Promise<any[]> {
  // Robust Excel/CSV parser: always use first row as header, trim/sanitize, fallback for empty headers
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        // Get raw rows (header: 1)
        const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        if (!rawRows.length) return resolve([]);
        // Use first row as header, trim, fill empty
        const rawHeaders = rawRows[0] || [];
        const headers = rawHeaders.map((h: any, i: number) => {
          let name = String(h || '').trim();
          if (!name) name = `Column${i+1}`;
          return name;
        });
        // Map rows to objects
        const dataRows = rawRows.slice(1).filter(r => r.some(cell => cell !== ''));
        const result = dataRows.map(row => {
          const obj: Record<string, any> = {};
          headers.forEach((h, i) => { obj[h] = row[i] ?? ''; });
          return obj;
        });
        resolve(result);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export async function generateExcelFile(data: any[], fields: string[]): Promise<Blob> {
  // TODO: Generate Excel file from data
  return new Blob();
}
