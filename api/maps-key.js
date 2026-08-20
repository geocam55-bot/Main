export default function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  const key = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || "";
  res.status(200).json({ apiKey: key, key: key });
}
