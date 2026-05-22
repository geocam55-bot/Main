import fetch from 'node-fetch';

// Helper: compare two objects and return only changed fields
function getChangedFields(existing, incoming) {
  const changed = {};
  for (const key in incoming) {
    if (incoming[key] !== existing[key]) {
      changed[key] = incoming[key];
    }
  }
  return changed;
}

// Handler for import execution (sync/async)

export async function handleImportJob(req, res) {
  // Expects: { records: [ { ...fields } ], apiKey: string }
  const { records, apiKey } = req.body;
  if (!records || !Array.isArray(records) || !apiKey) {
    return res.status(400).json({ error: 'Missing records or apiKey' });
  }

  const results = [];
  for (const row of records) {
    // 1. Check if contact exists by email
    const getRes = await fetch(
      `${process.env.SUPABASE_API_URL}/make-server-8405be07/api/v1/contacts?search=${encodeURIComponent(row.Email)}`,
      {
        headers: { 'X-API-Key': apiKey },
      }
    );
    const getData = await getRes.json();
    let contact = getData.data && getData.data.find(c => c.email === row.Email);

    if (contact) {
      // 2. Update only changed fields
      const changed = getChangedFields(contact, row);
      if (Object.keys(changed).length > 0) {
        const patchRes = await fetch(
          `${process.env.SUPABASE_API_URL}/make-server-8405be07/api/v1/contacts/${contact.id}`,
          {
            method: 'PATCH',
            headers: {
              'X-API-Key': apiKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(changed),
          }
        );
        const patchData = await patchRes.json();
        results.push({ email: row.Email, action: 'updated', result: patchData });
      } else {
        results.push({ email: row.Email, action: 'skipped', reason: 'No changes' });
      }
    } else {
      // 3. Create new contact
      const postRes = await fetch(
        `${process.env.SUPABASE_API_URL}/make-server-8405be07/api/v1/contacts`,
        {
          method: 'POST',
          headers: {
            'X-API-Key': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(row),
        }
      );
      const postData = await postRes.json();
      results.push({ email: row.Email, action: 'created', result: postData });
    }
  }
  res.json({ success: true, results });
}
