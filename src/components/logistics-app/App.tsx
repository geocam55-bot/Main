/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { DeliveryRecord, Truck, Branch, User, Tenant } from './types';
import { TENANTS } from './data';
import { 
  getFrontendSupabase, 
  initializeFrontendSupabase,
  checkSupabaseStatusDirect, 
  fetchTenantsDirect, 
  saveTenantDirect, 
  deleteTenantDirect, 
  fetchTenantStateDirect, 
  saveTenantStateDirect, 
  saveUserHeartbeatDirect,
  deleteRecordDirect, 
  clearAllDirect,
  deserializeType
} from './lib/supabaseClient';
import Dashboard, { isTruckAssignedToBranch } from './components/Dashboard';
import LiveDashboard from './components/LiveDashboard';
import ScanStation from './components/ScanStation';
import DeliveryQueue from './components/DeliveryQueue';
import ArchitectureView from './components/ArchitectureView';
import FleetSetup from './components/FleetSetup';
import StoresSetup from './components/StoresSetup';
import UsersSetup from './components/UsersSetup';
import LoginScreen from './components/LoginScreen';
import LandingPage from './components/LandingPage';
import SuperAdminTenantsView from './components/SuperAdminTenantsView';
import UserProfileModal, { renderUserAvatarHelper } from './components/UserProfileModal';
import GpsSetup from './components/GpsSetup';
import EnterpriseHub from './components/EnterpriseHub';
import { DeliveryBoard } from './components/DeliveryBoard';
import { 
  Map as MapIcon, LayoutDashboard, Scan, ClipboardList, Layers3, Store, Shield, Users, 
  ChevronDown, Trash2, Truck as TruckIcon, LogOut, Landmark, UserCheck, Key,
  Database, RefreshCw, FileDown, AlertTriangle, ShieldAlert, Camera, Sliders, User as UserIcon,
  Compass, Sparkles, Activity, Menu, X, Settings, Calendar as CalendarIcon, Building2
} from 'lucide-react';
import prospacesLogo from './assets/images/logo_no_border_tight_1783077241511.jpg';

// Custom fetch utility to automatically inject custom Supabase headers for stateless backend resilience
async function customFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : (input && 'url' in (input as any) ? (input as any).url : ''));
  if (url && (url.startsWith('/api/') || url.includes('/api/'))) {
    const savedUrl = localStorage.getItem('prospaces_custom_supabase_url');
    const savedKey = localStorage.getItem('prospaces_custom_supabase_key');
    if (
      savedUrl && savedKey &&
      savedUrl.trim() !== "" && savedUrl !== "null" && savedUrl !== "undefined" && savedUrl !== "Default" &&
      savedKey.trim() !== "" && savedKey !== "null" && savedKey !== "undefined"
    ) {
      init = init || {};
      const headers = new Headers(init.headers || {});
      if (!headers.has('x-custom-supabase-url')) {
        headers.set('x-custom-supabase-url', savedUrl.trim());
      }
      if (!headers.has('x-custom-supabase-key')) {
        headers.set('x-custom-supabase-key', savedKey.trim());
      }
      init.headers = headers;
    }
  }
  return window.fetch(input, init);
}

const getThemeClasses = (color: string) => {
  // Always return the classic corporate blue styling to match previous design
  return {
    bg: 'bg-blue-800',
    hoverBg: 'hover:bg-blue-900',
    activeBtn: 'bg-blue-800 text-white shadow-sm',
    bannerBg: 'bg-blue-900/60 border-blue-950',
    text: 'text-blue-800',
    border: 'border-blue-900',
    borderLight: 'border-blue-200/60',
    accentBg: 'bg-blue-50 text-blue-800 hover:bg-blue-100',
    accentText: 'text-blue-855',
    pills: 'bg-blue-100 text-blue-800 border-blue-200',
    badge: 'bg-white/20 text-white border-white/10'
  };
};

function deduplicateUsers(usersList: User[]): User[] {
  const seenEmails = new Set<string>();
  const seenIds = new Set<string>();
  const deduped: User[] = [];
  
  for (const u of usersList) {
    if (!u || !u.id) continue;
    const cleanId = u.id.trim();
    const cleanEmail = (u.email || '').trim().toLowerCase();
    
    if (seenIds.has(cleanId)) continue;
    if (cleanEmail && seenEmails.has(cleanEmail)) {
      continue;
    }
    
    seenIds.add(cleanId);
    if (cleanEmail) seenEmails.add(cleanEmail);
    deduped.push(u);
  }
  return deduped;
}

function extractVehicleNumber(str: string | undefined | null): string | null {
  if (!str) return null;
  const match = str.match(/\d+/);
  return match ? match[0] : null;
}

