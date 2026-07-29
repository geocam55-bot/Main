require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function test() {
  const { data, error } = await sb.from('deliveries').upsert([
    {
      id: "doc-test", 
      tenantId: "test-tenant", 
      invoiceNumber: "test", 
      epicorSalesOrder: "test", 
      customerName: "test", 
      deliveryAddress: "test", 
      phone: "test", 
      originBranch: "test", 
      status: "REGISTERED", 
      registeredAt: "2026-07-29T12:00:00.000Z", 
      documentType: "Supplier Pickup"
    }
  ]);
  console.log("Error:", error);
}
test();
