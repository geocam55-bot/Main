const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

const devDepsToMove = [
  'vite',
  'esbuild',
  '@vitejs/plugin-react',
  'tailwindcss',
  '@tailwindcss/vite',
  'tsx',
  'typescript'
];

for (const dep of devDepsToMove) {
  if (pkg.devDependencies && pkg.devDependencies[dep]) {
    pkg.dependencies[dep] = pkg.devDependencies[dep];
    delete pkg.devDependencies[dep];
  }
}

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
