const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Add trailing slash alias for dashboard
const dashboardRoute = "app.get('/api/competitive-pricing/dashboard', async (req, res) => {";
const dashboardAlias = "app.get(['/api/competitive-pricing/dashboard', '/api/competitive-pricing/dashboard/'], async (req, res) => {";
if (code.includes(dashboardRoute) && !code.includes("'/api/competitive-pricing/dashboard/'")) {
  code = code.replace(dashboardRoute, dashboardAlias);
  console.log("Added dashboard route alias!");
}

// Add absolute /api safeguard middleware before static / SPA catch-all
const staticTarget = "  const isProduction = process.env.NODE_ENV === \"production\"";
const apiSafeguard = `
  // Absolute safeguard: any unmatched /api/ request must return JSON 404, never HTML
  app.use('/api', (req, res) => {
    res.status(404).json({ error: \`API endpoint not found: \${req.method} \${req.originalUrl}\` });
  });

  const isProduction = process.env.NODE_ENV === "production"`;

if (code.includes(staticTarget) && !code.includes("Absolute safeguard: any unmatched /api/ request")) {
  code = code.replace(staticTarget, apiSafeguard);
  console.log("Added /api safeguard middleware!");
}

fs.writeFileSync('server.ts', code);
console.log("server.ts patched successfully!");
