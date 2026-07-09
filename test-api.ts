import { getServerHeaders } from './src/utils/server-headers.ts';
import { projectId } from './src/utils/supabase/info.tsx';
async function test() {
  const SERVER_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-8405be07`;
  const orgId = 'org_001';
  // Use public anon key to pretend we're a basic request without user auth if it allows it.
  const response = await fetch(`${SERVER_BASE}/permissions?organization_id=${encodeURIComponent(orgId)}`);
  const json = await response.json();
  console.log(json);
}
test();
