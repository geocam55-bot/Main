export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    env: {
      hasFleetCompleteApiKey: !!process.env.FLEET_COMPLETE_API_KEY,
      hasFleetCompleteUsername: !!process.env.FLEET_COMPLETE_USERNAME,
      hasFleetCompletePassword: !!process.env.FLEET_COMPLETE_PASSWORD,
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      hasSupabaseAnonKey: !!process.env.SUPABASE_ANON_KEY,
      nodeEnv: process.env.NODE_ENV
    },
    message: "ProSpaces Logistics API is fully online"
  });
}
