export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

  res.status(200).json({
    success: true,
    tenants: [
      {
        id: "rona_atlantic",
        name: "RONA Atlantic ProSpaces",
        slug: "rona-atlantic",
        domain: "rona.prospacescrm.com",
        status: "active",
        createdAt: "2026-01-01T00:00:00.000Z"
      }
    ]
  });
}
