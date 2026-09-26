import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Truck, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Phone, 
  Mail, 
  ChevronRight, 
  Copy, 
  Check, 
  ExternalLink, 
  AlertCircle, 
  Calendar, 
  ShieldCheck, 
  Package, 
  Navigation, 
  FileText, 
  Share2,
  X
} from 'lucide-react';
import heroTruckImage from '../assets/images/tracking_hero_banner_1790245493337.jpg';
import { createClient } from '../utils/supabase/client';

interface JourneyStep {
  key: string;
  title: string;
  subtitle?: string;
  timestamp: string | null;
  isCompleted: boolean;
  isActive: boolean;
}

export interface TenantBrand {
  id?: string;
  name: string;
  code: string;
  color?: string;
  supportEmail?: string;
  regionalFocus?: string;
}

interface TrackingData {
  id: string;
  trackingNumber: string;
  tenantBrand?: TenantBrand | null;
  customerEmail?: string;
  customerName: string;
  destination: string;
  originBranch: string;
  orderNumber: string;
  status: string;
  registeredAt: string;
  scheduledDate?: string;
  scheduledSlot?: string;
  pickedAt?: string | null;
  deliveredAt?: string | null;
  customerSignature?: string | null;
  deliveryPhotos?: string[];
  destinationNotes?: string | null;
  journeySteps: JourneyStep[];
  truck?: {
    id: string;
    name: string;
    driver: string;
    type: string;
    lat: number;
    lng: number;
    licensePlate?: string;
    speed?: number;
  } | null;
}

