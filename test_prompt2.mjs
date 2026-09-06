import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf-8');
const promptStr = content.match(/const prompt = `Competitive Pricing([\s\S]*?)`;/)[1];
console.log(promptStr);
