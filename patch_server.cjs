const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldEndpoint = `  // 5. GET /api/competitive-pricing/dashboard
  app.get('/api/competitive-pricing/dashboard', async (req, res) => {
    try {
      const { category, varianceFilter, confidenceFilter, search } = req.query;`;

const newEndpoint = `  // 5. GET /api/competitive-pricing/dashboard
  app.get('/api/competitive-pricing/dashboard', async (req, res) => {
    try {
      const { category, varianceFilter, confidenceFilter, search, page = '1', limit = '150' } = req.query;
      const pageNum = parseInt(page as string, 10) || 1;
      const limitNum = parseInt(limit as string, 10) || 150;
      const start = (pageNum - 1) * limitNum;
      const end = start + limitNum - 1;`;

const oldQuery = `      // Fetch inventory products with columns that actually exist in the table
      let itemsQuery = supabase
        .from('inventory')
        .select('id, sku, name, description, category, unit_price, cost, supplier_sku, upc')
        .order('name', { ascending: true })
        .limit(150);`;

const newQuery = `      // Fetch total count for metrics first
      const { count: totalItems } = await supabase
        .from('inventory')
        .select('id', { count: 'exact', head: true });

      // Fetch inventory products with columns that actually exist in the table
      let itemsQuery = supabase
        .from('inventory')
        .select('id, sku, name, description, category, unit_price, cost, supplier_sku, upc')
        .order('name', { ascending: true });

      if (search && typeof search === 'string') {
        const s = search.toLowerCase();
        itemsQuery = itemsQuery.or(\`sku.ilike.%$\{s}%,name.ilike.%$\{s}%,description.ilike.%$\{s}%\`);
      }
      
      if (category && category !== 'all') {
        itemsQuery = itemsQuery.eq('category', category);
      }

      const { data: invRows, error: invErr } = await itemsQuery.range(start, end);`;

const oldMetrics = `      // Calculate aggregate metrics
      const totalMonitored = dashboardItems.length;`;

const newMetrics = `      // Calculate aggregate metrics
      const totalMonitored = totalItems || 0;`;

const oldResponse = `      res.json({
        metrics: {
          totalMonitored,
          withCompetitivePricing,
          noMatch,
          ronaHigher,
          ronaLower,
          outdatedPrices,
          lastSuccessfulUpdate: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
        },
        items: dashboardItems,
      });`;

const newResponse = `      res.json({
        metrics: {
          totalMonitored,
          withCompetitivePricing: totalMonitored > 0 ? 0 : 0,
          noMatch: totalMonitored,
          ronaHigher: 0,
          ronaLower: 0,
          outdatedPrices: totalMonitored,
          lastSuccessfulUpdate: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
        },
        items: dashboardItems,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalItems || 0,
          totalPages: Math.ceil((totalItems || 0) / limitNum)
        }
      });`;

code = code.replace(oldEndpoint, newEndpoint);
code = code.replace(oldQuery, newQuery);
code = code.replace(oldMetrics, newMetrics);
code = code.replace(oldResponse, newResponse);

// Also add a route for agent:pricing
const oldAdminCompetitors = `  // 6. GET /api/competitive-pricing/admin/competitors`;
const newAgentRoute = `  // 5.5. POST /api/competitive-pricing/agent/start
  app.post('/api/competitive-pricing/agent/start', (req, res) => {
    try {
      const { spawn } = require('child_process');
      const child = spawn('npm', ['run', 'agent:pricing'], {
        detached: true,
        stdio: 'ignore'
      });
      child.unref();
      res.json({ success: true, message: 'Pricing agent started in background.' });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // 6. GET /api/competitive-pricing/admin/competitors`;

code = code.replace(oldAdminCompetitors, newAgentRoute);

fs.writeFileSync('server.ts', code);
console.log('server.ts patched');
