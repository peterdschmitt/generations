// Script to update Airtable Controls: move Value to Description, set Value = Label
// Usage: AIRTABLE_API_KEY=xxx AIRTABLE_BASE_ID=xxx node update-layouts-description.js
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  console.error('Error: AIRTABLE_API_KEY and AIRTABLE_BASE_ID environment variables are required');
  process.exit(1);
}

async function fetchAllControls() {
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Controls?maxRecords=100`;
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}` }
  });
  const data = await response.json();
  return data.records;
}

async function updateControl(recordId, label, description) {
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Controls/${recordId}`;
  const payload = {
    fields: {
      "Value": label,  // Set Value to the Label (short name)
      "Description": description  // Move long text to Description
    },
    typecast: true
  };

  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`Failed to update: ${err.error?.message || response.statusText}`);
  }

  return await response.json();
}

async function main() {
  console.log('Fetching all controls...');
  const records = await fetchAllControls();

  const layoutRecords = records.filter(r => r.fields.Category === 'Layout');
  console.log(`Found ${layoutRecords.length} Layout records to update`);

  for (let i = 0; i < layoutRecords.length; i++) {
    const record = layoutRecords[i];
    const label = record.fields.Label;
    const currentValue = record.fields.Value;

    // Only update if Value looks like a description (longer than label)
    if (currentValue && currentValue.length > label.length) {
      try {
        await updateControl(record.id, label, currentValue);
        console.log(`✓ [${i + 1}/${layoutRecords.length}] ${label}`);
        // Rate limit
        await new Promise(resolve => setTimeout(resolve, 220));
      } catch (error) {
        console.error(`✗ [${i + 1}/${layoutRecords.length}] ${label}: ${error.message}`);
      }
    } else {
      console.log(`⊘ [${i + 1}/${layoutRecords.length}] ${label} - skipped (already updated)`);
    }
  }

  console.log('\nDone!');
}

main();
