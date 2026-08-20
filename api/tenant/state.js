import { getSupabase } from '../_lib/telematicsHelper.js';

const DEFAULT_BRANCHES = [
  { id: "rona_halifax", name: "RONA+ Halifax (Store 7010)", address: "5500 Chain Lake Dr, Halifax, NS B3S 1H6", type: "STORE" },
  { id: "rona_dartmouth", name: "RONA+ Dartmouth (Store 7020)", address: "100 Gale Terrace, Dartmouth, NS B3B 0B7", type: "STORE" },
  { id: "rona_bedford", name: "RONA Bedford (Store 7030)", address: "1650 Bedford Hwy, Bedford, NS B4A 1E8", type: "STORE" },
  { id: "rona_bayers", name: "RONA Bayers Lake (Store 7040)", address: "200 Chain Lake Dr, Halifax, NS B3S 1D5", type: "STORE" }
];

const DEFAULT_TRUCKS = [
  { id: "TRK-01", truckNumber: "TRK-01", name: "Unit 101 - 26ft Freightliner M2", type: "26ft Box Truck", branchId: "rona_halifax", branch_id: "rona_halifax", driver: "Dave Miller", assignedDriverId: "Dave Miller", gpsDeviceId: "FC-TRK01", gpsStatus: "Connected", lat: 44.6488, lng: -63.5752, gpsLat: 44.6488, gpsLng: -63.5752 },
  { id: "TRK-02", truckNumber: "TRK-02", name: "Unit 102 - 24ft International MV", type: "24ft Box Truck", branchId: "rona_halifax", branch_id: "rona_halifax", driver: "Sarah Jenkins", assignedDriverId: "Sarah Jenkins", gpsDeviceId: "FC-TRK02", gpsStatus: "Connected", lat: 44.6510, lng: -63.5820, gpsLat: 44.6510, gpsLng: -63.5820 },
  { id: "TRK-03", truckNumber: "TRK-03", name: "Unit 103 - 26ft Hino 338 Flatbed", type: "Flatbed Boom Truck", branchId: "rona_halifax", branch_id: "rona_halifax", driver: "Marc LeBlanc", assignedDriverId: "Marc LeBlanc", gpsDeviceId: "FC-TRK03", gpsStatus: "Connected", lat: 44.6390, lng: -63.5910, gpsLat: 44.6390, gpsLng: -63.5910 },
  { id: "TRK-04", truckNumber: "TRK-04", name: "Unit 104 - 20ft Isuzu NRR", type: "20ft Curtainsider", branchId: "rona_halifax", branch_id: "rona_halifax", driver: "Alex Cormier", assignedDriverId: "Alex Cormier", gpsDeviceId: "FC-TRK04", gpsStatus: "Connected", lat: 44.6550, lng: -63.5680, gpsLat: 44.6550, gpsLng: -63.5680 },
  { id: "TRK-05", truckNumber: "TRK-05", name: "Unit 201 - 26ft Freightliner M2", type: "26ft Box Truck", branchId: "rona_dartmouth", branch_id: "rona_dartmouth", driver: "Mike MacDonald", assignedDriverId: "Mike MacDonald", gpsDeviceId: "FC-TRK05", gpsStatus: "Connected", lat: 44.6850, lng: -63.5590, gpsLat: 44.6850, gpsLng: -63.5590 },
  { id: "TRK-06", truckNumber: "TRK-06", name: "Unit 202 - 24ft Peterbilt 220", type: "24ft Box Truck", branchId: "rona_dartmouth", branch_id: "rona_dartmouth", driver: "Paul Tremblay", assignedDriverId: "Paul Tremblay", gpsDeviceId: "FC-TRK06", gpsStatus: "Connected", lat: 44.6920, lng: -63.5410, gpsLat: 44.6920, gpsLng: -63.5410 },
  { id: "TRK-07", truckNumber: "TRK-07", name: "Unit 203 - 28ft Western Star Flatbed", type: "Flatbed Crane Truck", branchId: "rona_dartmouth", branch_id: "rona_dartmouth", driver: "Jason Roy", assignedDriverId: "Jason Roy", gpsDeviceId: "FC-TRK07", gpsStatus: "Connected", lat: 44.6780, lng: -63.5700, gpsLat: 44.6780, gpsLng: -63.5700 },
  { id: "TRK-08", truckNumber: "TRK-08", name: "Unit 204 - 18ft Ford F-650", type: "18ft Box Truck", branchId: "rona_dartmouth", branch_id: "rona_dartmouth", driver: "Chris Boucher", assignedDriverId: "Chris Boucher", gpsDeviceId: "FC-TRK08", gpsStatus: "Connected", lat: 44.7010, lng: -63.5350, gpsLat: 44.7010, gpsLng: -63.5350 },
  { id: "TRK-09", truckNumber: "TRK-09", name: "Unit 301 - 26ft Kenworth T280", type: "26ft Box Truck", branchId: "rona_bedford", branch_id: "rona_bedford", driver: "Kevin Gallant", assignedDriverId: "Kevin Gallant", gpsDeviceId: "FC-TRK09", gpsStatus: "Connected", lat: 44.7310, lng: -63.6550, gpsLat: 44.7310, gpsLng: -63.6550 },
  { id: "TRK-10", truckNumber: "TRK-10", name: "Unit 302 - 24ft Freightliner M2", type: "24ft Box Truck", branchId: "rona_bedford", branch_id: "rona_bedford", driver: "Robert Landry", assignedDriverId: "Robert Landry", gpsDeviceId: "FC-TRK10", gpsStatus: "Connected", lat: 44.7250, lng: -63.6420, gpsLat: 44.7250, gpsLng: -63.6420 },
  { id: "TRK-11", truckNumber: "TRK-11", name: "Unit 303 - 26ft Hino 338 Flatbed", type: "Flatbed Boom Truck", branchId: "rona_bedford", branch_id: "rona_bedford", driver: "Daniel Chiasson", assignedDriverId: "Daniel Chiasson", gpsDeviceId: "FC-TRK11", gpsStatus: "Connected", lat: 44.7400, lng: -63.6600, gpsLat: 44.7400, gpsLng: -63.6600 },
  { id: "TRK-12", truckNumber: "TRK-12", name: "Unit 304 - 16ft Ram 5500 Service", type: "16ft Service Van", branchId: "rona_bedford", branch_id: "rona_bedford", driver: "Eric Arsenault", assignedDriverId: "Eric Arsenault", gpsDeviceId: "FC-TRK12", gpsStatus: "Connected", lat: 44.7180, lng: -63.6300, gpsLat: 44.7180, gpsLng: -63.6300 },
  { id: "TRK-13", truckNumber: "TRK-13", name: "Unit 401 - 26ft Freightliner M2", type: "26ft Box Truck", branchId: "rona_bayers", branch_id: "rona_bayers", driver: "Luc Richard", assignedDriverId: "Luc Richard", gpsDeviceId: "FC-TRK13", gpsStatus: "Connected", lat: 44.6450, lng: -63.6680, gpsLat: 44.6450, gpsLng: -63.6680 },
  { id: "TRK-14", truckNumber: "TRK-14", name: "Unit 402 - 24ft International MV", type: "24ft Box Truck", branchId: "rona_bayers", branch_id: "rona_bayers", driver: "Brian Doucet", assignedDriverId: "Brian Doucet", gpsDeviceId: "FC-TRK14", gpsStatus: "Connected", lat: 44.6520, lng: -63.6750, gpsLat: 44.6520, gpsLng: -63.6750 },
  { id: "TRK-15", truckNumber: "TRK-15", name: "Unit 403 - 28ft Western Star Flatbed", type: "Flatbed Crane Truck", branchId: "rona_bayers", branch_id: "rona_bayers", driver: "Gilles Poirier", assignedDriverId: "Gilles Poirier", gpsDeviceId: "FC-TRK15", gpsStatus: "Connected", lat: 44.6380, lng: -63.6610, gpsLat: 44.6380, gpsLng: -63.6610 },
  { id: "TRK-16", truckNumber: "TRK-16", name: "Unit 404 - 20ft Isuzu NRR", type: "20ft Curtainsider", branchId: "rona_bayers", branch_id: "rona_bayers", driver: "Denis Belliveau", assignedDriverId: "Denis Belliveau", gpsDeviceId: "FC-TRK16", gpsStatus: "Connected", lat: 44.6600, lng: -63.6800, gpsLat: 44.6600, gpsLng: -63.6800 }
];

