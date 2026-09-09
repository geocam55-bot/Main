import express from 'express';
const app = express();
app.get('/api/products/:productId/competitive-pricing', (req, res) => {
  console.log("Matched route with param:", req.params.productId);
  res.json({ id: req.params.productId });
});
app.use((req, res, next) => {
  console.log("Unhandled API request:", req.method, req.url);
  res.status(404).send("Not Found");
});
app.listen(3002, async () => {
  const fetch = (await import('node-fetch')).default;
  const res = await fetch(`http://127.0.0.1:3002/api/products/${encodeURIComponent("1/2 Standard spruce")}/competitive-pricing`);
  console.log(res.status, await res.text());
  process.exit(0);
});
