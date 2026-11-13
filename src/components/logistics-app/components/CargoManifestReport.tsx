import React, { useState } from 'react';
import { 
  Package, 
  Printer, 
  Copy, 
  Check, 
  FileText, 
  Calendar, 
  Truck as TruckIcon, 
  MapPin, 
  Search, 
  Plus, 
  Trash2, 
  Save, 
  Building2,
  Clock,
  AlertCircle
} from 'lucide-react';
import { DeliveryRecord, Truck, Branch, User, CargoManifestItem } from '../types';

interface CargoManifestReportProps {
  deliveries: DeliveryRecord[];
  trucks: Truck[];
  branches: Branch[];
  users: User[];
  currentUser: User | null;
  onUpdateDelivery?: (delivery: DeliveryRecord) => void;
  onSelectTab?: (tab: string) => void;
}

export const CargoManifestReport: React.FC<CargoManifestReportProps> = ({
  deliveries,
  trucks,
  branches,
  users,
  currentUser,
  onUpdateDelivery,
  onSelectTab
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedTruckId, setSelectedTruckId] = useState<string>(trucks[0]?.id || 'TRUCK-87');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Local editable manifest items keyed by delivery id
  const [editableManifests, setEditableManifests] = useState<Record<string, CargoManifestItem[]>>({});

  // Filter deliveries matching selectedDate and selectedTruckId
  const matchingDeliveries = deliveries.filter(d => {
    const dDate = (d.scheduledDate || d.date || '').split('T')[0];
    const matchDate = dDate === selectedDate || !dDate; // fallback if date not set

    const tId = String(d.assignedTruck || d.assignedTruckId || '').trim().toLowerCase();
    const targetTruck = trucks.find(t => t.id === selectedTruckId);
    const targetTruckName = targetTruck ? targetTruck.name.trim().toLowerCase() : selectedTruckId.toLowerCase();
    
    const matchTruck = 
      tId === selectedTruckId.toLowerCase() || 
      tId === targetTruckName ||
      (targetTruck && tId.includes(targetTruck.id.toLowerCase())) ||
      (targetTruck && targetTruckName.includes(tId));

    return matchDate && (matchTruck || !d.assignedTruck);
  });

  const getManifestItemsForDelivery = (delivery: DeliveryRecord): CargoManifestItem[] => {
    if (editableManifests[delivery.id]) {
      return editableManifests[delivery.id];
    }
    if (Array.isArray(delivery.cargoManifest) && delivery.cargoManifest.length > 0) {
      return delivery.cargoManifest;
    }
    return [
      { line: 1, ordered: '24', sku: '0971286', description: "SPF 2X4X8' LUMBER #2 & BETTER", units: 'EA', pricePer: '$12.50', extension: '$300.00' },
      { line: 2, ordered: '12', sku: '0812934', description: 'SPRUCE 2X4X10 DIMENSIONAL', units: 'EA', pricePer: '$18.00', extension: '$216.00' },
      { line: 3, ordered: '6', sku: 'OSB-7123', description: '7/16 OSB STRUCTURAL PANEL 4X8', units: 'SHEET', pricePer: '$24.50', extension: '$147.00' }
    ];
  };

  const handleItemChange = (deliveryId: string, index: number, field: keyof CargoManifestItem, value: string) => {
    const delivery = deliveries.find(d => d.id === deliveryId);
    if (!delivery) return;

    const currentItems = JSON.parse(JSON.stringify(getManifestItemsForDelivery(delivery)));
    currentItems[index] = { ...currentItems[index], [field]: value };

    if (field === 'ordered' || field === 'pricePer') {
      const qtyStr = field === 'ordered' ? value : currentItems[index].ordered;
      const priceStr = field === 'pricePer' ? value : currentItems[index].pricePer;
      const qty = parseFloat(String(qtyStr).replace(/[^0-9.]/g, '')) || 0;
      const price = parseFloat(String(priceStr).replace(/[^0-9.]/g, '')) || 0;
      const ext = qty * price;
      currentItems[index].extension = `$${ext.toFixed(2)}`;
    }

    setEditableManifests({
      ...editableManifests,
      [deliveryId]: currentItems
    });
  };

  const handleAddLine = (deliveryId: string) => {
    const delivery = deliveries.find(d => d.id === deliveryId);
    if (!delivery) return;

    const currentItems = JSON.parse(JSON.stringify(getManifestItemsForDelivery(delivery)));
    const newLineNum = currentItems.length + 1;
    currentItems.push({
      line: newLineNum,
      ordered: '1',
      sku: 'SKU-NEW',
      description: 'Lumber & Building Material Item',
      units: 'EA',
      pricePer: '$15.00',
      extension: '$15.00'
    });

    setEditableManifests({
      ...editableManifests,
      [deliveryId]: currentItems
    });
  };

  const handleDeleteLine = (deliveryId: string, index: number) => {
    const delivery = deliveries.find(d => d.id === deliveryId);
    if (!delivery) return;

    const currentItems = JSON.parse(JSON.stringify(getManifestItemsForDelivery(delivery)));
    const updated = currentItems.filter((_: any, i: number) => i !== index).map((item: any, i: number) => ({ ...item, line: i + 1 }));

    setEditableManifests({
      ...editableManifests,
      [deliveryId]: updated
    });
  };

  const handleSaveManifest = (delivery: DeliveryRecord) => {
    const items = getManifestItemsForDelivery(delivery);
    const newTotalExt = items.reduce((acc, item) => {
      const ext = parseFloat(String(item.extension).replace(/[^0-9.]/g, ''));
      return acc + (isNaN(ext) ? 0 : ext);
    }, 0);

    const updatedDelivery: DeliveryRecord = {
      ...delivery,
      cargoManifest: items,
      orderTotal: `$${newTotalExt.toFixed(2)}`
    };

    if (onUpdateDelivery) {
      onUpdateDelivery(updatedDelivery);
    }
    setSuccessMsg(`Cargo manifest for Order #${delivery.invoiceNumber || delivery.id} saved successfully!`);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleCopyTsv = (delivery: DeliveryRecord) => {
    const items = getManifestItemsForDelivery(delivery);
    const headers = ['LINE', 'ORDERED', 'SKU', 'DESCRIPTION', 'UNITS', 'PRICE/PER', 'EXTENSION'];
    const rows = items.map(item => [
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
    setCopiedId(delivery.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const selectedTruckObj = trucks.find(t => t.id === selectedTruckId);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6 font-sans">
      
      {/* Header & Title Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 font-bold text-xs uppercase tracking-wider mb-1">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
            <span>Dispatcher Space &bull; Operational Reports</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center space-x-2.5">
            <Package className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <span>Cargo Manifest Report</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Detailed order breakdown, line item box quantities, pricing, and freight manifests for dispatch verification.
          </p>
        </div>

        {/* Filter Controls: Date & Truck */}
        <div className="flex flex-wrap items-center gap-3 bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase font-mono mb-1">
              Select Manifest Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-lg pl-8 pr-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase font-mono mb-1">
              Select Truck / Fleet Unit
            </label>
            <div className="relative">
              <TruckIcon className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <select
                value={selectedTruckId}
                onChange={(e) => setSelectedTruckId(e.target.value)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-lg pl-8 pr-4 py-1.5 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                {trucks.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.id}) • {t.driver || 'Unassigned'}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 p-4 rounded-xl text-xs font-bold flex items-center space-x-2 shadow-sm animate-fade-in">
          <Check className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Manifest Summary Banner */}
      <div className="bg-gradient-to-r from-blue-900 to-slate-900 text-white rounded-2xl p-5 shadow-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-white/10 rounded-xl backdrop-blur-md">
            <TruckIcon className="h-6 w-6 text-blue-300" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-blue-300 font-bold block">Active Fleet Manifest Assignment</span>
            <h3 className="text-base font-bold text-white">
              {selectedTruckObj ? selectedTruckObj.name : selectedTruckId} <span className="text-xs text-blue-200 font-mono font-normal">({selectedTruckId})</span>
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Assigned Driver: <strong className="text-white">{selectedTruckObj?.driver || 'Unassigned'}</strong> • Date: <strong className="text-white">{selectedDate}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-xs">
          <div>
            <span className="text-slate-300 block text-[10px] uppercase">Matching Orders</span>
            <strong className="text-white text-base font-mono">{matchingDeliveries.length}</strong>
          </div>
          <div className="border-l border-white/20 pl-4">
            <span className="text-slate-300 block text-[10px] uppercase">Total Cargo Value</span>
            <strong className="text-emerald-300 text-base font-mono">
              ${matchingDeliveries.reduce((sum, d) => {
                const val = parseFloat(String(d.orderTotal || '0').replace(/[^0-9.]/g, ''));
                return sum + (isNaN(val) ? 0 : val);
              }, 0).toFixed(2)}
            </strong>
          </div>
        </div>
      </div>

      {/* Orders & Cargo Manifest List */}
      {matchingDeliveries.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/60 rounded-full flex items-center justify-center mx-auto text-blue-600">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white text-base">No Orders Found for {selectedTruckObj?.name || selectedTruckId} on {selectedDate}</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            There are currently no freight delivery orders assigned to this truck for the selected date. You can assign deliveries on the <strong>Freight Board</strong> or select a different date or truck above.
          </p>
          {onSelectTab && (
            <button
              onClick={() => onSelectTab('queue')}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition cursor-pointer shadow-sm"
            >
              Go to Freight Board
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {matchingDeliveries.map((delivery, dIdx) => {
            const manifestItems = getManifestItemsForDelivery(delivery);
            const totalQty = manifestItems.reduce((acc, item) => acc + (parseFloat(String(item.ordered)) || 0), 0);
            const totalExt = manifestItems.reduce((acc, item) => acc + (parseFloat(String(item.extension).replace(/[^0-9.]/g, '')) || 0), 0);

            return (
              <div 
                key={delivery.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden"
              >
                {/* Order Header Info */}
                <div className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2.5">
                      <span className="bg-blue-600 text-white font-mono text-[10px] px-2.5 py-0.5 rounded-full font-bold">
                        Order #{delivery.invoiceNumber || delivery.epicorSalesOrder || delivery.id}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        delivery.status === 'Delivered' ? 'bg-emerald-100 text-emerald-800' :
                        delivery.status === 'In Transit' ? 'bg-blue-100 text-blue-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {delivery.status || 'REGISTERED'}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">ID: {delivery.id}</span>
                    </div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center space-x-2">
                      <span>{delivery.customerName || delivery.customer || 'Customer'}</span>
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 flex items-center space-x-1.5">
                      <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                      <span>{delivery.deliveryAddress || delivery.destination || 'Destination'}</span>
                    </p>
                  </div>

                  {/* Order meta & Action buttons */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-xl text-xs space-y-0.5">
                      <div className="text-[10px] text-slate-400 uppercase font-mono">Scheduled Slot</div>
                      <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1">
                        <Clock className="h-3 w-3 text-blue-500" />
                        <span>{delivery.scheduledSlot || 'Morning Dispatch'} ({delivery.scheduledDate || selectedDate})</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleSaveManifest(delivery)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer shadow-xs"
                      title="Save quantities and prices for this manifest"
                    >
                      <Save className="h-3.5 w-3.5" />
                      <span>Save Changes</span>
                    </button>

                    <button
                      onClick={() => handleCopyTsv(delivery)}
                      className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer"
                      title="Copy manifest data as TSV"
                    >
                      {copiedId === delivery.id ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedId === delivery.id ? 'Copied!' : 'Copy TSV'}</span>
                    </button>
                  </div>
                </div>

                {/* Detailed Item Box Information Table */}
                <div className="p-4 sm:p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider font-mono flex items-center space-x-1.5">
                      <Package className="h-4 w-4 text-amber-500" />
                      <span>Detailed Item Box Information & Cargo Lines ({manifestItems.length} items)</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => handleAddLine(delivery.id)}
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Cargo Line</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/80 text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                          <th className="py-2.5 px-3">Line</th>
                          <th className="py-2.5 px-3">Ordered Qty</th>
                          <th className="py-2.5 px-3">SKU</th>
                          <th className="py-2.5 px-3 min-w-[220px]">Description</th>
                          <th className="py-2.5 px-3">Units</th>
                          <th className="py-2.5 px-3">Price / Unit</th>
                          <th className="py-2.5 px-3">Extension</th>
                          <th className="py-2.5 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                        {manifestItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                            <td className="py-2 px-3 font-mono font-bold text-slate-500">{item.line || idx + 1}</td>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={item.ordered}
                                onChange={(e) => handleItemChange(delivery.id, idx, 'ordered', e.target.value)}
                                className="w-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={item.sku}
                                onChange={(e) => handleItemChange(delivery.id, idx, 'sku', e.target.value)}
                                className="w-24 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs font-mono text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={item.description}
                                onChange={(e) => handleItemChange(delivery.id, idx, 'description', e.target.value)}
                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs font-medium text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={item.units}
                                onChange={(e) => handleItemChange(delivery.id, idx, 'units', e.target.value)}
                                className="w-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs font-mono text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={item.pricePer}
                                onChange={(e) => handleItemChange(delivery.id, idx, 'pricePer', e.target.value)}
                                className="w-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs font-mono text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </td>
                            <td className="py-2 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              {item.extension}
                            </td>
                            <td className="py-2 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleDeleteLine(delivery.id, idx)}
                                className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950 text-rose-500 rounded transition"
                                title="Delete line"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary Footer for Order */}
                  <div className="flex flex-wrap items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                    <div>
                      <span>Total Manifest Items: <strong>{manifestItems.length}</strong></span> • <span>Total Ordered Qty: <strong>{totalQty}</strong></span>
                    </div>
                    <div className="text-right">
                      <span className="mr-2">Order Extension Total:</span>
                      <strong className="text-sm font-mono text-slate-900 dark:text-white">${totalExt.toFixed(2)}</strong>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
