module.exports = (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.status(200).json({
    ok: true,
    timestamp: new Date().toISOString(),
    message: "Serverless functions are working!",
    env_check: {
      hasFleetCompleteApiKey: !!process.env.FLEET_COMPLETE_API_KEY,
      hasFleetCompleteUsername: !!process.env.FLEET_COMPLETE_USERNAME,
      nodeVersion: process.version
    }
  });
};
