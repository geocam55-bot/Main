fetch("http://localhost:3000/api/competitive-pricing/scrape-live", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ productName: "SPF 2X4X8' LUMBER #2 & BETTER" })
}).then(res => res.json()).then(console.log).catch(console.error);
