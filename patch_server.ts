import * as fs from 'fs';

const filePath = 'src/server/logistics-server.ts';
let code = fs.readFileSync(filePath, 'utf8');

// Find the start of `if (!apiSuccess) {`
// And the start of `// Step 3: Apply matching live telemetry`
const step3Str = '// Step 3: Apply matching live telemetry';

const startIndex = code.indexOf('if (!apiSuccess) {');
const endIndex = code.indexOf(step3Str);

if (startIndex !== -1 && endIndex !== -1) {
    code = code.substring(0, startIndex) + code.substring(endIndex);
    fs.writeFileSync(filePath, code);
    console.log('Successfully removed the !apiSuccess mock block');
} else {
    console.log('Could not find the block to remove');
}
