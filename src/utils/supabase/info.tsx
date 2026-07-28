/* DYNAMIC SUPABASE CONFIGURATION */

function getEnvVar(key: string): string | undefined {
  try {
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      // @ts-ignore
      return process.env[key];
    }
  } catch (e) {}
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      // @ts-ignore
      return import.meta.env[key];
    }
  } catch (e) {}
  return undefined;
}

function extractProjectId(): string {
  const url = getEnvVar('SUPABASE_URL') || getEnvVar('VITE_SUPABASE_URL');
  if (url) {
    const clean = url.trim().replace(/^['"\s]+|['"\s]+$/g, '');
    const match = clean.match(/https?:\/\/([^.]+)\.supabase\.co/);
    if (match && match[1]) {
      return match[1];
    }
  }
  return "usorqldwroecyxucmtuw";
}

function extractAnonKey(): string {
  const key = getEnvVar('SUPABASE_ANON_KEY') || getEnvVar('VITE_SUPABASE_ANON_KEY') || getEnvVar('SUPABASE_PUBLISHABLE_KEY');
  if (key) {
    const clean = key.trim().replace(/^['"\s]+|['"\s]+$/g, '');
    if (clean && clean !== 'undefined' && clean !== 'null' && !clean.includes('PLACEHOLDER')) {
      return clean;
    }
  }
  return "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzb3JxbGR3cm9lY3l4dWNtdHV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2NjI2NzksImV4cCI6MjA3ODIzODY3OX0.cpSQZHkDI_yod4HSPsjUIhwSkkJX98PVJ7HjTe0i6qM";
}

export const projectId = extractProjectId();
export const publicAnonKey = extractAnonKey();
