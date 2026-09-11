const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  `      // Generate a realistic 5-point historical progression
      const product = await resolveProductRecord(productId);
      const base = product.yourPrice > 0 ? product.yourPrice : 5.99;
      const now = Date.now();
      const demoHistory: any[] = [];
      for (let i = 4; i >= 0; i--) {
        const checkTime = new Date(now - i * 86400 * 1000 * 3).toISOString();
        demoHistory.push(
          {
            id: \`gen_\${i}_kent\`,
            productId: String(productId),
            competitorId: 1,
            competitorName: 'KENT Building Supplies',
            price: Number((base * (1.02 + i * 0.015)).toFixed(2)),
            normalizedUnitPrice: Number((base * (1.02 + i * 0.015)).toFixed(2)),
            currency: 'CAD',
            checkedAt: checkTime,
            availability: 'IN_STOCK',
          },
          {
            id: \`gen_\${i}_hd\`,
            productId: String(productId),
            competitorId: 2,
            competitorName: 'The Home Depot',
            price: Number((base * (0.98 - (i % 2) * 0.02)).toFixed(2)),
            normalizedUnitPrice: Number((base * (0.98 - (i % 2) * 0.02)).toFixed(2)),
            currency: 'CAD',
            checkedAt: checkTime,
            availability: 'IN_STOCK',
          }
        );
      }
      res.json(demoHistory);`,
  `      res.json([]);`
);

fs.writeFileSync('server.ts', code);
