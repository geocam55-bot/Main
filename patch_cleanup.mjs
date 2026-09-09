import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf-8');

code = code.replace(/console\.log\("=== API DASHBOARD REQUEST ==="\);\n/g, "");
code = code.replace(/console\.log\("Search term:", search\);\n/g, "");
code = code.replace(/console\.log\("Generated andClause:", .*?\);\n/g, "");
code = code.replace(/console\.log\("Range:", start, end\);\n/g, "");
code = code.replace(/console\.log\("Result rows:", .*?\);\n/g, "");
code = code.replace(/console\.log\("Result error:", invErr\);\n/g, "");
code = code.replace(/console\.log\("============================"\);\n/g, "");
code = code.replace(/console\.log\("DASHBOARD SEARCH QUERY:", search\);\n/g, "");
code = code.replace(/console\.log\("DB INVENTORY FETCH:", .*?\);\n/g, "");

fs.writeFileSync('server.ts', code);
