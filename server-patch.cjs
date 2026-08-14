const fs = require('fs');
let code = fs.readFileSync('src/server/logistics-server.ts', 'utf8');
const patch = `
app.post('/api/log-error', express.text({type: '*/*'}), (req, res) => {
  console.log('FRONTEND ERROR CAUGHT:', req.body);
  fs.appendFileSync('frontend-errors.log', req.body + '\\n');
  res.send('ok');
});
`;
code = code.replace('app.get("/api/health"', patch + '\n  app.get("/api/health"');
fs.writeFileSync('src/server/logistics-server.ts', code);
