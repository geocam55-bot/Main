import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf-8');

const doubleRegex = /const comp1 = \(competitors[\s\S]*?const searchMarket = market \|\| 'Halifax, Nova Scotia';\s+const comp1 = \(competitors/m;

if (content.match(doubleRegex)) {
    content = content.replace(doubleRegex, "const comp1 = (competitors");
    fs.writeFileSync('server.ts', content);
    console.log("Fixed double declarations");
}
