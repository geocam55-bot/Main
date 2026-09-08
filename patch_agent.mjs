import fs from 'fs';
let content = fs.readFileSync('src/scripts/pricing-agent.ts', 'utf-8');
content = content.replace(
  'console.log("Competitive Pricing Agent finished.");',
  `console.log("Competitive Pricing Agent finished.");\n  await supabase.from("Notifications").insert([{\n    Type: "Scraper Alert",\n    Message: "The Competitive Pricing Agent has finished scraping all competitors.",\n    IsRead: false,\n    CreatedAt: new Date().toISOString()\n  }]);`
);
fs.writeFileSync('src/scripts/pricing-agent.ts', content);
