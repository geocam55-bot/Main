import fs from 'fs';
let code = fs.readFileSync('src/components/BackgroundJobProcessor.tsx', 'utf-8');

code = code.replace(
  'return () => clearInterval(interval);',
  'return () => { clearInterval(interval); if (notifChannel) { supabase.removeChannel(notifChannel); } };'
);

fs.writeFileSync('src/components/BackgroundJobProcessor.tsx', code);
console.log("Patched background job processor channel cleanup!");
