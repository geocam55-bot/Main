console.log(
  'ENV KEYS:', 
  Object.keys(process.env).filter(k => k.startsWith('SUPABASE') || k.startsWith('DATABASE') || k.includes('KEY') || k.includes('URL'))
);
console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('DATABASE_URL:', process.env.DATABASE_URL);
