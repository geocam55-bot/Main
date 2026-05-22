import fs from 'fs';
import { parse } from '@babel/parser';

const file = fs.readFileSync('/components/kitchen/KitchenPlannerV2.tsx', 'utf-8');
try {
  parse(file, {
    sourceType: 'module',
    plugins: ['typescript', 'jsx']
  });
  console.log('No syntax errors');
} catch (e) {
  console.error(e);
}