const DEFAULT_USERS = [
  { id: "USR-01", name: "Dave Miller", email: "dave.miller@rona.ca", role: "Driver", associatedStoreId: "rona_halifax", status: "Active" },
  { id: "USR-02", name: "Sarah Jenkins", email: "sarah.jenkins@rona.ca", role: "Driver", associatedStoreId: "rona_halifax", status: "Active" },
  { id: "USR-03", name: "Marc LeBlanc", email: "marc.leblanc@rona.ca", role: "Driver", associatedStoreId: "rona_halifax", status: "Active" },
  { id: "USR-04", name: "Alex Cormier", email: "alex.cormier@rona.ca", role: "Driver", associatedStoreId: "rona_halifax", status: "Active" },
  { id: "USR-05", name: "Mike MacDonald", email: "mike.macdonald@rona.ca", role: "Driver", associatedStoreId: "rona_dartmouth", status: "Active" },
  { id: "USR-06", name: "Paul Tremblay", email: "paul.tremblay@rona.ca", role: "Driver", associatedStoreId: "rona_dartmouth", status: "Active" },
  { id: "USR-07", name: "Jason Roy", email: "jason.roy@rona.ca", role: "Driver", associatedStoreId: "rona_dartmouth", status: "Active" },
  { id: "USR-08", name: "Chris Boucher", email: "chris.boucher@rona.ca", role: "Driver", associatedStoreId: "rona_dartmouth", status: "Active" },
  { id: "USR-09", name: "Kevin Gallant", email: "kevin.gallant@rona.ca", role: "Driver", associatedStoreId: "rona_bedford", status: "Active" },
  { id: "USR-10", name: "Robert Landry", email: "robert.landry@rona.ca", role: "Driver", associatedStoreId: "rona_bedford", status: "Active" },
  { id: "USR-11", name: "Daniel Chiasson", email: "daniel.chiasson@rona.ca", role: "Driver", associatedStoreId: "rona_bedford", status: "Active" },
  { id: "USR-12", name: "Eric Arsenault", email: "eric.arsenault@rona.ca", role: "Driver", associatedStoreId: "rona_bedford", status: "Active" },
  { id: "USR-13", name: "Luc Richard", email: "luc.richard@rona.ca", role: "Driver", associatedStoreId: "rona_bayers", status: "Active" },
  { id: "USR-14", name: "Brian Doucet", email: "brian.doucet@rona.ca", role: "Driver", associatedStoreId: "rona_bayers", status: "Active" },
  { id: "USR-15", name: "Gilles Poirier", email: "gilles.poirier@rona.ca", role: "Driver", associatedStoreId: "rona_bayers", status: "Active" },
  { id: "USR-16", name: "Denis Belliveau", email: "denis.belliveau@rona.ca", role: "Driver", associatedStoreId: "rona_bayers", status: "Active" },
  { id: "USR-ADMIN", name: "George Cameron", email: "geocam55@gmail.com", role: "Admin", associatedStoreId: "rona_halifax", status: "Active" }
];

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

  const tenantId = req.query.tenantId || "rona_atlantic";

  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('kv_store_8405be07')
      .select('value')
      .eq('key', `tenant_state_${tenantId}`)
      .maybeSingle();

    if (data?.value) {
      return res.status(200).json({
        supabaseActive: true,
        tenantId: tenantId,
        ...data.value
      });
    }
  } catch (e) {
    console.warn('[Serverless Tenant State] Supabase read notice:', e?.message || e);
  }

  res.status(200).json({
    supabaseActive: true,
    tenantId: tenantId,
    branches: DEFAULT_BRANCHES,
    trucks: DEFAULT_TRUCKS,
    users: DEFAULT_USERS,
    deliveries: []
  });
}
