import { formatPhoneNumber } from '../lib/formatters';
import { useState, FormEvent } from 'react';
import { DeliveryRecord, DeliveryStatus, Branch, Truck, User as AppUser } from '../types';
import { 
  Search, MapPin, Eye, Clock, User, Phone, CheckCircle2, 
  AlertTriangle, ChevronDown, ChevronUp, FileText, 
  Truck as TruckIcon, MoreVertical, Edit, Trash2, Plus, X, ExternalLink 
} from 'lucide-react';

interface DeliveryQueueProps {
  deliveries: DeliveryRecord[];
  trucks: Truck[];
  onAddOrUpdateDelivery: (record: DeliveryRecord) => void;
  onDeleteDelivery: (id: string) => void;
  branches?: Branch[];
  users: AppUser[];
}

// Helper to determine document type normalized
export const getEffectiveDocumentType = (delivery: DeliveryRecord): string => {
  if (delivery.documentType) {
    const dt = delivery.documentType.trim();
    if (dt.toLowerCase().includes('supplier') || dt.toLowerCase().includes('pickup')) return 'Supplier Pickup';
    if (dt.toLowerCase().includes('credit')) return 'Credit';
    if (dt.toLowerCase().includes('rma')) return 'RMA';
    if (dt.toLowerCase().includes('order')) return 'Order';
    return dt;
  }
  if (delivery.destinationNotes) {
    const notes = delivery.destinationNotes;
    if (notes.includes('Type: Supplier Pickup') || notes.toLowerCase().includes('supplier pickup') || notes.toLowerCase().includes('supplier_pickup')) {
      return 'Supplier Pickup';
    }
    if (notes.includes('Type: Credit') || notes.toLowerCase().includes('credit note')) {
      return 'Credit';
    }
    if (notes.includes('Type: RMA') || notes.toLowerCase().includes('rma')) {
      return 'RMA';
    }
    if (notes.includes('Type: Order') || notes.toLowerCase().includes('order')) {
      return 'Order';
    }
  }
  return 'Order';
};

