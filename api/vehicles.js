const FLEET_COMPLETE_API_URL = "https://api.fleetcomplete.com/login/token";

async function getValidToken() {
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
      return null;
    }

    const data = await response.json();
    return data.token || null;
  } catch (error) {
    return null;
  }
}

async function getVehiclePositions() {
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

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    return [];
  }
}

export default async (req, res) => {
  try {
    const vehicles = await getVehiclePositions();
    
    res.status(200).json({
      success: true,
      source: "fleet_complete",
      isStale: false,
      fleetId: "abb3c44d-0588-486d-9e49-441d9639727c",
      vehicles: vehicles || []
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch vehicles"
    });
  }
};
