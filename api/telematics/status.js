module.exports = async (req, res) => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({
        status: "error",
        message: "Supabase configuration missing"
      });
    }

    const fleetCompleteApiKey = process.env.FLEET_COMPLETE_API_KEY;
    const fleetCompleteUsername = process.env.FLEET_COMPLETE_USERNAME;
    const fleetCompletePassword = process.env.FLEET_COMPLETE_PASSWORD;

    const isConfigured = !!(
      fleetCompleteApiKey ||
      (fleetCompleteUsername && fleetCompletePassword)
    );

    res.setHeader("Content-Type", "application/json");
    res.status(200).json({
      status: "active",
      timestamp: new Date().toISOString(),
      supabase: {
        connected: true,
        projectId: supabaseUrl.split("/").pop()
      },
      fleetComplete: {
        configured: isConfigured,
        authMethod: fleetCompleteApiKey ? "API_KEY" : "USERNAME_PASSWORD",
        status: "ACTIVE_SYNC (TOKEN)"
      }
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      error: error.message || "Status check failed"
    });
  }
};
