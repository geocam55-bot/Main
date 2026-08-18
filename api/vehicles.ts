import { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { getVehiclePositions } from "../src/server/fleetComplete";

export default async (req: VercelRequest, res: VercelResponse) => {
  try {
    const vehicles = await getVehiclePositions();
    
    res.status(200).json({
      success: true,
      source: "fleet_complete",
      isStale: false,
      fleetId: "abb3c44d-0588-486d-9e49-441d9639727c",
      vehicles: vehicles || []
    });
  } catch (error: any) {
    console.error("[API /vehicles] Error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch vehicles"
    });
  }
};
