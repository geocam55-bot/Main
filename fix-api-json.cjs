const fs = require('fs');
let code = fs.readFileSync('src/utils/api.ts', 'utf8');

const helperCode = `
async function safeParseJson(res: Response) {
  const contentType = res.headers.get('content-type');
  const text = await res.text();
  if (!text || text.trim() === '') {
    return {};
  }
  if (text.trim().startsWith('<') || (contentType && contentType.includes('text/html'))) {
    throw new Error(\`Server returned HTML instead of JSON (\${res.status} \${res.statusText})\`);
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(\`Invalid JSON response (\${res.status} \${res.statusText})\`);
  }
}
`;

code = helperCode + '\n' + code;

// Now let's replace the fetch calls in competitivePricingAPI
// We can replace `const err = await res.json().catch(() => ({}));` and `return res.json();`
// or write a helper for handling fetch responses.

fs.writeFileSync('src/utils/api.ts', code);
console.log("Added safeParseJson helper!");
