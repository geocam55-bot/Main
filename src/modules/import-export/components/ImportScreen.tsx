// Define CRM fields for each import type
const CONTACT_CRM_FIELDS = [
  // Basic details
  'Name',
  'Email',
  'Phone',
  'Company',
  'Trade',
  'Status',
  'Price Level',
  // Account and location
  'Legacy #',
  'Account Owner #',
  'Account Owner',
  'Address',
  'City',
  'Province / State',
  'Postal / Zip Code',
  // Notes and segmentation
  'Notes',
  'Tags',
  // Sales snapshot
  'PTD Sales',
  'PTD GP%',
  'YTD Sales',
  'YTD GP%',
  'LYR Sales',
  'LYR GP%'
];
const INVENTORY_CRM_FIELDS = [
  'Item Name',
  'SKU',
  'Category',
  'Quantity',
  'Location',
  'Status',
  // Add more as needed
];
const DEALS_CRM_FIELDS = [
  'Client Name',
  'Project Name',
  'Deal Value',
  'Stage',
  'Close Date',
  // Add more as needed
];

import React, { useState } from 'react';
import { FileUpload } from './FileUpload';
import { MappingGrid } from './MappingGrid';
import { parseExcelFile } from '../utils/excel';
import { uploadFile } from '../api/client';

