import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf-8');

content = content.replace(/"competitorName": "The Home Depot",/g, '"competitorName": "${comp2}",');
content = content.replace(/"storeName": "The Home Depot \(Halifax Lacewood\)",/g, '"storeName": "${comp2}",');
content = content.replace(/"storeLocation": "Halifax Lacewood",/g, '"storeLocation": "${searchMarket}",');
content = content.replace(/homedepot.ca/g, 'competitor website');
content = content.replace(/kent.ca/g, 'competitor website');
content = content.replace(/kent building supplies/ig, '${comp1}');
content = content.replace(/the home depot/ig, '${comp2}');

fs.writeFileSync('server.ts', content);
