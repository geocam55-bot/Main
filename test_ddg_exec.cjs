const { execSync } = require('child_process');

function searchDuckDuckGo(site, query) {
  try {
    const q = `site:${site} ${query}`.replace(/"/g, '').replace(/ /g, '+');
    const cmd = `curl -s -m 10 -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" "https://html.duckduckgo.com/html/" -d "q=${q}" | grep -o "https://${site}[^'\\"]*" | head -n 1`;
    const result = execSync(cmd).toString().trim();
    if (result) return result;
  } catch(e) {}
  
  // Try lite if html fails
  try {
    const q = `site:${site} ${query}`.replace(/"/g, '').replace(/ /g, '+');
    const cmd = `curl -s -m 10 -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" "https://lite.duckduckgo.com/lite/" -d "q=${q}" | grep -o "https://${site}[^'\\"]*" | head -n 1`;
    const result = execSync(cmd).toString().trim();
    return result || null;
  } catch(e) {
    return null;
  }
}
console.log(searchDuckDuckGo('kent.ca', 'SPF 2X4X8 LUMBER #2 & BETTER'));
console.log(searchDuckDuckGo('www.homedepot.ca', 'SPF 2X4X8 LUMBER #2 & BETTER'));
