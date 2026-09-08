async function searchDDG(site, query) {
  const q = `site:${site} ${query}`;
  const res = await fetch("https://lite.duckduckgo.com/lite/", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    },
    body: `q=${encodeURIComponent(q)}`
  });
  const html = await res.text();
  const match = html.match(new RegExp(`https:\/\/${site}[^'"]*`, 'g'));
  console.log("Matches:", match ? match.slice(0, 3) : null);
}
await searchDDG('kent.ca', 'SPF 2X4X8');
await searchDDG('homedepot.ca', 'SPF 2X4X8');
