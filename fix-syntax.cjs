const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace('});\\n\\n  app.post', '});\n\n  app.post');
fs.writeFileSync('server.ts', code);
console.log("Fixed syntax error in server.ts!");
