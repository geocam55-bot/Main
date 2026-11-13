import React, { useState } from 'react';
import {
  Package,
  Printer,
  Copy,
  Check,
  Calendar,
  Truck as TruckIcon,
  MapPin,
  Plus,
  Trash2,
  Save,
  Clock,
  AlertCircle,
  Download,
  UserCheck
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DeliveryRecord, DeliveryStatus, Truck, Branch, User, CargoManifestItem } from '../types';

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
  users,
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
    const dDate = (d.scheduledDate || d.registeredAt || '').split('T')[0];
    const matchDate = dDate === selectedDate || !dDate; // fallback if date not set

    const tId = String(d.assignedTruck || '').trim().toLowerCase();
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

    const currentItems: CargoManifestItem[] = JSON.parse(JSON.stringify(getManifestItemsForDelivery(delivery)));
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

    const currentItems: CargoManifestItem[] = JSON.parse(JSON.stringify(getManifestItemsForDelivery(delivery)));
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

    const currentItems: CargoManifestItem[] = JSON.parse(JSON.stringify(getManifestItemsForDelivery(delivery)));
    const updated = currentItems
      .filter((_, i) => i !== index)
      .map((item, i) => ({ ...item, line: i + 1 }));

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

  const getOrderPickerName = (delivery: DeliveryRecord): string => {
    const rawPicker = (delivery.assignedPicker || (delivery as any).pickerName || (delivery as any).picker || '').trim();
    if (!rawPicker) return 'Unassigned';
    const matchedUser = users.find(u => u.id === rawPicker || u.name === rawPicker);
    return matchedUser ? matchedUser.name : rawPicker;
  };

  const generatePdfForDeliveries = (targetDeliveries: DeliveryRecord[], filename: string) => {
    if (targetDeliveries.length === 0) return;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    targetDeliveries.forEach((delivery, idx) => {
      if (idx > 0) {
        doc.addPage();
      }

      const items = getManifestItemsForDelivery(delivery);
      const totalUnits = items.reduce((acc, item) => {
        const qty = parseFloat(String(item.ordered).replace(/[^0-9.]/g, ''));
        return acc + (isNaN(qty) ? 0 : qty);
      }, 0);
      const totalExtVal = items.reduce((acc, item) => {
        const ext = parseFloat(String(item.extension).replace(/[^0-9.]/g, ''));
        return acc + (isNaN(ext) ? 0 : ext);
      }, 0);

      // Header banner
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageWidth, 68, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('PROSPACES LOGISTICS - CARGO MANIFEST REPORT', 36, 30);
      doc.setFont('courier', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `TRUCK: ${selectedTruckObj?.name || selectedTruckId}  |  DATE: ${selectedDate}  |  ORDER: ${delivery.invoiceNumber || delivery.epicorSalesOrder || delivery.id}`,
        36,
        50
      );

      // Metadata block
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      let y = 92;
      doc.text('Customer:', 36, y);
      doc.setFont('helvetica', 'normal');
      doc.text(String(delivery.customerName || 'N/A'), 105, y);

      doc.setFont('helvetica', 'bold');
      doc.text('Manifest Date:', 330, y);
      doc.setFont('helvetica', 'normal');
      doc.text(selectedDate, 415, y);

      y += 16;
      doc.setFont('helvetica', 'bold');
      doc.text('Destination:', 36, y);
      doc.setFont('helvetica', 'normal');
      doc.text(String(delivery.deliveryAddress || 'N/A').slice(0, 42), 105, y);

      doc.setFont('helvetica', 'bold');
      doc.text('Scheduled Slot:', 330, y);
      doc.setFont('helvetica', 'normal');
      doc.text(String(delivery.scheduledSlot || 'Morning Dispatch'), 415, y);

      y += 16;
      doc.setFont('helvetica', 'bold');
      doc.text('Assigned Truck:', 36, y);
      doc.setFont('helvetica', 'normal');
      doc.text(String(selectedTruckObj?.name || selectedTruckId), 115, y);

      doc.setFont('helvetica', 'bold');
      doc.text('Driver:', 330, y);
      doc.setFont('helvetica', 'normal');
      doc.text(String(selectedTruckObj?.driver || 'Unassigned'), 415, y);

      y += 16;
      doc.setFont('helvetica', 'bold');
      doc.text('Picker:', 36, y);
      doc.setFont('helvetica', 'normal');
      doc.text(getOrderPickerName(delivery), 105, y);

      autoTable(doc, {
        startY: y + 18,
        margin: { left: 36, right: 36 },
        head: [['LINE', 'QTY', 'SKU', 'DESCRIPTION', 'UNITS', 'PRICE/UNIT', 'EXTENSION']],
        body: [
          ...items.map(item => [
            String(item.line || ''),
            String(item.ordered || ''),
            String(item.sku || ''),
            String(item.description || ''),
            String(item.units || ''),
            String(item.pricePer || ''),
            String(item.extension || '')
          ]),
          [
            '',
            String(totalUnits > 0 ? totalUnits : ''),
            '',
            'TOTALS:',
            '',
            '',
            `$${totalExtVal.toFixed(2)}`
          ]
        ],
        styles: {
          fontSize: 8.5,
          cellPadding: 5,
          textColor: [15, 23, 42]
        },
        headStyles: {
          fillColor: [241, 245, 249],
          textColor: [15, 23, 42],
          fontStyle: 'bold'
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 36 },
          1: { halign: 'right', cellWidth: 42 },
          2: { cellWidth: 75 },
          4: { halign: 'center', cellWidth: 46 },
          5: { halign: 'right', cellWidth: 65 },
          6: { halign: 'right', cellWidth: 72, fontStyle: 'bold' }
        },
        didParseCell: (hookData) => {
          if (hookData.row.index === items.length) {
            hookData.cell.styles.fontStyle = 'bold';
            hookData.cell.styles.fillColor = [248, 250, 252];
          }
        }
      });

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('PROSPACES LOGISTICS CARGO MANIFEST REPORT', 36, pageHeight - 28);
      doc.text(
        `Generated: ${new Date().toLocaleString()} | Page ${idx + 1} of ${targetDeliveries.length}`,
        pageWidth - 36,
        pageHeight - 28,
        { align: 'right' }
      );
    });

    doc.save(filename);
  };

  const printHtmlViaIframe = (html: string) => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const frameDoc = iframe.contentWindow?.document;
    if (!frameDoc) {
      document.body.removeChild(iframe);
      return;
    }

    frameDoc.open();
    frameDoc.write(html);
    frameDoc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } finally {
        setTimeout(() => {
          if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
          }
        }, 1000);
      }
    }, 250);
  };

  const buildManifestPrintSection = (delivery: DeliveryRecord) => {
    const items = getManifestItemsForDelivery(delivery);
    const totalUnits = items.reduce((acc, item) => {
      const qty = parseFloat(String(item.ordered).replace(/[^0-9.]/g, ''));
      return acc + (isNaN(qty) ? 0 : qty);
    }, 0);
    const totalExtVal = items.reduce((acc, item) => {
      const ext = parseFloat(String(item.extension).replace(/[^0-9.]/g, ''));
      return acc + (isNaN(ext) ? 0 : ext);
    }, 0);

    return `
      <div class="manifest-page">
        <div class="header">
          <h1 class="title">PROSPACES LOGISTICS - CARGO MANIFEST REPORT</h1>
          <div class="subtitle">FLEET TRUCK: ${selectedTruckObj?.name || selectedTruckId} &bull; DATE: ${selectedDate} &bull; ORDER ID: ${delivery.id}</div>
        </div>

        <div class="meta-grid">
          <div class="meta-item"><strong>Customer Name:</strong> ${delivery.customerName || 'N/A'}</div>
          <div class="meta-item"><strong>Manifest Date:</strong> ${selectedDate}</div>
          <div class="meta-item"><strong>Delivery Address:</strong> ${delivery.deliveryAddress || 'N/A'}</div>
          <div class="meta-item"><strong>Scheduled Slot:</strong> ${delivery.scheduledSlot || 'Morning Dispatch'}</div>
          <div class="meta-item"><strong>Assigned Truck:</strong> ${selectedTruckObj?.name || selectedTruckId}</div>
          <div class="meta-item"><strong>Assigned Driver:</strong> ${selectedTruckObj?.driver || 'Unassigned'}</div>
          <div class="meta-item"><strong>Assigned Picker:</strong> ${getOrderPickerName(delivery)}</div>
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
            ${items.map(item => `
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
              <td class="text-right font-mono" style="color: #047857; font-size: 12px;">$${totalExtVal > 0 ? totalExtVal.toFixed(2) : '0.00'}</td>
            </tr>
          </tbody>
        </table>

        <div class="footer">
          <span>PROSPACES LOGISTICS CARGO MANIFEST REPORT</span>
          <span>Generated: ${new Date().toLocaleString()}</span>
        </div>
      </div>
    `;
  };

  const handlePrintDeliveries = (targetDeliveries: DeliveryRecord[], title: string) => {
    if (targetDeliveries.length === 0) return;
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #0f172a; }
            .manifest-page { page-break-after: always; margin-bottom: 32px; }
            .manifest-page:last-child { page-break-after: auto; }
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
          ${targetDeliveries.map(d => buildManifestPrintSection(d)).join('')}
        </body>
      </html>
    `;
    printHtmlViaIframe(html);
  };

  const handlePrintManifest = (delivery: DeliveryRecord) => {
    handlePrintDeliveries([delivery], `Cargo Manifest Report - ${delivery.id}`);
  };

  const handleDownloadPdfManifest = (delivery: DeliveryRecord) => {
    const orderRef = delivery.invoiceNumber || delivery.epicorSalesOrder || delivery.id;
    generatePdfForDeliveries([delivery], `Cargo_Manifest_${selectedDate}_${orderRef}.pdf`);
  };

  const handleDownloadAllPdf = () => {
    if (matchingDeliveries.length === 0) return;
    generatePdfForDeliveries(matchingDeliveries, `Cargo_Manifest_${selectedDate}_${selectedTruckId}.pdf`);
  };

  const handlePrintAll = () => {
    if (matchingDeliveries.length === 0) return;
    handlePrintDeliveries(matchingDeliveries, `Cargo Manifest Report - ${selectedTruckId} - ${selectedDate}`);
  };

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

        <div className="flex items-center space-x-4">
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

          {matchingDeliveries.length > 0 && (
            <div className="flex items-center space-x-2">
              <button
                onClick={handleDownloadAllPdf}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-3 rounded-xl text-xs flex items-center space-x-2 transition shadow-md cursor-pointer"
                title="Download Cargo Manifest Report as PDF"
              >
                <Download className="h-4 w-4" />
                <span>Download PDF</span>
              </button>
              <button
                onClick={handlePrintAll}
                className="bg-white/15 hover:bg-white/25 text-white font-bold px-4 py-3 rounded-xl text-xs flex items-center space-x-2 transition border border-white/20 cursor-pointer"
                title="Print all matching Cargo Manifests"
              >
                <Printer className="h-4 w-4" />
                <span>Print All</span>
              </button>
            </div>
          )}
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
          {matchingDeliveries.map((delivery) => {
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
                        delivery.status === DeliveryStatus.DELIVERED ? 'bg-emerald-100 text-emerald-800' :
                        delivery.status === DeliveryStatus.PICKED_AND_LOADED ? 'bg-blue-100 text-blue-800' :
                        delivery.status === DeliveryStatus.RETURNED ? 'bg-rose-100 text-rose-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {delivery.status || DeliveryStatus.REGISTERED}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">ID: {delivery.id}</span>
                    </div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center space-x-2">
                      <span>{delivery.customerName || 'Customer'}</span>
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 flex items-center space-x-1.5">
                      <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                      <span>{delivery.deliveryAddress || 'Destination'}</span>
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

                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-xl text-xs space-y-0.5">
                      <div className="text-[10px] text-slate-400 uppercase font-mono">Assigned Picker</div>
                      <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1">
                        <UserCheck className="h-3 w-3 text-emerald-500" />
                        <span>{getOrderPickerName(delivery)}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDownloadPdfManifest(delivery)}
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer shadow-xs"
                      title="Download PDF of this order manifest"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download PDF</span>
                    </button>

                    <button
                      onClick={() => handlePrintManifest(delivery)}
                      className="bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer shadow-xs"
                      title="Print this order manifest"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      <span>Print</span>
                    </button>

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
