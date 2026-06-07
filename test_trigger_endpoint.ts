async function run() {
  const url = 'http://localhost:3000/api/import-export/tasks/task-wyftk9dbb/run';
  console.log('Sending POST to:', url);
  try {
    const res = await fetch(url, { method: 'POST' });
    console.log('Response Status:', res.status);
    const bodyText = await res.text();
    console.log('Response Body:', bodyText);
  } catch (err: any) {
    console.error('Trigger Endpoint Fetch Error:', err.message, err.stack);
  }
}

run().catch(console.error);
