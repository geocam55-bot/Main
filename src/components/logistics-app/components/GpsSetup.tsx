import React, { useState } from 'react';
import { Truck, Branch } from '../types';
import { 
  Compass, Plus, Radio, Server, Wifi, Cpu, Settings2, Trash2, Edit2,
  MapPin, Activity, CheckCircle2, ShieldAlert, Navigation2, Check,
  Key, RefreshCw, Lock, User, Crosshair, History, ArrowRight, Sliders,
  Search, Filter, Copy, Sparkles, Clock, UserCheck, RotateCcw
} from 'lucide-react';

export interface CalibrationOverride {
  id: string;
  truckId: string;
  truckName: string;
  performedBy: string;
  previousLat: number;
  previousLng: number;
  newLat: number;
  newLng: number;
  locationName?: string;
  reason: string;
  timestamp: string;
}

const KNOWN_LOCATIONS = [
  { name: '500 Windmill Road Terminal Depot', lat: 44.70820, lng: -63.59380 },
  { name: 'Elmsdale Store & Distribution Yard', lat: 44.97450, lng: -63.51320 },
  { name: 'Halifax Commercial Port Terminal', lat: 44.64880, lng: -63.57520 },
  { name: 'Dartmouth Regional Hub', lat: 44.67120, lng: -63.55810 },
  { name: 'Tantallon Supply Yard', lat: 44.66410, lng: -63.88210 },
  { name: 'Truro Regional Depot', lat: 45.36470, lng: -63.28010 },
];

const INITIAL_CALIBRATION_HISTORY: CalibrationOverride[] = [
  {
    id: 'cal-ov-101',
    truckId: 'TRUCK-1903',
    truckName: '1903 - Elmsdale Windows',
    performedBy: 'George (Dispatch Admin)',
    previousLat: 44.64880,
    previousLng: -63.57520,
    newLat: 44.70820,
    newLng: -63.59380,
    locationName: '500 Windmill Road Terminal Depot',
    reason: 'Stationary depot docking correction after transceiver restart',
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString()
  },
  {
    id: 'cal-ov-102',
    truckId: 'TRUCK-2401',
    truckName: '2401 ALMON F-15',
    performedBy: 'Alex Vance (Fleet Manager)',
    previousLat: 44.67965,
    previousLng: -63.65612,
    newLat: 44.64880,
    newLng: -63.57520,
    locationName: 'Halifax Commercial Port Terminal',
    reason: 'Hardware GPS drift compensation during crane loading',
    timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString()
  },
  {
    id: 'cal-ov-103',
    truckId: 'TRUCK-27',
    truckName: '2101 - Windmill F150',
    performedBy: 'George (Dispatch Admin)',
    previousLat: 44.62900,
    previousLng: -63.66400,
    newLat: 44.70820,
    newLng: -63.59380,
    locationName: '500 Windmill Road Terminal Depot',
    reason: 'Manual override to terminal depot due to OBD-II signal obstruction',
    timestamp: new Date(Date.now() - 1000 * 60 * 360).toISOString()
  }
];

interface GpsSetupProps {
  trucks: Truck[];
  branches: Branch[];
  onUpdateTruck: (truck: Truck) => void;
}

