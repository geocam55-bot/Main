import { getSupabase } from './_lib/telematicsHelper.js';

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  const supabase = getSupabase();

  if (req.method === "GET") {
    try {
      const { data, error } = await supabase
        .from("kv_store_8405be07")
        .select("key, value")
        .in("key", ["prospaces_ocr_coordinate_templates", "prospaces_ocr_mapped_fields", "prospaces_ocr_strict_coordinates"]);

      if (!error && data && data.length > 0) {
        const templatesRow = data.find((r) => r.key === "prospaces_ocr_coordinate_templates");
        const mappedRow = data.find((r) => r.key === "prospaces_ocr_mapped_fields");
        const strictRow = data.find((r) => r.key === "prospaces_ocr_strict_coordinates");

        return res.status(200).json({
          success: true,
          templates: templatesRow?.value || null,
          mappedFields: mappedRow?.value || null,
          strictCoordinates: strictRow ? strictRow.value : true,
          source: "supabase_kv"
        });
      }

      return res.status(200).json({
        success: true,
        templates: null,
        mappedFields: null,
        strictCoordinates: true,
        source: "empty"
      });
    } catch (err) {
      return res.status(200).json({
        success: true,
        templates: null,
        mappedFields: null,
        strictCoordinates: true,
        error: err.message
      });
    }
  }

  if (req.method === "POST") {
    try {
      const { templates, mappedFields, strictCoordinates } = req.body || {};
      if (!templates || typeof templates !== "object") {
        return res.status(400).json({ success: false, error: "Valid templates object is required" });
      }

      const records = [
        { key: "prospaces_ocr_coordinate_templates", value: templates },
        ...(mappedFields ? [{ key: "prospaces_ocr_mapped_fields", value: mappedFields }] : []),
        ...(strictCoordinates !== undefined ? [{ key: "prospaces_ocr_strict_coordinates", value: strictCoordinates }] : [])
      ];

      await supabase.from("kv_store_8405be07").upsert(records);

      return res.status(200).json({
        success: true,
        message: "OCR coordinate templates successfully saved and synced across environments"
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message || "Server error" });
    }
  }

  return res.status(405).json({ success: false, error: "Method not allowed" });
}
