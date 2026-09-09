import express from 'express';
const app = express();
app.get('/api/products/:productId/competitive-pricing', (req, res) => {
  res.json({ id: req.params.productId });
});
app.listen(3001, async () => {
  const fetch = (await import('node-fetch')).default;
  const res = await fetch(`http://127.0.0.1:3001/api/products/${encodeURIComponent("1/2 Standard spruce")}/competitive-pricing`);
  console.log(res.status, await res.text());
  process.exit(0);
});
