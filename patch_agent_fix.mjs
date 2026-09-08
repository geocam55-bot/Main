import fs from 'fs';
let content = fs.readFileSync('src/scripts/pricing-agent.ts', 'utf-8');
content = content.replace(
  /\.catch\(\(\) => \{\}\)/g,
  ''
);

// We still need to await them but without .catch, maybe we can just do await supabase... and wrap in try/catch or just ignore errors since it was just a script
fs.writeFileSync('src/scripts/pricing-agent.ts', content);
