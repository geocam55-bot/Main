import { fetchLiveFleetCompleteVehicles, getActiveConnection } from './_lib/telematicsHelper.js';

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

  try {
    const conn = await getActiveConnection();
    const result = await fetchLiveFleetCompleteVehicles();

    if (result.success && result.vehicles && result.vehicles.length > 0) {
      return res.status(200).json({
        success: true,
        source: "fleet_complete",
        isStale: false,
        fleetId: result.fleetId || "f273b680-2105-427a-9e57-4dcef2979ec1",
        vehicles: result.vehicles,
        timestamp: new Date().toISOString()
      });
    }

    return res.status(200).json({
      success: true,
      source: "fleet_complete",
      isStale: false,
      fleetId: "f273b680-2105-427a-9e57-4dcef2979ec1",
      warning: result.message || "No live vehicles reported from Fleet Complete at this moment.",
      vehicles: [],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("[API /vehicles] Error:", error);
    res.status(200).json({
      success: false,
      vehicles: [],
      error: error?.message || "Failed to fetch vehicles"
    });
  }
}
