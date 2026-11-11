import React, { useState } from 'react';
import { 
  Package, 
  X, 
  Printer, 
  Copy, 
  Check, 
  Database, 
  FileText,
  Layers,
  ArrowRight,
  Plus,
  Trash2,
  Save
} from 'lucide-react';
import { DeliveryRecord, CargoManifestItem } from '../types';

interface CargoManifestModalProps {
  delivery: DeliveryRecord | null;
  onClose: () => void;
  onOpenPdf?: (delivery: DeliveryRecord) => void;
  onUpdateDelivery?: (delivery: DeliveryRecord) => void;
}

export const CargoManifestModal: React.FC<CargoManifestModalProps> = ({
  delivery,
  onClose,
  onOpenPdf,
  onUpdateDelivery
}) => {
  const [copied, setCopied] = useState(false);
  const [showSql, setShowSql] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [manifestItems, setManifestItems] = useState<CargoManifestItem[]>(() => {
    if (!delivery) return [];
    if (Array.isArray(delivery.cargoManifest) && delivery.cargoManifest.length > 0) {
      return JSON.parse(JSON.stringify(delivery.cargoManifest));
    }
    return [
      { line: 1, ordered: '1', sku: '0971286', description: "SPF 2X4X8' LUMBER #2 & BETTER", units: 'EA', pricePer: '$12.50', extension: '$12.50' },
      { line: 2, ordered: '1', sku: 'N/A', description: 'SPRUCE 2X4X8', units: 'EA', pricePer: '$14.00', extension: '$14.00' },
      { line: 3, ordered: '1', sku: 'N/A', description: 'SPRUCE STUD', units: 'EA', pricePer: '$9.50', extension: '$9.50' }
    ];
  });

  if (!delivery) return null;

  // Calculate totals
  const totalUnits = manifestItems.reduce((acc, item) => {
    const qty = parseFloat(String(item.ordered).replace(/[^0-9.]/g, ''));
    return acc + (isNaN(qty) ? 0 : qty);
  }, 0);

  const totalExtension = manifestItems.reduce((acc, item) => {
    const ext = parseFloat(String(item.extension).replace(/[^0-9.]/g, ''));
    return acc + (isNaN(ext) ? 0 : ext);
  }, 0);

  const handleItemChange = (index: number, field: keyof CargoManifestItem, value: string) => {
    const updated = [...manifestItems];
    updated[index] = { ...updated[index], [field]: value };

    if (field === 'ordered' || field === 'pricePer') {
      const qtyStr = field === 'ordered' ? value : updated[index].ordered;
      const priceStr = field === 'pricePer' ? value : updated[index].pricePer;
      const qty = parseFloat(String(qtyStr).replace(/[^0-9.]/g, '')) || 0;
      const price = parseFloat(String(priceStr).replace(/[^0-9.]/g, '')) || 0;
      const ext = qty * price;
      updated[index].extension = `$${ext.toFixed(2)}`;
    }

    setManifestItems(updated);
  };

  const handleAddLine = () => {
    const newLineNum = manifestItems.length + 1;
    setManifestItems([
      ...manifestItems,
      { line: newLineNum, ordered: '1', sku: 'SKU-NEW', description: 'New Building Material Item', units: 'EA', pricePer: '$10.00', extension: '$10.00' }
    ]);
  };

  const handleDeleteLine = (index: number) => {
    const updated = manifestItems.filter((_, i) => i !== index).map((item, i) => ({ ...item, line: i + 1 }));
    setManifestItems(updated);
  };

  const handleSaveManifest = () => {
    const newTotalExt = manifestItems.reduce((acc, item) => {
      const ext = parseFloat(String(item.extension).replace(/[^0-9.]/g, ''));
      return acc + (isNaN(ext) ? 0 : ext);
    }, 0);

    const updatedDelivery: DeliveryRecord = {
      ...delivery,
      cargoManifest: manifestItems,
      orderTotal: `$${newTotalExt.toFixed(2)}`
    };

    if (onUpdateDelivery) {
      onUpdateDelivery(updatedDelivery);
    }
    setSuccessMsg('Manifest quantities and prices updated successfully!');
    setTimeout(() => {
      setSuccessMsg(null);
    }, 2500);
  };

  const handleCopyTsv = () => {
    const headers = ['LINE', 'ORDERED', 'SKU', 'DESCRIPTION', 'UNITS', 'PRICE/ PER', 'EXTENSION'];
    const rows = manifestItems.map(item => [
      item.line,
      item.ordered,
      item.sku,
      `"${String(item.description).replace(/"/g, '""')}"`,
      item.units,
      item.pricePer,
      item.extension
    ]);
    const tsvContent = [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
    navigator.clipboard.writeText(tsvContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sqlSchema = `-- ==============================================================================
-- ProSpaces Logistics: Order Cargo Manifest Table Migration
-- Attached to Order/Delivery: ${delivery.id}
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.order_cargo_manifests (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'rona_atlantic',
  delivery_id TEXT NOT NULL,
  line_number INTEGER NOT NULL DEFAULT 1,
  ordered_quantity TEXT NOT NULL DEFAULT '1',
  sku TEXT NOT NULL,
  description TEXT NOT NULL,
  units TEXT NOT NULL DEFAULT 'EA',
  price_per TEXT NOT NULL DEFAULT '$0.00',
  extension TEXT NOT NULL DEFAULT '$0.00',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_cargo_manifests_delivery_id ON public.order_cargo_manifests(delivery_id);
CREATE INDEX IF NOT EXISTS idx_order_cargo_manifests_tenant_id ON public.order_cargo_manifests(tenant_id);

ALTER TABLE public.order_cargo_manifests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all operations for order_cargo_manifests" ON public.order_cargo_manifests;
CREATE POLICY "Enable all operations for order_cargo_manifests"
  ON public.order_cargo_manifests FOR ALL USING (true) WITH CHECK (true);`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlSchema);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cargo Manifest - ${delivery.id}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #0f172a; }
            .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; }
            .title { font-size: 20px; font-weight: bold; margin: 0; }
            .subtitle { font-size: 12px; color: #64748b; margin-top: 4px; font-family: monospace; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 20px; font-size: 12px; }
            .meta-item strong { display: inline-block; width: 140px; color: #475569; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 10px; }
            th { background: #f1f5f9; padding: 8px 6px; text-align: left; font-family: monospace; border: 1px solid #cbd5e1; font-weight: bold; }
            td { padding: 8px 6px; border: 1px solid #e2e8f0; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-mono { font-family: monospace; }
            .total-row { font-weight: bold; background: #f8fafc; }
            .footer { margin-top: 30px; padding-top: 12px; border-top: 1px solid #cbd5e1; font-size: 10px; color: #64748b; display: flex; justify-content: space-between; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">PROSPACES LOGISTICS - CARGO MANIFEST</h1>
            <div class="subtitle">SKU BOX DISPATCH LEDGER &bull; ORDER ID: ${delivery.id} &bull; SALES ORDER: ${delivery.epicorSalesOrder || delivery.invoiceNumber || 'N/A'}</div>
          </div>

          <div class="meta-grid">
            <div class="meta-item"><strong>Customer Name:</strong> ${delivery.customerName}</div>
            <div class="meta-item"><strong>Date:</strong> ${new Date(delivery.registeredAt || Date.now()).toLocaleDateString()}</div>
            <div class="meta-item"><strong>Delivery Address:</strong> ${delivery.deliveryAddress}</div>
            <div class="meta-item"><strong>Origin Depot:</strong> ${delivery.originBranch || 'Central DC'}</div>
            <div class="meta-item"><strong>Assigned Truck:</strong> ${delivery.assignedTruck || 'Unassigned'}</div>
            <div class="meta-item"><strong>Status:</strong> ${delivery.status}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th class="text-center" style="width: 45px;">LINE</th>
                <th class="text-right" style="width: 65px;">ORDERED</th>
                <th style="width: 110px;">SKU</th>
                <th>DESCRIPTION</th>
                <th class="text-center" style="width: 60px;">UNITS</th>
                <th class="text-right" style="width: 85px;">PRICE/ PER</th>
                <th class="text-right" style="width: 95px;">EXTENSION</th>
              </tr>
            </thead>
            <tbody>
              ${manifestItems.map(item => `
                <tr>
                  <td class="text-center font-mono">${item.line}</td>
                  <td class="text-right font-mono" style="font-weight: bold;">${item.ordered}</td>
                  <td class="font-mono" style="font-weight: bold; color: #1e40af;">${item.sku}</td>
                  <td>${item.description}</td>
                  <td class="text-center font-mono">${item.units}</td>
                  <td class="text-right font-mono">${item.pricePer}</td>
                  <td class="text-right font-mono" style="font-weight: bold; color: #047857;">${item.extension}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="4" style="text-align: right; padding-right: 12px;">TOTALS:</td>
                <td class="text-center font-mono">${totalUnits > 0 ? totalUnits : ''}</td>
                <td></td>
                <td class="text-right font-mono" style="color: #047857; font-size: 12px;">$${totalExtension > 0 ? totalExtension.toFixed(2) : '0.00'}</td>
              </tr>
            </tbody>
          </table>

          <div class="footer">
            <span>PROSPACES LOGISTICS CARGO MANIFEST</span>
            <span>Generated: ${new Date().toLocaleString()}</span>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 border-b border-slate-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="p-2 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-xl shrink-0">
              <Package className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2 flex-wrap">
                <h3 className="font-sans font-extrabold text-white text-base tracking-tight truncate">
                  Cargo Manifest &bull; SKU BOX (Editable)
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  {delivery.id}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  {manifestItems.length} Item{manifestItems.length !== 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-xs text-slate-300 truncate mt-0.5">
                Customer: <span className="text-white font-semibold">{delivery.customerName}</span> &bull; {delivery.deliveryAddress}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleSaveManifest}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
              title="Save changes to quantities and prices"
            >
              <Save className="h-4 w-4" />
              <span>Save Manifest</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shrink-0"
              title="Close Manifest"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Success Banner */}
        {successMsg && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-2 text-emerald-800 text-xs font-bold flex items-center justify-between">
            <span>✅ {successMsg}</span>
          </div>
        )}

        {/* Toolbar & Mapped Columns Banner */}
        <div className="bg-slate-50 border-b border-slate-200/80 px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-1.5 flex-wrap text-[11px] font-mono text-slate-600">
            <span className="font-bold text-slate-900 font-sans uppercase tracking-wider text-[10px]">Editable Columns:</span>
            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-900 rounded font-bold">QTY (ORDERED)</span>
            <ArrowRight className="h-3 w-3 text-slate-400" />
            <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-900 rounded font-bold">PRICE / PER</span>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={handleAddLine}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center space-x-1 transition-all shadow-2xs cursor-pointer text-xs"
              title="Add new manifest line item"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Line</span>
            </button>

            <button
              type="button"
              onClick={handleCopyTsv}
              className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-bold flex items-center space-x-1 transition-all shadow-2xs cursor-pointer"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-slate-500" />}
              <span>{copied ? 'Copied TSV!' : 'Copy TSV'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-bold flex items-center space-x-1 transition-all shadow-2xs cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5 text-slate-500" />
              <span>Print Slip</span>
            </button>

            <button
              type="button"
              onClick={() => setShowSql(!showSql)}
              className={`px-2.5 py-1 border rounded-lg font-bold flex items-center space-x-1 transition-all shadow-2xs cursor-pointer ${
                showSql 
                  ? 'bg-purple-50 text-purple-700 border-purple-300' 
                  : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
              }`}
            >
              <Database className="h-3.5 w-3.5 text-purple-600" />
              <span>Supabase SQL</span>
            </button>

            {onOpenPdf && (
              <button
                type="button"
                onClick={() => onOpenPdf(delivery)}
                className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg text-indigo-700 font-bold flex items-center space-x-1 transition-all shadow-2xs cursor-pointer"
              >
                <FileText className="h-3.5 w-3.5 text-indigo-600" />
                <span>View Invoice</span>
              </button>
            )}
          </div>
        </div>

        {/* Collapsible Supabase SQL Drawer */}
        {showSql && (
          <div className="bg-slate-900 p-4 border-b border-slate-800 text-slate-200 text-xs animate-in slide-in-from-top duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
              <div className="flex items-center space-x-2">
                <Database className="h-4 w-4 text-purple-400" />
                <span className="font-mono font-bold text-slate-100">Supabase Table DDL: public.order_cargo_manifests</span>
              </div>
              <button
                type="button"
                onClick={handleCopySql}
                className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded font-mono font-bold text-[11px] flex items-center space-x-1 transition-colors cursor-pointer"
              >
                {copiedSql ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                <span>{copiedSql ? 'SQL Copied!' : 'Copy SQL for Supabase'}</span>
              </button>
            </div>
            <pre className="font-mono text-[10px] leading-relaxed text-purple-200 bg-slate-950 p-3 rounded-lg overflow-x-auto max-h-48 border border-slate-800">
              {sqlSchema}
            </pre>
          </div>
        )}

        {/* Manifest Table Content (Editable) */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {manifestItems.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 space-y-3">
              <Package className="h-10 w-10 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">No SKU Box Cargo Manifest items found</p>
              <button
                type="button"
                onClick={handleAddLine}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-xs shadow-sm hover:bg-blue-700 transition-colors"
              >
                + Add First Line Item
              </button>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-white">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-mono text-[10px] uppercase border-b border-slate-200 tracking-wider">
                  <tr>
                    <th className="p-3 text-center w-12 font-extrabold">LINE</th>
                    <th className="p-3 text-right w-24 font-extrabold text-blue-900">QTY / ORDERED</th>
                    <th className="p-3 w-32 font-extrabold">SKU</th>
                    <th className="p-3 font-extrabold">DESCRIPTION</th>
                    <th className="p-3 text-center w-20 font-extrabold">UOM</th>
                    <th className="p-3 text-right w-28 font-extrabold text-emerald-900">PRICE / PER</th>
                    <th className="p-3 text-right w-32 font-extrabold">EXTENSION</th>
                    <th className="p-3 text-center w-12 font-extrabold">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {manifestItems.map((item, idx) => (
                    <tr 
                      key={idx} 
                      className={`hover:bg-blue-50/40 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}
                    >
                      <td className="p-3 text-center font-mono font-bold text-slate-500">
                        {item.line || (idx + 1)}
                      </td>
                      <td className="p-3 text-right font-mono">
                        <input
                          type="text"
                          value={item.ordered}
                          onChange={(e) => handleItemChange(idx, 'ordered', e.target.value)}
                          className="w-20 bg-blue-50/70 border border-blue-200 rounded px-2 py-1 text-right font-mono font-extrabold text-blue-900 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          placeholder="1"
                        />
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-800">
                        <input
                          type="text"
                          value={item.sku}
                          onChange={(e) => handleItemChange(idx, 'sku', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 font-mono text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 font-sans font-medium text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        />
                      </td>
                      <td className="p-3 text-center font-mono">
                        <input
                          type="text"
                          value={item.units || 'EA'}
                          onChange={(e) => handleItemChange(idx, 'units', e.target.value)}
                          className="w-16 text-center bg-slate-50 border border-slate-200 rounded px-1 py-1 font-mono text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        />
                      </td>
                      <td className="p-3 text-right font-mono">
                        <input
                          type="text"
                          value={item.pricePer}
                          onChange={(e) => handleItemChange(idx, 'pricePer', e.target.value)}
                          className="w-24 bg-emerald-50/70 border border-emerald-200 rounded px-2 py-1 text-right font-mono font-bold text-emerald-900 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                          placeholder="$0.00"
                        />
                      </td>
                      <td className="p-3 text-right font-mono font-extrabold text-emerald-700 text-sm">
                        {item.extension || '$0.00'}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteLine(idx)}
                          className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors cursor-pointer"
                          title="Delete line item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-100/90 border-t-2 border-slate-300 font-mono text-xs font-bold text-slate-800">
                  <tr>
                    <td className="p-3 text-center text-slate-500">{manifestItems.length} Lines</td>
                    <td className="p-3 text-right text-slate-950 font-extrabold text-sm">{totalUnits > 0 ? totalUnits : ''}</td>
                    <td colSpan={4} className="p-3 text-right font-sans uppercase tracking-wider text-[11px] text-slate-600">
                      Total Manifest Value:
                    </td>
                    <td className="p-3 text-right text-emerald-800 font-black text-sm">
                      ${totalExtension > 0 ? totalExtension.toFixed(2) : '0.00'}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500 font-mono flex items-center space-x-1.5">
            <Layers className="h-3.5 w-3.5 text-blue-500" />
            <span>Edit quantities &amp; prices inline &bull; Click Save Manifest to commit changes</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleSaveManifest}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-sm transition-colors cursor-pointer flex items-center space-x-1.5"
            >
              <Save className="h-4 w-4" />
              <span>Save Manifest Changes</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-xs shadow-xs transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
