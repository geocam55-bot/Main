fetch("http://localhost:3000/api/competitive-pricing/scrape-live", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ productName: "Plywood Clip 7/16", mfgPartNumber: "PSCL 7/16-R50" })
}).then(res => res.json()).then(console.log).catch(console.error);
