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
        (v.truckName && v.truckName.toLowerCase().includes(search)) ||
        (v.name && v.name.toLowerCase().includes(search)) ||
        (v.id && String(v.id).toLowerCase().includes(search)) ||
        (v.vin && v.vin.toLowerCase().includes(search)) ||
        (v.licensePlate && v.licensePlate.toLowerCase().includes(search))
      );
    }

    // Status filter
    if (statusFilter === 'moving') {
      list = list.filter(v => v.status === 'MOVING' || v.motionStatus === 'MOVING' || (v.speed && v.speed > 3));
    } else if (statusFilter === 'idle' || statusFilter === 'idling') {
      list = list.filter(v => v.status === 'IDLE' || v.motionStatus === 'IDLE' || v.ignitionStatus === 'IDLE');
    } else if (statusFilter === 'stopped' || statusFilter === 'parked' || statusFilter === 'off') {
      list = list.filter(v => v.status === 'STOPPED' || v.motionStatus === 'PARKED' || v.ignitionStatus === 'OFF');
    }

    const allVehicles = result.vehicles || [];
    const movingCount = allVehicles.filter(v => v.status === 'MOVING' || v.motionStatus === 'MOVING' || (v.speed && v.speed > 3)).length;
    const idlingCount = allVehicles.filter(v => v.status === 'IDLE' || v.motionStatus === 'IDLE' || v.ignitionStatus === 'IDLE').length;
    const parkedCount = allVehicles.filter(v => v.status === 'STOPPED' || v.motionStatus === 'PARKED' || v.ignitionStatus === 'OFF').length;
    const avgSpeed = allVehicles.length > 0 ? Math.round(allVehicles.reduce((acc, v) => acc + (v.speed || 0), 0) / allVehicles.length) : 0;
    const avgFuel = allVehicles.length > 0 ? Math.round(allVehicles.reduce((acc, v) => acc + (v.telematics?.fuelPercent || 75), 0) / allVehicles.length) : 75;

    res.status(200).json({
      success: true,
      data: list,
      vehicles: list,
      count: list.length,
      totalCount: allVehicles.length,
      summary: {
        total: allVehicles.length,
        totalVehicles: allVehicles.length,
        moving: movingCount,
        movingCount: movingCount,
        idling: idlingCount,
        idleCount: idlingCount,
        parked: parkedCount,
        stoppedCount: parkedCount,
        averageSpeed: avgSpeed,
        averageFuelLevel: avgFuel,
        totalActiveDeliveries: 0
      },
      source: result.source || "fleet_complete",
      fleetId: result.fleetId || "f273b680-2105-427a-9e57-4dcef2979ec1",
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
