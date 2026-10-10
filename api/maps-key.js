import { getSystemSetting } from "./_lib/systemSettings.js";

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  try {
    const configuredKey = await getSystemSetting("GOOGLE_MAPS_PLATFORM_KEY");
    const key = configuredKey ||
      process.env.GOOGLE_MAPS_PLATFORM_KEY ||
      process.env.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
      process.env.GOOGLE_MAPS_API_KEY ||
      process.env.VITE_GOOGLE_MAPS_API_KEY ||
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
      process.env.REACT_APP_GOOGLE_MAPS_API_KEY ||
      "";
    return res.status(200).json({ apiKey: key, key });
  } catch (error) {
    console.error("[maps-key] Failed to load map configuration:", error instanceof Error ? error.message : error);
    return res.status(500).json({ error: "Failed to load map configuration" });
  }
}
