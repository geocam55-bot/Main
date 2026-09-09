import fetch from 'node-fetch';

async function run() {
  const res = await fetch('http://127.0.0.1:3000/api/competitive-pricing/dashboard?search=Standard%20Spruce');
  const text = await res.text();
  console.log("Raw Response:", text);
}
run();
