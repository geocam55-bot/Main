import { getServerHeaders } from './src/utils/server-headers.ts';
import { projectId } from './src/utils/supabase/info.ts';
async function test() {
  const headers = await getServerHeaders();
  const SERVER_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-8405be07`;
  const orgId = 'org_001';
  const response = await fetch(`${SERVER_BASE}/permissions?organization_id=${encodeURIComponent(orgId)}`, { headers });
  const json = await response.json();
  console.log(JSON.stringify(json.permissions, null, 2));
}
test();
