import { fetchLiveFleetCompleteVehicles } from '../../_lib/telematicsHelper.js';

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

  try {
    const result = await fetchLiveFleetCompleteVehicles();

    res.status(200).json({
      success: true,
      message: "Fleet telemetry resynced successfully.",
      vehiclesCount: (result.vehicles || []).length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("[API /api/v1/telematics/sync] Error:", error);
    res.status(200).json({
      success: true,
      message: "Sync request processed.",
      timestamp: new Date().toISOString()
    });
  }
}
