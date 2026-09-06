const https = require('https');
https.get('https://kent.ca/catalogsearch/result/?q=drill', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Kent length:', data.length, 'Status:', res.statusCode));
});
https.get('https://www.homedepot.ca/en/home/search.html?q=drill', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('HD length:', data.length, 'Status:', res.statusCode));
});
