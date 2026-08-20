import { fetchLiveFleetCompleteVehicles, getActiveConnection } from '../../_lib/telematicsHelper.js';

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

  try {
    const statusFilter = (req.query.status || 'all').toLowerCase().trim();
    const search = (req.query.search || '').toLowerCase().trim();

    const conn = await getActiveConnection();
    const result = await fetchLiveFleetCompleteVehicles();

    let list = result.vehicles || [];

    // Search filter
    if (search) {
      list = list.filter(v => 
        (v.name && v.name.toLowerCase().includes(search)) ||
        (v.id && String(v.id).toLowerCase().includes(search)) ||
        (v.vin && v.vin.toLowerCase().includes(search)) ||
        (v.licensePlate && v.licensePlate.toLowerCase().includes(search))
      );
    }

    // Status filter
    if (statusFilter === 'moving') {
      list = list.filter(v => v.motionStatus === 'MOVING' || (v.speed && v.speed > 0));
    } else if (statusFilter === 'idling') {
      list = list.filter(v => v.motionStatus === 'IDLING' || v.ignitionStatus === 'IDLING');
    } else if (statusFilter === 'parked' || statusFilter === 'stopped') {
      list = list.filter(v => v.motionStatus === 'PARKED' || v.ignitionStatus === 'OFF');
    }

    const movingCount = (result.vehicles || []).filter(v => v.motionStatus === 'MOVING' || (v.speed && v.speed > 0)).length;
    const idlingCount = (result.vehicles || []).filter(v => v.motionStatus === 'IDLING' || v.ignitionStatus === 'IDLING').length;
    const parkedCount = (result.vehicles || []).filter(v => v.motionStatus === 'PARKED' || v.ignitionStatus === 'OFF').length;

    res.status(200).json({
      success: true,
      data: list,
      vehicles: list,
      count: list.length,
      totalCount: (result.vehicles || []).length,
      summary: {
        total: (result.vehicles || []).length,
        moving: movingCount,
        idling: idlingCount,
        parked: parkedCount
      },
      source: "fleet_complete",
      fleetId: result.fleetId || "abb3c44d-0588-486d-9e49-441d9639727c",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("[API /api/v1/telematics/vehicles] Error:", error);
    res.status(200).json({
      success: false,
      data: [],
      vehicles: [],
      error: error?.message || "Failed to query vehicles",
      timestamp: new Date().toISOString()
    });
  }
}
