export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const { email, password, name, role } = req.body || {};
    return res.status(200).json({
      success: true,
      user: {
        id: 'user-' + Date.now(),
        email: email || 'geocam55@gmail.com',
        name: name || 'George',
        role: role || 'super_admin'
      },
      token: 'session-token-' + Date.now()
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || "Auth error" });
  }
}