// Main ImportScreen component
export const ImportScreen: React.FC = () => {
  const [tab, setTab] = useState<'import' | 'export'>('import');
  const [file, setFile] = useState<File | null>(null);
  const [importType, setImportType] = useState<'contacts' | 'inventory' | 'deals' | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [processMessage, setProcessMessage] = useState<string | null>(null);

  // Helper: get API key (for demo, prompt or use env/config)
  const getApiKey = () => {
    // TODO: Replace with secure retrieval
    return window.prompt('Enter your Supabase API Key (with contacts:write scope):');
  };

  // Map UI fields to data rows for backend
  function getMappedRows() {
    return rows.map((row) => {
      const mapped: Record<string, any> = {};
      Object.entries(mapping).forEach(([crmField, col]) => {
        if (col && row[col] !== undefined) mapped[crmField] = row[col];
      });
      return mapped;
    });
  }

  // Handler for file selection, sets file and import type
  const handleFileSelected = (type: 'contacts' | 'inventory' | 'deals') => async (selectedFile: File) => {
    setFile(selectedFile);
    setImportType(type);
    setError(null);
    try {
      const parsedRows = await parseExcelFile(selectedFile);
      setRows(parsedRows);
      // Initialize mapping: map each column to itself by default
      if (parsedRows.length > 0) {
        const columns = Object.keys(parsedRows[0]);
        const defaultMapping: Record<string, string> = {};
        columns.forEach((col) => { defaultMapping[col] = col; });
        setMapping(defaultMapping);
      }
    } catch {
      setRows([]);
      setMapping({});
      setError('Failed to parse file. Please check the file format.');
    }
  };

  const handleProcess = async () => {
    setProcessing(true);
    setProcessMessage(null);
    try {
      if (importType === 'contacts') {
        const apiKey = getApiKey();
        if (!apiKey) throw new Error('API key required');
        const mappedRows = getMappedRows();
        const res = await fetch('/api/import-export/importJob', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ records: mappedRows, apiKey }),
        });
        const data = await res.json();
        if (data.success) {
          setProcessMessage(`Processed ${mappedRows.length} records. Created: ${data.results.filter(r => r.action==='created').length}, Updated: ${data.results.filter(r => r.action==='updated').length}, Skipped: ${data.results.filter(r => r.action==='skipped').length}`);
        } else {
          setProcessMessage('Import failed: ' + (data.error || 'Unknown error'));
        }
      } else {
        setProcessMessage('Import for this type not implemented yet.');
      }
    } catch (err: any) {
      setProcessMessage('Error: ' + err.message);
    }
    setProcessing(false);
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto bg-slate-50 min-h-screen">
      {/* Info banners */}
      {error && (
        <div className="bg-red-100 text-red-800 px-4 py-2 rounded text-sm font-medium mb-4">{error}</div>
      )}

      {/* Tabs for Import/Export */}
      <div className="flex gap-2 mb-6">
        <button
          className={`px-4 py-2 rounded-t bg-white border-b-2 font-semibold transition-colors ${tab === 'import' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-blue-600'}`}
          onClick={() => setTab('import')}
        >
          Import
        </button>
        <button
          className={`px-4 py-2 rounded-t bg-white border-b-2 font-semibold transition-colors ${tab === 'export' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-blue-600'}`}
          onClick={() => setTab('export')}
        >
          Export
        </button>
      </div>

      {tab === 'import' && (
        <div className="flex flex-col gap-4">
          {/* Import from OneDrive (placeholder) */}
          <div className="bg-white rounded-lg shadow border p-4 min-h-0 flex-grow">
            <div className="font-semibold mb-2">Import from OneDrive</div>
            <div className="flex flex-wrap gap-2 mb-3">
              <button className="bg-blue-600 text-white px-3 py-1 rounded">Connect OneDrive</button>
              <button className="bg-slate-200 text-slate-700 px-3 py-1 rounded">Refresh Files</button>
              <button className="bg-slate-200 text-slate-700 px-3 py-1 rounded">Back</button>
              <button className="bg-slate-200 text-slate-700 px-3 py-1 rounded">Reset</button>
            </div>
            <div className="mb-2">
              <label className="block text-sm font-medium mb-1">Import as</label>
              <select className="border rounded px-2 py-1">
                <option>Contacts</option>
                <option>Inventory</option>
                <option>Deals</option>
              </select>
            </div>
            <div className="text-slate-500 text-sm">Not connected yet.</div>
            <button className="mt-2 bg-blue-600 text-white px-4 py-1.5 rounded">Connect OneDrive to load files</button>
          </div>

          {/* Import Contacts */}
          <div className="bg-white rounded-lg shadow border p-4 min-h-0 flex-grow">
            <div className="font-semibold mb-1">Import Contacts (Customers)</div>
            <div className="text-slate-500 text-sm mb-3">Import customer contact information from CSV or Excel files</div>
            <FileUpload onFileSelected={handleFileSelected('contacts')} />
            <div className="text-xs text-slate-400">Supported formats: CSV, Excel (.xlsx, .xls) or paste tab-delimited data. Required fields: Name (full name), Email</div>
            {/* Mapping UI for Contacts */}
            {importType === 'contacts' && file && rows.length > 0 && (
              <>
                <div className="mt-4 overflow-y-auto" style={{ maxHeight: '350px' }}>
                  <MappingGrid
                    columns={Object.keys(rows[0])}
                    crmFields={CONTACT_CRM_FIELDS}
                    mapping={mapping}
                    onChange={setMapping}
                  />
                </div>
                {/* Progress bar and process button */}
                <div className="mt-6 flex flex-col items-center gap-4 w-full max-w-md">
                  <div className="w-full flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span>Records to process:</span>
                        <span>{rows.length}</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-3 mb-2">
                        <div className="bg-blue-600 h-3 rounded-full transition-all" style={{ width: processing ? '100%' : '0%' }} />
                      </div>
                    </div>
                    <button
                      className="bg-blue-600 text-white px-6 py-2 rounded font-semibold shadow hover:bg-blue-700 transition-colors disabled:opacity-50"
                      onClick={handleProcess}
                      disabled={processing}
                    >
                      {processing ? 'Processing...' : 'Process'}
                    </button>
                  </div>
                  {processMessage && <div className="text-green-600 font-medium">{processMessage}</div>}
                </div>
              </>
            )}
          </div>

          {/* Import Inventory */}
          <div className="bg-white rounded-lg shadow border p-4 min-h-0 flex-grow">
            <div className="font-semibold mb-1">Import Inventory</div>
            <div className="text-slate-500 text-sm mb-3">Import inventory items from CSV or Excel files</div>
            <FileUpload onFileSelected={handleFileSelected('inventory')} />
            <div className="text-xs text-slate-400">Supported formats: CSV, Excel (.xlsx, .xls) or paste tab-delimited data. Required fields: Item Name, SKU</div>
            {/* Mapping UI for Inventory */}
            {importType === 'inventory' && file && rows.length > 0 && (
              <>
                <div className="mt-4 overflow-y-auto" style={{ maxHeight: '350px' }}>
                  <MappingGrid
                    columns={Object.keys(rows[0])}
                    crmFields={INVENTORY_CRM_FIELDS}
                    mapping={mapping}
                    onChange={setMapping}
                  />
                </div>
                {/* Progress bar and process button */}
                <div className="mt-6 flex flex-col items-center gap-4 w-full max-w-md">
                  <div className="w-full flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span>Records to process:</span>
                        <span>{rows.length}</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-3 mb-2">
                        <div className="bg-blue-600 h-3 rounded-full transition-all" style={{ width: processing ? '100%' : '0%' }} />
                      </div>
                    </div>
                    <button
                      className="bg-blue-600 text-white px-6 py-2 rounded font-semibold shadow hover:bg-blue-700 transition-colors disabled:opacity-50"
                      onClick={handleProcess}
                      disabled={processing}
                    >
                      {processing ? 'Processing...' : 'Process'}
                    </button>
                  </div>
                  {processMessage && <div className="text-green-600 font-medium">{processMessage}</div>}
                </div>
              </>
            )}
          </div>

          {/* Import Deals */}
          <div className="bg-white rounded-lg shadow border p-4 min-h-0 flex-grow">
            <div className="font-semibold mb-1">Import Deals (Sales & Quotes)</div>
            <div className="text-slate-500 text-sm mb-3">Import sales deals and quotes from CSV or Excel files</div>
            <FileUpload onFileSelected={handleFileSelected('deals')} />
            <div className="text-xs text-slate-400">Supported formats: CSV, Excel (.xlsx, .xls) or paste tab-delimited data. Required fields: Client Name, Project Name</div>
            {/* Mapping UI for Deals */}
            {importType === 'deals' && file && rows.length > 0 && (
              <>
                <div className="mt-4 overflow-y-auto" style={{ maxHeight: '350px' }}>
                  <MappingGrid
                    columns={Object.keys(rows[0])}
                    crmFields={DEALS_CRM_FIELDS}
                    mapping={mapping}
                    onChange={setMapping}
                  />
                </div>
                {/* Progress bar and process button */}
                <div className="mt-6 flex flex-col items-center gap-4 w-full max-w-md">
                  <div className="w-full flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span>Records to process:</span>
                        <span>{rows.length}</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-3 mb-2">
                        <div className="bg-blue-600 h-3 rounded-full transition-all" style={{ width: processing ? '100%' : '0%' }} />
                      </div>
                    </div>
                    <button
                      className="bg-blue-600 text-white px-6 py-2 rounded font-semibold shadow hover:bg-blue-700 transition-colors disabled:opacity-50"
                      onClick={handleProcess}
                      disabled={processing}
                    >
                      {processing ? 'Processing...' : 'Process'}
                    </button>
                  </div>
                  {processMessage && <div className="text-green-600 font-medium">{processMessage}</div>}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {tab === 'export' && (
        <div className="bg-white rounded-xl shadow border p-10 text-center text-slate-400 text-lg">
          Export functionality coming soon.
        </div>
      )}
    </div>
  );
};
