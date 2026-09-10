const { spawn } = require('child_process');
const child = spawn('npx', ['tsx', 'src/scripts/pricing-agent.ts']);
child.stdout.on('data', data => process.stdout.write(data));
child.stderr.on('data', data => process.stderr.write(data));
setTimeout(() => {
  console.log("Shutting down test after 40 seconds...");
  child.kill();
}, 40000);
