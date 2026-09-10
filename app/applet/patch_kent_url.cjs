const fs = require('fs');
const serverPath = './server.ts';
let content = fs.readFileSync(serverPath, 'utf8');

// Replace catalogsearch/result/?q= with en/search?q=
content = content.replace(/https:\/\/www\.kent\.ca\/catalogsearch\/result\/\?q=/g, 'https://www.kent.ca/en/search?q=');
content = content.replace(/https:\/\/kent\.ca\/catalogsearch\/result\/\?q=/g, 'https://kent.ca/en/search?q=');

fs.writeFileSync(serverPath, content, 'utf8');
console.log('Successfully updated server.ts Kent search URLs!');