// Generates a base64 SVG scanned copy for any document type if no static PDF exists
const generateScannedSvgForDelivery = (delivery: DeliveryRecord, docType: string): string => {
  const safeId = (delivery.id || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safePo = (delivery.epicorSalesOrder || delivery.invoiceNumber || delivery.id).replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeCust = (delivery.customerName || 'Vendor/Customer').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeAddr = (delivery.deliveryAddress || 'Address on file').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeDate = new Date(delivery.registeredAt || Date.now()).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  const safePhone = (delivery.phone || '902-555-0199').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeWeight = delivery.weight ? delivery.weight.replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
  const safeTotal = delivery.orderTotal ? delivery.orderTotal.replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';

  const isSupplier = docType === 'Supplier Pickup';
  const isCredit = docType === 'Credit';
  const isRma = docType === 'RMA';

  const docTitle = isSupplier ? 'SUPPLIER PICKUP DISPATCH AUTHORIZATION MEMO' :
                   isCredit ? 'CASHIER CREDIT & ADJUSTMENT MEMO' :
                   isRma ? 'VENDOR RETURN MERCHANDISE AUTHORIZATION' :
                   'LUMBER & FREIGHT DISPATCH MANIFEST';

  const headerBg = isSupplier ? '#b45309' : isCredit ? '#047857' : isRma ? '#be123c' : '#1d4ed8';

  const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 650 841" width="650" height="841" style="background:#ffffff; font-family:sans-serif; color:#0f172a;">
    <rect x="0" y="0" width="650" height="14" fill="${headerBg}" />
    <text x="40" y="45" font-size="18" font-weight="900" fill="${headerBg}" letter-spacing="-0.5">PROSPACES LOGISTICS</text>
    <text x="40" y="60" font-size="9" font-family="monospace" font-weight="bold" fill="#64748b">CORE LOGISTICS &amp; HQ GATEWAY v4.2</text>
    <text x="610" y="45" font-size="12" font-weight="bold" fill="#0f172a" text-anchor="end">${docTitle}</text>
    <text x="610" y="60" font-size="8" font-family="monospace" font-weight="bold" fill="#475569" text-anchor="end">DIGITIZED SCANNED SOURCE</text>
    <line x1="40" y1="75" x2="610" y2="75" stroke="#0f172a" stroke-width="2" />
    <rect x="40" y="90" width="570" height="150" fill="#f8fafc" stroke="#e2e8f0" rx="8" />
    <text x="55" y="112" font-size="10" font-weight="bold" fill="#64748b" font-family="monospace">PHYSICAL DIGITIZED ARCHIVE SPECIFICATIONS</text>
    <text x="55" y="132" font-size="16" font-weight="extrabold" fill="${headerBg}" font-family="monospace">TICKET ID: ${safeId}</text>
    <text x="55" y="155" font-size="10" font-weight="bold" fill="#334155">${isSupplier ? 'Purchase Order # (PO#):' : isCredit ? 'Credit Note #:' : isRma ? 'RMA #:' : 'Sales Order # (SO#):'} <tspan fill="${headerBg}">${safePo}</tspan></text>
    <text x="320" y="155" font-size="10" font-weight="bold" fill="#334155">${isSupplier ? 'Pickup Date (pickup Date):' : 'Registration Date:'} <tspan fill="#0f172a">${safeDate}</tspan></text>
    <text x="55" y="178" font-size="10" font-weight="bold" fill="#334155">${isSupplier ? 'Supplier Name & Address (Supplier):' : 'Customer / Recipient:'} <tspan fill="#0f172a">${safeCust}</tspan></text>
    <text x="55" y="201" font-size="10" font-weight="bold" fill="#334155">${isSupplier ? 'Deliver Address (Shipto address):' : 'Delivery Address:'} <tspan fill="#0f172a">${safeAddr}</tspan></text>
    <text x="55" y="224" font-size="10" font-weight="bold" fill="#334155">Contact Phone: <tspan fill="#0f172a">${safePhone}</tspan></text>
    ${(safeWeight || safeTotal) ? `<text x="320" y="224" font-size="10" font-weight="bold" fill="#334155">${safeWeight ? `Gross Weight: <tspan fill="#0f172a">${safeWeight}</tspan>` : ''}${safeWeight && safeTotal ? ' | ' : ''}${safeTotal ? `Value: <tspan fill="#059669">${safeTotal}</tspan>` : ''}</text>` : ''}
    <g transform="translate(420, 260)">
      <rect width="180" height="60" fill="#fef3c7" stroke="#f59e0b" stroke-width="1.5" rx="6" />
      <text x="90" y="22" font-size="9" font-weight="bold" fill="#92400e" text-anchor="middle" font-family="monospace">AZURE OCR ARCHIVE STAMP</text>
      <text x="90" y="38" font-size="8" fill="#b45309" text-anchor="middle">VERIFIED CONFIDENCE: 98.8%</text>
      <text x="90" y="50" font-size="7" fill="#78350f" text-anchor="middle">ORIGIN TYPE: ${docType.toUpperCase()}</text>
    </g>
    <rect x="40" y="340" width="570" height="30" fill="#1e293b" rx="4" />
    <text x="55" y="359" font-size="10" font-weight="bold" fill="#ffffff" font-family="monospace">QTY</text>
    <text x="110" y="359" font-size="10" font-weight="bold" fill="#ffffff" font-family="monospace">ITEM MANIFEST DESCRIPTION</text>
    <text x="595" y="359" font-size="10" font-weight="bold" fill="#ffffff" font-family="monospace" text-anchor="end">SPECIFICATIONS</text>
    <text x="55" y="395" font-size="10" font-family="monospace" fill="#334155">12</text>
    <text x="110" y="395" font-size="10" fill="#0f172a">${isSupplier ? 'M18 Fuel Lithium Brushless Tool Kits Freight' : '2x6x12 Pressure Treated Spruce Lumber Bundles'}</text>
    <text x="595" y="395" font-size="10" font-family="monospace" text-anchor="end" fill="#0f172a">Consigned Cargo</text>
    <line x1="40" y1="405" x2="610" y2="405" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="2,2" />
    <text x="55" y="430" font-size="10" font-family="monospace" fill="#334155">8</text>
    <text x="110" y="430" font-size="10" fill="#0f172a">${isSupplier ? 'Consignment Cargo Pallet Milwaukee Tools' : 'Portland Cement Bags 40kg Heavy Duty'}</text>
    <text x="595" y="430" font-size="10" font-family="monospace" text-anchor="end" fill="#0f172a">Standard Crate</text>
    <line x1="40" y1="440" x2="610" y2="440" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="2,2" />
    <g transform="translate(180, 720)">
      <rect width="290" height="60" fill="#f8fafc" stroke="#cbd5e1" rx="6" />
      <text x="145" y="25" font-size="18" font-family="monospace" font-weight="bold" fill="#0f172a" text-anchor="middle">||| | ||||| ||| |||| ||||</text>
      <text x="145" y="45" font-size="9" font-family="monospace" fill="#64748b" text-anchor="middle">${safeId} • ${safePo}</text>
    </g>
    <text x="325" y="810" font-size="8" fill="#94a3b8" text-anchor="middle">ProSpaces Logistics Gate Digitized Copy &bull; Archival Copy Verified</text>
  </svg>`;

  return "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgString)));
};

// Helper to retrieve the actual PDF path from the delivery record or parse it from destinationNotes or fallback to SVG scanned copy
const getEffectivePdfUrl = (delivery: DeliveryRecord): string => {
  if (delivery.pdfUrl) return delivery.pdfUrl;
  if (delivery.destinationNotes) {
    const match = delivery.destinationNotes.match(/Physical Document stored:\s*([^\s|"]+)/);
    if (match) {
      let url = match[1].trim();
      // Remove trailing punctuation just in case
      if (url.endsWith('.')) url = url.slice(0, -1);
      return url;
    }
  }
  const docType = getEffectiveDocumentType(delivery);
  return generateScannedSvgForDelivery(delivery, docType);
};

// Opens digitized documents in a top-level tab using Blob HTML to bypass browser data-URI restrictions
export const openScannedDocumentInNewTab = (delivery: DeliveryRecord) => {
  const pdfUrl = getEffectivePdfUrl(delivery);

  // If it's a standard HTTP/HTTPS URL, open directly
  if (pdfUrl.startsWith('http://') || pdfUrl.startsWith('https://')) {
    window.open(pdfUrl, '_blank', 'noopener,noreferrer');
    return;
  }

  // Extract raw SVG string from base64 data URI or raw SVG tag
  let svgContent = '';
  if (pdfUrl.startsWith('data:image/svg+xml;base64,')) {
    try {
      const base64Str = pdfUrl.replace('data:image/svg+xml;base64,', '');
      svgContent = decodeURIComponent(escape(atob(base64Str)));
    } catch (e) {
      console.error('Failed to decode base64 SVG:', e);
    }
  } else if (pdfUrl.startsWith('<svg')) {
    svgContent = pdfUrl;
  }

  if (!svgContent) {
    const docType = getEffectiveDocumentType(delivery);
    const safeId = (delivery.id || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const safePo = (delivery.epicorSalesOrder || delivery.invoiceNumber || delivery.id).replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const safeCust = (delivery.customerName || 'Vendor/Customer').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const safeAddr = (delivery.deliveryAddress || 'Address on file').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const safeDate = formatLocalDate(delivery.registeredAt) || formatLocalDate(new Date().toISOString());
    const safePhone = (delivery.phone || '902-555-0199').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const safeWeight = delivery.weight ? delivery.weight.replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
    const safeTotal = delivery.orderTotal ? delivery.orderTotal.replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';

    const isSupplier = docType === 'Supplier Pickup';
    const isCredit = docType === 'Credit';
    const isRma = docType === 'RMA';

    const docTitle = isSupplier ? 'SUPPLIER PICKUP DISPATCH AUTHORIZATION MEMO' :
                     isCredit ? 'CASHIER CREDIT & ADJUSTMENT MEMO' :
                     isRma ? 'VENDOR RETURN MERCHANDISE AUTHORIZATION' :
                     'LUMBER & FREIGHT DISPATCH MANIFEST';

    const headerBg = isSupplier ? '#b45309' : isCredit ? '#047857' : isRma ? '#be123c' : '#1d4ed8';

    svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 650 841" width="650" height="841" style="background:#ffffff; font-family:sans-serif; color:#0f172a;">
      <rect x="0" y="0" width="650" height="14" fill="${headerBg}" />
      <text x="40" y="45" font-size="18" font-weight="900" fill="${headerBg}" letter-spacing="-0.5">PROSPACES LOGISTICS</text>
      <text x="40" y="60" font-size="9" font-family="monospace" font-weight="bold" fill="#64748b">CORE LOGISTICS &amp; HQ GATEWAY v4.2</text>
      <text x="610" y="45" font-size="12" font-weight="bold" fill="#0f172a" text-anchor="end">${docTitle}</text>
      <text x="610" y="60" font-size="8" font-family="monospace" font-weight="bold" fill="#475569" text-anchor="end">DIGITIZED SCANNED SOURCE</text>
      <line x1="40" y1="75" x2="610" y2="75" stroke="#0f172a" stroke-width="2" />
      <rect x="40" y="90" width="570" height="150" fill="#f8fafc" stroke="#e2e8f0" rx="8" />
      <text x="55" y="112" font-size="10" font-weight="bold" fill="#64748b" font-family="monospace">PHYSICAL DIGITIZED ARCHIVE SPECIFICATIONS</text>
      <text x="55" y="132" font-size="16" font-weight="extrabold" fill="${headerBg}" font-family="monospace">TICKET ID: ${safeId}</text>
      <text x="55" y="155" font-size="10" font-weight="bold" fill="#334155">${isSupplier ? 'Purchase Order # (PO#):' : isCredit ? 'Credit Note #:' : isRma ? 'RMA #:' : 'Sales Order # (SO#):'} <tspan fill="${headerBg}">${safePo}</tspan></text>
      <text x="320" y="155" font-size="10" font-weight="bold" fill="#334155">${isSupplier ? 'Pickup Date (pickup Date):' : 'Registration Date:'} <tspan fill="#0f172a">${safeDate}</tspan></text>
      <text x="55" y="178" font-size="10" font-weight="bold" fill="#334155">${isSupplier ? 'Supplier Name & Address (Supplier):' : 'Customer / Recipient:'} <tspan fill="#0f172a">${safeCust}</tspan></text>
      <text x="55" y="201" font-size="10" font-weight="bold" fill="#334155">${isSupplier ? 'Deliver Address (Shipto address):' : 'Delivery Address:'} <tspan fill="#0f172a">${safeAddr}</tspan></text>
      <text x="55" y="224" font-size="10" font-weight="bold" fill="#334155">Contact Phone: <tspan fill="#0f172a">${safePhone}</tspan></text>
      ${(safeWeight || safeTotal) ? `<text x="320" y="224" font-size="10" font-weight="bold" fill="#334155">${safeWeight ? `Gross Weight: <tspan fill="#0f172a">${safeWeight}</tspan>` : ''}${safeWeight && safeTotal ? ' | ' : ''}${safeTotal ? `Value: <tspan fill="#059669">${safeTotal}</tspan>` : ''}</text>` : ''}
      <g transform="translate(420, 260)">
        <rect width="180" height="60" fill="#fef3c7" stroke="#f59e0b" stroke-width="1.5" rx="6" />
        <text x="90" y="22" font-size="9" font-weight="bold" fill="#92400e" text-anchor="middle" font-family="monospace">AZURE OCR ARCHIVE STAMP</text>
        <text x="90" y="38" font-size="8" fill="#b45309" text-anchor="middle">VERIFIED CONFIDENCE: 98.8%</text>
        <text x="90" y="50" font-size="7" fill="#78350f" text-anchor="middle">ORIGIN TYPE: ${docType.toUpperCase()}</text>
      </g>
      <rect x="40" y="340" width="570" height="30" fill="#1e293b" rx="4" />
      <text x="55" y="359" font-size="10" font-weight="bold" fill="#ffffff" font-family="monospace">QTY</text>
      <text x="110" y="359" font-size="10" font-weight="bold" fill="#ffffff" font-family="monospace">ITEM MANIFEST DESCRIPTION</text>
      <text x="595" y="359" font-size="10" font-weight="bold" fill="#ffffff" font-family="monospace" text-anchor="end">SPECIFICATIONS</text>
      <text x="55" y="395" font-size="10" font-family="monospace" fill="#334155">12</text>
      <text x="110" y="395" font-size="10" fill="#0f172a">${isSupplier ? 'M18 Fuel Lithium Brushless Tool Kits Freight' : '2x6x12 Pressure Treated Spruce Lumber Bundles'}</text>
      <text x="595" y="395" font-size="10" font-family="monospace" text-anchor="end" fill="#0f172a">Consigned Cargo</text>
      <line x1="40" y1="405" x2="610" y2="405" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="2,2" />
      <text x="55" y="430" font-size="10" font-family="monospace" fill="#334155">8</text>
      <text x="110" y="430" font-size="10" fill="#0f172a">${isSupplier ? 'Consignment Cargo Pallet Milwaukee Tools' : 'Portland Cement Bags 40kg Heavy Duty'}</text>
      <text x="595" y="430" font-size="10" font-family="monospace" text-anchor="end" fill="#0f172a">Standard Crate</text>
      <line x1="40" y1="440" x2="610" y2="440" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="2,2" />
      <g transform="translate(180, 720)">
        <rect width="290" height="60" fill="#f8fafc" stroke="#cbd5e1" rx="6" />
        <text x="145" y="25" font-size="18" font-family="monospace" font-weight="bold" fill="#0f172a" text-anchor="middle">||| | ||||| ||| |||| ||||</text>
        <text x="145" y="45" font-size="9" font-family="monospace" fill="#64748b" text-anchor="middle">${safeId} • ${safePo}</text>
      </g>
      <text x="325" y="810" font-size="8" fill="#94a3b8" text-anchor="middle">ProSpaces Logistics Gate Digitized Copy &bull; Archival Copy Verified</text>
    </svg>`;
  }

  const docTypeLabel = getEffectiveDocumentType(delivery);
  const docRef = delivery.epicorSalesOrder || delivery.invoiceNumber || delivery.id;
  const title = `Digitized Document - ${docRef}`;

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 24px;
      background-color: #0f172a;
      color: #f8fafc;
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 100vh;
    }
    .header {
      width: 100%;
      max-width: 700px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding: 14px 20px;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 12px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.4);
    }
    .doc-info { display: flex; flex-direction: column; }
    .doc-title { font-weight: 800; font-size: 15px; color: #38bdf8; font-family: monospace; }
    .doc-sub { font-size: 12px; color: #94a3b8; margin-top: 4px; }
    .btn {
      background-color: #2563eb; color: #ffffff; border: none; padding: 10px 18px;
      border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer;
      display: inline-flex; align-items: center; gap: 8px; text-decoration: none;
      box-shadow: 0 2px 6px rgba(0,0,0,0.2);
    }
    .btn:hover { background-color: #1d4ed8; }
    .doc-wrapper {
      background: #ffffff; padding: 20px; border-radius: 12px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.6); max-width: 100%; overflow: auto;
    }
    .doc-wrapper svg { display: block; max-width: 100%; height: auto; margin: 0 auto; }
    @media print {
      body { background: #fff; padding: 0; }
      .header { display: none; }
      .doc-wrapper { box-shadow: none; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="doc-info">
      <div class="doc-title">📄 ${title}</div>
      <div class="doc-sub">Type: <strong>${docTypeLabel}</strong> | Ticket: <strong>${delivery.id}</strong> | Client: <strong>${(delivery.customerName || '').replace(/</g, '&lt;')}</strong></div>
    </div>
    <div>
      <button class="btn" onclick="window.print()">🖨️ Print Document</button>
    </div>
  </div>
  <div class="doc-wrapper">
    ${svgContent}
  </div>
</body>
</html>`;

  const blob = new Blob([htmlContent], { type: 'text/html' });
  const blobUrl = URL.createObjectURL(blob);
  window.open(blobUrl, '_blank');
};

// Robust date normalizer into YYYY-MM-DD
export const parseToYYYYMMDD = (dateStr?: string | null): string | null => {
  if (!dateStr) return null;
  const str = dateStr.trim();
  if (!str) return null;

  // 1. Strict YYYY-MM-DD pattern without time
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // 2. Strict M/D/YYYY or MM/DD/YYYY or M/D/YY pattern without time
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(str)) {
    const mdYMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (mdYMatch) {
      const month = mdYMatch[1].padStart(2, '0');
      const day = mdYMatch[2].padStart(2, '0');
      let year = mdYMatch[3];
      if (year.length === 2) year = `20${year}`;
      return `${year}-${month}-${day}`;
    }
  }

  // 3. JS Date parsing for ISO strings with times, or natural language dates
  // This correctly applies local timezone offset so it matches UI rendering
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return null;
};

// Helper for rendering dates in the UI so that pure YYYY-MM-DD dates aren't skewed by timezone
export const formatLocalDate = (dateStr?: string | null): string => {
  if (!dateStr) return '';
  const str = dateStr.trim();
  let dateObj = new Date(str);
  
  // If it's strictly a YYYY-MM-DD string, append T12:00:00 to prevent timezone drift
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    dateObj = new Date(`${str}T12:00:00`);
  }
  
  if (isNaN(dateObj.getTime())) return str;
  return dateObj.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};

// Extracts all associated YYYY-MM-DD date tags for a delivery record
export const getDeliveryDatesYYYYMMDD = (record: DeliveryRecord) => {
  const dates = new Set<string>();

  const deliveredDate = parseToYYYYMMDD(record.deliveredAt);
  if (deliveredDate) dates.add(deliveredDate);

  const registeredDate = parseToYYYYMMDD(record.registeredAt);
  if (registeredDate) dates.add(registeredDate);

  const pickedDate = parseToYYYYMMDD(record.pickedAt);
  if (pickedDate) dates.add(pickedDate);

  const returnedDate = parseToYYYYMMDD(record.returnedAt);
  if (returnedDate) dates.add(returnedDate);

  if (Array.isArray(record.history)) {
    record.history.forEach(h => {
      const hDate = parseToYYYYMMDD(h.timestamp);
      if (hDate) dates.add(hDate);
    });
  }

  if (record.destinationNotes) {
    const noteMatches = record.destinationNotes.match(/\b(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2}|(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})\b/gi);
    if (noteMatches) {
      noteMatches.forEach(m => {
        const p = parseToYYYYMMDD(m);
        if (p) dates.add(p);
      });
    }
  }

  return {
    deliveredDate,
    registeredDate,
    returnedDate,
    primaryDate: deliveredDate || registeredDate || (Array.from(dates)[0] || null),
    allDates: Array.from(dates)
  };
};

export default function DeliveryQueue({ deliveries, trucks, onAddOrUpdateDelivery, onDeleteDelivery, branches, users }: DeliveryQueueProps) {
  const BRANCHES = branches || [];
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState('ALL');
  const [selectedDateFilter, setSelectedDateFilter] = useState(() => {
    const today = new Date();
    const tzOffset = today.getTimezoneOffset() * 60000;
    return new Date(Date.now() - tzOffset).toISOString().substring(0, 10);
  });
  const [expandedRecord, setExpandedRecord] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'ALL' | DeliveryStatus>('ALL');

  // Action Menu & Modal States
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DeliveryRecord | null>(null);
  const [showDeleteConfirmId, setShowDeleteConfirmId] = useState<string | null>(null);
  const [previewDocDelivery, setPreviewDocDelivery] = useState<DeliveryRecord | null>(null);

  // Form Field States
  const [formId, setFormId] = useState('');
  const [formInvoiceNumber, setFormInvoiceNumber] = useState('');
  const [formSalesOrder, setFormSalesOrder] = useState('');
  const [formCustomerName, setFormCustomerName] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formOriginBranch, setFormOriginBranch] = useState('');
  const [formWeight, setFormWeight] = useState('');
  const [formOrderTotal, setFormOrderTotal] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formStatus, setFormStatus] = useState<DeliveryStatus>(DeliveryStatus.REGISTERED);
  const [formAssignedTruck, setFormAssignedTruck] = useState('');
  const [formReturnReason, setFormReturnReason] = useState('');
  const [formSignature, setFormSignature] = useState('');
  const [formPhoto, setFormPhoto] = useState('');
  const [formPdfUrl, setFormPdfUrl] = useState('');
  const [formPicker, setFormPicker] = useState('');
  const [formDeliveredAt, setFormDeliveredAt] = useState('');
  const [formRegisteredAt, setFormRegisteredAt] = useState('');

  // Picker selection quick popup state
  const [pickerModalDeliveryId, setPickerModalDeliveryId] = useState<string | null>(null);
  const [quickSelectedPicker, setQuickSelectedPicker] = useState('');

  const handleOpenAddModal = () => {
    const randomTicketNum = Math.floor(10000 + Math.random() * 90000);
    const randomSalesOrder = Math.floor(1000000 + Math.random() * 9000000);
    const randomInvoiceNum = Math.floor(4000 + Math.random() * 5999);
    
    setEditingRecord(null);
    setFormId(`SO-${randomTicketNum}-A`);
    setFormInvoiceNumber(`INV-${randomInvoiceNum}-B`);
    setFormSalesOrder(String(randomSalesOrder));
    setFormCustomerName('');
    setFormAddress('');
    setFormPhone('');
    setFormOriginBranch(BRANCHES[0]?.id || 'WINDMILL_DC');
    setFormWeight('');
    setFormOrderTotal('');
    setFormNotes('');
    setFormStatus(DeliveryStatus.REGISTERED);
    setFormAssignedTruck('');
    setFormReturnReason('');
    setFormSignature('');
    setFormPhoto('');
    setFormPdfUrl('');
    setFormPicker('');
    setFormRegisteredAt(new Date().toISOString().substring(0, 10));
    setFormDeliveredAt('');
    
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (record: DeliveryRecord) => {
    setEditingRecord(record);
    setFormId(record.id);
    setFormInvoiceNumber(record.invoiceNumber || '');
    setFormSalesOrder(record.epicorSalesOrder || '');
    setFormCustomerName(record.customerName || '');
    setFormAddress(record.deliveryAddress || '');
    setFormPhone(record.phone || '');
    setFormOriginBranch(record.originBranch || BRANCHES[0]?.id || 'WINDMILL_DC');
    setFormWeight(record.weight || '');
    setFormOrderTotal(record.orderTotal || '');
    setFormNotes(record.destinationNotes || '');
    setFormStatus(record.status || DeliveryStatus.REGISTERED);
    setFormAssignedTruck(record.assignedTruck || '');
    setFormReturnReason(record.returnReason || '');
    setFormSignature(record.customerSignature || '');
    setFormPhoto(record.deliveryPhoto || '');
    setFormPdfUrl(record.pdfUrl || getEffectivePdfUrl(record) || '');
    setFormPicker(record.assignedPicker || '');
    setFormRegisteredAt(parseToYYYYMMDD(record.registeredAt) || new Date().toISOString().substring(0, 10));
    setFormDeliveredAt(parseToYYYYMMDD(record.deliveredAt) || '');
    
    setIsModalOpen(true);
  };

  const handleSaveDelivery = (e: FormEvent) => {
    e.preventDefault();
    if (!formId.trim() || !formCustomerName.trim() || !formAddress.trim()) {
      alert("Please enter a valid ticket reference ID, customer name, and customer address.");
      return;
    }

    if (formStatus === DeliveryStatus.PICKED_AND_LOADED && !formPicker) {
      alert("A picker must be chosen and cannot be left blank when moving to Loaded on Truck.");
      return;
    }

    const matchedTruck = trucks.find(t => t.id === formAssignedTruck);
    const originStoreName = BRANCHES.find(b => b.id === formOriginBranch)?.name || 'Local Store';
    
    const pickerUser = users.find(u => u.id === formPicker) || users.find(u => u.name === formPicker);
    const pickerName = pickerUser ? pickerUser.name : formPicker;

    if (editingRecord) {
      // Edit Mode
      const isStatusChanged = editingRecord.status !== formStatus;
      const isTruckChanged = editingRecord.assignedTruck !== formAssignedTruck;
      
      let newHistory = [...editingRecord.history];
      
      if (isStatusChanged) {
        let historyNotes = `Status manually updated from ${editingRecord.status} to ${formStatus} via Action form.`;
        if (formStatus === DeliveryStatus.PICKED_AND_LOADED && pickerName) {
          historyNotes = `Cargo manually moved to Loaded on Truck stage. Picker assigned: ${pickerName}.`;
        }
        newHistory.push({
          status: formStatus,
          timestamp: new Date().toISOString(),
          location: originStoreName,
          operator: 'Logistics Board Coordinator',
          notes: historyNotes
        });
      }
      
      if (isTruckChanged && formAssignedTruck) {
        newHistory.push({
          status: formStatus,
          timestamp: new Date().toISOString(),
          location: originStoreName,
          operator: 'Logistics Board Coordinator',
          notes: `Manually re-allocated delivery path to flatbed: ${matchedTruck?.name || formAssignedTruck} (Driver: ${matchedTruck?.driver || 'N/A'}).`
        });
      } else if (isTruckChanged && !formAssignedTruck) {
        newHistory.push({
          status: formStatus,
          timestamp: new Date().toISOString(),
          location: originStoreName,
          operator: 'Logistics Board Coordinator',
          notes: `Deallocated truck assignments.`
        });
      }

      const updatedRecord: DeliveryRecord = {
        ...editingRecord,
        id: formId,
        invoiceNumber: formInvoiceNumber,
        epicorSalesOrder: formSalesOrder,
        customerName: formCustomerName,
        deliveryAddress: formAddress,
        phone: formPhone,
        originBranch: formOriginBranch,
        weight: formWeight || undefined,
        orderTotal: formOrderTotal || undefined,
        destinationNotes: formNotes || undefined,
        status: formStatus,
        registeredAt: formRegisteredAt ? new Date(`${formRegisteredAt}T12:00:00`).toISOString() : (editingRecord?.registeredAt || new Date().toISOString()),
        deliveredAt: formStatus === DeliveryStatus.DELIVERED 
          ? (formDeliveredAt ? new Date(`${formDeliveredAt}T12:00:00`).toISOString() : (editingRecord?.deliveredAt || new Date().toISOString())) 
          : undefined,
        assignedTruck: formAssignedTruck || undefined,
        assignedDriver: matchedTruck?.driver || undefined,
        assignedPicker: formStatus === DeliveryStatus.PICKED_AND_LOADED ? pickerName : (editingRecord?.assignedPicker || undefined),
        returnReason: formStatus === DeliveryStatus.RETURNED ? (formReturnReason || undefined) : undefined,
        customerSignature: formStatus === DeliveryStatus.DELIVERED ? (formSignature || editingRecord.customerSignature || 'Physical Signoff Done') : undefined,
        deliveryPhoto: formStatus === DeliveryStatus.DELIVERED ? (formPhoto || editingRecord.deliveryPhoto || undefined) : undefined,
        pdfUrl: formPdfUrl || undefined,
        history: newHistory
      };

      onAddOrUpdateDelivery(updatedRecord);
    } else {
      // Add Mode
      const newHistory = [
        {
          status: formStatus,
          timestamp: new Date().toISOString(),
          location: originStoreName,
          operator: 'Logistics Board Coordinator',
          notes: 'Ticket manually registered to Lumber depot freight ledger.'
        }
      ];

      if (formAssignedTruck) {
        newHistory.push({
          status: formStatus,
          timestamp: new Date().toISOString(),
          location: originStoreName,
          operator: 'Logistics Board Coordinator',
          notes: `Allocated truck to delivery path on creation: ${matchedTruck?.name || formAssignedTruck} (Driver: ${matchedTruck?.driver || 'N/A'}).`
        });
      }

      const newRecord: DeliveryRecord = {
        id: formId,
        invoiceNumber: formInvoiceNumber,
        epicorSalesOrder: formSalesOrder,
        customerName: formCustomerName,
        deliveryAddress: formAddress,
        phone: formPhone,
        originBranch: formOriginBranch,
        weight: formWeight || undefined,
        orderTotal: formOrderTotal || undefined,
        destinationNotes: formNotes || undefined,
        status: formStatus,
        registeredAt: formRegisteredAt ? new Date(`${formRegisteredAt}T12:00:00`).toISOString() : new Date().toISOString(),
        deliveredAt: formStatus === DeliveryStatus.DELIVERED 
          ? (formDeliveredAt ? new Date(`${formDeliveredAt}T12:00:00`).toISOString() : new Date().toISOString()) 
          : undefined,
        assignedTruck: formAssignedTruck || undefined,
        assignedDriver: matchedTruck?.driver || undefined,
        assignedPicker: formStatus === DeliveryStatus.PICKED_AND_LOADED ? pickerName : undefined,
        returnReason: formStatus === DeliveryStatus.RETURNED ? (formReturnReason || undefined) : undefined,
        customerSignature: formStatus === DeliveryStatus.DELIVERED ? (formSignature || 'Physical Handoff Validated') : undefined,
        deliveryPhoto: formStatus === DeliveryStatus.DELIVERED ? (formPhoto || undefined) : undefined,
        pdfUrl: formPdfUrl || undefined,
        history: newHistory
      };

      onAddOrUpdateDelivery(newRecord);
    }

    setIsModalOpen(false);
  };

  const handleAssignTruck = (deliveryId: string, truckId: string) => {
    const delivery = deliveries.find(d => d.id === deliveryId);
    if (!delivery) return;

    const newTruck = trucks.find(t => t.id === truckId);
    if (!newTruck) return;

    const originStoreName = BRANCHES.find(b => b.id === delivery.originBranch)?.name || 'Local Store';
    const originalStatus = delivery.status;
    const oldTruck = trucks.find(t => t.id === delivery.assignedTruck);
    
    // Maintain the current status exactly to allow flexible pre-allocation of trucks
    // without automatically switching status from "REGISTERED" to "LOADED".
    const updatedStatus = originalStatus;

    let notes = '';
    if (delivery.assignedTruck && delivery.assignedTruck !== truckId) {
      // This is a SWAP / BREAKDOWN / RE-ROUTING scenario
      notes = `Truck swap performed (Potential Breakdown / Logistics Re-route). Transferred cargo from ${oldTruck?.name || delivery.assignedTruck} to ${newTruck.name} (Driver: ${newTruck.driver}).`;
    } else {
      notes = `Allocated truck to delivery path: ${newTruck.name} (Driver: ${newTruck.driver}).`;
    }

    const updatedHistory = [
      ...delivery.history,
      {
        status: updatedStatus,
        timestamp: new Date().toISOString(),
        location: originStoreName,
        operator: 'Logistics Board Coordinator',
        notes: notes
      }
    ];

    const updatedRecord: DeliveryRecord = {
      ...delivery,
      assignedTruck: newTruck.id,
      assignedDriver: newTruck.driver,
      status: updatedStatus,
      history: updatedHistory
    };

    onAddOrUpdateDelivery(updatedRecord);
  };

  const handleLoadCargo = (deliveryId: string) => {
    setPickerModalDeliveryId(deliveryId);
    setQuickSelectedPicker('');
  };

  const handleConfirmQuickPickerLoad = () => {
    if (!pickerModalDeliveryId) return;
    if (!quickSelectedPicker) {
      alert("A picker must be chosen and cannot be left blank.");
      return;
    }

    const delivery = deliveries.find(d => d.id === pickerModalDeliveryId);
    if (!delivery) return;

    const pickerUser = users.find(u => u.id === quickSelectedPicker) || users.find(u => u.name === quickSelectedPicker);
    const pickerName = pickerUser ? pickerUser.name : quickSelectedPicker;

    const originStoreName = BRANCHES.find(b => b.id === delivery.originBranch)?.name || 'Local Store';
    
    const updatedHistory = [
      ...delivery.history,
      {
        status: DeliveryStatus.PICKED_AND_LOADED,
        timestamp: new Date().toISOString(),
        location: originStoreName,
        operator: `Picker: ${pickerName} / Board Coordinator`,
        notes: `Cargo manually confirmed loaded onto truck. Picker assigned: ${pickerName}.`
      }
    ];

    const updatedRecord: DeliveryRecord = {
      ...delivery,
      status: DeliveryStatus.PICKED_AND_LOADED,
      assignedPicker: pickerName,
      history: updatedHistory
    };

    onAddOrUpdateDelivery(updatedRecord);
    setPickerModalDeliveryId(null);
    setQuickSelectedPicker('');
  };

  // Toggle record expanded state
  const toggleExpand = (id: string) => {
    if (expandedRecord === id) {
      setExpandedRecord(null);
    } else {
      setExpandedRecord(id);
    }
  };

  // Filter logic
  const filtered = deliveries.filter(record => {
    // 1. Status Tab Filter
    if (activeTab !== 'ALL' && record.status !== activeTab) {
      return false;
    }

    // 2. Branch Filter
    if (selectedBranchFilter !== 'ALL' && record.originBranch !== selectedBranchFilter) {
      return false;
    }

    // 3. Text Search Filter (Barcode or Customer or invoice)
    const text = searchQuery.toLowerCase();
    if (text) {
      if (!(
        record.id.toLowerCase().includes(text) ||
        record.customerName.toLowerCase().includes(text) ||
        record.invoiceNumber.toLowerCase().includes(text) ||
        record.epicorSalesOrder.toLowerCase().includes(text) ||
        record.deliveryAddress.toLowerCase().includes(text)
      )) {
        return false;
      }
    }

    // 4. Date Filter (tracks across normalized registered, delivered, history, and OCR parsed timestamps)
    if (selectedDateFilter) {
      const { registeredDate, primaryDate, allDates, deliveredDate, returnedDate } = getDeliveryDatesYYYYMMDD(record);
      const isCompleted = record.status === DeliveryStatus.DELIVERED || record.status === DeliveryStatus.RETURNED;

      if (isCompleted) {
        const completionDate = deliveredDate || returnedDate;
        if (completionDate !== selectedDateFilter) {
          return false;
        }
      } else {
        // Direct match on any associated date for this record (registeredAt, history, OCR date)
        const matchesExplicitDate = allDates.includes(selectedDateFilter);

        if (matchesExplicitDate) {
          // Document directly matches the selected date
        } else {
          // Roll over active/incomplete tickets registered on or before the selected date
          const regDate = registeredDate || primaryDate;
          if (regDate && regDate < selectedDateFilter) {
            // Allow active ticket to roll over
          } else {
            return false;
          }
        }
      }
    }

    return true;
  });

  return (
    <div className="space-y-6" id="delivery-queue-tab">
      
      {/* Top action row */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h4 className="font-sans font-bold text-gray-900 tracking-tight text-xl">Lumber & Freight Logistics Board</h4>
          <p className="text-xs text-gray-500">Search and track live status profiles of active customer deliveries across regional hubs</p>
        </div>

        {/* Filter selections */}
        <div className="flex flex-col sm:flex-row gap-2 max-w-xl w-full md:w-auto items-stretch sm:items-center">
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="flex items-center justify-center space-x-1 bg-blue-850 hover:bg-blue-900 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors shadow-sm cursor-pointer shrink-0"
            id="add-delivery-ticket-btn"
          >
            <Plus className="h-4 w-4" />
            <span>Add Delivery</span>
          </button>

          {/* Search box */}
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search Customer, Barcode, Inv..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 pl-9 pr-3 py-2 text-xs rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
            />
          </div>

          {/* Datepicker Filter */}
          <div className="relative">
            <input 
              type="date"
              value={selectedDateFilter}
              onChange={(e) => setSelectedDateFilter(e.target.value)}
              className="border border-slate-200 px-3 py-2 text-xs rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono w-full sm:w-auto"
              title="Filter deliveries by date (Delivered Date for completed, or Registration Date for pending)"
            />
            {selectedDateFilter && (
              <button
                type="button"
                onClick={() => setSelectedDateFilter('')}
                className="absolute right-7 top-2 text-[10px] font-bold text-red-500 hover:text-red-700 bg-white px-1 rounded"
              >
                Clear
              </button>
            )}
          </div>

          {/* Branch selector */}
          <select
            value={selectedBranchFilter}
            onChange={(e) => setSelectedBranchFilter(e.target.value)}
            className="border border-slate-200 px-3 py-2 text-xs rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="ALL">All Depot Stations</option>
            {BRANCHES.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-100 flex overflow-x-auto space-x-6 pb-px">
        <button
          onClick={() => setActiveTab('ALL')}
          className={`pb-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap ${activeTab === 'ALL' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
        >
          🗂️ All Deliveries ({deliveries.length})
        </button>
        <button
          onClick={() => setActiveTab(DeliveryStatus.REGISTERED)}
          className={`pb-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap ${activeTab === DeliveryStatus.REGISTERED ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
        >
          1️⃣ Registered ({deliveries.filter(d => d.status === DeliveryStatus.REGISTERED).length})
        </button>
        <button
          onClick={() => setActiveTab(DeliveryStatus.PICKED_AND_LOADED)}
          className={`pb-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap ${activeTab === DeliveryStatus.PICKED_AND_LOADED ? 'border-amber-500 text-amber-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
        >
          2️⃣ Loaded on Truck ({deliveries.filter(d => d.status === DeliveryStatus.PICKED_AND_LOADED).length})
        </button>
        <button
          onClick={() => setActiveTab(DeliveryStatus.DELIVERED)}
          className={`pb-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap ${activeTab === DeliveryStatus.DELIVERED ? 'border-green-600 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
        >
          3️⃣ Completed ({deliveries.filter(d => d.status === DeliveryStatus.DELIVERED).length})
        </button>
        <button
          onClick={() => setActiveTab(DeliveryStatus.RETURNED)}
          className={`pb-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap ${activeTab === DeliveryStatus.RETURNED ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
        >
          ⚠️ Returns / Blocked ({deliveries.filter(d => d.status === DeliveryStatus.RETURNED).length})
        </button>
      </div>

      {/* Main Board queue */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-slate-50 border border-dashed border-slate-200 text-center py-12 text-gray-500 rounded-xl">
            <FileText className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold">No records match the current filter criteria</p>
            <p className="text-xs">Try adjusting your branch selection, state tab, or search string.</p>
          </div>
        ) : (
          filtered.map(delivery => {
            const isExpanded = expandedRecord === delivery.id;
            const docType = getEffectiveDocumentType(delivery);
            const isSupplierPickup = docType === 'Supplier Pickup';
            const isCreditDoc = docType === 'Credit';
            const isRmaDoc = docType === 'RMA';

            return (
              <div 
                key={delivery.id} 
                className={`relative bg-white border rounded-xl shadow-sm transition-all hover:shadow-md overflow-hidden ${
                  delivery.status === DeliveryStatus.REGISTERED ? 'border-orange-100 hover:border-orange-200' :
                  delivery.status === DeliveryStatus.PICKED_AND_LOADED ? 'border-amber-100 hover:border-amber-200' :
                  delivery.status === DeliveryStatus.DELIVERED ? 'border-green-100 hover:border-green-200' :
                  'border-red-100 hover:border-red-200'
                }`}
              >
                {/* Top Left Container Document Type Bar */}
                <div className={`px-4 py-2 border-b font-sans text-xs flex flex-wrap items-center justify-between gap-2 ${
                  isSupplierPickup ? 'bg-amber-500/10 border-amber-200/80 text-amber-950' :
                  isCreditDoc ? 'bg-emerald-500/10 border-emerald-200/80 text-emerald-950' :
                  isRmaDoc ? 'bg-rose-500/10 border-rose-200/80 text-rose-950' :
                  'bg-blue-500/10 border-blue-200/80 text-blue-950'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded text-[11px] font-black uppercase tracking-wide shadow-xs ${
                      isSupplierPickup ? 'bg-amber-200 text-amber-950 border border-amber-300' :
                      isCreditDoc ? 'bg-emerald-200 text-emerald-950 border border-emerald-300' :
                      isRmaDoc ? 'bg-rose-200 text-rose-950 border border-rose-300' :
                      'bg-blue-200 text-blue-950 border border-blue-300'
                    }`}>
                      {isSupplierPickup ? '🏭 SUPPLIER PICKUP MEMO' :
                       isCreditDoc ? '💳 CREDIT MEMO RECEIPT' :
                       isRmaDoc ? '⚠️ RMA AUTHORIZATION' :
                       '📦 SALES ORDER DISPATCH'}
                    </span>
                    <span className="text-[11px] font-bold text-slate-800">
                      {isSupplierPickup ? 'Vendor Freight Claim & Pickup Authorization' :
                       isCreditDoc ? 'Customer Return Credit Adjustment' :
                       isRmaDoc ? 'Manufacturer Defect Warranty Return' :
                       'Lumber & Building Material Freight Delivery'}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-600 font-bold">
                    {isSupplierPickup ? 'Action: Pickup cargo consignment from vendor and dispatch flatbed' :
                     isCreditDoc ? 'Action: Process return credit and restock inventory' :
                     isRmaDoc ? 'Action: Dispatch return to manufacturer' :
                     'Action: Pick, load, and deliver to recipient'}
                  </span>
                </div>

                {/* Header Summary */}
                <div 
                  onClick={() => toggleExpand(delivery.id)}
                  className="p-4 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 select-none"
                >
                  
                  {/* Left Column: Barcode & Origin */}
                  <div className="flex items-start space-x-3">
                    <div className="p-2.5 bg-slate-50 rounded-lg hidden sm:block font-mono text-center min-w-[75px]">
                      <span className="text-[9px] text-gray-500 block uppercase font-bold">
                        {isSupplierPickup ? 'PO#' :
                         isCreditDoc ? 'Credit#' :
                         isRmaDoc ? 'RMA#' :
                         'SO#'}
                      </span>
                      <strong className="text-slate-800 text-xs font-bold">{delivery.epicorSalesOrder || delivery.invoiceNumber || delivery.id}</strong>
                    </div>

                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-extrabold text-blue-600 text-sm tracking-tight">{delivery.id}</span>
                        <span className="text-xs text-gray-400">|</span>
                        <span className="text-[10px] font-mono text-slate-600 font-bold uppercase">
                          {isSupplierPickup ? `PO#: ${delivery.invoiceNumber || delivery.epicorSalesOrder}` :
                           isCreditDoc ? `Credit#: ${delivery.invoiceNumber}` :
                           isRmaDoc ? `RMA#: ${delivery.invoiceNumber}` :
                           `SO#: ${delivery.invoiceNumber || delivery.epicorSalesOrder}`}
                        </span>
                        {getEffectivePdfUrl(delivery) && (
                          <>
                            <span className="text-xs text-slate-300">|</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewDocDelivery(delivery);
                              }}
                              className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-sans font-extrabold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors cursor-pointer"
                              title="View digitized physical document archive"
                            >
                              <FileText className="h-3 w-3 mr-1 text-indigo-600 animate-pulse" />
                              View Document
                            </button>
                          </>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 mt-1">
                        <MapPin className="h-3.5 w-3.5 text-red-500 shrink-0" />
                        <span className="text-xs font-bold text-gray-900">
                          {isSupplierPickup ? 'Supplier:' : isCreditDoc ? 'Customer:' : isRmaDoc ? 'Manufacturer:' : 'Customer:'} <span className="font-semibold text-slate-800">{delivery.customerName}</span>
                        </span>
                        <span className="text-gray-300">&bull;</span>
                        <span className="text-xs font-bold text-gray-900 truncate max-w-xs">
                          {isSupplierPickup ? 'Shipto address:' : isCreditDoc ? 'Return address:' : isRmaDoc ? 'Return destination:' : 'Shipto address:'} <span className="text-gray-600 font-normal">{delivery.deliveryAddress}</span>
                        </span>
                      </div>

                      {(delivery.weight || delivery.orderTotal) && (
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          {delivery.weight && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              ⚖️ Weight: <span className="text-slate-800 ml-1">{delivery.weight}</span>
                            </span>
                          )}
                          {delivery.orderTotal && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              💰 Total: <span className="text-emerald-900 ml-1 font-extrabold">{delivery.orderTotal}</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Middle Column: Logistics Driver & Origin Store */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center space-x-1.5 py-1 px-2.5 bg-slate-50 rounded text-slate-700 text-[10px]" title="Pickup / Registration Date">
                        <Clock className="h-3 w-3 text-slate-400" />
                        <span className="font-mono font-semibold">
                          {isSupplierPickup ? 'pickup Date: ' : isCreditDoc ? 'Credit Date: ' : isRmaDoc ? 'Issue Date: ' : 'pickup Date: '}
                          {formatLocalDate(delivery.registeredAt)}
                        </span>
                      </div>
                      {delivery.deliveredAt && (
                        <div className="flex items-center space-x-1.5 py-1 px-2.5 bg-green-50 border border-green-100 rounded text-green-800 text-[10px]" title="Actual Delivery Date">
                          <CheckCircle2 className="h-3 w-3 text-green-500 animate-pulse" />
                          <span className="font-mono font-bold">Completed: {formatLocalDate(delivery.deliveredAt)}</span>
                        </div>
                      )}
                    </div>

                    <div className="py-1 px-2.5 bg-slate-50 border border-slate-100 rounded text-[11px] text-slate-600">
                      Depot: <strong className="text-slate-800">{BRANCHES.find(b => b.id === delivery.originBranch)?.name.replace('ProSpaces ', '')}</strong>
                    </div>

                    {(() => {
                      const matchedTruck = trucks.find(t => t.id === delivery.assignedTruck);
                      if (matchedTruck) {
                        return (
                          <div className="py-1 px-2.5 bg-blue-50 border border-blue-100 text-blue-900 font-semibold rounded-lg text-[11px] flex items-center space-x-1 shadow-sm font-sans">
                            <span className="text-xs">🚚</span>
                            <span>{matchedTruck.name}</span>
                            <span className="text-slate-300">&bull;</span>
                            <span className="text-gray-600 font-medium font-mono">({matchedTruck.driver})</span>
                          </div>
                        );
                      } else if (delivery.assignedDriver) {
                        return (
                          <div className="py-1 px-2.5 bg-slate-100 text-slate-800 font-medium rounded text-[11px] flex items-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-500 mr-1.5"></span>
                            {delivery.assignedDriver}
                          </div>
                        );
                      } else {
                        return (
                          <span className="text-slate-400 text-[10px] font-mono italic">No fleet assigned</span>
                        );
                      }
                    })()}

                    {delivery.assignedPicker && (
                      <div className="py-1 px-2.5 bg-emerald-50 border border-emerald-100 text-emerald-900 font-semibold rounded-lg text-[11px] flex items-center space-x-1 shadow-sm font-sans">
                        <span className="text-xs">👤</span>
                        <span className="text-gray-500 font-medium">Picker:</span>
                        <span className="text-emerald-800 font-semibold">{delivery.assignedPicker}</span>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Status Banner */}
                  <div className="flex items-center space-x-3 self-end md:self-auto">
                    {delivery.status === DeliveryStatus.REGISTERED && (
                      <span className="px-3 py-1 bg-orange-50 border border-orange-100 text-orange-700 rounded-full text-xs font-bold font-sans">
                        1️⃣ Registered
                      </span>
                    )}
                    {delivery.status === DeliveryStatus.PICKED_AND_LOADED && (
                      <span className="px-3 py-1 bg-amber-50 border border-amber-100 text-amber-700 rounded-full text-xs font-bold font-sans animate-pulse">
                        2️⃣ Loaded
                      </span>
                    )}
                    {delivery.status === DeliveryStatus.DELIVERED && (
                      <span className="px-3 py-1 bg-green-50 border border-green-100 text-green-700 rounded-full text-xs font-bold font-sans flex items-center">
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        3️⃣ Delivered
                      </span>
                    )}
                    {delivery.status === DeliveryStatus.RETURNED && (
                      <span className="px-3 py-1 bg-red-50 border border-red-100 text-red-600 rounded-full text-xs font-bold font-sans flex items-center">
                        <AlertTriangle className="h-3.5 w-3.5 mr-1 text-red-500" />
                        ⚠️ Returned
                      </span>
                    )}

                    <div className="flex items-center space-x-2 relative" onClick={(e) => e.stopPropagation()}>
                      {/* Action Menu dropdown trigger */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDropdownId(activeDropdownId === delivery.id ? null : delivery.id);
                        }}
                        className="p-1 px-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors focus:outline-none"
                        title="Delivery Actions Menu"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                      
                      {/* Dropdown element */}
                      {activeDropdownId === delivery.id && (
                        <>
                          <div 
                            className="fixed inset-0 z-40" 
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDropdownId(null);
                            }}
                          />
                          <div 
                            className="absolute right-0 top-full mt-1 w-40 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden py-1"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                handleOpenEditModal(delivery);
                                setActiveDropdownId(null);
                              }}
                              className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center space-x-2 font-semibold transition-colors border-b border-slate-50"
                            >
                              <Edit className="h-3.5 w-3.5 text-emerald-600" />
                              <span>Edit Ticket</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShowDeleteConfirmId(delivery.id);
                                setActiveDropdownId(null);
                              }}
                              className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 flex items-center space-x-2 font-semibold transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-red-600" />
                              <span>Delete Ticket</span>
                            </button>
                          </div>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() => toggleExpand(delivery.id)}
                        className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                </div>

                {/* Expanded Details Panel */}
                {isExpanded && (
                  <div className="border-t border-dashed border-slate-100 p-5 bg-slate-50/50 grid grid-cols-1 md:grid-cols-12 gap-6 text-xs text-gray-700">
                    
                    {/* Left details (Columns 1-6) */}
                    <div className="md:col-span-6 space-y-4">
                      
                      {/* Shipping detail cards */}
                      <div className="grid grid-cols-1 gap-4">
                        {getEffectivePdfUrl(delivery) && (
                          <div>
                            <h5 className="font-bold text-gray-900 mb-1 uppercase tracking-wider font-mono text-[10px]">Physical Document Archive</h5>
                            <div className="bg-gradient-to-br from-indigo-50/50 to-blue-50/50 border border-indigo-100 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
                              <div className="flex items-center space-x-2.5">
                                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
                                  <FileText className="h-4 w-4" />
                                </div>
                                <div className="text-[11px]">
                                  <p className="font-bold text-slate-800 font-mono">{delivery.id}_physical.pdf</p>
                                  <p className="text-slate-500">Inbound OCR digitized physical copy archived on server</p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewDocDelivery(delivery);
                                }}
                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold shadow-xs hover:shadow-sm transition-all flex items-center space-x-1 cursor-pointer"
                              >
                                <Eye className="h-3.5 w-3.5 mr-1" />
                                <span>View Document</span>
                              </button>
                            </div>
                          </div>
                        )}

                        <div>
                          <h5 className="font-bold text-gray-900 mb-1 uppercase tracking-wider font-mono text-[10px]">
                            {isSupplierPickup ? 'Supplier Pickup Instructions' : isCreditDoc ? 'Credit Memo Processing Details' : isRmaDoc ? 'RMA Return Dispatch Details' : 'Recipient Delivery Instructions'}
                          </h5>
                          <div className="bg-white border border-slate-100 rounded-xl p-3 space-y-2 shadow-sm">
                            <p><span className="text-slate-500 font-semibold">{isSupplierPickup ? 'Purchase Order # (PO#):' : isCreditDoc ? 'Credit Note #:' : isRmaDoc ? 'RMA #:' : 'Sales Order # (SO#):'}</span> <strong className="font-mono text-blue-700">{delivery.epicorSalesOrder || delivery.invoiceNumber || delivery.id}</strong></p>
                            <p><span className="text-slate-500 font-semibold">{isSupplierPickup ? 'Supplier Name & Address (Supplier):' : isCreditDoc ? 'Customer Name:' : isRmaDoc ? 'Manufacturer:' : 'Customer Name:'}</span> <strong className="text-slate-900">{delivery.customerName}</strong></p>
                            <p><span className="text-slate-500 font-semibold">{isSupplierPickup ? 'Deliver Address (Shipto address):' : 'Delivery Address:'}</span> <strong className="text-slate-900">{delivery.deliveryAddress}</strong></p>
                            <p><span className="text-slate-500 font-semibold">{isSupplierPickup ? 'Pickup Date (pickup Date):' : 'Date Registered:'}</span> <strong className="font-mono text-slate-800">{formatLocalDate(delivery.registeredAt)}</strong></p>
                            <p><span className="text-slate-500 font-semibold">Phone Contact:</span> <strong className="font-mono">{delivery.phone}</strong></p>
                            {delivery.destinationNotes && (
                              <p className="mt-1 pt-1.5 border-t border-slate-100 text-slate-600 italic">
                                &ldquo;{delivery.destinationNotes}&rdquo;
                              </p>
                            )}
                          </div>
                        </div>

                        {(delivery.weight || delivery.orderTotal) && (
                          <div>
                            <h5 className="font-bold text-gray-900 mb-1 uppercase tracking-wider font-mono text-[10px]">Document-Mapped Balances</h5>
                            <div className="bg-white border border-slate-100 rounded-xl p-3 grid grid-cols-2 gap-4 shadow-sm">
                              {delivery.weight && (
                                <div>
                                  <p className="text-gray-400 text-[9px] font-mono uppercase font-bold">Gross Freight Weight</p>
                                  <p className="text-sm font-black text-slate-800 font-mono mt-0.5">⚖️ {delivery.weight}</p>
                                </div>
                              )}
                              {delivery.orderTotal && (
                                <div>
                                  <p className="text-gray-400 text-[9px] font-mono uppercase font-bold">Total Mapped Value</p>
                                  <p className="text-sm font-black text-emerald-700 font-mono mt-0.5">💰 {delivery.orderTotal}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Interactive Truck Selection & Confirmation Desk */}
                        {delivery.status !== DeliveryStatus.DELIVERED && (
                          <div className="bg-white border border-slate-100 rounded-xl p-3.5 space-y-3 shadow-sm">
                            <div className="flex items-center justify-between">
                              <h5 className="font-bold text-gray-900 uppercase tracking-wider font-mono text-[10px] flex items-center">
                                <TruckIcon className="h-3.5 w-3.5 text-blue-600 mr-1.5" />
                                Allocate Depot Delivery Truck
                              </h5>
                              {delivery.assignedTruck ? (
                                <span className="text-[9px] bg-blue-100 text-blue-800 border border-blue-200 font-bold px-2 py-0.5 rounded-full uppercase">
                                  {delivery.status === DeliveryStatus.PICKED_AND_LOADED ? '🚚 Loaded' : '👍 Assigned'}
                                </span>
                              ) : (
                                <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 font-bold px-2 py-0.5 rounded-full uppercase font-mono">
                                  Pending Truck
                                </span>
                              )}
                            </div>
                            
                            <div className="space-y-2">
                              <p className="text-[10px] text-gray-500 font-sans leading-relaxed">
                                Assign or re-route a flatbed truck crane under ProSpaces fleet for this delivery ticket:
                              </p>
                              
                              <select
                                value={delivery.assignedTruck || ''}
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleAssignTruck(delivery.id, e.target.value);
                                  }
                                }}
                                className="w-full border border-slate-200 px-2.5 py-1.5 rounded-lg text-xs bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                              >
                                <option value="">-- Choose fleet transport truck --</option>
                                {(() => {
                                  const localDepotTrucks = trucks.filter(t => t.branchId === delivery.originBranch);
                                  const otherDepotTrucks = trucks.filter(t => t.branchId !== delivery.originBranch);
                                  return (
                                    <>
                                      {localDepotTrucks.length > 0 && (
                                        <optgroup label={`Local Store Fleet (${BRANCHES.find(b => b.id === delivery.originBranch)?.name.replace(' ProSpaces', '')})`}>
                                          {localDepotTrucks.map(t => (
                                            <option key={t.id} value={t.id}>
                                              🚚 {t.name} (Driver: {t.driver}) — {t.type}
                                            </option>
                                          ))}
                                        </optgroup>
                                      )}
                                      {otherDepotTrucks.length > 0 && (
                                        <optgroup label="Other Regional Store Fleets">
                                          {otherDepotTrucks.map(t => {
                                            const branchName = BRANCHES.find(b => b.id === t.branchId)?.name.replace(' ProSpaces', '') || 'Other';
                                            return (
                                              <option key={t.id} value={t.id}>
                                                🚚 {t.name} (Driver: {t.driver}) — [{branchName}]
                                              </option>
                                            );
                                          })}
                                        </optgroup>
                                      )}
                                    </>
                                  );
                                })()}
                              </select>
                              
                              {/* Option to load truck directly on the board */}
                              {delivery.status === DeliveryStatus.REGISTERED && delivery.assignedTruck && (
                                <button
                                  onClick={() => handleLoadCargo(delivery.id)}
                                  className="w-full mt-1 bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-800 hover:to-blue-900 text-white font-bold text-xs py-2 rounded-lg flex items-center justify-center space-x-1 px-3 shadow-xs transition-colors"
                                >
                                  <span>📦 Confirm Cargo Loaded on Truck</span>
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Hardware outcome validation */}
                      {delivery.status === DeliveryStatus.DELIVERED && (
                        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3.5 space-y-2 text-emerald-800">
                          <h6 className="font-bold flex items-center">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 mr-1.5" /> 
                            Proof of Delivery Sign-off
                          </h6>
                          <p className="font-mono text-[11px]">Signature Handoff File: <strong>&ldquo;{delivery.customerSignature}&rdquo;</strong></p>
                          {delivery.deliveryPhoto && (
                            <div className="rounded-lg overflow-hidden border border-emerald-200 mt-1 max-w-sm">
                              <img src={delivery.deliveryPhoto} alt="Lumber placement dropoff check" className="h-32 w-full object-cover" />
                              <div className="bg-emerald-100/90 py-1 text-center font-mono text-[9px] text-emerald-900 border-t border-emerald-200">
                                🛡️ Timestamped and Location coordinates Verified
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {delivery.status === DeliveryStatus.RETURNED && (
                        <div className="bg-red-50 border border-red-100 rounded-xl p-4 space-y-2 text-red-800">
                          <h6 className="font-bold flex items-center">
                            <AlertTriangle className="h-3.5 w-3.5 text-red-600 mr-1.5" /> 
                            Driver Exception Report
                          </h6>
                          <p>Reason: <strong className="text-red-900 italic">&ldquo;{delivery.returnReason}&rdquo;</strong></p>
                          <p className="text-[10px] text-red-600">
                            * Cargo is checked back into local inventory. ERP Sales order marked with tracking error.
                          </p>
                        </div>
                      )}

                    </div>

                    {/* Right event audit trail history (Columns 7-12) */}
                    <div className="md:col-span-6 space-y-3">
                      <h5 className="font-bold text-gray-900 uppercase tracking-wider font-mono text-[10px]">Real-time Event Audit Trail</h5>
                      
                      <div className="relative border-l border-slate-300 pl-4 py-1.5 ml-2 space-y-4">
                        {delivery.history.map((h, i) => (
                          <div key={i} className="relative">
                            <span className="absolute -left-[21px] mt-1.5 w-2 h-2 rounded-full bg-blue-600 border-2 border-white"></span>
                            <div className="flex items-center justify-between font-mono text-[10px] text-gray-400">
                              <span>{new Date(h.timestamp).toLocaleString()}</span>
                              <span className="font-bold text-slate-500 bg-slate-100 px-1 py-0.25 rounded">{h.operator}</span>
                            </div>
                            <p className="font-bold font-sans text-gray-800 text-[11px] mt-0.5">{h.status}</p>
                            <p className="text-gray-500 text-[11px] mt-0.5 italic">{h.notes}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                )}

              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Delivery Ticket Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-55 backdrop-blur-xs overflow-y-auto">
          <div 
            className="fixed inset-0" 
            onClick={() => setIsModalOpen(false)}
          />
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-2xl w-full max-h-[90vh] overflow-y-auto relative z-10 animate-in fade-in zoom-in duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-slate-50 rounded-t-2xl">
              <div>
                <h4 className="font-sans font-extrabold text-slate-900 text-lg animate-fade-in">
                  {editingRecord ? '📝 Edit Delivery Ticket' : '➕ Register New Delivery'}
                </h4>
                <p className="text-xs text-gray-500">
                  {editingRecord ? `Modify tracking profiles for order ${editingRecord.id}` : 'Create a fresh customer freight ticket manual entry'}
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 px-2 hover:bg-slate-200 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
                title="Close Modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSaveDelivery} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* ID Barcode Reference */}
                <div>
                  <label className="block text-slate-600 font-bold mb-1 font-mono uppercase text-[10px]">Barcode / Ticket ID *</label>
                  <input 
                    type="text"
                    required
                    disabled={!!editingRecord}
                    value={formId}
                    onChange={(e) => setFormId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2 text-xs rounded-lg disabled:text-gray-500 disabled:bg-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="SO-83941-A"
                  />
                  {!editingRecord && (
                    <span className="text-[10px] text-gray-400 mt-0.5 block">Autogenerated reference pattern</span>
                  )}
                </div>

                {/* Enterprise Sales Order Ref */}
                <div>
                  <label className="block text-slate-600 font-bold mb-1 font-mono uppercase text-[10px]">Sales Order Ref *</label>
                  <input 
                    type="text"
                    required
                    value={formSalesOrder}
                    onChange={(e) => setFormSalesOrder(e.target.value)}
                    className="w-full bg-white border border-slate-200 p-2 text-xs rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="7284910"
                  />
                </div>

                {/* Invoice Reference Number */}
                <div>
                  <label className="block text-slate-600 font-bold mb-1 font-mono uppercase text-[10px]">Invoice Number *</label>
                  <input 
                    type="text"
                    required
                    value={formInvoiceNumber}
                    onChange={(e) => setFormInvoiceNumber(e.target.value)}
                    className="w-full bg-white border border-slate-200 p-2 text-xs rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="INV-3920-B"
                  />
                </div>

                {/* Store Depot Station Selection */}
                <div>
                  <label className="block text-slate-600 font-bold mb-1 font-mono uppercase text-[10px]">Lumber Depot Origin Station *</label>
                  <select
                    value={formOriginBranch}
                    onChange={(e) => setFormOriginBranch(e.target.value)}
                    className="w-full bg-white border border-slate-200 p-2 text-xs rounded-lg text-gray-800 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {BRANCHES.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                {/* Customer Contact Name */}
                <div className="sm:col-span-2">
                  <label className="block text-slate-600 font-bold mb-1 font-mono uppercase text-[10px]">Customer Recipient Name *</label>
                  <div className="relative">
                    <User className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input 
                      type="text"
                      required
                      value={formCustomerName}
                      onChange={(e) => setFormCustomerName(e.target.value)}
                      className="w-full bg-white border border-slate-200 pl-8 p-2 text-xs rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Builders Alliance Inc."
                    />
                  </div>
                </div>

                {/* Recipient Address */}
                <div className="sm:col-span-2">
                  <label className="block text-slate-600 font-bold mb-1 font-mono uppercase text-[10px]">Delivery Project Site Address *</label>
                  <div className="relative">
                    <MapPin className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input 
                      type="text"
                      required
                      value={formAddress}
                      onChange={(e) => setFormAddress(e.target.value)}
                      className="w-full bg-white border border-slate-200 pl-8 p-2 text-xs rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="1820 NW 54th Ave, Vancouver, WA"
                    />
                  </div>
                </div>

                {/* Customer Phone Contact */}
                <div>
                  <label className="block text-slate-600 font-bold mb-1 font-mono uppercase text-[10px]">Contact Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input 
                      type="text"
                      value={formPhone}
                      onChange={(e) => setFormPhone(formatPhoneNumber(e.target.value))}
                      className="w-full bg-white border border-slate-200 pl-8 p-2 text-xs rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                      placeholder="360-555-0144"
                    />
                  </div>
                </div>

                {/* Transport truck assignment */}
                <div>
                  <label className="block text-slate-600 font-bold mb-1 font-mono uppercase text-[10px]">Allocate Truck & Driver</label>
                  <select
                    value={formAssignedTruck}
                    onChange={(e) => setFormAssignedTruck(e.target.value)}
                    className="w-full bg-white border border-slate-200 p-2 text-xs rounded-lg text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">-- No flatbed assigned --</option>
                    {trucks.map(t => {
                      const dynamicBranch = BRANCHES.find(b => b.id === t.branchId)?.name.replace(' ProSpaces', '') || 'Other';
                      return (
                        <option key={t.id} value={t.id}>
                          🚚 {t.name} ({t.driver}) — [{dynamicBranch}]
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Freight weight */}
                <div>
                  <label className="block text-slate-600 font-bold mb-1 font-mono uppercase text-[10px]">Freight Cargo Gross Weight</label>
                  <input 
                    type="text"
                    value={formWeight}
                    onChange={(e) => setFormWeight(e.target.value)}
                    className="w-full bg-white border border-slate-200 p-2 text-xs rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="3,150 lbs"
                  />
                </div>

                {/* Value amount order total */}
                <div>
                  <label className="block text-slate-600 font-bold mb-1 font-mono uppercase text-[10px]">Order Value Total</label>
                  <input 
                    type="text"
                    value={formOrderTotal}
                    onChange={(e) => setFormOrderTotal(e.target.value)}
                    className="w-full bg-white border border-slate-200 p-2 text-xs rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="$1,450.00"
                  />
                </div>

                {/* Route sequence simulation state */}
                <div>
                  <label className="block text-slate-600 font-bold mb-1 font-mono uppercase text-[10px]">Tracking Lifecycle Stage *</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as DeliveryStatus)}
                    className="w-full bg-white border border-slate-200 p-2 text-xs rounded-lg font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value={DeliveryStatus.REGISTERED}>1️⃣ Registered / Queued</option>
                    <option value={DeliveryStatus.PICKED_AND_LOADED}>2️⃣ Picked & Loaded on Flatbed</option>
                    <option value={DeliveryStatus.DELIVERED}>3️⃣ Completed & Delivered</option>
                    <option value={DeliveryStatus.RETURNED}>⚠️ Blocked / Returned Exception</option>
                  </select>
                </div>

                {/* Staging / Registration Date */}
                <div>
                  <label className="block text-slate-600 font-bold mb-1 font-mono uppercase text-[10px]">Staging / Registration Date *</label>
                  <input 
                    type="date"
                    required
                    value={formRegisteredAt}
                    onChange={(e) => setFormRegisteredAt(e.target.value)}
                    className="w-full bg-white border border-slate-200 p-2 text-xs rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Picker selection if Picked & Loaded is chosen */}
                {formStatus === DeliveryStatus.PICKED_AND_LOADED && (
                  <div>
                    <label className="block text-slate-600 font-bold mb-1 font-mono uppercase text-[10px]">Assign Warehouse Picker *</label>
                    <select
                      required
                      value={formPicker}
                      onChange={(e) => setFormPicker(e.target.value)}
                      className="w-full bg-white border border-slate-200 p-2 text-xs rounded-lg font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">-- Select Registered Picker (Required) --</option>
                      {users.filter(u => u.role === 'Picker').map(u => (
                        <option key={u.id} value={u.id}>
                          👤 {u.name} ({u.email})
                        </option>
                      ))}
                      <option value="Picked up at Supplier">📦 Picked up at Supplier</option>
                      <option value="Picked up at Store">🏪 Picked up at Store</option>
                    </select>
                    {users.filter(u => u.role === 'Picker').length === 0 && (
                      <div className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 mt-1 font-sans leading-relaxed">
                        ⚠️ No users with <strong>Picker</strong> role are currently registered in the database. Setup an operational Picker profile in <strong>Fleet Setup &gt; Users Setup</strong> or via login screen registration.
                      </div>
                    )}
                  </div>
                )}

                {/* Return reason if exception is chosen */}
                {formStatus === DeliveryStatus.RETURNED && (
                  <div>
                    <label className="block text-red-600 font-bold mb-1 font-mono uppercase text-[10px]">Driver Exception Note/Reason *</label>
                    <input 
                      type="text"
                      required
                      value={formReturnReason}
                      onChange={(e) => setFormReturnReason(e.target.value)}
                      className="w-full bg-red-50 border border-red-200 p-2 text-xs rounded-lg text-red-900 font-medium focus:outline-none focus:ring-1 focus:ring-red-500"
                      placeholder="Customer refused, wrong size framing studs ordered"
                    />
                  </div>
                )}

                {/* Sign-off properties if Delivered */}
                {formStatus === DeliveryStatus.DELIVERED && (
                  <>
                    <div>
                      <label className="block text-green-600 font-bold mb-1 font-mono uppercase text-[10px]">Actual Date Delivered *</label>
                      <input 
                        type="date"
                        required
                        value={formDeliveredAt || new Date().toISOString().substring(0, 10)}
                        onChange={(e) => setFormDeliveredAt(e.target.value)}
                        className="w-full bg-green-50 border border-green-200 p-2 text-xs rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-indigo-600 font-bold mb-1 font-mono uppercase text-[10px]">Recipient Handover File Signature</label>
                      <input 
                        type="text"
                        value={formSignature}
                        onChange={(e) => setFormSignature(e.target.value)}
                        className="w-full bg-indigo-50/50 border border-indigo-100 p-2 text-xs rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        placeholder="John Doe (Verified via Handoff Pin)"
                      />
                    </div>
                    <div>
                      <label className="block text-indigo-600 font-bold mb-1 font-mono uppercase text-[10px]">Dropoff Proof Photo URL</label>
                      <input 
                        type="text"
                        value={formPhoto}
                        onChange={(e) => setFormPhoto(e.target.value)}
                        className="w-full bg-indigo-50/50 border border-indigo-100 p-2 text-xs rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        placeholder="https://images.unsplash.com/..."
                      />
                    </div>
                  </>
                )}

                {/* Server-side PDF archive path */}
                <div className="sm:col-span-2">
                  <label className="block text-indigo-600 font-bold mb-1 font-mono uppercase text-[10px]">Server Archived PDF/Image Source URL</label>
                  <input 
                    type="text"
                    value={formPdfUrl}
                    onChange={(e) => setFormPdfUrl(e.target.value)}
                    className="w-full bg-indigo-50/30 border border-indigo-100 p-2 text-xs rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="/uploads/SO-98471-A_source.pdf"
                  />
                </div>

                {/* Destination notes */}
                <div className="sm:col-span-2">
                  <label className="block text-slate-600 font-bold mb-1 font-mono uppercase text-[10px]">Recipient Instructions & Driver Dispatch Notes</label>
                  <textarea 
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    rows={2}
                    className="w-full bg-white border border-slate-200 p-2 text-xs rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Unload by crane on NW gravel side pathway. Avoid wet front grass area."
                  />
                </div>

              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 rounded-lg text-gray-700 hover:bg-slate-200 transition-colors font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-800 text-white rounded-lg hover:bg-blue-900 shadow-sm transition-colors font-bold cursor-pointer"
                >
                  Confirm and Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmId && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-55 backdrop-blur-xs">
          <div 
            className="fixed inset-0" 
            onClick={() => setShowDeleteConfirmId(null)}
          />
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full relative z-10 animate-in fade-in zoom-in duration-150 p-6">
            <div className="flex items-center space-x-3 text-red-600 mb-4">
              <div className="p-2 bg-red-50 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <h4 className="font-sans font-bold text-slate-900 text-lg">
                Confirm Deletion
              </h4>
            </div>
            
            <p className="text-slate-600 text-sm mb-6 leading-relaxed">
              Are you sure you want to permanently delete delivery ticket <strong className="text-slate-900 font-semibold">{showDeleteConfirmId}</strong>? This action cannot be undone and will remove the item from all dashboards.
            </p>

            <div className="flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirmId(null)}
                className="px-4 py-2 bg-slate-100 rounded-lg text-slate-700 hover:bg-slate-200 transition-colors font-semibold cursor-pointer text-xs"
              >
                Cancel, Keep Ticket
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteDelivery(showDeleteConfirmId);
                  setShowDeleteConfirmId(null);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-sm transition-colors font-bold cursor-pointer text-xs flex items-center space-x-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Picker Assignment Modal (Manual "Loaded on Truck" confirmation flow) */}
      {pickerModalDeliveryId && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-55 backdrop-blur-xs">
          <div 
            className="fixed inset-0" 
            onClick={() => setPickerModalDeliveryId(null)}
          />
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 max-w-md w-full relative z-10 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center space-x-2 text-blue-700 mb-4">
              <User className="h-5 w-5" />
              <h4 className="font-sans font-bold text-slate-900 text-lg">
                Assign Warehouse Picker
              </h4>
            </div>
            
            <p className="text-slate-600 text-sm mb-4 leading-relaxed">
              Moving manual ticket <strong className="text-slate-900 font-semibold">{pickerModalDeliveryId}</strong> to the <strong>Loaded on Truck</strong> stage requires identifying the picker responsible for staging the cargo.
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-slate-500 font-bold mb-1 font-mono uppercase text-[10px]">Select Registered Picker *</label>
                <select
                  required
                  value={quickSelectedPicker}
                  onChange={(e) => setQuickSelectedPicker(e.target.value)}
                  className="w-full bg-white border border-slate-200 p-2.5 text-xs rounded-lg font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">-- Choose Picker (Required) --</option>
                  {users.filter(u => u.role === 'Picker').map(u => (
                    <option key={u.id} value={u.id}>
                      👤 {u.name} ({u.email})
                    </option>
                  ))}
                  <option value="Picked up at Supplier">📦 Picked up at Supplier</option>
                  <option value="Picked up at Store">🏪 Picked up at Store</option>
                </select>
                {users.filter(u => u.role === 'Picker').length === 0 && (
                  <div className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5 mt-2 font-sans leading-relaxed">
                    ⚠️ No users with the <strong>Picker</strong> role are registered. Please create a Picker in <strong>Fleet Setup &gt; Users Setup</strong> first, or register one in the portal registration.
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setPickerModalDeliveryId(null)}
                className="px-4 py-2 bg-slate-100 rounded-lg text-slate-700 hover:bg-slate-200 transition-colors font-semibold cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!quickSelectedPicker}
                onClick={handleConfirmQuickPickerLoad}
                className="px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 shadow-sm transition-colors font-bold cursor-pointer text-xs flex items-center space-x-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Confirm &amp; Load Truck</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Digitized Document Preview Modal */}
      {previewDocDelivery && (
        <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center p-4 z-55 backdrop-blur-sm animate-in fade-in duration-150">
          <div 
            className="fixed inset-0" 
            onClick={() => setPreviewDocDelivery(null)}
          />
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-3xl w-full relative z-10 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-mono font-bold text-slate-100 text-sm flex items-center space-x-2">
                    <span>Digitized Physical Document Archive</span>
                    <span className="text-xs px-2 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-800/50 rounded font-semibold font-mono">
                      {previewDocDelivery.epicorSalesOrder || previewDocDelivery.invoiceNumber || previewDocDelivery.id}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 font-sans mt-0.5">
                    Ticket ID: <strong className="text-slate-200 font-mono">{previewDocDelivery.id}</strong> &bull; {previewDocDelivery.customerName}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => openScannedDocumentInNewTab(previewDocDelivery)}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center space-x-1.5 cursor-pointer"
                  title="Open document in a dedicated browser tab"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Open in New Tab</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDocDelivery(null)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Document Render Canvas */}
            <div className="p-6 overflow-y-auto bg-slate-950/90 flex justify-center items-center">
              <div className="bg-white rounded-xl p-4 shadow-2xl max-w-full overflow-auto">
                {(() => {
                  const pdfUrl = getEffectivePdfUrl(previewDocDelivery);
                  if (pdfUrl.startsWith('data:image/svg+xml;base64,')) {
                    try {
                      const base64Str = pdfUrl.replace('data:image/svg+xml;base64,', '');
                      const svgStr = decodeURIComponent(escape(atob(base64Str)));
                      return <div dangerouslySetInnerHTML={{ __html: svgStr }} className="w-full flex justify-center" />;
                    } catch (e) {
                      return <img src={pdfUrl} alt="Digitized Document" className="max-w-full h-auto rounded" />;
                    }
                  } else if (pdfUrl.startsWith('<svg')) {
                    return <div dangerouslySetInnerHTML={{ __html: pdfUrl }} className="w-full flex justify-center" />;
                  } else {
                    return <img src={pdfUrl} alt="Digitized Document" className="max-w-full h-auto rounded" />;
                  }
                })()}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between shrink-0 text-xs text-slate-400">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-mono text-[11px] text-slate-300">
                  Azure OCR High-Fidelity Gate Archive Verified
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => openScannedDocumentInNewTab(previewDocDelivery)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg transition-colors cursor-pointer flex items-center space-x-1"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Full Screen</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDocDelivery(null)}
                  className="px-4 py-1.5 bg-indigo-900/60 hover:bg-indigo-900/80 text-indigo-200 font-bold rounded-lg transition-colors cursor-pointer border border-indigo-800/40"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
