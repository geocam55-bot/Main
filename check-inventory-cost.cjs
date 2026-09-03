const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.example', 'utf8');
// Let's check actual env or server.ts
console.log("Checking environment...");
