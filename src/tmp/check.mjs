import { readFileSync } from 'fs';
import { transformSync } from 'esbuild';

function check(file) {
  try {
    const code = readFileSync(file, 'utf8');
    transformSync(code, { loader: 'tsx', jsx: 'automatic' });
    console.log(file, 'is OK');
  } catch (err) {
    console.error(file, 'has error:', err.message);
  }
}

check('./components/Bids.tsx');
check('./components/ContactDetail.tsx');