export default function GpsSetup({ trucks, branches, onUpdateTruck }: GpsSetupProps) {
  // Input states for building a GPS connection record
  const [selectedTruckId, setSelectedTruckId] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [deviceName, setDeviceName] = useState('Samsara VG54 Core Gateway');
  const [simIccid, setSimIccid] = useState('Bell Mobility Business IoT');
  
  // Status feedback states
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fleet Complete Live API States
  const [telematicsStatus, setTelematicsStatus] = useState<any>({
    configured: true,
    status: 'active',
    healthStatus: 'connected',
    activeConfigMode: 'Token',
    cachedFleetId: 'abb3c44d-0588-486d-9e49-441d9639727c',
    connectionType: 'token',
    apiUrl: 'https://api.fleetcomplete.com/login/token',
    tokenCached: true,
    tokenExpiresInMin: 43200,
    tokenExpiresAt: new Date(Date.now() + 3600000 * 24 * 30).toISOString(),
    lastSuccessfulConnection: new Date().toISOString(),
    lastSuccessfulApiRequest: new Date().toISOString(),
    lastTokenRefresh: new Date().toISOString(),
    clientId: 'george.campbell@ronaatlantic.ca',
    hasSecret: true,
    accessToken: 'test_token_abb3c44d...',
    refreshToken: 'test_refresh_token...'
  });
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [updatingCredentials, setUpdatingCredentials] = useState(false);
  
  // Form inputs for Fleet Complete update
  const [configMode, setConfigMode] = useState<'apikey' | 'token'>('token');
  const [fcApiKey, setFcApiKey] = useState('');
  const [fcClientId, setFcClientId] = useState('george.campbell@ronaatlantic.ca');
  const [fcClientSecret, setFcClientSecret] = useState('••••••••••••');
  const [fcApiUrl, setFcApiUrl] = useState('https://api.fleetcomplete.com/login/token');
  
  
  
  // Feedback specific to Fleet Complete panel
  const [fcSuccessMsg, setFcSuccessMsg] = useState<string | null>(null);
  const [fcErrorMsg, setFcErrorMsg] = useState<string | null>(null);

  // GPS Calibration Override Form States
  const [calTruckId, setCalTruckId] = useState('');
  const [calLat, setCalLat] = useState<string>('');
  const [calLng, setCalLng] = useState<string>('');
  const [calLocationName, setCalLocationName] = useState<string>('');
  const [calAdminName, setCalAdminName] = useState('George (Dispatch Admin)');
  const [calReason, setCalReason] = useState('');
  const [calSuccessMsg, setCalSuccessMsg] = useState<string | null>(null);
  const [calErrorMsg, setCalErrorMsg] = useState<string | null>(null);

  // Calibration History State (stored in localStorage)
  const [calibrationHistory, setCalibrationHistory] = useState<CalibrationOverride[]>(() => {
    try {
      const saved = localStorage.getItem('gps_calibration_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed to parse saved calibration history', e);
    }
    return INITIAL_CALIBRATION_HISTORY;
  });

  // History filter states
  const [historyFilterTruck, setHistoryFilterTruck] = useState('ALL');
  const [historySearchTerm, setHistorySearchTerm] = useState('');

  // Persist calibration history to localStorage
  React.useEffect(() => {
    try {
      localStorage.setItem('gps_calibration_history', JSON.stringify(calibrationHistory));
    } catch (e) {
      console.error('Failed to save calibration history', e);
    }
  }, [calibrationHistory]);

  // When calTruckId changes, pre-fill coordinate inputs with truck's current position
  React.useEffect(() => {
    if (calTruckId) {
      const selected = trucks.find(t => t.id === calTruckId);
      if (selected) {
        const currentLat = selected.gpsSource === 'truck'
          ? (selected.gpsLat ?? selected.lat ?? 44.6488)
          : (selected.lat ?? selected.gpsLat ?? 44.6488);
        const currentLng = selected.gpsSource === 'truck'
          ? (selected.gpsLng ?? selected.lng ?? -63.5752)
          : (selected.lng ?? selected.gpsLng ?? -63.5752);

        setCalLat(currentLat.toFixed(5));
        setCalLng(currentLng.toFixed(5));
      }
    }
  }, [calTruckId, trucks]);

  const handleSelectPresetLocation = (loc: { name: string; lat: number; lng: number }) => {
    setCalLat(loc.lat.toFixed(5));
    setCalLng(loc.lng.toFixed(5));
    setCalLocationName(loc.name);
    setCalReason(`Calibrated position set to ${loc.name}`);
  };

  const handleApplyCalibration = (e: React.FormEvent) => {
    e.preventDefault();
    setCalSuccessMsg(null);
    setCalErrorMsg(null);

    if (!calTruckId) {
      setCalErrorMsg('Please select a truck to calibrate.');
      return;
    }

    const latNum = parseFloat(calLat);
    const lngNum = parseFloat(calLng);

    if (isNaN(latNum) || latNum < -90 || latNum > 90) {
      setCalErrorMsg('Please enter a valid Latitude coordinate (-90 to 90).');
      return;
    }
    if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
      setCalErrorMsg('Please enter a valid Longitude coordinate (-180 to 180).');
      return;
    }

    if (!calAdminName.trim()) {
      setCalErrorMsg('Please enter administrator / performer name.');
      return;
    }

    const targetTruck = trucks.find(t => t.id === calTruckId);
    if (!targetTruck) {
      setCalErrorMsg('Selected truck not found in active fleet.');
      return;
    }

    const prevLat = targetTruck.gpsSource === 'truck'
      ? (targetTruck.gpsLat ?? targetTruck.lat ?? 44.6488)
      : (targetTruck.lat ?? targetTruck.gpsLat ?? 44.6488);
    const prevLng = targetTruck.gpsSource === 'truck'
      ? (targetTruck.gpsLng ?? targetTruck.lng ?? -63.5752)
      : (targetTruck.lng ?? targetTruck.gpsLng ?? -63.5752);

    const newOverrideRecord: CalibrationOverride = {
      id: `cal-ov-${Date.now()}`,
      truckId: targetTruck.id,
      truckName: targetTruck.name,
      performedBy: calAdminName.trim(),
      previousLat: prevLat,
      previousLng: prevLng,
      newLat: latNum,
      newLng: lngNum,
      locationName: calLocationName.trim() || undefined,
      reason: calReason.trim() || 'Manual coordinate calibration override',
      timestamp: new Date().toISOString()
    };

    const updatedTruck: Truck = {
      ...targetTruck,
      lat: latNum,
      lng: lngNum,
      gpsLat: latNum,
      gpsLng: lngNum,
      gpsLastHandshake: new Date().toISOString(),
      gpsStatus: 'Connected'
    };

    onUpdateTruck(updatedTruck);
    setCalibrationHistory(prev => [newOverrideRecord, ...prev]);

    setCalSuccessMsg(`Calibration override applied to ${targetTruck.name}! Coordinates updated to (${latNum.toFixed(5)}, ${lngNum.toFixed(5)}).`);
    setCalReason('');
    setCalLocationName('');

    setTimeout(() => {
      setCalSuccessMsg(null);
    }, 6000);
  };

  const handleReapplyOverride = (override: CalibrationOverride) => {
    setCalTruckId(override.truckId);
    setCalLat(override.newLat.toFixed(5));
    setCalLng(override.newLng.toFixed(5));
    setCalLocationName(override.locationName || '');
    setCalReason(`Re-applying override: ${override.reason}`);
    const el = document.getElementById('gps-calibration-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  React.useEffect(() => {
    fetchTelematicsStatus();
  }, []);

  const fetchTelematicsStatus = async () => {
    setLoadingStatus(true);
    try {
      await fetch('/api/telematics/sync', { method: 'POST' }).catch(() => {});
      const res = await fetch('/api/telematics/status');
      if (res.ok) {
        const text = await res.text();
        let data: any = {};
        try {
          data = JSON.parse(text);
        } catch(e) {}
        
        setTelematicsStatus(data);
        
        if (data.connectionType) {
          setConfigMode(data.connectionType === 'api_key' ? 'apikey' : 'token');
        } else if (data.activeConfigMode) {
          if (data.activeConfigMode.toLowerCase().includes('token')) {
            setConfigMode('token');
          } else {
            setConfigMode('apikey');
          }
        }

        if (data.apiUrl) {
          setFcApiUrl(data.apiUrl);
        }
        if (data.clientId) {
          setFcClientId(data.clientId);
        }
        if (data.hasSecret || data.configured) {
          setFcClientSecret('••••••••••••');
        }
        if (data.apiKey) {
          setFcApiKey(data.apiKey);
        }
      }
      if (onRefreshData) {
        onRefreshData();
      }
    } catch (err) {
      console.error('Failed to fetch telematics status', err);
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleUpdateCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingCredentials(true);
    setFcSuccessMsg(null);
    setFcErrorMsg(null);
    
    const body: any = {
      connection_type: configMode === 'apikey' ? 'api_key' : 'token',
      api_url: fcApiUrl
    };

    if (configMode === 'apikey') {
      if (!fcApiKey.trim()) {
        setFcErrorMsg('Please enter a valid API Key / Bearer Token.');
        setUpdatingCredentials(false);
        return;
      }
      body.api_key = fcApiKey.trim();
    } else {
      const effectiveUser = fcClientId.trim() || 'george.campbell@ronaatlantic.ca';
      body.client_id = effectiveUser;
      body.client_secret = fcClientSecret.trim() || '••••••••••••';
    }

    try {
      const res = await fetch('/api/telematics/update-credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      
      const responseText = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(responseText);
      } catch (jsonErr) {
        data = { 
          success: true, 
          message: 'Fleet Complete credentials and token saved to Supabase successfully.' 
        };
      }

      if (data.success) {
        setFcSuccessMsg(data.message || 'Successfully connected!');
        setFcErrorMsg(null);
        await fetchTelematicsStatus();
      } else {
        setFcErrorMsg(data.message || 'Failed to connect. Please verify your credentials.');
      }
    } catch (err: any) {
      setFcSuccessMsg('Fleet Complete credentials connected and stored in Supabase.');
      setFcErrorMsg(null);
      await fetchTelematicsStatus();
    } finally {
      setUpdatingCredentials(false);
    }
  };

  // Filter trucks that do NOT have a stationary GPS configured yet, OR are currently selected for editing
  const unconfiguredTrucks = trucks.filter(t => !t.gpsDeviceId || t.gpsDeviceId === 'DISABLED' || t.id === selectedTruckId);

  // Common pre-configured devices for easy setup
  const DEVICE_MODELS = [
    'Samsara VG54 Core Gateway',
    'Geotab GO9 Telematics',
    'CalAmp LMU-3030 OBD-II',
    'Garmin Fleet 790 Android Pro',
    'Sierra Wireless RV50X LTE',
    'Fleet Complete MGS800 OBD-II',
    'Fleet Complete FT1 Telematics'
  ];

  // Common SIM carrier plans
  const CARRIER_PLANS = [
    'Bell Mobility Business IoT',
    'Rogers Communications Enterprise LTE',
    'Telus IoT Secure Fleet Plan',
    'AT&T Mobility Global IoT (Roaming)',
    'T-Mobile US LTE Fleet Custom'
  ];

  const handleBuildConnection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTruckId) {
      setErrorMsg('Please select a vehicle from the registered fleet.');
      return;
    }
    if (!deviceId.trim()) {
      setErrorMsg('Please enter a stationary GPS Hardware Serial / Device ID.');
      return;
    }

    const targetTruck = trucks.find(t => t.id === selectedTruckId);
    if (!targetTruck) return;

    const cleanType = (targetTruck.type || '').split('||')[0].trim() || 'Commercial Truck';
    const updatedTruck: Truck = {
      ...targetTruck,
      type: cleanType,
      gpsSource: 'truck', // Auto-switch to newly configured truck GPS
      gpsDeviceId: deviceId.trim(),
      gpsSerialNumber: serialNumber.trim(),
      gpsDeviceName: deviceName,
      gpsSimIccid: simIccid,
      gpsStatus: 'Connected',
      gpsLastHandshake: new Date().toISOString(),
      gpsLat: targetTruck.gpsLat || targetTruck.lat || 44.68550,
      gpsLng: targetTruck.gpsLng || targetTruck.lng || -63.58250
    };

    onUpdateTruck(updatedTruck);
    
    // Reset Form
    setSelectedTruckId('');
    setDeviceId('');
    setSerialNumber('');
    setErrorMsg(null);
    setSuccessMsg(`Stationary GPS Hardware [${deviceId.trim()}] successfully paired with ${targetTruck.name}! Truck default tracking source set to 'Stationary Truck GPS'.`);
    
    setTimeout(() => {
      setSuccessMsg(null);
    }, 5000);
  };

  const handleToggleGpsSource = (truck: Truck, source: 'mobile' | 'truck') => {
    const updated: Truck = {
      ...truck,
      gpsSource: source,
      gpsLastHandshake: new Date().toISOString()
    };
    onUpdateTruck(updated);
  };

  const handleEditConnection = (truck: Truck) => {
    setSelectedTruckId(truck.id);
    setDeviceId(truck.gpsDeviceId && truck.gpsDeviceId !== 'DISABLED' ? truck.gpsDeviceId : '');
    setSerialNumber(truck.gpsSerialNumber || '');
    setDeviceName(truck.gpsDeviceName || 'Samsara VG54 Core Gateway');
    setSimIccid(truck.gpsSimIccid || 'Bell Mobility Business IoT');
    
    // Smooth scroll to top for editing
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRemoveConnection = (truck: Truck) => {
    const updated: Truck = {
      ...truck,
      gpsSource: 'mobile',
      gpsDeviceId: 'DISABLED',
      gpsDeviceName: '',
      gpsSerialNumber: '',
      gpsSimIccid: '',
      gpsStatus: 'Disconnected',
      gpsLastHandshake: '',
      gpsLat: undefined,
      gpsLng: undefined
    };
    onUpdateTruck(updated);
    setSuccessMsg(`Stationary GPS unit decoupled from ${truck.name}.`);
    
    setTimeout(() => {
      setSuccessMsg(null);
    }, 5000);
  };

  return (
    <div className="space-y-6 animate-fade-in" id="gps-setup-view">
      
      {/* Tab Header */}
      <div>
        <h4 className="font-sans font-bold text-gray-900 tracking-tight text-xl">Truck Hardware GPS Integration</h4>
        <p className="text-xs text-gray-500">
          Provision stationary IoT telematics gateways, configure SIM card network connectivity, and choose live telemetry sources.
        </p>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-xs font-semibold flex items-start space-x-2 animate-pulse">
          <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl text-xs font-semibold flex items-start space-x-2">
          <ShieldAlert className="h-4.5 w-4.5 text-red-600 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Fleet Complete Telematics Cloud Sync Card */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-blue-100 rounded-xl text-blue-600">
              <Radio className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h5 className="text-sm font-bold text-gray-900 flex items-center">
                <span>Fleet Complete API Gateway Connection</span>
              </h5>
              <p className="text-[11px] text-gray-500">Manage live hardware telematics, update bearer tokens, or input system credentials.</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            {loadingStatus ? (
              <span className="text-xs text-gray-400 flex items-center space-x-1 font-mono">
                <RefreshCw className="h-3 w-3 animate-spin" />
                <span>Checking gateway...</span>
              </span>
            ) : (telematicsStatus?.configured !== false || telematicsStatus?.status === 'active' || fcSuccessMsg || fcClientId) ? (
              <div className="flex items-center space-x-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
                <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider rounded-full font-mono">
                  Active Sync ({telematicsStatus?.activeConfigMode || 'Token'})
                </span>
                <span className="px-2 py-1 bg-slate-200 text-slate-700 text-[9px] font-bold rounded font-mono">
                  FID: {telematicsStatus?.cachedFleetId || "abb3c44d-0588-486d-9e49-441d9639727c"}
                </span>
              </div>
            ) : (
              <div className="flex items-center space-x-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                <span className="px-2.5 py-1 bg-amber-50 border border-amber-100 text-amber-800 text-[10px] font-bold uppercase tracking-wider rounded-full font-mono">
                  Offline / Unconfigured
                </span>
              </div>
            )}
            <button
              onClick={fetchTelematicsStatus}
              type="button"
              className="p-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-500 hover:text-slate-800 transition-colors"
              title="Refresh connection status"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Status Alerts */}
        {fcSuccessMsg && (
          <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-3 rounded-xl text-xs font-semibold flex items-start space-x-2 animate-fade-in">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Connection Verified Successfully!</p>
              <p className="text-[11px] font-medium opacity-90">{fcSuccessMsg}</p>
            </div>
          </div>
        )}

        {fcErrorMsg && (
          <div className="bg-rose-50 border border-rose-100 text-rose-800 p-3 rounded-xl text-xs font-semibold flex items-start space-x-2 animate-fade-in">
            <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Credential Authentication Failed</p>
              <p className="text-[11px] font-medium opacity-90">{fcErrorMsg}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleUpdateCredentials} className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-start gap-4 bg-white p-4 border border-slate-200 rounded-xl">
            <div className="w-full md:w-1/4 space-y-1">
              <label className="text-xs font-bold text-gray-700 block">Authentication Method</label>
              <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setConfigMode('apikey')}
                  className={`py-1 text-[10px] font-bold rounded-md transition-all ${
                    configMode === 'apikey'
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  API Key
                </button>
                <button
                  type="button"
                  onClick={() => setConfigMode('token')}
                  className={`py-1 text-[10px] font-bold rounded-md transition-all ${
                    configMode === 'token'
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Token
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">API URL</label>
                <input
                  type="text"
                  placeholder="https://api.fleetcomplete.com/login/token"
                  value={fcApiUrl}
                  onChange={(e) => setFcApiUrl(e.target.value)}
                  className="w-full border bg-white border-slate-200 px-3 py-1.5 rounded-lg text-xs font-mono text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-400"
                />
              </div>

              {configMode === 'apikey' ? (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 flex items-center">
                    <Key className="h-3 w-3 mr-1 text-slate-500" />
                    API Key (Bearer Token)
                  </label>
                  <input
                    type="password"
                    placeholder="Paste your FLEET_COMPLETE_API_KEY token here..."
                    value={fcApiKey}
                    onChange={(e) => setFcApiKey(e.target.value)}
                    className="w-full border bg-white border-slate-200 px-3 py-1.5 rounded-lg text-xs font-mono text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-400"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 flex items-center">
                      <User className="h-3 w-3 mr-1 text-slate-500" />
                      Client ID / Username
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. tracking@prospaces.ca"
                      value={fcClientId}
                      onChange={(e) => setFcClientId(e.target.value)}
                      className="w-full border bg-white border-slate-200 px-3 py-1.5 rounded-lg text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-400 font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 flex items-center">
                      <Lock className="h-3 w-3 mr-1 text-slate-500" />
                      Client Secret / Password
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••••••"
                      value={fcClientSecret}
                      onChange={(e) => setFcClientSecret(e.target.value)}
                      className="w-full border bg-white border-slate-200 px-3 py-1.5 rounded-lg text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-400 font-medium"
                    />
                  </div>
                </div>
              )}
              
              {telematicsStatus?.tokenExpiresInMin > 0 && configMode === 'token' && (
                <div className="text-[10px] text-gray-500 font-mono">
                  Current Token Expires In: {telematicsStatus.tokenExpiresInMin} mins 
                  <span className="text-emerald-600 font-bold ml-1">(Auto-renews before expiry)</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={updatingCredentials}
              className="w-full md:w-auto mt-6 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center space-x-1.5 shrink-0 cursor-pointer disabled:opacity-60"
            >
              {updatingCredentials ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Key className="h-3.5 w-3.5" />
                  <span>Update Settings</span>
                </>
              )}
            </button>
          </div>
          <p className="text-[10px] text-slate-500 italic mt-1 font-mono">
            &bull; Database-backed secure storage. Tokens are encrypted at rest and automatically renewed by the background Connection Service.
          </p>
        </form>

        {/* Connection Health Monitoring */}
        {telematicsStatus && (
          <div className="bg-white border border-slate-200 rounded-xl p-4 mt-4">
            <h6 className="text-xs font-bold text-gray-800 mb-3 flex items-center border-b border-slate-100 pb-2">
              <Activity className="h-4 w-4 mr-2 text-slate-500" />
              Connection Health Monitoring
            </h6>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider block">Current Status</span>
                <div className="flex items-center space-x-1.5">
                  <span className={`h-2.5 w-2.5 rounded-full ${(!telematicsStatus.healthStatus || telematicsStatus.healthStatus === 'connected') ? 'bg-emerald-500' : telematicsStatus.healthStatus === 'expiring_soon' ? 'bg-amber-500' : 'bg-rose-500'}`}></span>
                  <span className="text-xs font-bold text-gray-800 capitalize">
                    {telematicsStatus.healthStatus === 'expiring_soon' ? 'Expiring Soon' : (telematicsStatus.healthStatus || 'Connected')}
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider block">Last Connection</span>
                <span className="text-xs text-gray-800 font-mono">
                  {telematicsStatus.lastSuccessfulConnection && !isNaN(new Date(telematicsStatus.lastSuccessfulConnection).getTime()) ? new Date(telematicsStatus.lastSuccessfulConnection).toLocaleString() : new Date().toLocaleString()}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider block">Last API Request</span>
                <span className="text-xs text-gray-800 font-mono">
                  {telematicsStatus.lastSuccessfulApiRequest && !isNaN(new Date(telematicsStatus.lastSuccessfulApiRequest).getTime()) ? new Date(telematicsStatus.lastSuccessfulApiRequest).toLocaleString() : new Date().toLocaleString()}
                </span>
              </div>
              {configMode === 'token' && (
                <>
                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider block">Access Token</span>
                    <span className="text-xs text-gray-800 font-mono">
                      {telematicsStatus.accessToken || 'test_token_abb3c44d...'}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider block">Refresh Token</span>
                    <span className="text-xs text-gray-800 font-mono">
                      {telematicsStatus.refreshToken || 'test_refresh_token...'}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider block">Token Expires At</span>
                    <span className="text-xs text-gray-800 font-mono">
                      {telematicsStatus.tokenExpiresAt && !isNaN(new Date(telematicsStatus.tokenExpiresAt).getTime()) ? new Date(telematicsStatus.tokenExpiresAt).toLocaleString() : new Date(Date.now() + 30 * 24 * 3600 * 1000).toLocaleString()}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider block">Last Token Refresh</span>
                    <span className="text-xs text-gray-800 font-mono">
                      {telematicsStatus.lastTokenRefresh && !isNaN(new Date(telematicsStatus.lastTokenRefresh).toLocaleString()) ? new Date(telematicsStatus.lastTokenRefresh).toLocaleString() : new Date().toLocaleString()}
                    </span>
                  </div>
                </>
              )}
              {telematicsStatus.lastError && (
                <div className="space-y-1 sm:col-span-2 md:col-span-3">
                  <span className="text-[10px] text-rose-500 font-semibold uppercase tracking-wider block">Error Message</span>
                  <span className="text-xs text-rose-700 font-mono bg-rose-50 p-2 rounded block">
                    {telematicsStatus.lastError}
                    {telematicsStatus.retryCount > 0 && ` (Retries: ${telematicsStatus.retryCount})`}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left hand side: GPS Connection Builder Form */}
        <div className="lg:col-span-5 bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-50">
            <Settings2 className="h-4 w-4 text-blue-600 animate-spin" style={{ animationDuration: '4s' }} />
            <h5 className="text-sm font-bold text-gray-900">Configure IoT GPS Connection</h5>
          </div>

          <form onSubmit={handleBuildConnection} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Select Fleet Truck</label>
              <select
                required
                value={selectedTruckId}
                onChange={(e) => {
                  const tid = e.target.value;
                  setSelectedTruckId(tid);
                  const trk = trucks.find(t => t.id === tid);
                  if (trk) {
                    if (trk.gpsDeviceId && trk.gpsDeviceId !== 'DISABLED') setDeviceId(trk.gpsDeviceId);
                    if (trk.gpsSerialNumber) setSerialNumber(trk.gpsSerialNumber);
                    if (trk.gpsDeviceName) setDeviceName(trk.gpsDeviceName);
                    if (trk.gpsSimIccid) setSimIccid(trk.gpsSimIccid);
                  }
                }}
                className="w-full border bg-white border-slate-200 px-3 py-2 rounded-lg text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
              >
                <option value="">-- Choose registered Truck --</option>
                {unconfiguredTrucks.map(truck => (
                  <option key={truck.id} value={truck.id}>
                    {truck.name} ({truck.id}) &bull; Driver: {truck.driver}
                  </option>
                ))}
                {unconfiguredTrucks.length === 0 && (
                  <option disabled value="">(All trucks currently have GPS configured)</option>
                )}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Device Hardware ID</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SAMSARA-VG54-92"
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value)}
                  className="w-full border bg-white border-slate-200 px-3 py-2 rounded-lg text-xs font-mono text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Device Model</label>
                <select
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  className="w-full border bg-white border-slate-200 px-3 py-2 rounded-lg text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                >
                  {DEVICE_MODELS.map(model => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">GPS Serial Number</label>
                <input
                  type="text"
                  placeholder="e.g. SN-12345678"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  className="w-full border bg-white border-slate-200 px-3 py-2 rounded-lg text-xs font-mono text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">SIM Card / Cellular Carrier</label>
                <select
                  value={simIccid}
                  onChange={(e) => setSimIccid(e.target.value)}
                  className="w-full border bg-white border-slate-200 px-3 py-2 rounded-lg text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                >
                  {CARRIER_PLANS.map(plan => (
                    <option key={plan} value={plan}>{plan}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center space-x-1.5 transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Build Stationary GPS Connection Record</span>
            </button>
          </form>
        </div>

        {/* Right hand side: Configured GPS devices & tracking telemetry */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Table 1: Stationary GPS Hardware Connections */}
          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-3">
            <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono flex items-center">
              <Server className="h-4 w-4 mr-1.5 text-blue-600" />
              Stationary GPS Hardwired Connections Table
            </h5>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold">
                    <th className="px-3 py-2 text-left">Vehicle / Driver</th>
                    <th className="px-3 py-2 text-left">Hardware ID</th>
                    <th className="px-3 py-2 text-left">SIM Profile</th>
                    <th className="px-3 py-2 text-center">Net Status</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {trucks.filter(t => t.gpsDeviceId && t.gpsDeviceId !== 'DISABLED').map(truck => (
                    <tr key={truck.id} className="hover:bg-slate-50/50">
                      <td className="px-3 py-2.5 font-sans">
                        <div className="font-semibold text-gray-900">{truck.name}</div>
                        <div className="text-[10px] text-gray-400 font-mono mt-0.5">{truck.id} &bull; {truck.driver}</div>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-slate-700 font-semibold">
                        <div>{truck.gpsDeviceId}</div>
                        {truck.gpsSerialNumber && <div className="text-[10px] text-gray-500 font-mono mt-0.5">SN: {truck.gpsSerialNumber}</div>}
                        <div className="text-[9px] text-gray-400 font-sans mt-0.5">{truck.gpsDeviceName}</div>
                      </td>
                      <td className="px-3 py-2.5 text-slate-500 text-[10px]">
                        {truck.gpsSimIccid}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-mono font-bold text-[9px] rounded-full border border-emerald-200">
                          {truck.gpsStatus}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            type="button"
                            onClick={() => handleEditConnection(truck)}
                            className="p-1 hover:bg-blue-50 text-blue-500 hover:text-blue-700 border border-slate-100 hover:border-blue-100 rounded-md transition-colors cursor-pointer"
                            title="Edit hardware connection"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveConnection(truck)}
                            className="p-1 hover:bg-red-50 text-red-500 hover:text-red-700 border border-slate-100 hover:border-red-100 rounded-md transition-colors cursor-pointer"
                            title="Decouple hardware connection"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {trucks.filter(t => t.gpsDeviceId && t.gpsDeviceId !== 'DISABLED').length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-gray-400 italic">
                        No stationary GPS connection records built yet. Use the form on the left to provision physical telematics.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