function deduplicateTrucks(trucksList: Truck[]): Truck[] {
  const map = new Map<string, Truck>();

  for (const truck of trucksList) {
    if (!truck || !truck.id) continue;
    
    const idKey = String(truck.id).toLowerCase().trim();
    const nameKey = String(truck.name || truck.id).toLowerCase().trim();

    let existingKey: string | undefined;
    if (map.has(idKey)) {
      existingKey = idKey;
    } else {
      for (const [k, v] of map.entries()) {
        const vNameKey = String(v.name || v.id).toLowerCase().trim();
        const vIdKey = String(v.id).toLowerCase().trim();
        if (vNameKey === nameKey || vIdKey === nameKey || vNameKey === idKey) {
          existingKey = k;
          break;
        }
      }
    }

    if (!existingKey) {
      map.set(idKey, truck);
    } else {
      const existing = map.get(existingKey)!;
      const driverName = (truck.driver && truck.driver.toLowerCase() !== 'no driver' && truck.driver.toLowerCase() !== 'unassigned') 
        ? truck.driver 
        : ((existing.driver && existing.driver.toLowerCase() !== 'no driver' && existing.driver.toLowerCase() !== 'unassigned') ? existing.driver : 'No Driver');
      
      const branchId = truck.branchId || existing.branchId;

      const gpsLat = truck.gpsLat !== undefined && !isNaN(truck.gpsLat) ? truck.gpsLat : existing.gpsLat;
      const gpsLng = truck.gpsLng !== undefined && !isNaN(truck.gpsLng) ? truck.gpsLng : existing.gpsLng;
      const lat = truck.lat !== undefined && !isNaN(truck.lat) ? truck.lat : existing.lat;
      const lng = truck.lng !== undefined && !isNaN(truck.lng) ? truck.lng : existing.lng;
      const gpsSpeed = typeof truck.gpsSpeed === 'number' ? truck.gpsSpeed : existing.gpsSpeed;
      const gpsIdlingMins = typeof truck.gpsIdlingMins === 'number' ? truck.gpsIdlingMins : existing.gpsIdlingMins;
      const gpsLastHandshake = (truck.gpsLastHandshake && existing.gpsLastHandshake && truck.gpsLastHandshake < existing.gpsLastHandshake) ? existing.gpsLastHandshake : (truck.gpsLastHandshake || existing.gpsLastHandshake);

      map.set(existingKey, {
        ...existing,
        ...truck,
        id: existing.id.startsWith('TRUCK-') ? truck.id : existing.id,
        driver: driverName,
        branchId,
        gpsLat,
        gpsLng,
        lat,
        lng,
        gpsSpeed,
        gpsIdlingMins,
        gpsLastHandshake
      });
    }
  }

  // ENFORCE STRICT UNIQUE DRIVER ASSIGNMENT PER VEHICLE
  // Each driver can be assigned to at most one vehicle at a time.
  const assignedDriversSeen = new Set<string>();
  const result: Truck[] = [];

  for (const truck of map.values()) {
    const drv = truck.driver ? truck.driver.trim() : 'No Driver';
    const drvNorm = drv.toLowerCase();

    if (drvNorm !== 'no driver' && drvNorm !== 'unassigned' && drvNorm !== 'driver' && drvNorm !== '') {
      if (assignedDriversSeen.has(drvNorm)) {
        // Driver is already assigned to a previous vehicle in the fleet list
        result.push({ ...truck, driver: 'No Driver' });
      } else {
        assignedDriversSeen.add(drvNorm);
        result.push({ ...truck, driver: drv });
      }
    } else {
      result.push({ ...truck, driver: 'No Driver' });
    }
  }

  return result;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState<boolean>(false);
  const [activeNavDropdown, setActiveNavDropdown] = useState<string | null>(null);
  const [showLogin, setShowLogin] = useState<boolean>(false);
  const [allTenants, setAllTenants] = useState<Tenant[]>(() => {
    const cached = localStorage.getItem('prospaces_all_tenants');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        console.error("Failed parsing cached tenants list:", e);
      }
    }
    return TENANTS;
  });

  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(() => {
    try {
      const cached = localStorage.getItem('prospaces_active_tenant');
      if (cached) return JSON.parse(cached);
      const crmUserStr = localStorage.getItem('prospaces_cached_user');
      if (crmUserStr) {
        const crmUser = JSON.parse(crmUserStr);
        const defaultTenant: Tenant = {
          id: crmUser?.organization_id || crmUser?.organizationId || 'prospaces',
          name: 'ProSpaces Logistics',
          code: 'PS',
          description: 'Corporate logistics tracking for ProSpaces distributor and dealer stores.',
          logoBadge: '🏢',
          regionalFocus: 'Atlantic Canada (Dartmouth, Tantallon, Halifax)',
          primaryColor: 'blue'
        };
        localStorage.setItem('prospaces_active_tenant', JSON.stringify(defaultTenant));
        return defaultTenant;
      }
    } catch (e) {}
    return null;
  });
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const isSessionActive = sessionStorage.getItem('prospaces_session_active');
      const keepLoggedIn = localStorage.getItem('prospaces_keep_logged_in');
      if (!isSessionActive && keepLoggedIn === 'false') {
        return null;
      }
      const cached = localStorage.getItem('prospaces_active_user');
      if (cached) {
        const u = JSON.parse(cached);
        if (u) {
          if (u.email === 'superadmin@prospaces.com' || u.id === 'USR-SUPER-ADMIN-01' || ['super_admin', 'superadmin', 'super_admin'].includes(String(u.role).toLowerCase())) {
            u.role = 'SUPER_ADMIN';
          }
          return u;
        }
      }
      const crmUserStr = localStorage.getItem('prospaces_cached_user');
      if (crmUserStr) {
        const crmUser = JSON.parse(crmUserStr);
        if (crmUser && (crmUser.email || crmUser.id)) {
          const autoUserRole = (crmUser.role === 'SUPER_ADMIN' || crmUser.role === 'Super_Admin' || crmUser.role === 'super_admin' || crmUser.email === 'superadmin@prospaces.com')
            ? "SUPER_ADMIN"
            : ((crmUser.role === 'admin' || crmUser.role === 'Admin') ? "Admin" : (crmUser.role || "Admin"));
          const autoUser: User = {
            id: crmUser.id || "USR-57008",
            name: crmUser.full_name || crmUser.name || (crmUser.email ? crmUser.email.split('@')[0] : "George Campbell"),
            email: crmUser.email || "george.campbell@prospaces.com",
            role: autoUserRole as any,
            phone: crmUser.phone || "(902) 555-0199",
            status: "Active",
            associatedStoreId: "DC-WINAMILL"
          };
          localStorage.setItem('prospaces_active_user', JSON.stringify(autoUser));
          return autoUser;
        }
      }
    } catch (e) {}
    return null;
  });

  // State to switch between Super Admin Tenant Maintenance and Tenant Application Workspace
  const [superAdminViewMode, setSuperAdminViewMode] = useState<'tenant_maintenance' | 'app_workspace'>('tenant_maintenance');

  // Keep active user and tenant in sync with localStorage updates
  useEffect(() => {
    const syncUserAndTenant = () => {
      try {
        const isSessionActive = sessionStorage.getItem('prospaces_session_active');
        const keepLoggedIn = localStorage.getItem('prospaces_keep_logged_in');

        if (!isSessionActive && keepLoggedIn === 'false') {
          localStorage.removeItem('prospaces_active_user');
          localStorage.removeItem('prospaces_active_tenant');
          localStorage.removeItem('prospaces_cached_user');
          localStorage.removeItem('prospaces_keep_logged_in');
          setCurrentUser(null);
          setCurrentTenant(null);
          return;
        }

        const activeUserStr = localStorage.getItem('prospaces_active_user');
        const activeTenantStr = localStorage.getItem('prospaces_active_tenant');
        const crmUserStr = localStorage.getItem('prospaces_cached_user');

        if (activeUserStr && activeTenantStr) {
          const u = JSON.parse(activeUserStr);
          const t = JSON.parse(activeTenantStr);
          if (u) {
            if (u.email === 'superadmin@prospaces.com' || u.id === 'USR-SUPER-ADMIN-01' || ['super_admin', 'superadmin'].includes(String(u.role).toLowerCase())) {
              u.role = 'SUPER_ADMIN';
            }
            if (!currentUser || currentUser.email !== u.email || currentUser.id !== u.id || currentUser.role !== u.role) {
              setCurrentUser(u);
            }
          }
          if (t && (!currentTenant || currentTenant.id !== t.id)) {
            setCurrentTenant(t);
          }
        } else if (crmUserStr && (!currentUser || !currentTenant)) {
          const crmUser = JSON.parse(crmUserStr);
          if (crmUser && (crmUser.email || crmUser.id)) {
            const autoUserRole = (crmUser.role === 'SUPER_ADMIN' || crmUser.role === 'Super_Admin' || crmUser.role === 'super_admin' || crmUser.email === 'superadmin@prospaces.com')
              ? "SUPER_ADMIN"
              : ((crmUser.role === 'admin' || crmUser.role === 'Admin') ? "Admin" : (crmUser.role || "Admin"));
            const autoUser: User = {
              id: crmUser.id || "USR-57008",
              name: crmUser.full_name || crmUser.name || (crmUser.email ? crmUser.email.split('@')[0] : "George Campbell"),
              email: crmUser.email || "george.campbell@prospaces.com",
              role: autoUserRole as any,
              phone: crmUser.phone || "(902) 555-0199",
              status: "Active",
              associatedStoreId: "DC-WINAMILL"
            };
            const autoTenant: Tenant = {
              id: crmUser.organization_id || crmUser.organizationId || 'prospaces',
              name: 'ProSpaces Logistics',
              code: 'PS',
              description: 'Corporate logistics tracking for ProSpaces distributor and dealer stores.',
              logoBadge: '🏢',
              regionalFocus: 'Atlantic Canada (Dartmouth, Tantallon, Halifax)',
              primaryColor: 'blue'
            };
            localStorage.setItem('prospaces_active_user', JSON.stringify(autoUser));
            localStorage.setItem('prospaces_active_tenant', JSON.stringify(autoTenant));
            setCurrentUser(autoUser);
            setCurrentTenant(autoTenant);
          }
        }
      } catch (e) {}
    };

    syncUserAndTenant();
    window.addEventListener('storage', syncUserAndTenant);
    return () => window.removeEventListener('storage', syncUserAndTenant);
  }, [currentUser, currentTenant]);

  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isFleetDropdownOpen, setIsFleetDropdownOpen] = useState(false);

  // User Profile Menu & Modal states
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileActiveTab, setProfileActiveTab] = useState<'info' | 'photo' | 'password'>('info');

  // User Password Change states
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changePasswordError, setChangePasswordError] = useState<string | null>(null);
  const [changePasswordSuccess, setChangePasswordSuccess] = useState<string | null>(null);
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);

  // Custom Supabase Database credentials state
  const [showDbConfig, setShowDbConfig] = useState(false);
  const [customDbUrl, setCustomDbUrl] = useState(() => localStorage.getItem('prospaces_custom_supabase_url') || '');
  const [customDbKey, setCustomDbKey] = useState(() => localStorage.getItem('prospaces_custom_supabase_key') || '');
  const [configSaving, setConfigSaving] = useState(false);
  const [configMsg, setConfigMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isDbInitializing, setIsDbInitializing] = useState(() => !!(localStorage.getItem('prospaces_custom_supabase_url') && localStorage.getItem('prospaces_custom_supabase_key')));
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [diagnosticsModal, setDiagnosticsModal] = useState<{
    show: boolean;
    title: string;
    connected: boolean;
    url?: string;
    isServiceRoleKeyAnon?: boolean;
    error?: string | null;
  } | null>(null);

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.nav-dropdown-container')) {
        setActiveNavDropdown(null);
      }
    };
    if (activeNavDropdown) {
      document.addEventListener('mousedown', handleGlobalClick);
      document.addEventListener('touchstart', handleGlobalClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleGlobalClick);
      document.removeEventListener('touchstart', handleGlobalClick);
    };
  }, [activeNavDropdown]);

  // Load custom credentials from localStorage on mount and register them with the backend memory store.
  // Performs a startup check to automatically prune credentials matching default environment variables
  useEffect(() => {
    const runStartupCheck = async () => {
      try {
        // Remove any other custom Supabase configurations to eliminate false data
        localStorage.removeItem('prospaces_custom_supabase_url');
        localStorage.removeItem('prospaces_custom_supabase_key');
        setCustomDbUrl('');
        setCustomDbKey('');
        initializeFrontendSupabase('', '');

        const res = await fetch("/api/supabase-status");
        if (res.ok) {
          const contentType = res.headers.get("content-type") || "";
          if (contentType.includes("application/json")) {
            const data = await res.json();
            if (data.configured && data.anonKey) {
              initializeFrontendSupabase(data.url, data.anonKey);
            }
          }
        }
      } catch (err) {
        console.debug("Startup check direct mode:", err);
      } finally {
        setIsDbInitializing(false);
        setLoadTrigger(prev => prev + 1);
        checkSupabaseStatus();
      }
    };

    runStartupCheck();
  }, []);

  // Keep a ref of live states for the geolocation watchPosition callback to avoid stale closures and constant watcher restarts
  const stateRef = useRef({ deliveries, trucks, branches, users, currentTenant });
  useEffect(() => {
    stateRef.current = { deliveries, trucks, branches, users, currentTenant };
  }, [deliveries, trucks, branches, users, currentTenant]);

  // Fallback state redirect for restricted role views
  useEffect(() => {
    if (!currentUser) return;
    const role = currentUser.role;
    if (role === 'Driver') {
      if (!['epod', 'inspections', 'fuel', 'scanner'].includes(activeTab)) {
        setActiveTab('epod');
      }
    } else if (role === 'Picker') {
      if (activeTab !== 'scanner') {
        setActiveTab('scanner');
      }
    } else if (role === 'User') {
      if (!['dashboard', 'queue', 'delivery-board'].includes(activeTab)) {
        setActiveTab('dashboard');
      }
    }
  }, [currentUser, activeTab]);

  // Driver Live GPS Geolocation Sync to database with strict driver/tenant validation
  useEffect(() => {
    // Strictly restrict GPS position tracking ONLY to active, assigned company drivers
    if (!currentUser || currentUser.role !== 'Driver') return;

    // Reject inactive/suspended driver accounts immediately
    if (currentUser.status && ['Suspended', 'Terminated', 'Inactive'].includes(currentUser.status)) {
      console.warn(`GPS tracking disabled: Driver ${currentUser.name} account status is ${currentUser.status}.`);
      return;
    }

    if (!navigator.geolocation) {
      console.warn("Device geolocation is not supported by this browser.");
      return;
    }

    const successHandler = (position: GeolocationPosition) => {
      const { deliveries: latestDeliveries, trucks: latestTrucks, branches: latestBranches, users: latestUsers, currentTenant: latestTenant } = stateRef.current;
      
      // 1. Tenant boundary check
      if (!latestTenant) {
        console.warn("GPS update rejected: No active tenant loaded.");
        return;
      }

      // 2. Strict Role & Active Status Re-Verification
      if (currentUser.role !== 'Driver') {
        console.warn(`GPS update rejected: Current user ${currentUser.name} has role ${currentUser.role}, not Driver.`);
        return;
      }

      const activeUserRecord = latestUsers.find(u => 
        u.id === currentUser.id || 
        (u.email && u.email.toLowerCase() === currentUser.email.toLowerCase())
      );
      if (activeUserRecord && activeUserRecord.status && ['Suspended', 'Terminated', 'Inactive'].includes(activeUserRecord.status)) {
        console.warn(`GPS update rejected: Driver ${currentUser.name} account status is ${activeUserRecord.status}.`);
        return;
      }

      // 3. Find assigned vehicle for this company driver in current tenant's fleet
      const driverTruck = latestTrucks.find(t => {
        if (!t.id) return false;
        // Tenant boundary check if tenantId is present on truck
        if (t.tenantId && t.tenantId !== latestTenant.id) return false;

        const isDriverMatch = t.driver && t.driver.trim().toLowerCase() === currentUser.name.trim().toLowerCase();
        const isDriverIdMatch = t.assignedDriverId && t.assignedDriverId === currentUser.id;
        return isDriverMatch || isDriverIdMatch;
      });

      if (!driverTruck) {
        console.warn(`GPS update rejected: Driver ${currentUser.name} is not assigned to any active vehicle in tenant ${latestTenant.id}.`);
        return;
      }

      // 4. Validate Vehicle ID against current tenant's fleet
      const isVehicleInTenantFleet = latestTrucks.some(t => 
        t.id === driverTruck.id && 
        (!t.tenantId || t.tenantId === latestTenant.id)
      );

      if (!isVehicleInTenantFleet) {
        console.warn(`GPS update rejected: Vehicle ID ${driverTruck.id} is not registered in tenant ${latestTenant.id}'s fleet.`);
        return;
      }

      if (!driverTruck.driver || driverTruck.driver.trim().toLowerCase() === 'no driver') {
        console.warn(`GPS update rejected: Vehicle ${driverTruck.name || driverTruck.id} has no assigned active driver.`);
        return;
      }

      if (driverTruck.isActive === false) {
        console.warn(`GPS update rejected: Vehicle ${driverTruck.name || driverTruck.id} is set to inactive.`);
        return;
      }

      // 5. Coordinate Extraction & Validation
      const { latitude, longitude } = position.coords;
      if (typeof latitude !== 'number' || typeof longitude !== 'number' || isNaN(latitude) || isNaN(longitude)) {
        console.warn("GPS update rejected: Invalid coordinate values.");
        return;
      }

      const previousLat = (driverTruck as any).lat ?? (driverTruck as any).gpsLat;
      const previousLng = (driverTruck as any).lng ?? (driverTruck as any).gpsLng;

      // Update position if moved by more than ~5 meters (0.00005 deg)
      const latDiff = previousLat !== undefined ? Math.abs(previousLat - latitude) : 1;
      const lngDiff = previousLng !== undefined ? Math.abs(previousLng - longitude) : 1;

      if (latDiff > 0.00005 || lngDiff > 0.00005) {
        console.log(`Live GPS tracked for company driver ${currentUser.name} on vehicle ${driverTruck.id}: ${latitude}, ${longitude}`);
        
        const nowIso = new Date().toISOString();
        const updatedTruck: Truck = {
          ...driverTruck,
          lat: latitude,
          lng: longitude,
          gpsLat: latitude,
          gpsLng: longitude,
          gpsLastHandshake: nowIso,
          gpsSource: 'mobile',
          tenantId: latestTenant.id
        };
        
        // Update local state and sync
        const updatedTrucks = latestTrucks.map(t => t.id === updatedTruck.id ? updatedTruck : t);
        setTrucks(updatedTrucks);

        if (realtimeChannelRef.current) {
          realtimeChannelRef.current.send({
            type: 'broadcast',
            event: 'gps_update',
            payload: { 
              truckId: updatedTruck.id, 
              tenantId: latestTenant.id,
              driverName: currentUser.name,
              lat: latitude, 
              lng: longitude 
            }
          }).catch(console.error);
        }

        const now = Date.now();
        // Only write to the physical database table at longer intervals (every 2 minutes) for historical routing logs
        if (now - lastGpsDbSyncRef.current > 120000) {
          syncStateToSupabase(latestTenant.id, latestDeliveries, updatedTrucks, latestBranches, latestUsers);
          lastGpsDbSyncRef.current = now;
        }
      }
    };

    const errorHandler = (err: GeolocationPositionError) => {
      console.warn("Live GPS device lock failed:", err.message);
    };

    const watchId = navigator.geolocation.watchPosition(successHandler, errorHandler, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0
    });

    return () => navigator.geolocation.clearWatch(watchId);
  }, [currentUser]);

  // Trigger login session handlers
  const handleLoginSuccess = (tenant: Tenant, user: User) => {
    // Clear operational state immediately to prevent stale cross-tenant contamination
    setDeliveries([]);
    setTrucks([]);
    setBranches([]);
    setUsers([]);
    setCurrentTenant(tenant);
    setCurrentUser(user);
    localStorage.setItem('prospaces_active_tenant', JSON.stringify(tenant));
    localStorage.setItem('prospaces_active_user', JSON.stringify(user));
  };

  const handleLogout = async () => {
    if (currentUser && currentTenant && users.length > 0) {
      // Safely prevent logout save if the loaded data in state is contaminated or mismatched
      const hasDifferentTenantData = 
        branches.some(b => b.tenantId && b.tenantId !== currentTenant.id) ||
        users.some(u => u.tenantId && u.tenantId !== currentTenant.id) ||
        trucks.some(t => t.tenantId && t.tenantId !== currentTenant.id);

      if (!hasDifferentTenantData) {
        const updatedUsers = users.map(u => u.id === currentUser.id ? { ...u, lastActive: "1970-01-01T00:00:00.000Z" } : u);
        setUsers(updatedUsers);
        syncStateToSupabase(currentTenant.id, deliveries, trucks, branches, updatedUsers);
      }
    }
    setCurrentTenant(null);
    setCurrentUser(null);
    localStorage.removeItem('prospaces_active_tenant');
    localStorage.removeItem('prospaces_active_user');
    localStorage.removeItem('prospaces_cached_user');
    localStorage.removeItem('prospaces_keep_logged_in');
    sessionStorage.removeItem('prospaces_session_active');
    sessionStorage.removeItem('prospaces_keep_logged_in');
    setActiveTab('dashboard');
    // Clear operational state completely on sign out
    setDeliveries([]);
    setTrucks([]);
    setBranches([]);
    setUsers([]);

    try {
      const supabase = getFrontendSupabase();
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch (e) {
      console.warn("Supabase sign out error:", e);
    }

    // Redirect user to the ProSpaces CRM Hero page
    window.location.href = '/';
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !currentTenant) return;
    
    setChangePasswordError(null);
    setChangePasswordSuccess(null);
    
    const userCurrentDbPass = currentUser.password || "";
    if (currentPassword !== userCurrentDbPass) {
      setChangePasswordError("The current password you entered is incorrect.");
      return;
    }
    if (newPassword.trim() === '') {
      setChangePasswordError("New password cannot be empty.");
      return;
    }
    if (newPassword === '123456') {
      setChangePasswordError("For security reasons, '123456' is no longer allowed. Please choose a different password.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setChangePasswordError("New passwords do not match.");
      return;
    }
    
    setChangePasswordLoading(true);
    try {
      const updatedUser: User = { ...currentUser, password: newPassword };
      
      // Update local storage and React state immediately
      setCurrentUser(updatedUser);
      localStorage.setItem('prospaces_active_user', JSON.stringify(updatedUser));
      
      // Update in our users state list so that syncStateToSupabase writes the serialized phone payload
      const updatedUsersList = users.map(u => u.id === currentUser.id ? updatedUser : u);
      setUsers(updatedUsersList);
      
      await syncStateToSupabase(currentTenant.id, deliveries, trucks, branches, updatedUsersList);
      
      setChangePasswordSuccess("Your password has been changed successfully!");
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      console.error(err);
      setChangePasswordError("Failed to update password in database. Please try again.");
    } finally {
      setChangePasswordLoading(false);
    }
  };

  const handleUpdateProfile = async (updatedUser: User) => {
    if (!currentTenant) return;
    
    // Update local storage and React state immediately
    setCurrentUser(updatedUser);
    localStorage.setItem('prospaces_active_user', JSON.stringify(updatedUser));
    
    // Update in our users state list so that syncStateToSupabase writes the serialized payload
    const updatedUsersList = users.map(u => u.id === updatedUser.id ? updatedUser : u);
    setUsers(updatedUsersList);
    
    await syncStateToSupabase(currentTenant.id, deliveries, trucks, branches, updatedUsersList);
  };

  // Supabase Live Sync and Configuration Diagnostics
  const [supabaseStatus, setSupabaseStatus] = useState<{
    configured: boolean;
    connected: boolean;
    isServiceRoleKeyAnon?: boolean | null;
    error: string | null;
    url: string;
    schemaSql: string;
  } | null>(null);
  const [dismissedRlsWarning, setDismissedRlsWarning] = useState<boolean>(() => localStorage.getItem('prospaces_dismissed_rls_warning') === 'true');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'IDLE' | 'SYNCING' | 'ERROR'>('IDLE');
  const lastMutationTimeRef = useRef<number>(0);
  const recentlyDeletedIdsRef = useRef<Set<string>>(new Set());
  const syncStatusRef = useRef<string>('IDLE');
  const isFirstLoadRef = useRef<boolean>(true);
  const isExpressBackendAvailableRef = useRef<boolean | null>(
    typeof window !== 'undefined' && (
      window.location.hostname.includes('prospacescrm.com') ||
      window.location.hostname.includes('vercel.app') ||
      window.location.hostname.includes('netlify.app')
    ) ? false : null
  );
  useEffect(() => {
    syncStatusRef.current = syncStatus;
  }, [syncStatus]);
  const [dbActive, setDbActive] = useState<boolean>(true);
  const [lastFetchError, setLastFetchError] = useState<string | null>(null);
  const [loadTrigger, setLoadTrigger] = useState<number>(0);

  // Persistent Manual Full Trucks state for Freight Board and Delivery Board
  const [manualFullTrucks, setManualFullTrucks] = useState<Record<string, boolean>>(() => {
    try {
      const tenantId = currentTenant?.id || 'default';
      const saved = localStorage.getItem(`prospaces_manual_full_trucks_${tenantId}`);
      if (saved) return JSON.parse(saved);
      const globalSaved = localStorage.getItem('prospaces_manual_full_trucks');
      return globalSaved ? JSON.parse(globalSaved) : {};
    } catch {
      return {};
    }
  });

  // Keep manualFullTrucks in sync when tenant changes or branches reload from database
  useEffect(() => {
    if (!currentTenant?.id) return;
    const tenantId = currentTenant.id;
    try {
      const saved = localStorage.getItem(`prospaces_manual_full_trucks_${tenantId}`);
      if (saved) {
        setManualFullTrucks(JSON.parse(saved));
        return;
      }
    } catch (e) {}
    if (branches && branches.length > 0 && (branches[0] as any)?.manualFullTrucks) {
      setManualFullTrucks((branches[0] as any).manualFullTrucks);
    }
  }, [currentTenant?.id, branches]);

  const handleForceRefreshLive = async () => {
    if (!currentTenant) return;
    const tenantId = currentTenant.id;
    setSyncStatus('SYNCING');
    
    // Clear local storage cache for this tenant
    localStorage.removeItem(`prospaces_deliveries_tenant_${tenantId}`);
    localStorage.removeItem(`prospaces_trucks_tenant_${tenantId}`);
    localStorage.removeItem(`prospaces_branches_tenant_${tenantId}`);
    localStorage.removeItem(`prospaces_users_tenant_${tenantId}`);
    
    // Trigger load state fresh
    setLoadTrigger(prev => prev + 1);
  };

  const handleSaveDbConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfigSaving(true);
    setConfigMsg(null);
    try {
      const url = customDbUrl.trim();
      const key = customDbKey.trim();

      if (!url || !key) {
        throw new Error("Both Supabase API URL and Supabase Key are required.");
      }

      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        throw new Error("Supabase API URL must start with http:// or https://");
      }

      // Initialize frontend client
      initializeFrontendSupabase(url, key);

      // Save to localStorage
      localStorage.setItem('prospaces_custom_supabase_url', url);
      localStorage.setItem('prospaces_custom_supabase_key', key);

      // Send to backend server
      const res = await customFetch('/api/setup-custom-supabase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url, key })
      });

      if (!res.ok) {
        throw new Error(`Failed to update backend configuration. Server status: ${res.status}`);
      }

      // Re-run status check
      const status = await checkSupabaseStatus();
      if (status.connected) {
        setConfigMsg({ type: 'success', text: "Successfully connected to your live Supabase database! Cache has been refreshed." });
        setLoadTrigger(prev => prev + 1);
      } else {
        setConfigMsg({ type: 'error', text: `Saved configuration, but connection test failed: ${status.error || 'Check credentials'}` });
      }
    } catch (err: any) {
      setConfigMsg({ type: 'error', text: err.message || "An unexpected error occurred during configuration." });
    } finally {
      setConfigSaving(false);
    }
  };

  const handleResetDbConfig = async () => {
    setConfigSaving(true);
    setConfigMsg(null);
    try {
      localStorage.removeItem('prospaces_custom_supabase_url');
      localStorage.removeItem('prospaces_custom_supabase_key');
      setCustomDbUrl('');
      setCustomDbKey('');
      
      // Reset frontend
      initializeFrontendSupabase('', '');

      // Reset backend
      await customFetch('/api/setup-custom-supabase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: '', key: '' })
      });

      const status = await checkSupabaseStatus();
      setConfigMsg({ type: 'success', text: "Reset connection to environment defaults." });
      setLoadTrigger(prev => prev + 1);
    } catch (err: any) {
      setConfigMsg({ type: 'error', text: err.message || "Reset failed." });
    } finally {
      setConfigSaving(false);
    }
  };

  const handlePushLocalToSupabase = async () => {
    if (!currentTenant) return;
    await syncStateToSupabase(currentTenant.id, deliveries, trucks, branches, users);
    setLoadTrigger(prev => prev + 1);
  };

  const runSupabaseRestDiagnostic = async () => {
    const url = (supabaseStatus?.url || localStorage.getItem('prospaces_custom_supabase_url') || "").trim().replace(/\/+$/, '');
    const anonKey = (supabaseStatus?.anonKey || localStorage.getItem('prospaces_custom_supabase_key') || "").trim();

    console.log("%c=== SUPABASE REST HEALTH DIAGNOSTIC START ===", "color: #10B981; font-weight: bold; font-size: 14px;");
    console.log("Target URL:", url);
    console.log("Target REST Endpoint:", url ? `${url}/rest/v1/` : "None");
    console.log("Key Prefix:", anonKey ? `${anonKey.substring(0, 10)}...` : "None");

    if (!url) {
      console.error("Diagnostic aborted: Supabase URL is empty or unconfigured.");
      console.log("%c=== SUPABASE REST HEALTH DIAGNOSTIC END ===", "color: #EF4444; font-weight: bold; font-size: 14px;");
      return { success: false, error: "Supabase URL is empty or unconfigured." };
    }

    try {
      const restUrl = `${url}/rest/v1/`;
      const headersObj: Record<string, string> = {
        "apikey": anonKey,
        "Authorization": `Bearer ${anonKey}`
      };

      console.log("Sending explicit fetch with headers:", {
        "apikey": anonKey ? "PRESENT" : "MISSING",
        "Authorization": anonKey ? "Bearer PRESENT" : "MISSING"
      });

      const startTime = performance.now();
      const response = await fetch(restUrl, {
        method: 'GET',
        headers: headersObj
      });
      const duration = (performance.now() - startTime).toFixed(1);

      console.log(`%cHTTP Response Status: ${response.status} ${response.statusText} (took ${duration}ms)`, "color: #3B82F6; font-weight: bold;");

      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });
      console.log("HTTP Response Headers:", headers);

      const text = await response.text();
      let parsedBody: any = null;
      try {
        parsedBody = JSON.parse(text);
        console.log("HTTP Response Body (JSON):", parsedBody);
      } catch {
        console.log("HTTP Response Body (Text):", text);
      }

      console.log("%c=== SUPABASE REST HEALTH DIAGNOSTIC SUCCESS ===", "color: #10B981; font-weight: bold; font-size: 14px;");
      
      return {
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers,
        body: parsedBody || text,
        url,
        duration
      };
    } catch (err: any) {
      console.error("Diagnostic fetch failed:", err);
      console.log("%c=== SUPABASE REST HEALTH DIAGNOSTIC ERROR ===", "color: #EF4444; font-weight: bold; font-size: 14px;");
      return {
        success: false,
        error: err.message || String(err),
        url
      };
    }
  };

  const checkSupabaseStatus = async () => {
    if (isExpressBackendAvailableRef.current === false) {
      const direct = await checkSupabaseStatusDirect();
      const fallbackState = {
        configured: !!direct.active,
        connected: !!direct.success,
        isServiceRoleKeyAnon: true,
        error: direct.error || direct.details || null,
        url: "Default",
        schemaSql: ""
      };
      setSupabaseStatus(fallbackState);
      return fallbackState;
    }

    try {
      const res = await customFetch("/api/supabase-status");
      if (!res.ok) {
        throw new Error(`Server returned non-ok status: ${res.status}`);
      }
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error("Server returned non-JSON content.");
      }
      const data = await res.json();
      isExpressBackendAvailableRef.current = true;
      setSupabaseStatus(data);
      if (data.configured && data.anonKey) {
        initializeFrontendSupabase(data.url, data.anonKey);
      }
      return data;
    } catch (e: any) {
      isExpressBackendAvailableRef.current = false;
      console.debug("Express endpoint /api/supabase-status offline. Using direct client lookup:", e.message || e);
      const direct = await checkSupabaseStatusDirect();
      const fallbackState = {
        configured: !!direct.active,
        connected: !!direct.success,
        isServiceRoleKeyAnon: true, // safe default fallback
        error: direct.error || direct.details || null,
        url: "Default",
        schemaSql: ""
      };
      setSupabaseStatus(fallbackState);
      return fallbackState;
    }
  };

  const syncStateToSupabase = async (
    tenantId: string,
    d: DeliveryRecord[],
    t: Truck[],
    b: Branch[],
    u: User[]
  ) => {
    lastMutationTimeRef.current = Date.now();
    // Save to browser cache immediately so that local fallback remains 100% persistent in cache
    localStorage.setItem(`prospaces_deliveries_tenant_${tenantId}`, JSON.stringify(d));
    localStorage.setItem(`prospaces_trucks_tenant_${tenantId}`, JSON.stringify(t));
    localStorage.setItem(`prospaces_branches_tenant_${tenantId}`, JSON.stringify(b));
    localStorage.setItem(`prospaces_users_tenant_${tenantId}`, JSON.stringify(u));

    setSyncStatus('SYNCING');

    if (isExpressBackendAvailableRef.current === false) {
      try {
        const directResult = await saveTenantStateDirect(tenantId, d, t, b, u);
        setSyncStatus('IDLE');
        if (directResult.supabaseActive) {
          setLastSyncTime(`${new Date().toLocaleTimeString()} (Direct Sync Connected)`);
        } else {
          setLastSyncTime(`${new Date().toLocaleTimeString()} (Saved Locally Only)`);
        }
      } catch (directErr) {
        console.error("Direct Supabase write fallback failed as well:", directErr);
        setSyncStatus('ERROR');
        setLastSyncTime(`${new Date().toLocaleTimeString()} (Offline Cache Saved)`);
      }
      return;
    }

    try {
      const res = await customFetch('/api/tenant/save-state', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tenantId,
          deliveries: d,
          trucks: t,
          branches: b,
          users: u
        })
      });
      if (res.ok) {
        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const body = await res.json();
          setSyncStatus('IDLE');
          if (body.supabaseActive) {
            setLastSyncTime(new Date().toLocaleTimeString());
          } else {
            setLastSyncTime(`${new Date().toLocaleTimeString()} (Offline Cache Saved)`);
          }
          return;
        }
      }
      throw new Error(`Server returned ${res.status}`);
    } catch (e) {
      isExpressBackendAvailableRef.current = false;
      console.debug("Express backend save-state offline, trying direct client-side save fallback");
      try {
        const directResult = await saveTenantStateDirect(tenantId, d, t, b, u);
        setSyncStatus('IDLE');
        if (directResult.supabaseActive) {
          setLastSyncTime(`${new Date().toLocaleTimeString()} (Direct Sync Connected)`);
        } else {
          setLastSyncTime(`${new Date().toLocaleTimeString()} (Saved Locally Only)`);
        }
      } catch (directErr) {
        console.error("Direct Supabase write fallback failed as well:", directErr);
        setSyncStatus('ERROR');
        setLastSyncTime(`${new Date().toLocaleTimeString()} (Offline Cache Saved)`);
      }
    }
  };

  // Hydrate state from Supabase dynamically on tenant switch or manual retry trigger
  useEffect(() => {
    if (!currentTenant) return;
    if (isDbInitializing) {
      console.log("Postponing state load until custom database initialization completes...");
      return;
    }

    const tenantId = currentTenant.id;

    const loadState = async () => {
      // Prevent fetching only if an active sync POST request is currently in flight
      if (syncStatusRef.current === 'SYNCING') {
        console.log("[Sync Lock] Skipping database state polling during active synchronization.");
        return;
      }

      setLastFetchError(null);
      try {
        // Run connectivity diagnostics in background to keep UI stats updated
        checkSupabaseStatus().catch(() => {});

        let data: any;
        if (isExpressBackendAvailableRef.current === false) {
          const directData = await fetchTenantStateDirect(tenantId);
          if (directData && directData.supabaseActive) {
            data = directData;
          } else {
            throw new Error("Direct client state fetch unavailable");
          }
        } else {
          try {
            const res = await customFetch(`/api/tenant/state?tenantId=${tenantId}&_t=${Date.now()}`);
            if (!res.ok) {
              throw new Error(`Server returned error status ${res.status}`);
            }
            const contentType = res.headers.get("content-type") || "";
            if (!contentType.includes("application/json")) {
              throw new Error("non-JSON response");
            }
            data = await res.json();
          } catch (apiErr) {
            isExpressBackendAvailableRef.current = false;
            console.debug("Express backend endpoint /api/tenant/state offline or 404. Trying direct client lookup");
            const directData = await fetchTenantStateDirect(tenantId);
            if (directData && directData.supabaseActive) {
              data = directData;
            } else {
              throw apiErr;
            }
          }
        }

        if (data.supabaseActive) {
          // Populate React state directly from live Supabase Tables and filter out recently deleted IDs
          const filteredDeliveries = (data.deliveries || []).filter((d: any) => !recentlyDeletedIdsRef.current.has(d.id));
          const filteredTrucks = (data.trucks || []).filter((t: any) => !recentlyDeletedIdsRef.current.has(t.id));
          const filteredBranches = (data.branches || []).filter((b: any) => !recentlyDeletedIdsRef.current.has(b.id));
          const filteredUsers = (data.users || []).filter((u: any) => !recentlyDeletedIdsRef.current.has(u.id));

          setDeliveries(filteredDeliveries);
          setTrucks(deduplicateTrucks(filteredTrucks));
          setBranches(filteredBranches);
          setUsers(deduplicateUsers(filteredUsers));
          setLastSyncTime(new Date().toLocaleTimeString());
          setDbActive(true);
          setSyncStatus('IDLE');
          return;
        } else {
          // Supabase is unconfigured/inactive. Fallback to Local/Session Storage mode with the backend-provided sample seed data.
          console.debug("Database dashboard reports unconfigured backend connector. Using local cache fallback.");
          if (data.error) {
            setLastFetchError(data.error);
          }
          const cachedDeliveries = localStorage.getItem(`prospaces_deliveries_tenant_${tenantId}`);
          const cachedTrucks = localStorage.getItem(`prospaces_trucks_tenant_${tenantId}`);
          const cachedBranches = localStorage.getItem(`prospaces_branches_tenant_${tenantId}`);
          const cachedUsers = localStorage.getItem(`prospaces_users_tenant_${tenantId}`);

          let rawDeliveries, rawTrucks, rawBranches, rawUsers;
          let loadedFromCache = false;

          if (isFirstLoadRef.current) {
            // First load on boot: prioritize local storage so we restore state correctly
            if (cachedBranches) {
              rawDeliveries = cachedDeliveries ? JSON.parse(cachedDeliveries) : [];
              rawTrucks = cachedTrucks ? JSON.parse(cachedTrucks) : [];
              rawBranches = JSON.parse(cachedBranches);
              rawUsers = cachedUsers ? JSON.parse(cachedUsers) : [];
              loadedFromCache = true;
            } else {
              // No cache found, use backend's default seed data
              rawDeliveries = data.deliveries || [];
              rawTrucks = data.trucks || [];
              rawBranches = data.branches || [];
              rawUsers = data.users || [];
            }
            isFirstLoadRef.current = false;
          } else {
            // Subsequent polls: prefer server's latest data (with updated GPS coordinates)
            rawDeliveries = (data.deliveries && data.deliveries.length > 0) ? data.deliveries : (cachedDeliveries ? JSON.parse(cachedDeliveries) : []);
            rawTrucks = (data.trucks && data.trucks.length > 0) ? data.trucks : (cachedTrucks ? JSON.parse(cachedTrucks) : []);
            rawBranches = (data.branches && data.branches.length > 0) ? data.branches : (cachedBranches ? JSON.parse(cachedBranches) : []);
            rawUsers = (data.users && data.users.length > 0) ? data.users : (cachedUsers ? JSON.parse(cachedUsers) : []);
          }

          // Keep localStorage warm with current state
          localStorage.setItem(`prospaces_deliveries_tenant_${tenantId}`, JSON.stringify(rawDeliveries));
          localStorage.setItem(`prospaces_trucks_tenant_${tenantId}`, JSON.stringify(rawTrucks));
          localStorage.setItem(`prospaces_branches_tenant_${tenantId}`, JSON.stringify(rawBranches));
          localStorage.setItem(`prospaces_users_tenant_${tenantId}`, JSON.stringify(rawUsers));

          setDeliveries(rawDeliveries.filter((d: any) => !recentlyDeletedIdsRef.current.has(d.id)));
          setTrucks(deduplicateTrucks(rawTrucks.filter((t: any) => !recentlyDeletedIdsRef.current.has(t.id))));
          setBranches(rawBranches.filter((b: any) => !recentlyDeletedIdsRef.current.has(b.id)));
          setUsers(deduplicateUsers(rawUsers.filter((u: any) => !recentlyDeletedIdsRef.current.has(u.id))));
          setLastSyncTime(`${new Date().toLocaleTimeString()} (Offline Local Cache)`);
          setDbActive(false);
          setSyncStatus('IDLE');

          // If we restored a custom state from the cache on boot, sync it back to the backend in-memory store
          if (loadedFromCache) {
            syncStateToSupabase(tenantId, rawDeliveries, rawTrucks, rawBranches, rawUsers);
          }
        }
      } catch (err: any) {
        console.error("Failed to fetch live Supabase tenant state:", err);
        setLastFetchError(err.message || String(err));
        setDbActive(false);
        setSyncStatus('ERROR');
        
        // Upgrade: Graceful, non-blocking local storage cache hydration so that the user is NOT stuck with a frozen/blank UI
        try {
          console.warn("Using offline / cached database hydration fallback to maintain interactive operations.");
          const cachedDeliveries = localStorage.getItem(`prospaces_deliveries_tenant_${tenantId}`);
          const cachedTrucks = localStorage.getItem(`prospaces_trucks_tenant_${tenantId}`);
          const cachedBranches = localStorage.getItem(`prospaces_branches_tenant_${tenantId}`);
          const cachedUsers = localStorage.getItem(`prospaces_users_tenant_${tenantId}`);

          const rawDeliveries = cachedDeliveries ? JSON.parse(cachedDeliveries) : [];
          const rawTrucks = cachedTrucks ? JSON.parse(cachedTrucks) : [];
          const rawBranches = cachedBranches ? JSON.parse(cachedBranches) : [];
          const rawUsers = cachedUsers ? JSON.parse(cachedUsers) : [];

          setDeliveries(rawDeliveries.filter((d: any) => !recentlyDeletedIdsRef.current.has(d.id)));
          setTrucks(deduplicateTrucks(rawTrucks.filter((t: any) => !recentlyDeletedIdsRef.current.has(t.id))));
          setBranches(rawBranches.filter((b: any) => !recentlyDeletedIdsRef.current.has(b.id)));
          setUsers(deduplicateUsers(rawUsers.filter((u: any) => !recentlyDeletedIdsRef.current.has(u.id))));
          setLastSyncTime(`${new Date().toLocaleTimeString()} (Offline Local Fallback)`);
        } catch (fbErr) {
          console.error("Fallback state load failed:", fbErr);
          setDeliveries([]);
          setTrucks([]);
          setBranches([]);
          setUsers([]);
        }
      }
    };

    loadState();
  }, [currentTenant, loadTrigger, isDbInitializing]);

  // Periodic state polling to retrieve live driver GPS and order updates on desktop/other mobiles
  useEffect(() => {
    if (!currentTenant) return;
    if (currentUser?.role === 'SUPER_ADMIN') return;

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        setLoadTrigger(prev => prev + 1);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [currentTenant, currentUser?.role]);

  const realtimeChannelRef = useRef<any>(null);

  // Setup Supabase Realtime Broadcast
  useEffect(() => {
    if (!currentTenant) return;
    const supabase = getFrontendSupabase();
    if (!supabase) return;

    const channelName = `tenant_${currentTenant.id}`;
    const channel = supabase.channel(channelName);

    channel.on(
      'broadcast',
      { event: 'gps_update' },
      (payload) => {
        const data = payload.payload;
        if (data && data.truckId) {
          const nowIso = new Date().toISOString();
          setTrucks(prevTrucks => prevTrucks.map(t => {
            if (t.id === data.truckId) {
              return { 
                ...t, 
                lat: data.lat, 
                lng: data.lng,
                gpsLat: data.lat,
                gpsLng: data.lng,
                gpsLastHandshake: nowIso,
                gpsStatus: 'Connected'
              };
            }
            return t;
          }));
        }
      }
    );

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('Subscribed to Realtime Broadcast for tenant updates');
      }
    });

    realtimeChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      realtimeChannelRef.current = null;
    };
  }, [currentTenant]);

  const lastGpsDbSyncRef = useRef<number>(Date.now());
  const lastHeartbeatRef = useRef<number>(0);

  // Periodic user online heartbeat
  useEffect(() => {
    if (!currentUser || !currentTenant) return;
    if (currentUser.role === 'SUPER_ADMIN') return;
    const now = Date.now();
    // Throttle heartbeat to once every 10 seconds
    if (now - lastHeartbeatRef.current < 10000) return;

    const { users: currentUsers, deliveries: currentDeliveries, trucks: currentTrucks, branches: currentBranches, currentTenant: stateTenant } = stateRef.current;
    if (currentUsers.length === 0) return;

    // Prevent cross-tenant writes if state is stale or mismatches the active tenant
    if (!stateTenant || stateTenant.id !== currentTenant.id) {
      console.debug("[Heartbeat] Tenant mismatch in ref state. Skipping heartbeat save.");
      return;
    }

    const hasDifferentTenantData = 
      currentBranches.some(b => b.tenantId && b.tenantId !== currentTenant.id) ||
      currentUsers.some(u => u.tenantId && u.tenantId !== currentTenant.id) ||
      currentTrucks.some(t => t.tenantId && t.tenantId !== currentTenant.id);

    if (hasDifferentTenantData) {
      console.debug("[Heartbeat] Loaded state contains items from a different tenant. Skipping heartbeat save.");
      return;
    }

    lastHeartbeatRef.current = now;
    const timestamp = new Date().toISOString();
    const updatedUsers = currentUsers.map(u => u.id === currentUser.id ? { ...u, lastActive: timestamp } : u);
    setUsers(updatedUsers);

    // Call lightweight user heartbeat endpoint or fallback directly to direct Supabase update
    const doHeartbeat = async () => {
      if (isExpressBackendAvailableRef.current !== true) {
        saveUserHeartbeatDirect(currentTenant.id, currentUser.id, timestamp).catch(() => {});
        return;
      }
      try {
        const res = await customFetch("/api/tenant/user-heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tenantId: currentTenant.id,
            userId: currentUser.id,
            lastActive: timestamp
          })
        });
        if (res.ok) {
          const contentType = res.headers.get("content-type") || "";
          if (contentType.includes("application/json")) {
            return;
          }
        }
        await saveUserHeartbeatDirect(currentTenant.id, currentUser.id, timestamp);
      } catch (err) {
        saveUserHeartbeatDirect(currentTenant.id, currentUser.id, timestamp).catch(() => {});
      }
    };
    doHeartbeat();
  }, [currentUser, currentTenant, loadTrigger]);

  // Auto-heal/reconcile state to ensure logged-in user and driver vehicles are always present and properly linked
  useEffect(() => {
    if (!currentUser || !currentTenant) return;
    if (currentUser.role === 'SUPER_ADMIN') return;
    
    // We only heal if state has finished loading (i.e. branches is populated, indicating we have state)
    if (branches.length === 0) return;

    // Check for tenant data contamination to prevent cross-tenant writes during state hydration
    const hasDifferentTenantData = 
      branches.some(b => b.tenantId && b.tenantId !== currentTenant.id) ||
      users.some(u => u.tenantId && u.tenantId !== currentTenant.id) ||
      trucks.some(t => t.tenantId && t.tenantId !== currentTenant.id);

    if (hasDifferentTenantData) {
      console.debug("[Auto-Heal] Loaded state contains items from a different tenant. Skipping auto-heal to avoid data contamination.");
      return;
    }

    let stateUpdated = false;
    let newUsers = [...users];
    let newTrucks = [...trucks];
    let newBranches = [...branches];

    // Migrate branch ID "500" (typo) to "DC-WINAMILL"
    if (newBranches.some(b => b.id === "500")) {
      const hasWinamill = newBranches.some(b => b.id === "DC-WINAMILL");
      if (hasWinamill) {
        newBranches = newBranches.filter(b => b.id !== "500");
      } else {
        newBranches = newBranches.map(b => b.id === "500" ? { ...b, id: "DC-WINAMILL" } : b);
      }
      newTrucks = newTrucks.map(t => t.branchId === "500" ? { ...t, branchId: "DC-WINAMILL" } : t);
      newUsers = newUsers.map(u => u.associatedStoreId === "500" ? { ...u, associatedStoreId: "DC-WINAMILL" } : u);
      stateUpdated = true;
    }

    // Migrate branch ID "DC-ELMSDALE" to "01070"
    if (newTrucks.some(t => t.branchId === "DC-ELMSDALE" || t.branchId === "ELMSDALE")) {
      newTrucks = newTrucks.map(t => (t.branchId === "DC-ELMSDALE" || t.branchId === "ELMSDALE") ? { ...t, branchId: "01070" } : t);
      stateUpdated = true;
    }

    // Safeguard uniqueness to avoid duplicate keys in React and ON CONFLICT constraint errors in database
    const uniqueBranchesMap = new Map<string, Branch>();
    newBranches.forEach(b => uniqueBranchesMap.set(b.id, b));
    if (uniqueBranchesMap.size !== newBranches.length) {
      newBranches = Array.from(uniqueBranchesMap.values());
      stateUpdated = true;
    }

    const uniqueTrucksMap = new Map<string, Truck>();
    newTrucks.forEach(t => uniqueTrucksMap.set(t.id, t));
    if (uniqueTrucksMap.size !== newTrucks.length) {
      newTrucks = Array.from(uniqueTrucksMap.values());
      stateUpdated = true;
    }

    const uniqueUsersMap = new Map<string, User>();
    newUsers.forEach(u => uniqueUsersMap.set(u.id, u));
    if (uniqueUsersMap.size !== newUsers.length) {
      newUsers = Array.from(uniqueUsersMap.values());
      stateUpdated = true;
    }

    // 1. Ensure current user exists in users list
    const userExists = newUsers.some(u => u.id === currentUser.id || u.email.toLowerCase() === currentUser.email.toLowerCase());
    if (!userExists) {
      const newUserRecord: User = {
        id: currentUser.id || `USR-${Math.floor(10000 + Math.random() * 90000)}`,
        tenantId: currentTenant.id,
        name: currentUser.name,
        email: currentUser.email,
        role: currentUser.role,
        phone: currentUser.phone || " ||pw:ProSpaces2026! ||status:Active",
        status: "Active",
        associatedStoreId: currentUser.associatedStoreId || "DC-WINAMILL",
        driverLicenseExpire: currentUser.driverLicenseExpire || (currentUser.role === 'Driver' ? "2027-01-22" : undefined),
        lastActive: new Date().toISOString()
      };
      newUsers.push(newUserRecord);
      stateUpdated = true;
    } else {
      // Update lastActive timestamp if it's too old or not set to maintain online status
      newUsers = newUsers.map(u => {
        if (u.email.toLowerCase() === currentUser.email.toLowerCase()) {
          const nowStr = new Date().toISOString();
          const lastActiveTime = u.lastActive ? new Date(u.lastActive).getTime() : 0;
          if (Date.now() - lastActiveTime > 15000) {
            stateUpdated = true;
            return { ...u, lastActive: nowStr };
          }
        }
        return u;
      });
    }

    if (stateUpdated) {
      setUsers(newUsers);
      setTrucks(newTrucks);
      setBranches(newBranches);
      syncStateToSupabase(currentTenant.id, deliveries, newTrucks, newBranches, newUsers);
    }
  }, [currentUser, currentTenant, branches.length, users.length, trucks.length]);

  // Load corporate tenants on boot
  useEffect(() => {
    const loadTenants = async () => {
      try {
        // Run connectivity diagnostics on mount to initialize the frontend Supabase client early
        checkSupabaseStatus().catch(() => {});

        if (isExpressBackendAvailableRef.current === false) {
          const directTenants = await fetchTenantsDirect();
          if (directTenants && directTenants.length > 0) {
            setAllTenants(directTenants);
            localStorage.setItem('prospaces_all_tenants', JSON.stringify(directTenants));
          }
          return;
        }

        const res = await customFetch("/api/tenants");
        if (!res.ok) {
          throw new Error(`Server returned non-ok status: ${res.status}`);
        }
        const contentType = res.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
          throw new Error("Server returned non-JSON content.");
        }
        const data = await res.json();
        if (data.tenants) {
          setAllTenants(data.tenants);
          localStorage.setItem('prospaces_all_tenants', JSON.stringify(data.tenants));
        }
      } catch (err: any) {
        isExpressBackendAvailableRef.current = false;
        console.debug("Failed retrieving tenants from API, trying direct client lookup:", err.message || err);
        try {
          const directTenants = await fetchTenantsDirect();
          if (directTenants && directTenants.length > 0) {
            setAllTenants(directTenants);
            localStorage.setItem('prospaces_all_tenants', JSON.stringify(directTenants));
          }
        } catch (directErr) {
          console.error("Direct tenants lookup failed as well:", directErr);
        }
      }
    };
    loadTenants();
  }, []);

  const handleAddTenant = async (newTenant: Tenant) => {
    try {
      const res = await customFetch("/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant: newTenant })
      });
      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }
      const data = await res.json();
      if (data.supabaseActive === false) throw new Error("Supabase is unconfigured on server.");
      
      const updated = [...allTenants, newTenant];
      setAllTenants(updated);
      localStorage.setItem('prospaces_all_tenants', JSON.stringify(updated));
    } catch (err) {
      console.warn("Express backend register tenant offline, performing direct Supabase upsert:", err);
      try {
        await saveTenantDirect(newTenant);
        const updated = [...allTenants, newTenant];
        setAllTenants(updated);
        localStorage.setItem('prospaces_all_tenants', JSON.stringify(updated));
      } catch (directErr: any) {
        console.error("Direct tenant creation failed:", directErr);
        throw directErr;
      }
    }
  };

  const handleUpdateTenant = async (updatedTenant: Tenant) => {
    try {
      const res = await customFetch("/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant: updatedTenant })
      });
      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }
      const data = await res.json();
      if (data.supabaseActive === false) throw new Error("Supabase is unconfigured on server.");
      
      const updated = allTenants.map(t => t.id === updatedTenant.id ? updatedTenant : t);
      setAllTenants(updated);
      localStorage.setItem('prospaces_all_tenants', JSON.stringify(updated));
    } catch (err) {
      console.warn("Express backend save tenant offline, performing direct Supabase upsert:", err);
      try {
        await saveTenantDirect(updatedTenant);
        const updated = allTenants.map(t => t.id === updatedTenant.id ? updatedTenant : t);
        setAllTenants(updated);
        localStorage.setItem('prospaces_all_tenants', JSON.stringify(updated));
      } catch (directErr: any) {
        console.error("Direct tenant save failed:", directErr);
        throw directErr;
      }
    }
  };

  const handleDeleteTenant = async (id: string) => {
    try {
      const res = await customFetch(`/api/tenants/${id}`, {
        method: "DELETE"
      });
      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }
      const data = await res.json();
      if (data.supabaseActive === false) throw new Error("Supabase is unconfigured on server.");

      const updated = allTenants.filter(t => t.id !== id);
      setAllTenants(updated);
      localStorage.setItem('prospaces_all_tenants', JSON.stringify(updated));
    } catch (err) {
      console.warn("Express backend delete tenant offline, executing direct Supabase deletion:", err);
      try {
        await deleteTenantDirect(id);
        const updated = allTenants.filter(t => t.id !== id);
        setAllTenants(updated);
        localStorage.setItem('prospaces_all_tenants', JSON.stringify(updated));
      } catch (directErr: any) {
        console.error("Direct tenant delete failed:", directErr);
        throw directErr;
      }
    }
  };

  // Sync with Supabase when deliveries change
  const handleAddOrUpdateDelivery = async (newRecord: DeliveryRecord) => {
    if (!currentTenant) return;
    lastMutationTimeRef.current = Date.now();
    const updated = [...deliveries];
    const index = updated.findIndex(d => d.id === newRecord.id);
    if (index >= 0) {
      updated[index] = newRecord;
    } else {
      updated.unshift(newRecord);
    }
    setDeliveries(updated);
    if (currentTenant.id) {
      localStorage.setItem(`prospaces_deliveries_tenant_${currentTenant.id}`, JSON.stringify(updated));
    }
    await syncStateToSupabase(currentTenant.id, updated, trucks, branches, users);
  };

  const deleteRecordWithFallback = async (table: string, id: string, tenantId: string) => {
    lastMutationTimeRef.current = Date.now();
    recentlyDeletedIdsRef.current.add(id);
    if (isExpressBackendAvailableRef.current === false) {
      try {
        await deleteRecordDirect(table, id, tenantId);
      } catch (directErr) {
        console.error("Direct Supabase record deletion failed as well:", directErr);
      }
      return;
    }
    try {
      const res = await customFetch(`/api/tenant/delete-record?table=${table}&id=${id}&tenantId=${tenantId}`, { method: 'DELETE' });
      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }
      const data = await res.json();
      if (data.supabaseActive === false) throw new Error("Supabase is unconfigured on server.");
    } catch (err) {
      isExpressBackendAvailableRef.current = false;
      console.warn(`API record deletion failed, attempting direct Supabase query fallback:`, err);
      try {
        await deleteRecordDirect(table, id, tenantId);
      } catch (directErr) {
        console.error("Direct Supabase record deletion failed as well:", directErr);
      }
    }
  };

  const handleDeleteDelivery = async (id: string) => {
    if (!currentTenant) return;
    const updated = deliveries.filter(d => d.id !== id);
    setDeliveries(updated);
    setSyncStatus('SYNCING');
    lastMutationTimeRef.current = Date.now();
    try {
      await deleteRecordWithFallback('deliveries', id, currentTenant.id);
      await syncStateToSupabase(currentTenant.id, updated, trucks, branches, users);
    } catch (err) {
      console.error("Delete delivery error:", err);
      setSyncStatus('ERROR');
    }
  };

  // Fleet handlers
  const handleAddTruck = async (newTruck: Truck) => {
    if (!currentTenant) return;
    const updated = [...trucks, newTruck];
    setTrucks(updated);
    await syncStateToSupabase(currentTenant.id, deliveries, updated, branches, users);
  };

  const handleUpdateTruck = async (updatedTruck: Truck) => {
    if (!currentTenant) return;
    lastMutationTimeRef.current = Date.now();
    const updated = trucks.map(t => t.id === updatedTruck.id ? updatedTruck : t);
    setTrucks(updated);
    await syncStateToSupabase(currentTenant.id, deliveries, updated, branches, users);
  };

  const handleDeleteTruck = async (id: string) => {
    if (!currentTenant) return;
    const updated = trucks.filter(t => t.id !== id);
    setTrucks(updated);
    setSyncStatus('SYNCING');
    lastMutationTimeRef.current = Date.now();
    try {
      await deleteRecordWithFallback('trucks', id, currentTenant.id);
      await syncStateToSupabase(currentTenant.id, deliveries, updated, branches, users);
    } catch (err) {
      console.error("Delete truck error:", err);
      setSyncStatus('ERROR');
    }
  };

  // Branch / Store handlers
  const handleAddBranch = async (newBranch: Branch) => {
    if (!currentTenant) return;
    const updated = [...branches, newBranch];
    setBranches(updated);
    await syncStateToSupabase(currentTenant.id, deliveries, trucks, updated, users);
  };

  const handleUpdateBranch = async (updatedBranch: Branch) => {
    if (!currentTenant) return;
    const updated = branches.map(b => b.id === updatedBranch.id ? updatedBranch : b);
    setBranches(updated);
    await syncStateToSupabase(currentTenant.id, deliveries, trucks, updated, users);
  };

  const handleDeleteBranch = async (id: string) => {
    if (!currentTenant) return;
    const updated = branches.filter(b => b.id !== id);
    setBranches(updated);
    setSyncStatus('SYNCING');
    lastMutationTimeRef.current = Date.now();
    try {
      await deleteRecordWithFallback('branches', id, currentTenant.id);
      await syncStateToSupabase(currentTenant.id, deliveries, trucks, updated, users);
    } catch (err) {
      console.error("Delete branch error:", err);
      setSyncStatus('ERROR');
    }
  };

  const handleUpdateClosureRules = async (rules: SlotClosureRule[]) => {
    if (!currentTenant) return;
    let updatedBranches = [...branches];
    if (updatedBranches.length === 0) {
      updatedBranches = [{ id: 'ALL', name: 'All Stores', type: 'STORE', address: 'Main Center', closureRules: rules }];
    } else {
      updatedBranches = updatedBranches.map((b, idx) => idx === 0 ? { ...b, closureRules: rules } : b);
    }
    setBranches(updatedBranches);
    try {
      localStorage.setItem(`prospaces_closure_rules_${currentTenant.id}`, JSON.stringify(rules));
    } catch (e) {}
    await syncStateToSupabase(currentTenant.id, deliveries, trucks, updatedBranches, users);
  };

  const handleUpdateStoreConfigs = async (configs: Record<string, StoreDeliveryConfig>) => {
    if (!currentTenant) return;
    let updatedBranches = branches.map(b => {
      const configForBranch = configs[b.id] || configs['ALL'];
      if (configForBranch) {
        return {
          ...b,
          deliveryBoardConfig: configForBranch,
          deliveryDays: configForBranch.deliveryDays
        };
      }
      return b;
    });
    if (updatedBranches.length === 0) {
      const defaultConfig = configs['ALL'] || { branchId: 'ALL', deliveryDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], amTimeRange: '07:00 AM - 12:00 PM', pmTimeRange: '12:00 PM - 05:00 PM', amMaxCap: 6, pmMaxCap: 6, cutoffTime: '16:00', allowOverbooking: false };
      updatedBranches = [{ id: 'ALL', name: 'All Stores', type: 'STORE', address: 'Main Center', deliveryBoardConfig: defaultConfig, deliveryDays: defaultConfig.deliveryDays }];
    }
    setBranches(updatedBranches);
    try {
      localStorage.setItem(`prospaces_store_configs_${currentTenant.id}`, JSON.stringify(configs));
    } catch (e) {}
    await syncStateToSupabase(currentTenant.id, deliveries, trucks, updatedBranches, users);
  };

  const handleUpdateManualFullTrucks = async (updated: Record<string, boolean>) => {
    setManualFullTrucks(updated);
    if (!currentTenant) return;
    const tenantId = currentTenant.id;
    try {
      localStorage.setItem(`prospaces_manual_full_trucks_${tenantId}`, JSON.stringify(updated));
      localStorage.setItem('prospaces_manual_full_trucks', JSON.stringify(updated));
    } catch (e) {}

    let updatedBranches = [...branches];
    if (updatedBranches.length === 0) {
      updatedBranches = [{ id: 'ALL', name: 'All Stores', type: 'STORE', address: 'Main Center', manualFullTrucks: updated } as any];
    } else {
      updatedBranches = updatedBranches.map((b, idx) => idx === 0 ? { ...b, manualFullTrucks: updated } : b);
    }
    setBranches(updatedBranches);
    await syncStateToSupabase(tenantId, deliveries, trucks, updatedBranches, users);
  };

  // User handlers
  const handleAddUser = async (newUser: User) => {
    if (!currentTenant) return;
    const updated = [...users, newUser];
    setUsers(updated);
    await syncStateToSupabase(currentTenant.id, deliveries, trucks, branches, updated);
  };

  const handleUpdateUser = async (updatedUser: User) => {
    if (!currentTenant) return;
    const updated = users.map(u => u.id === updatedUser.id ? { ...u, ...updatedUser } : u);
    setUsers(updated);
    await syncStateToSupabase(currentTenant.id, deliveries, trucks, branches, updated);
  };

  const handleDeleteUser = async (id: string) => {
    if (!currentTenant) return;
    const updated = users.filter(u => u.id !== id);
    setUsers(updated);
    setSyncStatus('SYNCING');
    lastMutationTimeRef.current = Date.now();
    try {
      await deleteRecordWithFallback('users', id, currentTenant.id);
      await syncStateToSupabase(currentTenant.id, deliveries, trucks, branches, updated);
    } catch (err) {
      console.error("Delete user error:", err);
      setSyncStatus('ERROR');
    }
  };

  // Purge / Clear all operational data for the current tenant to start totally fresh
  const handleClearAllData = async () => {
    if (!currentTenant || !currentUser) return;
    
    const confirmMessage = `Are you absolutely sure you want to remove all operational test data (Deliveries, Stores, Trucks, and other custom users) for ${currentTenant.name}?\n\nThis will permanently empty all tables in the live database, but your active administrator profile (${currentUser.email}) will be kept so you stay logged in.`;
    
    if (window.confirm(confirmMessage)) {
      const tenantId = currentTenant.id;
      
      const emptyDeliveries: DeliveryRecord[] = [];
      const emptyTrucks: Truck[] = [];
      const emptyBranches: Branch[] = [];
      const preservedUsers: User[] = [currentUser];
      
      // Update local state
      setDeliveries(emptyDeliveries);
      setTrucks(emptyTrucks);
      setBranches(emptyBranches);
      setUsers(preservedUsers);
      
      // Call the live API to wipe database records permanently
      setSyncStatus('SYNCING');

      if (isExpressBackendAvailableRef.current === false) {
        try {
          await clearAllDirect(tenantId);
          await saveTenantStateDirect(tenantId, emptyDeliveries, emptyTrucks, emptyBranches, preservedUsers);
          setSyncStatus('SUCCESS');
          setLastSyncTime(`${new Date().toLocaleTimeString()} (Direct Clean Sync Completed)`);
          alert("All operational and test data has been successfully deleted from Supabase!");
        } catch (directErr) {
          console.error("Direct clear operation failed:", directErr);
          setSyncStatus('ERROR');
          alert("Could not clear live tables directly. Verify Supabase schema and network connection.");
        }
        return;
      }

      try {
        const res = await customFetch("/api/tenant/clear-all", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tenantId,
            keepUserEmail: currentUser.email
          })
        });
        
        if (res.ok) {
          setSyncStatus('SUCCESS');
          setLastSyncTime(new Date().toLocaleTimeString());
          alert("All operational and test data has been successfully deleted from the live system!");
        } else {
          throw new Error("API returned failed response");
        }
      } catch (err) {
        isExpressBackendAvailableRef.current = false;
        console.error("Failed to delete live records via API, fallback to manual syncing:", err);
        try {
          await clearAllDirect(tenantId);
          // Re-save preserved user to Supabase
          await saveTenantStateDirect(tenantId, emptyDeliveries, emptyTrucks, emptyBranches, preservedUsers);
          setSyncStatus('SUCCESS');
          setLastSyncTime(`${new Date().toLocaleTimeString()} (Direct Clean Sync Completed)`);
          alert("All operational and test data has been successfully deleted from Supabase!");
        } catch (directErr) {
          console.error("Direct clear operation failed too:", directErr);
          setSyncStatus('ERROR');
          alert("Could not clear live tables directly. Verify Supabase schema and network connection.");
        }
      }
    }
  };


  if (!currentTenant || !currentUser) {
    if (showLogin) {
      return (
        <LoginScreen 
          onLoginSuccess={(tenant, user) => {
            handleLoginSuccess(tenant, user);
            setShowLogin(false);
          }} 
          tenantsList={allTenants} 
          onBackToLanding={() => { window.location.href = '/'; }}
        />
      );
    }
    return (
      <LandingPage 
        onStartTrial={() => setShowLogin(true)} 
        onBookDemo={() => setShowLogin(true)} 
        onLoginClick={() => setShowLogin(true)} 
      />
    );
  }

  // Check if logged in user is a SUPER_ADMIN in tenant maintenance mode
  if (currentUser.role === 'SUPER_ADMIN' && superAdminViewMode === 'tenant_maintenance') {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col font-sans text-slate-100 antialiased selection:bg-amber-500 selection:text-slate-950 animate-fade-in" id="super-admin-layout">
        
        {/* Super Admin Top Header */}
        <header className="bg-slate-950 text-white border-b border-amber-500/25 shadow-xl animate-slide-down" id="super-admin-header">
          <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            
            {/* Branded Logo representation */}
            <div className="flex items-center space-x-3 text-center sm:text-left">
              <div className="shrink-0 flex items-center justify-center bg-white p-1 rounded-lg border border-amber-500/10 shadow-sm">
                <img 
                  src="/logistics-logo.jpg" 
                  alt="ProSpaces Logo" 
                  className="h-10 w-auto object-contain"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = typeof prospacesLogo === 'string' && prospacesLogo ? prospacesLogo : '/logo.jpg';
                  }}
                />
              </div>
              <div>
                <div className="flex items-center justify-center sm:justify-start space-x-2 flex-wrap gap-y-1.5">
                  <h2 className="font-sans font-black text-xl text-slate-100 tracking-tight leading-none m-0">ProSpaces</h2>
                  <span className="bg-amber-500/15 text-amber-400 text-[9.5px] uppercase font-mono px-2 py-0.5 rounded font-black border border-amber-500/30 tracking-widest leading-none">
                    Master Administrator
                  </span>
                  {currentTenant && (
                    <span className="bg-slate-800 text-amber-500/90 text-[9.5px] uppercase font-mono px-2 py-0.5 rounded border border-slate-700 tracking-wider font-extrabold leading-none">
                      Tenant: {currentTenant.name}
                    </span>
                  )}
                </div>
                <p className="text-slate-400 text-xs font-semibold mt-1.5 leading-none">
                  Global Organizational Partition Controls & Ecosystem Tenant Provisioning
                </p>
              </div>
            </div>

            {/* Super Admin Navigation View Switcher */}
            <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-xl space-x-1 shadow-inner">
              <button
                onClick={() => setSuperAdminViewMode('tenant_maintenance')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                  superAdminViewMode === 'tenant_maintenance'
                    ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Building2 className="h-3.5 w-3.5" />
                <span>Tenant Maintenance</span>
              </button>
              <button
                onClick={() => setSuperAdminViewMode('app_workspace')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                  superAdminViewMode === 'app_workspace'
                    ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                <span>Launch App Workspace</span>
              </button>
            </div>

            {/* Quick Status Bar */}
            <div className="flex items-center space-x-4">
              <div
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-[10.5px] font-mono border leading-none transition-all duration-200 ${
                  supabaseStatus?.connected 
                    ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' 
                    : 'bg-amber-950/40 border-amber-500/30 text-amber-300 animate-pulse'
                }`}
                title={supabaseStatus?.connected ? "Live Database Sync Verified and Enforced" : "Connecting to unified Supabase server..."}
              >
                <Database className="h-3.5 w-3.5 text-current shrink-0" />
                <span>{supabaseStatus?.connected ? 'Live Database Sync Active' : 'Connecting...'}</span>
              </div>

              <button
                onClick={async () => {
                  setIsCheckingStatus(true);
                  try {
                    const status = await checkSupabaseStatus();
                    setDiagnosticsModal({
                      show: true,
                      title: "ProSpaces Database Diagnostics",
                      connected: !!status?.connected,
                      url: status?.url || 'Default/Local',
                      isServiceRoleKeyAnon: !!status?.isServiceRoleKeyAnon,
                      error: status?.connected ? null : (status?.error || "Supabase database credentials are unconfigured or placeholder.")
                    });
                  } catch (e: any) {
                    setDiagnosticsModal({
                      show: true,
                      title: "Diagnostics System Error",
                      connected: false,
                      url: 'Error',
                      isServiceRoleKeyAnon: false,
                      error: e.message || String(e)
                    });
                  } finally {
                    setIsCheckingStatus(false);
                  }
                }}
                title="Run database connection diagnostics & status verification"
                className="flex items-center space-x-1 bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-800 px-2.5 py-1.5 rounded-lg text-[10.5px] font-mono transition-all duration-200 cursor-pointer shadow-sm active:scale-95"
              >
                <RefreshCw className={`h-3 w-3 ${isCheckingStatus ? 'animate-spin text-amber-400' : 'text-slate-400'}`} />
                <span>{isCheckingStatus ? 'Verifying...' : 'Diagnostics'}</span>
              </button>

              {/* Identity & control */}
              <div className="relative flex items-center border-l border-slate-800 pl-4">
                <button 
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-2.5 hover:bg-slate-850 p-1.5 rounded-2xl transition-all cursor-pointer select-none text-left"
                  id="user-menu-trigger-admin"
                >
                  <div className="hidden lg:flex flex-col text-right font-sans">
                    <span className="text-xs font-bold leading-none text-slate-200">{currentUser.name}</span>
                    <span className="text-[9px] font-mono text-amber-400 leading-none mt-1 uppercase font-black tracking-wider">
                      {currentUser.role}
                    </span>
                  </div>
                  {renderUserAvatarHelper(currentUser.avatarUrl, currentUser.name, "h-8 w-8")}
                </button>

                {/* Dropdown Menu */}
                {isUserMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-3xl shadow-2xl border border-slate-100 p-4 z-50 animate-fade-in text-left">
                      <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-4 flex flex-col items-center justify-center text-center mb-3">
                        <div className="relative group mb-3">
                          <div className="h-20 w-20 rounded-full overflow-hidden border-2 border-white shadow-md bg-white flex items-center justify-center">
                            {renderUserAvatarHelper(currentUser.avatarUrl, currentUser.name, "h-full w-full")}
                          </div>
                          <button 
                            onClick={() => {
                              setIsUserMenuOpen(false);
                              setProfileActiveTab('photo');
                              setShowProfileModal(true);
                            }}
                            className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white p-1.5 rounded-full shadow-lg transition-all cursor-pointer"
                            title="Update Profile Photo"
                          >
                            <Camera className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <h4 className="text-xs sm:text-sm font-extrabold text-slate-800 leading-snug">
                          {currentUser.name} &bull; {currentUser.role}
                        </h4>
                        <p className="text-[10px] sm:text-xs text-slate-500 truncate max-w-full font-medium mt-0.5">
                          {currentUser.email}
                        </p>
                      </div>

                      <div className="space-y-0.5">
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            setProfileActiveTab('password');
                            setShowProfileModal(true);
                          }}
                          className="w-full flex items-center space-x-3 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 rounded-xl transition-all font-bold text-left cursor-pointer"
                        >
                          <Key className="h-4 w-4 text-slate-400" />
                          <span>Passwords and autofill</span>
                        </button>

                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            setProfileActiveTab('info');
                            setShowProfileModal(true);
                          }}
                          className="w-full flex items-center space-x-3 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 rounded-xl transition-all font-bold text-left cursor-pointer"
                        >
                          <Sliders className="h-4 w-4 text-slate-400" />
                          <span>Customize profile details</span>
                        </button>

                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            setProfileActiveTab('photo');
                            setShowProfileModal(true);
                          }}
                          className="w-full flex items-center space-x-3 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 rounded-xl transition-all font-bold text-left cursor-pointer"
                        >
                          <Camera className="h-4 w-4 text-slate-400" />
                          <span>Customize photo / avatar</span>
                        </button>

                        <div className="border-t border-slate-100 my-2" />

                        <div className="px-3 py-1 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                          <span>Sync engine status</span>
                          <span className="flex items-center space-x-1 text-green-600 font-bold">
                            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                            <span>Sync is on</span>
                          </span>
                        </div>

                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            handleLogout();
                          }}
                          className="w-full flex items-center space-x-3 px-3 py-2.5 text-xs text-rose-600 hover:bg-rose-50 rounded-xl transition-all font-black text-left cursor-pointer"
                        >
                          <LogOut className="h-4 w-4 text-rose-400" />
                          <span>Logoff & switch tenant</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

          </div>
        </header>

        {/* Core Screen */}
        <main className="flex-1 max-w-[1920px] w-full mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-8 flex flex-col space-y-6">
          <div className="bg-slate-800/40 p-6 rounded-3xl border border-slate-800/80 backdrop-blur-md" id="super-admin-content-card">
            <SuperAdminTenantsView 
              tenants={allTenants} 
              onAddTenant={handleAddTenant}
              onUpdateTenant={handleUpdateTenant}
              onDeleteTenant={handleDeleteTenant}
              supabaseStatus={supabaseStatus}
              currentUser={currentUser}
            />
          </div>
        </main>

        <footer className="bg-slate-950 text-slate-500 py-6 border-t border-slate-900 text-center text-xs" id="super-admin-footer">
          <div className="max-w-[1920px] mx-auto px-4 space-y-1">
            <p className="font-bold text-slate-400">ProSpaces Global Administration Node</p>
            <p className="text-[10px] text-slate-600 font-mono">
              Secured under master corporate administrative rules &bull; Full structural control over physical tenants.
            </p>
          </div>
        </footer>

      </div>
    );
  }

  const theme = getThemeClasses(currentTenant.primaryColor);

  const userRoleNormalized = (currentUser?.role || '').trim().toLowerCase();
  const isNavAdmin = ['admin', 'super_admin'].includes(userRoleNormalized);
  const isNavDispatcher = userRoleNormalized === 'dispatcher';
  const isNavDriver = userRoleNormalized === 'driver';
  const isNavPicker = userRoleNormalized === 'picker';
  const isNavUser = userRoleNormalized === 'user';

  // Combined checks for view space accessibility
  const showDispatcherSpace = isNavAdmin || isNavDispatcher || isNavUser;
  const showPickerSpace = isNavAdmin || isNavDispatcher || isNavPicker;
  const showDriverSpace = isNavAdmin || isNavDispatcher || isNavDriver;
  const showAdminSpace = isNavAdmin || isNavDispatcher;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-gray-800 antialiased selection:bg-blue-600 selection:text-white w-full max-w-full overflow-x-hidden" id="main-app-container">
      
      {/* Super Admin Top Controller Banner when in App Workspace Mode */}
      {currentUser.role === 'SUPER_ADMIN' && (
        <div className="bg-slate-950 text-amber-300 px-4 py-2 flex flex-wrap items-center justify-between text-xs border-b border-amber-500/30 shadow-md gap-2 z-50">
          <div className="flex items-center space-x-2.5">
            <span className="bg-amber-500 text-slate-950 text-[10px] uppercase font-mono px-2 py-0.5 rounded font-black tracking-wider shadow-xs">
              SUPER ADMIN MODE
            </span>
            <span className="text-slate-200 font-medium">
              Active Workspace: <strong className="text-amber-400 font-bold">{currentTenant?.name}</strong> <span className="text-slate-400 font-mono text-[11px]">({currentTenant?.id})</span>
            </span>
          </div>
          <div className="flex items-center space-x-3">
            {allTenants.length > 0 && (
              <div className="flex items-center space-x-1.5">
                <label className="text-slate-400 text-[11px] font-mono">Switch Tenant:</label>
                <select
                  value={currentTenant?.id}
                  onChange={(e) => {
                    const found = allTenants.find(t => t.id === e.target.value);
                    if (found) {
                      setCurrentTenant(found);
                      localStorage.setItem('prospaces_active_tenant', JSON.stringify(found));
                    }
                  }}
                  className="bg-slate-900 text-amber-300 text-xs px-2.5 py-1 rounded-lg border border-slate-700 font-mono focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  {allTenants.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.id})</option>
                  ))}
                </select>
              </div>
            )}
            <button
              onClick={() => setSuperAdminViewMode('tenant_maintenance')}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-3 py-1 rounded-lg text-xs transition-all shadow-sm cursor-pointer border border-amber-300 flex items-center space-x-1.5"
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>Return to Tenant Maintenance</span>
            </button>
          </div>
        </div>
      )}
      
      {/* Enterprise Sticky Brand Header & Unified Navigation */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs transition-all duration-200" id="prospaces-header">
        <div className="max-w-[1920px] mx-auto px-3 sm:px-6 lg:px-8 py-2 sm:py-2.5 flex items-center justify-between gap-3">
          
          {/* Logo & title context */}
          <div className="flex items-center space-x-2.5 sm:space-x-4 text-left">
            <div className="shrink-0 flex items-center justify-center">
              <img 
                src="/logistics-logo.jpg" 
                alt="ProSpaces Logo" 
                className="h-10 sm:h-16 w-auto object-contain animate-fade-in"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = typeof prospacesLogo === 'string' && prospacesLogo ? prospacesLogo : '/logo.jpg';
                }}
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="bg-blue-50 text-blue-600 border border-blue-200/50 text-[8px] font-bold uppercase tracking-wider px-1 py-0.5 rounded font-mono leading-none">
                  Tenant
                </span>
                <span className="text-slate-400 text-[9px] uppercase font-bold tracking-wider font-sans leading-none hidden xs:inline">Active Workspace:</span>
              </div>
              <h1 className="font-sans font-black text-slate-900 text-xs sm:text-base tracking-tight leading-tight m-0 truncate max-w-[150px] sm:max-w-none">
                {currentTenant.name}
              </h1>
              <p className="text-slate-500 text-[8px] sm:text-[10px] font-semibold uppercase tracking-wider mt-0.5 leading-none flex items-center gap-1 sm:gap-1.5">
                <span>Enterprise Logistics Portal</span>
                <span className="opacity-40">&bull;</span>
                <span className="bg-slate-100 border border-slate-200 text-slate-700 px-1 py-0.5 rounded text-[8px] font-mono font-bold leading-none">{currentTenant.code}</span>
              </p>
            </div>
          </div>

          {/* Quick Stats & Logged-In User Profile context */}
          <div className="flex items-center justify-end gap-2 sm:gap-3 shrink-0">
            <div className="hidden md:flex items-center space-x-1.5 bg-slate-50 border border-slate-200/85 px-2.5 py-1 rounded-lg text-xs font-mono text-slate-600">
              <Store className="h-3.5 w-3.5 text-slate-400" />
              <span>{branches.length} Regs &bull; {trucks.length} Vehs</span>
            </div>

            {/* Authenticated User Badge & Logout Switcher */}
            <div className="relative flex items-center">
              <button 
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center space-x-1 sm:space-x-2 hover:bg-slate-50 p-1 sm:p-1.5 rounded-2xl transition-all cursor-pointer select-none text-left"
                id="user-menu-trigger"
              >
                <div className="hidden sm:flex flex-col text-right font-sans">
                  <span className="text-xs font-black leading-none text-slate-800">{currentUser.name}</span>
                  <span className="text-[9px] font-mono text-slate-500 leading-none mt-1 uppercase font-bold tracking-wider">
                    {currentUser.role}
                  </span>
                </div>
                <div className="sm:hidden flex flex-col text-right pr-1 font-sans">
                  <span className="text-[10px] font-bold leading-none text-slate-800 truncate max-w-[80px]">{currentUser.name.split(' ')[0]}</span>
                  <span className="text-[8px] font-mono text-slate-400 leading-none mt-0.5 uppercase tracking-wider">
                    {currentUser.role}
                  </span>
                </div>
                {renderUserAvatarHelper(currentUser.avatarUrl, currentUser.name, "h-7 w-7 sm:h-8 sm:w-8")}
              </button>

              {/* User Dropdown Menu */}
              {isUserMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-3xl shadow-2xl border border-slate-100 p-4 z-50 animate-fade-in text-left">
                    <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-4 flex flex-col items-center justify-center text-center mb-3">
                      <div className="relative group mb-3">
                        <div className="h-20 w-20 rounded-full overflow-hidden border-2 border-white shadow-md bg-white flex items-center justify-center">
                          {renderUserAvatarHelper(currentUser.avatarUrl, currentUser.name, "h-full w-full")}
                        </div>
                        <button 
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            setProfileActiveTab('photo');
                            setShowProfileModal(true);
                          }}
                          className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white p-1.5 rounded-full shadow-lg transition-all cursor-pointer"
                          title="Update Profile Photo"
                        >
                          <Camera className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <h4 className="text-xs sm:text-sm font-extrabold text-slate-800 leading-snug">
                        {currentUser.name} &bull; {currentUser.role}
                      </h4>
                      <p className="text-[10px] sm:text-xs text-slate-500 truncate max-w-full font-medium mt-0.5">
                        {currentUser.email}
                      </p>
                    </div>

                    <div className="space-y-0.5">
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          setProfileActiveTab('password');
                          setShowProfileModal(true);
                        }}
                        className="w-full flex items-center space-x-3 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 rounded-xl transition-all font-bold text-left cursor-pointer"
                      >
                        <Key className="h-4 w-4 text-slate-400" />
                        <span>Passwords and autofill</span>
                      </button>

                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          setProfileActiveTab('info');
                          setShowProfileModal(true);
                        }}
                        className="w-full flex items-center space-x-3 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 rounded-xl transition-all font-bold text-left cursor-pointer"
                      >
                        <Sliders className="h-4 w-4 text-slate-400" />
                        <span>Customize profile details</span>
                      </button>

                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          setProfileActiveTab('photo');
                          setShowProfileModal(true);
                        }}
                        className="w-full flex items-center space-x-3 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 rounded-xl transition-all font-bold text-left cursor-pointer"
                      >
                        <Camera className="h-4 w-4 text-slate-400" />
                        <span>Customize photo / avatar</span>
                      </button>

                      <div className="border-t border-slate-100 my-2" />

                      <div className="px-3 py-1 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span>Sync engine status</span>
                        <span className="flex items-center space-x-1 text-green-600 font-bold">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                          <span>Sync is on</span>
                        </span>
                      </div>

                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center space-x-3 px-3 py-2.5 text-xs text-rose-600 hover:bg-rose-50 rounded-xl transition-all font-black text-left cursor-pointer"
                      >
                        <LogOut className="h-4 w-4 text-rose-400" />
                        <span>Logoff & switch tenant</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Righthand Navigation Dropdown on Mobile */}
            <div className="relative lg:hidden">
              <button
                onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
                className="p-2 text-slate-600 hover:bg-slate-100 active:bg-slate-200 rounded-xl transition-all cursor-pointer flex items-center justify-center border border-slate-200/80 bg-white"
                id="mobile-nav-trigger"
                aria-label="Toggle Navigation Menu"
              >
                {isMobileNavOpen ? <X className="h-4.5 w-4.5" /> : <Menu className="h-4.5 w-4.5" />}
              </button>

              {isMobileNavOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsMobileNavOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 p-3.5 z-50 animate-fade-in text-left">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 px-1 font-sans">Navigation Menu</p>
                    
                    <div className="space-y-1">
                      {showDispatcherSpace && (
                        <>
                          <div className="text-[9px] font-black tracking-wider uppercase text-slate-400 font-sans mt-3 mb-1 px-2 border-b border-slate-100 pb-1">Dispatcher Space</div>
                          <button
                            onClick={() => {
                              setActiveTab('dashboard');
                              setIsMobileNavOpen(false);
                            }}
                            className={`w-full py-2 px-3 text-xs font-bold rounded-xl flex items-center space-x-2.5 transition-all cursor-pointer ${
                              activeTab === 'dashboard'
                                ? 'bg-blue-800 text-white shadow-sm'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <MapIcon className="h-4 w-4" />
                            <span>Map</span>
                          </button>

                          {showAdminSpace && (
                            <button
                              onClick={() => {
                                setActiveTab('live-dashboard');
                                setIsMobileNavOpen(false);
                              }}
                              className={`w-full py-2 px-3 text-xs font-bold rounded-xl flex items-center space-x-2.5 transition-all cursor-pointer ${
                                activeTab === 'live-dashboard'
                                  ? 'bg-blue-800 text-white shadow-sm'
                                  : 'text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <Activity className="h-4 w-4 text-[#FF5A1F] animate-pulse" />
                              <span>Live Monitor</span>
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setActiveTab('queue');
                              setIsMobileNavOpen(false);
                            }}
                            className={`w-full py-2 px-3 text-xs font-bold rounded-xl flex items-center justify-between transition-all cursor-pointer ${
                              activeTab === 'queue'
                                ? 'bg-blue-800 text-white shadow-sm'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center space-x-2.5">
                              <ClipboardList className="h-4 w-4" />
                              <span>Freight Board</span>
                            </div>
                            {deliveries.length > 0 && (
                              <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${activeTab === 'queue' ? 'bg-white text-blue-900 font-mono' : 'bg-slate-100 text-slate-600 font-mono'}`}>
                                {deliveries.length}
                              </span>
                            )}
                          </button>

                          <button
                            onClick={() => {
                              setActiveTab('delivery-board');
                              setIsMobileNavOpen(false);
                            }}
                            className={`w-full py-2 px-3 text-xs font-bold rounded-xl flex items-center space-x-2.5 transition-all cursor-pointer ${
                              activeTab === 'delivery-board'
                                ? 'bg-blue-800 text-white shadow-sm'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <CalendarIcon className="h-4 w-4 text-blue-500" />
                            <span>Delivery Board</span>
                          </button>

                          {!isNavUser && (
                            <button
                              onClick={() => {
                                setActiveTab('document-import');
                                setIsMobileNavOpen(false);
                              }}
                              className={`w-full py-2 px-3 text-xs font-bold rounded-xl flex items-center space-x-2.5 transition-all cursor-pointer ${
                                activeTab === 'document-import'
                                  ? 'bg-blue-800 text-white shadow-sm'
                                  : 'text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <FileDown className="h-4 w-4 text-indigo-500" />
                              <span>Doc Import</span>
                            </button>
                          )}
                        </>
                      )}

                      {showPickerSpace && (
                        <>
                          <div className="text-[9px] font-black tracking-wider uppercase text-slate-400 font-sans mt-3 mb-1 px-2 border-b border-slate-100 pb-1">Picker Space</div>
                          <button
                            onClick={() => {
                              setActiveTab('scanner');
                              setIsMobileNavOpen(false);
                            }}
                            className={`w-full py-2 px-3 text-xs font-bold rounded-xl flex items-center space-x-2.5 transition-all cursor-pointer ${
                              activeTab === 'scanner'
                                ? 'bg-blue-800 text-white shadow-sm'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <Scan className="h-4 w-4 text-amber-600" />
                            <span>Loading Scanner</span>
                          </button>
                        </>
                      )}

                      {showDriverSpace && (
                        <>
                          <div className="text-[9px] font-black tracking-wider uppercase text-slate-400 font-sans mt-3 mb-1 px-2 border-b border-slate-100 pb-1">Driver Space</div>
                          <button
                            onClick={() => {
                              setActiveTab('epod');
                              setIsMobileNavOpen(false);
                            }}
                            className={`w-full py-2 px-3 text-xs font-bold rounded-xl flex items-center space-x-2.5 transition-all cursor-pointer ${
                              activeTab === 'epod'
                                ? 'bg-blue-800 text-white shadow-sm'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <TruckIcon className="h-4 w-4 text-emerald-600" />
                            <span>Mobile EPOD</span>
                          </button>

                          <button
                            onClick={() => {
                              setActiveTab('scanner');
                              setIsMobileNavOpen(false);
                            }}
                            className={`w-full py-2 px-3 text-xs font-bold rounded-xl flex items-center space-x-2.5 transition-all cursor-pointer ${
                              activeTab === 'scanner'
                                ? 'bg-blue-800 text-white shadow-sm'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <Scan className="h-4 w-4 text-amber-600" />
                            <span>Loading Scanner</span>
                          </button>
                          
                          <button
                            onClick={() => {
                              setActiveTab('inspections');
                              setIsMobileNavOpen(false);
                            }}
                            className={`w-full py-2 px-3 text-xs font-bold rounded-xl flex items-center space-x-2.5 transition-all cursor-pointer ${
                              activeTab === 'inspections'
                                ? 'bg-blue-800 text-white shadow-sm'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <Shield className="h-4 w-4 text-blue-500" />
                            <span>Vehicle Inspections</span>
                          </button>

                          <button
                            onClick={() => {
                              setActiveTab('fuel');
                              setIsMobileNavOpen(false);
                            }}
                            className={`w-full py-2 px-3 text-xs font-bold rounded-xl flex items-center space-x-2.5 transition-all cursor-pointer ${
                              activeTab === 'fuel'
                                ? 'bg-blue-800 text-white shadow-sm'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <Activity className="h-4 w-4 text-rose-500" />
                            <span>Fuel Tracker</span>
                          </button>
                        </>
                      )}

                      {showAdminSpace && (
                        <>
                          <div className="text-[9px] font-black tracking-wider uppercase text-slate-400 font-sans mt-3 mb-1 px-2 border-b border-slate-100 pb-1">Admin Space</div>
                          <button
                            onClick={() => {
                              setActiveTab('enterprise-hub');
                              setIsMobileNavOpen(false);
                            }}
                            className={`w-full py-2 px-3 text-xs font-bold rounded-xl flex items-center space-x-2.5 transition-all cursor-pointer ${
                              activeTab === 'enterprise-hub'
                                ? 'bg-blue-800 text-white shadow-sm'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <Sparkles className="h-4 w-4 text-purple-500 animate-pulse" />
                            <span>Enterprise Hub</span>
                          </button>

                          <button
                            onClick={() => {
                              setActiveTab('stores');
                              setIsMobileNavOpen(false);
                            }}
                            className={`w-full py-2 px-3 text-xs font-bold rounded-xl flex items-center space-x-2.5 transition-all cursor-pointer ${
                              ['stores', 'trucks', 'gps', 'users', 'architecture'].includes(activeTab)
                                ? 'bg-blue-800 text-white shadow-sm'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <Settings className="h-4 w-4" />
                            <span>System Config</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

          </div>
        </div>

        {/* Unified Classified Navigation Subbar inside Sticky Header */}
        <div className="hidden lg:block border-t border-slate-100 bg-slate-50/70 py-1.5 select-none" id="prospaces-nav-unified-sticky">
          <div className="max-w-[1920px] mx-auto px-3 sm:px-6 lg:px-8">
            <div className="flex items-center space-x-2 lg:space-x-4">
              
              {/* Group 1: Dispatcher Space */}
              {showDispatcherSpace && (
                <div 
                  className="relative nav-dropdown-container"
                >
                  <button 
                    onClick={() => setActiveNavDropdown(prev => prev === 'dispatcher' ? null : 'dispatcher')}
                    className="flex items-center space-x-2 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200/60 rounded-xl transition-all cursor-pointer"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                    <span>Dispatcher Space</span>
                    <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${activeNavDropdown === 'dispatcher' ? 'rotate-180' : ''}`} />
                  </button>
                  <div className={`absolute left-0 top-full pt-1 min-w-[200px] z-[100] transition-all duration-200 ${activeNavDropdown === 'dispatcher' ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2 pointer-events-none'}`}>
                    <div className="flex flex-col bg-white border border-slate-200 shadow-xl shadow-slate-200/50 rounded-xl p-1.5">
                      <button
                        onClick={() => { setActiveTab('dashboard'); setActiveNavDropdown(null); }}
                        className={`w-full text-left px-3 py-2 text-xs font-bold rounded-lg flex items-center space-x-2.5 transition-all cursor-pointer ${
                          activeTab === 'dashboard' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <MapIcon className="h-4 w-4" />
                        <span>Map</span>
                      </button>

                      {showAdminSpace && (
                        <button
                          onClick={() => { setActiveTab('live-dashboard'); setActiveNavDropdown(null); }}
                          className={`w-full text-left px-3 py-2 text-xs font-bold rounded-lg flex items-center space-x-2.5 transition-all cursor-pointer ${
                            activeTab === 'live-dashboard' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                          }`}
                        >
                          <Activity className="h-4 w-4 text-[#FF5A1F]" />
                          <span>Live Monitor</span>
                        </button>
                      )}

                      <button
                        onClick={() => { setActiveTab('queue'); setActiveNavDropdown(null); }}
                        className={`w-full text-left px-3 py-2 text-xs font-bold rounded-lg flex items-center space-x-2.5 transition-all cursor-pointer ${
                          activeTab === 'queue' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <ClipboardList className="h-4 w-4" />
                        <span>Freight Board</span>
                      </button>

                      <button
                        onClick={() => { setActiveTab('delivery-board'); setActiveNavDropdown(null); }}
                        className={`w-full text-left px-3 py-2 text-xs font-bold rounded-lg flex items-center space-x-2.5 transition-all cursor-pointer ${
                          activeTab === 'delivery-board' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <CalendarIcon className="h-4 w-4 text-blue-600" />
                        <span>Delivery Board</span>
                      </button>

                      {!isNavUser && (
                        <button
                          onClick={() => { setActiveTab('document-import'); setActiveNavDropdown(null); }}
                          className={`w-full text-left px-3 py-2 text-xs font-bold rounded-lg flex items-center space-x-2.5 transition-all cursor-pointer ${
                            activeTab === 'document-import' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                          }`}
                        >
                          <FileDown className="h-4 w-4 text-indigo-600" />
                          <span>Doc Import</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Group 2: Picker Space */}
              {showPickerSpace && (
                <div 
                  className="relative nav-dropdown-container"
                >
                  <button 
                    onClick={() => setActiveNavDropdown(prev => prev === 'picker' ? null : 'picker')}
                    className="flex items-center space-x-2 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200/60 rounded-xl transition-all cursor-pointer"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    <span>Picker Space</span>
                    <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${activeNavDropdown === 'picker' ? 'rotate-180' : ''}`} />
                  </button>
                  <div className={`absolute left-0 top-full pt-1 min-w-[200px] z-[100] transition-all duration-200 ${activeNavDropdown === 'picker' ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2 pointer-events-none'}`}>
                    <div className="flex flex-col bg-white border border-slate-200 shadow-xl shadow-slate-200/50 rounded-xl p-1.5">
                      <button
                        onClick={() => { setActiveTab('scanner'); setActiveNavDropdown(null); }}
                        className={`w-full text-left px-3 py-2 text-xs font-bold rounded-lg flex items-center space-x-2.5 transition-all cursor-pointer ${
                          activeTab === 'scanner' ? 'bg-amber-50 text-amber-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <Scan className="h-4 w-4 text-amber-600" />
                        <span>Loading Scanner</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Group 3: Driver Space */}
              {showDriverSpace && (
                <div 
                  className="relative nav-dropdown-container"
                >
                  <button 
                    onClick={() => setActiveNavDropdown(prev => prev === 'driver' ? null : 'driver')}
                    className="flex items-center space-x-2 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200/60 rounded-xl transition-all cursor-pointer"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>Driver Space</span>
                    <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${activeNavDropdown === 'driver' ? 'rotate-180' : ''}`} />
                  </button>
                  <div className={`absolute left-0 top-full pt-1 min-w-[200px] z-[100] transition-all duration-200 ${activeNavDropdown === 'driver' ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2 pointer-events-none'}`}>
                    <div className="flex flex-col bg-white border border-slate-200 shadow-xl shadow-slate-200/50 rounded-xl p-1.5">
                      <button
                        onClick={() => { setActiveTab('epod'); setActiveNavDropdown(null); }}
                        className={`w-full text-left px-3 py-2 text-xs font-bold rounded-lg flex items-center space-x-2.5 transition-all cursor-pointer ${
                          activeTab === 'epod' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <TruckIcon className="h-4 w-4 text-emerald-600" />
                        <span>Mobile EPOD</span>
                      </button>
                      <button
                        onClick={() => { setActiveTab('scanner'); setActiveNavDropdown(null); }}
                        className={`w-full text-left px-3 py-2 text-xs font-bold rounded-lg flex items-center space-x-2.5 transition-all cursor-pointer ${
                          activeTab === 'scanner' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <Scan className="h-4 w-4 text-amber-600" />
                        <span>Loading Scanner</span>
                      </button>
                      <button
                        onClick={() => { setActiveTab('inspections'); setActiveNavDropdown(null); }}
                        className={`w-full text-left px-3 py-2 text-xs font-bold rounded-lg flex items-center space-x-2.5 transition-all cursor-pointer ${
                          activeTab === 'inspections' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <Shield className="h-4 w-4 text-blue-500" />
                        <span>Vehicle Inspections</span>
                      </button>
                      <button
                        onClick={() => { setActiveTab('fuel'); setActiveNavDropdown(null); }}
                        className={`w-full text-left px-3 py-2 text-xs font-bold rounded-lg flex items-center space-x-2.5 transition-all cursor-pointer ${
                          activeTab === 'fuel' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <Activity className="h-4 w-4 text-rose-500" />
                        <span>Fuel Tracker</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Group 4: Admin Space */}
              {showAdminSpace && (
                <div 
                  className="relative nav-dropdown-container"
                >
                  <button 
                    onClick={() => setActiveNavDropdown(prev => prev === 'admin' ? null : 'admin')}
                    className="flex items-center space-x-2 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200/60 rounded-xl transition-all cursor-pointer"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
                    <span>Admin Space</span>
                    <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${activeNavDropdown === 'admin' ? 'rotate-180' : ''}`} />
                  </button>
                  <div className={`absolute left-0 top-full pt-1 min-w-[200px] z-[100] transition-all duration-200 ${activeNavDropdown === 'admin' ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2 pointer-events-none'}`}>
                    <div className="flex flex-col bg-white border border-slate-200 shadow-xl shadow-slate-200/50 rounded-xl p-1.5">
                      <button
                        onClick={() => { setActiveTab('enterprise-hub'); setActiveNavDropdown(null); }}
                        className={`w-full text-left px-3 py-2 text-xs font-bold rounded-lg flex items-center space-x-2.5 transition-all cursor-pointer ${
                          activeTab === 'enterprise-hub' ? 'bg-purple-50 text-purple-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <Sparkles className="h-4 w-4 text-purple-500" />
                        <span>Enterprise Hub</span>
                      </button>
                      <button
                        onClick={() => { setActiveTab('stores'); setActiveNavDropdown(null); }}
                        className={`w-full text-left px-3 py-2 text-xs font-bold rounded-lg flex items-center space-x-2.5 transition-all cursor-pointer ${
                          ['stores', 'trucks', 'gps', 'users', 'architecture'].includes(activeTab) ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <Settings className="h-4 w-4" />
                        <span>System Config</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
            </div>
          </div>
        </div>
      </header>

      {/* Main Core Body */}
      <main className="flex-1 max-w-[1920px] w-full mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-6 flex flex-col space-y-6 overflow-x-hidden" id="prospaces-body">

        {/* Secondary Sub-navigation for Fleet Setup */}
        {['stores', 'trucks', 'gps', 'users', 'architecture'].includes(activeTab) && (
          <div className="bg-slate-100 border border-slate-200/50 p-1 rounded-xl flex flex-nowrap overflow-x-auto gap-1 shadow-inner w-full scrollbar-none select-none animate-fade-in" id="prospaces-subnav" style={{ WebkitOverflowScrolling: 'touch' }}>
            <button
              onClick={() => setActiveTab('stores')}
              className={`flex-1 py-1.5 px-3.5 text-[11px] font-bold rounded-lg flex items-center justify-center space-x-1.5 transition-all shrink-0 whitespace-nowrap ${
                activeTab === 'stores'
                  ? 'bg-white text-blue-800 shadow-xs border border-slate-200/40'
                  : 'text-gray-500 hover:bg-white/50 hover:text-gray-800'
              }`}
            >
              <Store className="h-3.5 w-3.5 text-blue-600" />
              <span>Stores</span>
            </button>
            <button
              onClick={() => setActiveTab('trucks')}
              className={`flex-1 py-1.5 px-3.5 text-[11px] font-bold rounded-lg flex items-center justify-center space-x-1.5 transition-all shrink-0 whitespace-nowrap ${
                activeTab === 'trucks'
                  ? 'bg-white text-blue-800 shadow-xs border border-slate-200/40'
                  : 'text-gray-500 hover:bg-white/50 hover:text-gray-800'
              }`}
            >
              <TruckIcon className="h-3.5 w-3.5 text-blue-600" />
              <span>Trucks</span>
            </button>
            {currentUser?.role === 'Admin' && (
              <button
                onClick={() => setActiveTab('gps')}
                className={`flex-1 py-1.5 px-3.5 text-[11px] font-bold rounded-lg flex items-center justify-center space-x-1.5 transition-all shrink-0 whitespace-nowrap ${
                  activeTab === 'gps'
                    ? 'bg-white text-blue-800 shadow-xs border border-slate-200/40'
                    : 'text-gray-500 hover:bg-white/50 hover:text-gray-800'
                }`}
              >
                <Compass className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
                <span>Hardware GPS Setup</span>
              </button>
            )}
            <button
              onClick={() => setActiveTab('users')}
              className={`flex-1 py-1.5 px-3.5 text-[11px] font-bold rounded-lg flex items-center justify-center space-x-1.5 transition-all shrink-0 whitespace-nowrap ${
                activeTab === 'users'
                  ? 'bg-white text-blue-800 shadow-xs border border-slate-200/40'
                  : 'text-gray-500 hover:bg-white/50 hover:text-gray-800'
              }`}
            >
              <Users className="h-3.5 w-3.5 text-blue-600" />
              <span>Users</span>
            </button>
            <button
              onClick={() => setActiveTab('architecture')}
              className={`flex-1 py-1.5 px-3.5 text-[11px] font-bold rounded-lg flex items-center justify-center space-x-1.5 transition-all shrink-0 whitespace-nowrap ${
                activeTab === 'architecture'
                  ? 'bg-white text-blue-800 shadow-xs border border-slate-200/40'
                  : 'text-gray-500 hover:bg-white/50 hover:text-gray-800'
              }`}
            >
              <Layers3 className="h-3.5 w-3.5 text-blue-600" />
              <span>Overall Architecture</span>
            </button>
          </div>
        )}
        {/* Dynamic content area depending on tabs */}
        <div className="flex-1 transition-all duration-300" id="current-tab-view">
          {activeTab === 'dashboard' && (
            <Dashboard 
              deliveries={deliveries} 
              onSelectTab={setActiveTab} 
              trucks={trucks} 
              onAddOrUpdateDelivery={handleAddOrUpdateDelivery}
              branches={branches}
              onUpdateTruck={handleUpdateTruck}
              users={users}
              currentUser={currentUser}
            />
          )}
          {activeTab === 'live-dashboard' && (
            <LiveDashboard 
              deliveries={deliveries} 
              trucks={trucks} 
              branches={branches}
              users={users}
            />
          )}
          {['enterprise-hub', 'epod', 'inspections', 'fuel', 'safety', 'compliance', 'maintenance', 'routes'].includes(activeTab) && (
            <EnterpriseHub 
              deliveries={deliveries}
              branches={branches}
              trucks={trucks}
              users={users}
              currentUser={currentUser}
              onAddOrUpdateDelivery={handleAddOrUpdateDelivery}
              defaultView={
                activeTab === 'epod' ? 'pod' :
                activeTab === 'inspections' ? 'inspections' :
                activeTab === 'fuel' ? 'fuel' :
                activeTab === 'enterprise-hub' ? 'customers' :
                activeTab
              }
            />
          )}
          {activeTab === 'scanner' && (
            <ScanStation 
              deliveries={deliveries} 
              onAddOrUpdateDelivery={handleAddOrUpdateDelivery} 
              onDeleteDelivery={handleDeleteDelivery}
              trucks={trucks} 
              branches={branches}
              users={users}
            />
          )}
          {activeTab === 'queue' && (
            <DeliveryQueue 
              deliveries={deliveries} 
              trucks={trucks}
              onAddOrUpdateDelivery={handleAddOrUpdateDelivery}
              onDeleteDelivery={handleDeleteDelivery}
              branches={branches}
              users={users}
              manualFullTrucks={manualFullTrucks}
              onUpdateManualFullTrucks={handleUpdateManualFullTrucks}
            />
          )}
          {activeTab === 'delivery-board' && (
            <DeliveryBoard
              deliveries={deliveries}
              branches={branches}
              trucks={trucks}
              users={users}
              currentUser={currentUser}
              currentTenant={currentTenant}
              onUpdateDelivery={handleAddOrUpdateDelivery}
              onAddDelivery={handleAddOrUpdateDelivery}
              onUpdateClosureRules={handleUpdateClosureRules}
              onUpdateStoreConfigs={handleUpdateStoreConfigs}
              manualFullTrucks={manualFullTrucks}
              onUpdateManualFullTrucks={handleUpdateManualFullTrucks}
            />
          )}
          {activeTab === 'stores' && (
            <StoresSetup 
              branches={branches}
              onAddBranch={handleAddBranch}
              onUpdateBranch={handleUpdateBranch}
              onDeleteBranch={handleDeleteBranch}
              truckCountByBranch={branches.reduce((acc, b) => {
                acc[b.id] = trucks.filter(t => isTruckAssignedToBranch(t, b)).length;
                return acc;
              }, {} as Record<string, number>)}
              readOnly={currentUser?.role === 'Dispatcher'}
            />
          )}
          {activeTab === 'trucks' && (
            <FleetSetup 
              trucks={trucks} 
              branches={branches}
              users={users}
              onAddTruck={handleAddTruck} 
              onUpdateTruck={handleUpdateTruck} 
              onDeleteTruck={handleDeleteTruck} 
              readOnly={currentUser?.role === 'Dispatcher'}
            />
          )}
          {activeTab === 'gps' && (
            <GpsSetup 
              trucks={trucks}
              branches={branches}
              onUpdateTruck={handleUpdateTruck}
            />
          )}
          {activeTab === 'users' && (
            <UsersSetup 
              users={users}
              branches={branches}
              onAddUser={handleAddUser}
              onUpdateUser={handleUpdateUser}
              onDeleteUser={handleDeleteUser}
              readOnly={currentUser?.role === 'Dispatcher'}
            />
          )}
          {activeTab === 'document-import' && (
            <ArchitectureView 
              branches={branches}
              onAddOrUpdateDelivery={handleAddOrUpdateDelivery}
              supabaseStatus={supabaseStatus}
              syncStatus={syncStatus}
              lastSyncTime={lastSyncTime}
              onRefreshStatus={checkSupabaseStatus}
              onRunRestDiagnostic={runSupabaseRestDiagnostic}
              defaultSegment="mapping-ui"
              allowedSegments={['mapping-ui', 'local-folder']}
            />
          )}
          {activeTab === 'architecture' && (
            <ArchitectureView 
              branches={branches}
              onAddOrUpdateDelivery={handleAddOrUpdateDelivery}
              supabaseStatus={supabaseStatus}
              syncStatus={syncStatus}
              lastSyncTime={lastSyncTime}
              onRefreshStatus={checkSupabaseStatus}
              onRunRestDiagnostic={runSupabaseRestDiagnostic}
              defaultSegment="blueprint"
              allowedSegments={['blueprint', 'supabase-db']}
            />
          )}
          {activeTab === 'landing-preview' && (
            <div className="bg-white border border-slate-200/60 rounded-2xl shadow-xs overflow-hidden">
              <LandingPage 
                onStartTrial={() => setActiveTab('dashboard')} 
                onBookDemo={() => setActiveTab('dashboard')} 
                onLoginClick={() => setActiveTab('dashboard')} 
                isEmbedPreview={true}
              />
            </div>
          )}
        </div>

      </main>

      {/* Corporate Footer */}
      <footer className="bg-slate-900 text-slate-400 py-6 border-t border-slate-800 text-center text-xs mt-12" id="prospaces-footer">
        <div className="max-w-[1920px] mx-auto px-4 space-y-2">
          <p className="font-medium text-slate-300">{currentTenant.name} &bull; ProSpaces Portal</p>
          <p className="text-[10px] text-slate-500 font-mono">
            Drafted for presentation regarding independent mobile routing platforms &bull; Part of ProSpaces Delivery and Logistics &bull; Workspace tenant: {currentTenant.code}
          </p>
          <div className="flex items-center justify-center space-x-4 pt-1 text-[10px] text-slate-500">
            <span className="flex items-center">
              <Shield className="h-3 w-3 mr-1 text-slate-600" />
              Authenticated Session Secure ({currentUser.role}: {currentUser.email})
            </span>
            <span>&bull;</span>
            <span>Local Database Persistent (Active)</span>
          </div>
        </div>
      </footer>

      {showChangePasswordModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="change-password-modal">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 text-slate-800 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center space-x-2">
                <Key className="h-5 w-5 text-blue-600" />
                <h3 className="text-base font-bold font-sans text-slate-900">Change Account Password</h3>
              </div>
              <button
                onClick={() => setShowChangePasswordModal(false)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-50 transition-all text-xs"
              >
                ✕
              </button>
            </div>

            {changePasswordError && (
              <div className="mb-4 bg-rose-50 border border-rose-100 rounded-xl p-3 text-xs text-rose-800 flex items-start space-x-2">
                <span className="text-rose-500 font-bold shrink-0">⚠️</span>
                <span>{changePasswordError}</span>
              </div>
            )}

            {changePasswordSuccess && (
              <div className="mb-4 bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-xs text-emerald-800 flex items-start space-x-2">
                <span className="text-emerald-500 font-bold shrink-0">✅</span>
                <span>{changePasswordSuccess}</span>
              </div>
            )}

            <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-semibold text-slate-700">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>

              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-semibold text-slate-700">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="At least 6 characters, no simple passwords"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>

              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-semibold text-slate-700">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Repeat your new password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowChangePasswordModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={changePasswordLoading}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all disabled:opacity-50"
                >
                  {changePasswordLoading ? 'Saving...' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showProfileModal && currentUser && (
        <UserProfileModal
          currentUser={currentUser}
          branches={branches}
          initialTab={profileActiveTab}
          onClose={() => setShowProfileModal(false)}
          onUpdateProfile={handleUpdateProfile}
        />
      )}



      {diagnosticsModal && diagnosticsModal.show && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="diagnostics-modal">
          <div className="bg-slate-900 text-slate-100 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-800/80 animate-fade-in text-left">
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-4 mb-4">
              <div className="flex items-center space-x-2.5">
                <Shield className="h-5 w-5 text-blue-400" />
                <h3 className="text-base font-bold font-sans text-slate-100">{diagnosticsModal.title}</h3>
              </div>
              <button
                onClick={() => setDiagnosticsModal(null)}
                className="text-slate-400 hover:text-slate-200 rounded-lg p-1 hover:bg-slate-800/50 transition-all text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-lg ${
                  diagnosticsModal.connected ? 'bg-emerald-950/50 text-emerald-400' : 'bg-rose-950/50 text-rose-400'
                }`}>
                  {diagnosticsModal.connected ? '✓' : '✗'}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-200">Database Connection Status</h4>
                  <p className="text-xs text-slate-400">
                    {diagnosticsModal.connected ? 'CONNECTED & ACTIVE' : 'OFFLINE / UNCONFIGURED'}
                  </p>
                </div>
              </div>

              <div className="space-y-2 bg-slate-950 p-4 rounded-2xl border border-slate-800/60 font-mono text-xs">
                <div>
                  <span className="text-slate-500">Endpoint URL:</span>
                  <p className="text-slate-300 break-all mt-0.5">{diagnosticsModal.url || 'None'}</p>
                </div>
                <div className="border-t border-slate-900 my-2 pt-2">
                  <span className="text-slate-500">Role Authority:</span>
                  <p className="text-slate-300 mt-0.5">
                    {diagnosticsModal.isServiceRoleKeyAnon 
                      ? "⚠️ Under Limited / Anon Role Key (Non-Admin)" 
                      : "✅ Service Role Key Configured (Admin Mode)"}
                  </p>
                </div>
                {diagnosticsModal.error && (
                  <div className="border-t border-slate-900 my-2 pt-2">
                    <span className="text-rose-400">Error Details:</span>
                    <p className="text-rose-300 break-words mt-0.5 whitespace-pre-wrap">{diagnosticsModal.error}</p>
                  </div>
                )}
              </div>

              {!diagnosticsModal.connected && (
                <div className="bg-amber-950/20 border border-amber-500/20 rounded-2xl p-3.5 text-xs text-amber-300 leading-relaxed flex items-start space-x-2.5">
                  <span className="text-amber-500 font-bold shrink-0">⚠️</span>
                  <span>
                    Action Required: Click the "Offline / Local Database Sync Mode" status button in the header to set up valid live Supabase credentials!
                  </span>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setDiagnosticsModal(null)}
                  className="px-5 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all cursor-pointer"
                >
                  Close Diagnostic View
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

