import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearHistory() {
  console.log("Clearing competitive price history...");
  
  const { error: err2 } = await supabase
      .from('price_history')
      .delete()
      .not('id', 'is', null);
      
  if (err2) {
      console.error("Failed to clear history:", err2);
  } else {
      console.log("History cleared successfully!");
  }
}

clearHistory();
