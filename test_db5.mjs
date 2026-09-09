import fetch from 'node-fetch';
async function run() {
  const res = await fetch('http://127.0.0.1:3003/api/competitive-pricing/dashboard?search=Standard%20Spruce');
  console.log("Status:", res.status);
}
run();
