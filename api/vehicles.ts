import type { VercelRequest, VercelResponse } from "@vercel/node";

const FLEET_COMPLETE_API_URL = "https://api.fleetcomplete.com/login/token";

async function getValidToken(): Promise<string | null> {
  try {
    const username = process.env.FLEET_COMPLETE_USERNAME;
    const password = process.env.FLEET_COMPLETE_PASSWORD;
    const apiKey = process.env.FLEET_COMPLETE_API_KEY;

    if (apiKey) {
      return apiKey;
    }

    if (!username || !password) {
      return null;
    }

    const response = await fetch(FLEET_COMPLETE_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      console.error("[Fleet Complete] Token request failed:", response.statusText);
      return null;
    }

    const data: any = await response.json();
    return data.token || null;
  } catch (error) {
    console.error("[Fleet Complete] Token fetch error:", error);
    return null;
  }
}

async function getVehiclePositions(): Promise<any[]> {
  try {
    const token = await getValidToken();
    if (!token) {
      return [];
    }

    const response = await fetch("https://api.fleetcomplete.com/v1.0/vehicle/positions", {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      return [];
    }

    const data: any = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("[Fleet Complete] Vehicle positions fetch error:", error);
    return [];
  }
}

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
