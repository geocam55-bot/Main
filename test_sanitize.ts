import { deserializeType } from './src/components/logistics-app/lib/supabaseClient';
console.log(deserializeType({ id: "123", current_latitude: 44.69, current_longitude: -63.59, current_status: "Connected" }));
