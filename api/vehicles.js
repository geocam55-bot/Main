module.exports = async (req, res) => {
  try {
    res.setHeader("Content-Type", "application/json");

    const username = process.env.FLEET_COMPLETE_USERNAME;
    const password = process.env.FLEET_COMPLETE_PASSWORD;
    const apiKey = process.env.FLEET_COMPLETE_API_KEY;

    if (!apiKey && (!username || !password)) {
      return res.status(500).json({
        success: false,
        error: "Fleet Complete credentials missing"
      });
    }

    // Get token from Fleet Complete
    let token = apiKey;
    
    if (!token && username && password) {
      const tokenRes = await fetch("https://api.fleetcomplete.com/login/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!tokenRes.ok) {
        console.error("[API] Token fetch failed:", tokenRes.status);
        return res.status(500).json({ success: false, error: "Failed to authenticate with Fleet Complete" });
      }

      const tokenData = await tokenRes.json();
      token = tokenData.token;
    }

    if (!token) {
      return res.status(500).json({ success: false, error: "No valid Fleet Complete token" });
    }

    // Fetch vehicles from Fleet Complete
    const vehiclesRes = await fetch("https://api.fleetcomplete.com/v1.0/vehicle/positions", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!vehiclesRes.ok) {
      console.error("[API] Vehicles fetch failed:", vehiclesRes.status);
      return res.status(500).json({ success: false, error: "Failed to fetch vehicles" });
    }

    const vehicles = await vehiclesRes.json();

    res.status(200).json({
      success: true,
      source: "fleet_complete",
      isStale: false,
      fleetId: "abb3c44d-0588-486d-9e49-441d9639727c",
      vehicles: Array.isArray(vehicles) ? vehicles : []
    });
  } catch (error) {
    console.error("[API /vehicles] Error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch vehicles"
    });
  }
};
