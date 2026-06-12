import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || "https://npwbfu6x7fl7e7s5fjpce5.supabase.co"; // wait, let's read the env first or construct from process.env
// Let's print all process.env key names to see what we have
console.log("Env keys:", Object.keys(process.env));
