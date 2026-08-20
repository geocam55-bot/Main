export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  res.status(200).json({ success: true, timestamp: new Date().toISOString() });
}