export default function CustomerTrackingPortal({ isEmbedded = false }: { isEmbedded?: boolean }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTrackingNumber, setActiveTrackingNumber] = useState('');
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [activeTenant, setActiveTenant] = useState<TenantBrand | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedNum, setCopiedNum] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);

  // Initialize tenant branding from cached local storage if available
  useEffect(() => {
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('prospaces_active_tenant') : null;
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.name && !parsed.name.toLowerCase().includes('prospaces')) {
          setActiveTenant(parsed);
        }
      }
    } catch (_) {}
  }, []);

  // Initialize from URL param if present (e.g. ?num=PSL-965112 or ?tracking=...)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const queryParam = params.get('num') || params.get('tracking') || params.get('id') || params.get('track');
      if (queryParam) {
        const clean = queryParam.trim();
        setSearchQuery(clean);
        setActiveTrackingNumber(clean);
        fetchTrackingDetails(clean);
      }
    }
  }, []);

  // Helper to format a raw delivery record into the rich TrackingData interface
  const formatRawDelivery = (d: any, cleanParam: string): TrackingData => {
    let meta: any = {};
    if (d.items && Array.isArray(d.items) && d.items.length > 0) {
      try {
        const itemZero = d.items[0];
        const parsed = typeof itemZero === "string" ? JSON.parse(itemZero) : itemZero;
        if (parsed?._meta) meta = parsed._meta;
      } catch (_) {}
    }

    const fallbackDigits = Math.abs(String(d.id || cleanParam).split("").reduce((a: number, b: string) => ((a << 5) - a) + b.charCodeAt(0), 0)) % 900000 + 100000;
    const trackingNumber = d.trackingNumber || d.tracking_number || meta.trackingNumber || (cleanParam.startsWith("PSL-") ? cleanParam : `PSL-${fallbackDigits}`);
    const customerName = d.customerName || d.customer || d.customer_name || meta.customerName || "Valued Customer";
    const destination = d.deliveryAddress || d.destination || d.dropoff_location || meta.deliveryAddress || "Standard Delivery Address";
    const originBranch = d.originBranch || d.pickup_location || meta.originBranch || "RONA Dartmouth (Store 7020)";
    const orderNumber = d.invoiceNumber || d.orderNumber || d.epicorSalesOrder || meta.invoiceNumber || d.id;
    const status = d.status || meta.status || "REGISTERED";
    const regTime = meta.registeredAt || d.created_at || d.registeredAt || new Date().toISOString();
    const pickTime = meta.pickedAt || d.pickedAt || null;
    const delTime = meta.deliveredAt || d.deliveredAt || null;

    const journeySteps: JourneyStep[] = [
      {
        key: "REGISTERED",
        title: "Order Registered",
        subtitle: "Order received and queued for staging",
        timestamp: regTime,
        isCompleted: true,
        isActive: status === "REGISTERED"
      },
      {
        key: "PROCESSING",
        title: "Processing at Warehouse",
        subtitle: "Cargo staged and verified at loading dock",
        timestamp: pickTime || (status !== "REGISTERED" ? regTime : null),
        isCompleted: status === "PICKED_AND_LOADED" || status === "IN_TRANSIT" || status === "DELIVERED",
        isActive: status === "PICKED_AND_LOADED"
      },
      {
        key: "OUT_FOR_DELIVERY",
        title: "Out for Delivery",
        subtitle: "Flatbed dispatched on route to project site",
        timestamp: (status === "IN_TRANSIT" || status === "DELIVERED") ? (pickTime || regTime) : null,
        isCompleted: status === "DELIVERED",
        isActive: status === "IN_TRANSIT"
      },
      {
        key: "DELIVERED",
        title: "Delivered",
        subtitle: "Drop-off completed and receipt signed",
        timestamp: delTime,
        isCompleted: status === "DELIVERED",
        isActive: status === "DELIVERED"
      }
    ];

    return {
      id: d.id,
      trackingNumber,
      customerEmail: d.customerEmail || d.customer_email || meta.customerEmail,
      customerName,
      destination,
      originBranch,
      orderNumber,
      status,
      registeredAt: regTime,
      scheduledDate: d.scheduledDate || d.scheduled_date || meta.scheduledDate,
      scheduledSlot: d.scheduledSlot || d.scheduled_slot || meta.scheduledSlot,
      pickedAt: pickTime,
      deliveredAt: delTime,
      customerSignature: meta.customerSignature || d.customerSignature || null,
      deliveryPhotos: meta.deliveryPhotos || (meta.deliveryPhoto ? [meta.deliveryPhoto] : (d.deliveryPhotos || [])),
      destinationNotes: meta.destinationNotes || d.destinationNotes || null,
      journeySteps,
      truck: d.truck || (d.assignedTruck ? {
        id: d.assignedTruck,
        name: d.assignedTruck,
        driver: d.assignedDriver || "Assigned Driver",
        type: "Curtain-side Flatbed",
        lat: 44.6855,
        lng: -63.5825
      } : null)
    };
  };

  const fetchTrackingDetails = async (trackingCode: string) => {
    const clean = trackingCode.trim();
    if (!clean) return;

    setIsLoading(true);
    setErrorMessage(null);

    // 1. Try serverless endpoint /api/tracking/:clean
    try {
      const res = await fetch(`/api/tracking/${encodeURIComponent(clean)}`);
      const contentType = res.headers.get("content-type") || "";
      if (res.ok && contentType.includes("application/json")) {
        const json = await res.json();
        if (json?.success && json?.delivery) {
          setTrackingData(json.delivery);
          setActiveTrackingNumber(json.delivery.trackingNumber || clean);
          setErrorMessage(null);
          setIsLoading(false);
          return;
        }
      }
    } catch (_) {}

    // 2. Try search endpoint /api/tracking-search?q=:clean
    try {
      const searchRes = await fetch(`/api/tracking-search?q=${encodeURIComponent(clean)}`);
      const searchType = searchRes.headers.get("content-type") || "";
      if (searchRes.ok && searchType.includes("application/json")) {
        const searchJson = await searchRes.json();
        if (searchJson?.success && searchJson.results && searchJson.results.length > 0) {
          const first = searchJson.results[0];
          const fullRes = await fetch(`/api/tracking/${encodeURIComponent(first.trackingNumber || first.id)}`);
          const fullType = fullRes.headers.get("content-type") || "";
          if (fullRes.ok && fullType.includes("application/json")) {
            const fullJson = await fullRes.json();
            if (fullJson?.success && fullJson.delivery) {
              setTrackingData(fullJson.delivery);
              setActiveTrackingNumber(fullJson.delivery.trackingNumber || first.trackingNumber);
              setErrorMessage(null);
              setIsLoading(false);
              return;
            }
          }
        }
      }
    } catch (_) {}

    // 3. Resilient Direct Supabase Fallback (ensures live tracking functions even if server is offline)
    try {
      const supabase = createClient();
      if (supabase) {
        const cleanParam = clean.toLowerCase().replace(/[^a-z0-9]/g, "");

        // Direct query on deliveries table
        const { data: dbMatches } = await supabase
          .from("deliveries")
          .select("*")
          .or(`tracking_number.ilike.${clean},id.eq.${clean},orderNumber.ilike.${clean}`)
          .limit(10);

        if (dbMatches && dbMatches.length > 0) {
          const formatted = formatRawDelivery(dbMatches[0], clean);
          setTrackingData(formatted);
          setActiveTrackingNumber(formatted.trackingNumber);
          setErrorMessage(null);
          setIsLoading(false);
          return;
        }

        // Query by scanning all recent deliveries table rows
        const { data: allDels } = await supabase
          .from("deliveries")
          .select("*")
          .order("id", { ascending: false })
          .limit(150);

        if (allDels && allDels.length > 0) {
          for (const d of allDels) {
            const dId = String(d.id || "").toLowerCase().replace(/[^a-z0-9]/g, "");
            const dTrack = String(d.tracking_number || d.trackingNumber || "").toLowerCase().replace(/[^a-z0-9]/g, "");
            const dOrder = String(d.orderNumber || "").toLowerCase().replace(/[^a-z0-9]/g, "");
            const dEmail = String(d.customer_email || "").toLowerCase().trim();

            if (dTrack === cleanParam || dId === cleanParam || dOrder === cleanParam || dEmail === clean.toLowerCase() || dTrack.includes(cleanParam)) {
              const formatted = formatRawDelivery(d, clean);
              setTrackingData(formatted);
              setActiveTrackingNumber(formatted.trackingNumber);
              setErrorMessage(null);
              setIsLoading(false);
              return;
            }
          }
        }

        // Check kv_store tenant states
        const { data: kvStates } = await supabase
          .from("kv_store_8405be07")
          .select("value")
          .like("key", "%tenant_state%");

        if (kvStates) {
          for (const row of kvStates) {
            const dels = row.value?.deliveries || row.value?.state?.deliveries || [];
            for (const d of dels) {
              const dId = String(d.id || "").toLowerCase().replace(/[^a-z0-9]/g, "");
              const dTrack = String(d.trackingNumber || d.tracking_number || "").toLowerCase().replace(/[^a-z0-9]/g, "");
              const dOrder = String(d.orderNumber || d.invoiceNumber || "").toLowerCase().replace(/[^a-z0-9]/g, "");
              if (dTrack === cleanParam || dId === cleanParam || dOrder === cleanParam || dTrack.includes(cleanParam) || cleanParam.includes(dTrack)) {
                const formatted = formatRawDelivery(d, clean);
                setTrackingData(formatted);
                setActiveTrackingNumber(formatted.trackingNumber);
                setErrorMessage(null);
                setIsLoading(false);
                return;
              }
            }
          }
        }
      }
    } catch (sbErr) {
      console.warn("Direct Supabase tracking fallback notice:", sbErr);
    }

    // 4. LocalStorage cache fallback
    try {
      const cleanParam = clean.toLowerCase().replace(/[^a-z0-9]/g, "");
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i) || "";
        if (key.includes("deliveries")) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              for (const d of parsed) {
                const dId = String(d.id || "").toLowerCase().replace(/[^a-z0-9]/g, "");
                const dTrack = String(d.trackingNumber || d.tracking_number || "").toLowerCase().replace(/[^a-z0-9]/g, "");
                const dOrder = String(d.orderNumber || d.invoiceNumber || "").toLowerCase().replace(/[^a-z0-9]/g, "");
                if (dTrack === cleanParam || dId === cleanParam || dOrder === cleanParam || dTrack.includes(cleanParam) || cleanParam.includes(dTrack)) {
                  const formatted = formatRawDelivery(d, clean);
                  setTrackingData(formatted);
                  setActiveTrackingNumber(formatted.trackingNumber);
                  setErrorMessage(null);
                  setIsLoading(false);
                  return;
                }
              }
            }
          }
        }
      }
    } catch (_) {}

    // Not found
    setTrackingData(null);
    setErrorMessage(`No delivery record found matching "${clean}". Please verify your tracking number or search using your ticket or invoice reference.`);
    setIsLoading(false);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    fetchTrackingDetails(searchQuery.trim());
  };

  const copyTrackingNumber = () => {
    if (!trackingData) return;
    navigator.clipboard.writeText(trackingData.trackingNumber);
    setCopiedNum(true);
    setTimeout(() => setCopiedNum(false), 2000);
  };

  const copyDirectTrackingLink = () => {
    if (!trackingData) return;
    const url = `${window.location.origin}/track?num=${encodeURIComponent(trackingData.trackingNumber)}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Helper date formatter matching screenshot: "Apr 25, 2025" and "10:24 AM"
  const formatJourneyDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return { date: '—', time: '' };
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return { date: dateStr, time: '' };
      const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      return { date, time };
    } catch {
      return { date: dateStr, time: '' };
    }
  };

  const formatExpectedDelivery = (dateStr?: string) => {
    if (!dateStr) return 'Scheduled for Today';
    try {
      const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Map status to clean display title
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return { label: 'Delivered', color: 'text-emerald-600', banner: 'Your delivery has been safely delivered.' };
      case 'IN_TRANSIT':
        return { label: 'Out for Delivery', color: 'text-blue-600', banner: 'Your delivery is on the way and expected to arrive today.' };
      case 'PICKED_AND_LOADED':
        return { label: 'Processing at Warehouse', color: 'text-amber-600', banner: 'Your freight is loaded onto the dispatch flatbed.' };
      case 'RETURNED':
        return { label: 'Returned to Depot', color: 'text-red-600', banner: 'Delivery was returned to the distribution depot.' };
      default:
        return { label: 'Order Registered', color: 'text-sky-600', banner: 'Your order is confirmed and queued for departure staging.' };
    }
  };

  const statusInfo = getStatusDisplay(trackingData?.status || 'IN_TRANSIT');
  const currentBrandName = trackingData?.tenantBrand?.name || activeTenant?.name || 'RONA';

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 antialiased selection:bg-blue-600 selection:text-white">
      {/* Navigation Bar (Clean Customer Facing Style) */}
      {!isEmbedded && (
        <nav className="bg-slate-950/95 backdrop-blur-md text-white border-b border-white/10 px-5 sm:px-8 py-4 sticky top-0 z-40">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            {/* Active Tenant LOGISTICS Brand Logo */}
            <a href="/track" className="flex items-center space-x-2.5 group">
              {/* Isometric 3D Box Emblem */}
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 p-1.5 shadow-md shadow-blue-500/30 flex items-center justify-center transform group-hover:scale-105 transition">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-extrabold tracking-tight text-white leading-none">
                  {currentBrandName}
                </span>
                <span className="text-[10px] font-bold text-sky-400 tracking-[0.2em] leading-none uppercase mt-0.5">
                  DELIVERY TRACKING
                </span>
              </div>
            </a>

            {/* Navigation Tabs */}
            <div className="flex items-center space-x-6 sm:space-x-8">
              <a 
                href="/track" 
                className="text-sm font-semibold text-white relative py-1 border-b-2 border-sky-400 flex items-center"
              >
                Track Delivery
              </a>
              <button 
                type="button"
                onClick={() => setShowContactModal(true)} 
                className="text-sm font-medium text-slate-300 hover:text-white transition cursor-pointer"
              >
                Contact Support
              </button>
            </div>
          </div>
        </nav>
      )}

      {/* Main Container */}
      <div className="w-full">
        {/* Hero Section with Truck Curving Highway Photograph */}
        <section className="relative overflow-hidden bg-slate-950 text-white min-h-[300px] sm:min-h-[360px] flex items-center justify-center">
          {/* Background Image of Freight Semi Truck on Highway */}
          <div className="absolute inset-0 z-0">
            <img 
              src={heroTruckImage} 
              alt={`${currentBrandName} Logistics Highway Freight Fleet`}
              className="w-full h-full object-cover object-center opacity-45 scale-105 transform hover:scale-100 transition-all duration-1000"
            />
            {/* Gradient Overlays for optimal readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/50" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-transparent to-slate-950/80" />
          </div>

          <div className="relative z-10 max-w-3xl mx-auto px-5 py-10 sm:py-14 text-center w-full">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-3 drop-shadow-md">
              Track Your Delivery
            </h1>
            <p className="text-sm sm:text-base text-slate-200 max-w-xl mx-auto mb-8 font-normal drop-shadow">
              Enter your tracking number or sales order number below to view the live status of your shipment.
            </p>

            {/* Tracking Search Input Form */}
            <form onSubmit={handleSearchSubmit} className="max-w-xl mx-auto">
              <div className="flex flex-col sm:flex-row items-stretch gap-2.5 sm:gap-0 bg-white p-1.5 rounded-2xl sm:rounded-full shadow-2xl shadow-black/40 border border-white/20">
                <div className="relative flex-1 flex items-center pl-4 pr-3 py-2 sm:py-1.5">
                  <Search className="w-5 h-5 text-slate-400 mr-2.5 flex-shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Enter tracking number, ticket ID, or sales order reference..."
                    className="w-full text-slate-900 placeholder-slate-400 text-sm font-medium focus:outline-none bg-transparent"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="text-slate-400 hover:text-slate-600 p-1 mr-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm px-8 py-3.5 rounded-xl sm:rounded-full transition duration-200 shadow-md flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-70"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Tracking...</span>
                    </>
                  ) : (
                    <span>Track</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* Loading Indicator */}
        {isLoading && (
          <div className="max-w-4xl mx-auto px-5 py-12 text-center">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-sm text-slate-600 font-medium">Looking up live delivery docket...</p>
          </div>
        )}

        {/* Error notification if not found */}
        {errorMessage && !isLoading && (
          <div className="max-w-4xl mx-auto px-5 mt-8">
            <div className="bg-red-50 border border-red-200 text-red-800 p-5 rounded-2xl flex items-start space-x-3.5 text-sm shadow-xs">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-red-900 text-base">Tracking Number Not Found</p>
                <p className="mt-1 text-xs text-red-700 leading-relaxed">{errorMessage}</p>
                <p className="mt-3 text-xs text-red-600 border-t border-red-200/60 pt-2.5">
                  Tip: Please verify the tracking number provided in your dispatch notification email, or search using your ticket or invoice reference.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Empty State Welcome Guide (When no search has been performed yet) */}
        {!trackingData && !errorMessage && !isLoading && (
          <div className="max-w-4xl mx-auto px-5 py-12">
            <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-10 shadow-sm text-center">
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xs">
                <Package className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Live {currentBrandName} Delivery Portal</h3>
              <p className="text-sm text-slate-600 max-w-lg mx-auto mb-8">
                Enter your shipment tracking number (provided in your confirmation email) or sales order number above to view real-time transit status, route telemetry, and proof-of-delivery receipts.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left border-t border-slate-100 pt-6">
                <div className="p-4 bg-slate-50 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center mb-2 font-bold text-sm">1</div>
                  <h4 className="font-semibold text-slate-900 text-sm">Real-Time Transit</h4>
                  <p className="text-xs text-slate-500 mt-1">Track milestone progress from warehouse dock to jobsite dropoff.</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2 font-bold text-sm">2</div>
                  <h4 className="font-semibold text-slate-900 text-sm">Proof of Delivery</h4>
                  <p className="text-xs text-slate-500 mt-1">Access signed delivery receipts and on-site arrival photographic evidence.</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center mb-2 font-bold text-sm">3</div>
                  <h4 className="font-semibold text-slate-900 text-sm">Direct Support</h4>
                  <p className="text-xs text-slate-500 mt-1">Instant dispatch contact for delivery adjustments or gate access notes.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results Container: Directly matches the user's reference mockup */}
        {trackingData && (
          <main className="max-w-6xl mx-auto px-5 sm:px-8 py-8 sm:py-12">
            {/* Top Info Bar: Order Identifier & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-8 border-b border-slate-200 gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold uppercase tracking-wider font-mono text-slate-500">
                    Shipment Docket
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-blue-100 text-blue-800 font-mono">
                    {trackingData.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mt-1">
                  {trackingData.customerName}
                </h2>
                <p className="text-xs text-slate-500 flex items-center mt-1">
                  <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400" />
                  <span>{trackingData.destination}</span>
                </p>
              </div>

              {/* Share & Copy Actions */}
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={copyDirectTrackingLink}
                  className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition cursor-pointer shadow-sm"
                  title="Copy permanent tracking link to clipboard"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5 text-slate-500" />}
                  <span>{copiedLink ? 'Link Copied!' : 'Share Tracking Link'}</span>
                </button>

                {trackingData.truck && (
                  <button
                    type="button"
                    onClick={() => setShowMapModal(true)}
                    className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition cursor-pointer"
                  >
                    <Navigation className="w-3.5 h-3.5 text-blue-600" />
                    <span>View Truck GPS</span>
                  </button>
                )}
              </div>
            </div>

            {/* Desktop 2-Column Grid / Mobile Vertical Stack */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* LEFT / MAIN COLUMN: "Your Delivery Journey" (Cols 1-7 or 8) */}
              <div className="lg:col-span-7 bg-white rounded-2xl">
                <div className="mb-8">
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                    Your Delivery Journey
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Live milestone progress updated by dispatch warehouse sensors &amp; driver mobile terminal.
                  </p>
                </div>

                {/* 1. DESKTOP HORIZONTAL STEPPER (Rendered on tablet & desktop screens) */}
                <div className="hidden md:block">
                  <div className="relative flex items-center justify-between pb-4">
                    {/* Horizontal connecting line bar behind the circles */}
                    <div className="absolute top-6 left-8 right-8 h-1 bg-slate-200 z-0">
                      {/* Active filled line portion */}
                      <div 
                        className="h-full bg-blue-600 transition-all duration-700"
                        style={{
                          width: trackingData.status === 'DELIVERED' 
                            ? '100%' 
                            : trackingData.status === 'IN_TRANSIT' 
                              ? '66%' 
                              : trackingData.status === 'PICKED_AND_LOADED'
                                ? '33%'
                                : '0%'
                        }}
                      />
                    </div>

                    {/* Step Milestone Nodes */}
                    {trackingData.journeySteps.map((step, idx) => {
                      const isComplete = step.isCompleted;
                      const isActive = step.isActive;
                      const dateObj = formatJourneyDate(step.timestamp);

                      return (
                        <div key={step.key} className="relative z-10 flex flex-col items-center text-center max-w-[130px]">
                          {/* Circle Icon Indicator */}
                          <div 
                            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-sm ${
                              isActive 
                                ? 'bg-blue-600 text-white ring-4 ring-blue-100 scale-110 shadow-blue-500/30'
                                : isComplete
                                  ? 'bg-blue-50 text-blue-600 border-2 border-blue-600'
                                  : 'bg-white text-slate-300 border-2 border-slate-300'
                            }`}
                          >
                            {idx === 2 ? (
                              <Truck className={`w-5 h-5 ${isActive ? 'text-white' : isComplete ? 'text-blue-600' : 'text-slate-400'}`} />
                            ) : isComplete ? (
                              <CheckCircle2 className="w-6 h-6 text-blue-600 fill-blue-50" />
                            ) : (
                              <div className="w-3 h-3 rounded-full bg-slate-300" />
                            )}
                          </div>

                          {/* Step Title */}
                          <h4 className={`text-xs font-bold mt-3 leading-tight ${
                            isActive ? 'text-blue-600' : isComplete ? 'text-slate-900' : 'text-slate-400'
                          }`}>
                            {step.title}
                          </h4>

                          {/* Timestamp */}
                          <div className="mt-1 text-[11px] font-mono leading-tight">
                            {dateObj.date !== '—' ? (
                              <>
                                <p className="text-slate-700 font-medium">{dateObj.date}</p>
                                <p className="text-slate-400 text-[10px]">{dateObj.time}</p>
                              </>
                            ) : (
                              <p className="text-slate-300">—</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. MOBILE VERTICAL TIMELINE (Rendered on mobile view & small screens, matching the phone screen in reference photo!) */}
                <div className="block md:hidden">
                  <div className="relative pl-6 space-y-7 before:absolute before:left-[19px] before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
                    {trackingData.journeySteps.map((step, idx) => {
                      const isComplete = step.isCompleted;
                      const isActive = step.isActive;
                      const dateObj = formatJourneyDate(step.timestamp);

                      return (
                        <div key={step.key} className="relative flex items-start space-x-4">
                          {/* Left Milestone Icon */}
                          <div 
                            className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 -ml-6 transition shadow-sm ${
                              isActive
                                ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                                : isComplete
                                  ? 'bg-blue-50 text-blue-600 border-2 border-blue-600'
                                  : 'bg-white text-slate-300 border-2 border-slate-300'
                            }`}
                          >
                            {idx === 2 ? (
                              <Truck className={`w-4 h-4 ${isActive ? 'text-white' : isComplete ? 'text-blue-600' : 'text-slate-400'}`} />
                            ) : isComplete ? (
                              <Check className="w-4 h-4 text-blue-600 stroke-[3]" />
                            ) : (
                              <div className="w-2 h-2 rounded-full bg-slate-300" />
                            )}
                          </div>

                          {/* Content Details */}
                          <div className="flex-1 pt-0.5">
                            <div className="flex items-center justify-between">
                              <h4 className={`text-sm font-bold ${
                                isActive ? 'text-blue-600' : isComplete ? 'text-slate-900' : 'text-slate-400'
                              }`}>
                                {step.title}
                              </h4>
                              {isActive && (
                                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                                  Current
                                </span>
                              )}
                            </div>

                            {dateObj.date !== '—' ? (
                              <div className="flex items-center space-x-2 mt-0.5 text-xs text-slate-500 font-mono">
                                <span>{dateObj.date}</span>
                                <span>•</span>
                                <span>{dateObj.time}</span>
                              </div>
                            ) : (
                              <p className="text-xs text-slate-300 font-mono mt-0.5">—</p>
                            )}

                            {step.subtitle && (
                              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                {step.subtitle}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Additional Milestone Context Box */}
                {trackingData.destinationNotes && (
                  <div className="mt-8 bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-700">
                    <span className="font-bold text-slate-900 block mb-1">
                      Delivery Site Notes &amp; Access Guidance:
                    </span>
                    <p className="text-slate-600 leading-relaxed">
                      {trackingData.destinationNotes}
                    </p>
                  </div>
                )}

                {/* Proof of Delivery (POD) display when delivered */}
                {trackingData.status === 'DELIVERED' && (
                  <div className="mt-8 bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
                    <div className="flex items-center space-x-2 mb-3">
                      <ShieldCheck className="w-5 h-5 text-emerald-600" />
                      <h4 className="font-bold text-sm text-emerald-900">
                        Electronic Proof of Delivery (POD) Completed
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {trackingData.customerSignature && (
                        <div className="bg-white p-3 rounded-xl border border-emerald-200">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                            Recipient Signoff
                          </span>
                          <div className="h-16 flex items-center justify-center border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
                            {trackingData.customerSignature.startsWith('data:') ? (
                              <img src={trackingData.customerSignature} alt="Signature" className="max-h-14 object-contain" />
                            ) : (
                              <span className="font-serif italic text-slate-700 text-sm">{trackingData.customerSignature}</span>
                            )}
                          </div>
                        </div>
                      )}

                      {trackingData.deliveryPhotos && trackingData.deliveryPhotos.length > 0 && (
                        <div className="bg-white p-3 rounded-xl border border-emerald-200">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                            Drop Site Photograph
                          </span>
                          <img 
                            src={trackingData.deliveryPhotos[0]} 
                            alt="Drop Site" 
                            className="h-16 w-full object-cover rounded-lg border border-slate-200" 
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN: Light Sky Blue Delivery Summary Card (Cols 8-12) */}
              <div className="lg:col-span-5">
                <div className="bg-sky-50/70 border border-sky-100 rounded-2xl p-6 sm:p-7 shadow-sm">
                  {/* Tracking Number */}
                  <div className="mb-5 pb-5 border-b border-sky-100">
                    <span className="text-xs font-semibold text-slate-500 block mb-1 font-mono uppercase tracking-wider">
                      Tracking Number
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono tracking-tight">
                        {trackingData.trackingNumber}
                      </span>
                      <button
                        type="button"
                        onClick={copyTrackingNumber}
                        className="text-sky-600 hover:text-sky-800 p-1.5 rounded-lg hover:bg-sky-100/70 transition cursor-pointer"
                        title="Copy tracking number"
                      >
                        {copiedNum ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Current Status */}
                  <div className="mb-5 pb-5 border-b border-sky-100">
                    <span className="text-xs font-semibold text-slate-500 block mb-1 font-mono uppercase tracking-wider">
                      Current Status
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-600"></span>
                      </span>
                      <span className={`text-lg sm:text-xl font-bold ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                  </div>

                  {/* Expected Delivery */}
                  <div className="mb-6">
                    <span className="text-xs font-semibold text-slate-500 block mb-1 font-mono uppercase tracking-wider">
                      Expected Delivery
                    </span>
                    <span className="text-lg sm:text-xl font-bold text-slate-900">
                      {formatExpectedDelivery(trackingData.scheduledDate || trackingData.registeredAt)}
                    </span>
                  </div>

                  {/* Description Banner Box (Exactly as in the reference screenshot) */}
                  <div className="bg-white/80 border border-sky-200/80 rounded-xl p-4 shadow-xs">
                    <div className="flex items-start space-x-2.5">
                      <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                      <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed">
                        {statusInfo.banner}
                      </p>
                    </div>
                  </div>

                  {/* Enforced Customer Email & Notification Badge */}
                  {trackingData.customerEmail && (
                    <div className="mt-4 pt-4 border-t border-sky-100 text-xs text-slate-500 flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        <Mail className="w-3.5 h-3.5 text-sky-600" />
                        <span className="font-mono text-[11px] text-slate-600">{trackingData.customerEmail}</span>
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Email Alerts Active
                      </span>
                    </div>
                  )}

                  {/* Origin Depot & Freight Info */}
                  <div className="mt-6 pt-5 border-t border-sky-100/80 space-y-2 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Origin Depot:</span>
                      <span className="font-semibold text-slate-800">{trackingData.originBranch}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Order Reference:</span>
                      <span className="font-mono text-slate-800">{trackingData.orderNumber}</span>
                    </div>
                    {trackingData.truck && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Assigned Flatbed:</span>
                        <span className="font-semibold text-slate-800">{trackingData.truck.name}</span>
                      </div>
                    )}
                  </div>

                  {/* Need Help CTA Button */}
                  <button
                    type="button"
                    onClick={() => setShowContactModal(true)}
                    className="w-full mt-6 bg-white hover:bg-slate-50 text-slate-800 border border-sky-200 font-semibold py-2.5 rounded-xl text-xs shadow-xs transition flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5 text-sky-600" />
                    <span>Need Help? Contact Dispatch</span>
                  </button>
                </div>
              </div>
            </div>
          </main>
        )}

        {/* Footer */}
        <footer className="bg-slate-900 text-slate-400 text-xs border-t border-slate-800 py-8 px-5 sm:px-8 mt-12">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <Package className="w-4 h-4 text-sky-400" />
              <span className="font-bold text-white">{currentBrandName} Logistics</span>
              <span>© {new Date().getFullYear()} All Rights Reserved.</span>
            </div>

            <div className="flex items-center space-x-6">
              <a href="/privacy-policy" className="hover:text-white transition">Privacy Policy</a>
              <a href="/terms-of-service" className="hover:text-white transition">Terms of Service</a>
              <button 
                type="button" 
                onClick={() => setShowContactModal(true)} 
                className="hover:text-white transition cursor-pointer"
              >
                Customer Support
              </button>
            </div>
          </div>
        </footer>
      </div>

      {/* Support / Contact Modal */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Contact {currentBrandName} Logistics Dispatch</h3>
                  <p className="text-xs text-slate-500">Live Customer Delivery Support</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowContactModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-slate-600">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-800 block text-xs mb-1">Direct Dispatch Hotline</span>
                <p className="text-base font-bold text-blue-600 font-mono">1-800-555-0144</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Available Mon-Sat: 6:00 AM – 7:00 PM EST</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-800 block text-xs mb-1">Customer Support Email</span>
                <p className="font-mono text-slate-800">{trackingData?.tenantBrand?.supportEmail || activeTenant?.supportEmail || 'support@prospacescrm.ca'}</p>
              </div>

              <div className="p-3 bg-sky-50 rounded-xl border border-sky-100 text-sky-900">
                <p className="font-semibold">Have your tracking number ready:</p>
                <p className="font-mono font-bold text-sm text-sky-700 mt-0.5">
                  {trackingData?.trackingNumber || (activeTrackingNumber ? activeTrackingNumber : 'Order Reference')}
                </p>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowContactModal(false)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Truck GPS Modal */}
      {showMapModal && trackingData?.truck && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <Navigation className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Live Flatbed Vehicle Telematics</h3>
                  <p className="text-xs text-slate-500">{trackingData.truck.name} • Driver: {trackingData.truck.driver}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMapModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Simulated Live Route Graphic with Coordinates */}
            <div className="relative h-64 bg-slate-900 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center">
              {/* Map background grid simulation */}
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]"></div>
              
              <div className="relative z-10 text-center text-white px-4">
                <div className="inline-flex p-3 rounded-full bg-blue-600/30 ring-8 ring-blue-500/20 mb-3 animate-pulse">
                  <Truck className="w-8 h-8 text-blue-400" />
                </div>
                <h4 className="font-bold text-sm text-white">Truck En Route on Transit Corridor</h4>
                <p className="text-xs text-slate-300 font-mono mt-1">
                  GPS: {trackingData.truck.lat.toFixed(5)}° N, {trackingData.truck.lng.toFixed(5)}° W
                </p>
                <p className="text-[11px] text-emerald-400 font-semibold mt-1">
                  Speed: {trackingData.truck.speed ?? 0} km/h • ETA: Scheduled for today
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-lg">
                <span className="text-slate-400 font-mono text-[10px] uppercase block">Drop Destination</span>
                <span className="font-bold text-slate-800">{trackingData.destination}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg">
                <span className="text-slate-400 font-mono text-[10px] uppercase block">Assigned Driver</span>
                <span className="font-bold text-slate-800">{trackingData.truck.driver}</span>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowMapModal(false)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition cursor-pointer"
              >
                Close Map
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
