const FALLBACK_SUPABASE_URL = "https://usorqldwroecyxucmtuw.supabase.co";
const FALLBACK_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzb3JxbGR3cm9lY3l4dWNtdHV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2NjI2NzksImV4cCI6MjA3ODIzODY3OX0.cpSQZHkDI_yod4HSPsjUIhwSkkJX98PVJ7HjTe0i6qM";

module.exports = async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL).trim();
  const anonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY).trim();
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || FALLBACK_SUPABASE_ANON_KEY).trim();

  res.status(200).json({
    configured: true,
    connected: true,
    url: url,
    anonKey: anonKey,
    hasServiceRoleKey: !!serviceRoleKey,
    status: "online",
    timestamp: new Date().toISOString()
  });
};
