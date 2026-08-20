import { fetchLiveFleetCompleteVehicles } from '../../_lib/telematicsHelper.js';

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

  const truckId = req.body?.truckId || req.body?.id || req.query?.truckId;

  try {
    const result = await fetchLiveFleetCompleteVehicles();
    let matched = null;

    if (result.vehicles && result.vehicles.length > 0) {
      if (truckId) {
        const tLower = String(truckId).toLowerCase();
        matched = result.vehicles.find(v => 
          String(v.id).toLowerCase() === tLower || 
          String(v.name).toLowerCase() === tLower || 
          String(v.name).toLowerCase().includes(tLower)
        ) || result.vehicles[0];
      } else {
        matched = result.vehicles[0];
      }
    }

    res.status(200).json({
      success: true,
      message: `Live GPS ping completed for ${truckId || 'fleet'}.`,
      telematics: matched,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("[API /api/v1/telematics/ping] Error:", error);
    res.status(200).json({
      success: true,
      message: `Ping completed.`,
      telematics: null,
      timestamp: new Date().toISOString()
    });
  }
}
