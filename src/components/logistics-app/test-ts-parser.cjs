const ts = require('typescript');
const fs = require('fs');

const fileName = 'src/components/ScanStation.tsx';
const fileContent = fs.readFileSync(fileName, 'utf8');

// Parse the file with TypeScript compiler
const sourceFile = ts.createSourceFile(
  fileName,
  fileContent,
  ts.ScriptTarget.Latest,
  true
);

// Retrieve syntax diagnostics (parser errors)
const diagnostics = ts.getPreEmitDiagnostics(ts.createProgram([fileName], {
  jsx: ts.JsxEmit.ReactJSX,
  noEmit: true
}));

console.log(`Found ${diagnostics.length} diagnostics:`);
diagnostics.forEach(diag => {
  if (diag.file) {
    const { line, character } = diag.file.getLineAndCharacterOfPosition(diag.start);
    const message = ts.flattenDiagnosticMessageText(diag.messageText, '\n');
    console.log(`🚨 Error at line ${line + 1}, char ${character + 1}: ${message}`);
  } else {
    console.log(`🚨 General Error: ${ts.flattenDiagnosticMessageText(diag.messageText, '\n')}`);
  }
});
