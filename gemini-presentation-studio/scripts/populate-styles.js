// Script to add Visual Styles to Airtable Controls table
// Usage: AIRTABLE_API_KEY=xxx AIRTABLE_BASE_ID=xxx node populate-styles.js
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  console.error('Error: AIRTABLE_API_KEY and AIRTABLE_BASE_ID environment variables are required');
  process.exit(1);
}

const styles = [
  { label: "Clean Visual Organization", description: "The core design style for infographics, ensuring data is presented with hierarchy. It uses chart-like blocks, arrows, and labeled boxes." },
  { label: "Clean Vector Art", description: "A high-quality, illustrative medium used for diagrams and infographics, often combined with a specified color palette like pastel colors." },
  { label: "Crisp Sans-Serif Typography", description: "A strict textual constraint used within data visuals to ensure headlines appear crisp and the text is perfectly legible and modern." },
  { label: "Whiteboard Illustration Style", description: "A structured, educational aesthetic used for converting complex topics into clean, explanatory graphics. It utilizes diagrams, arrows, labels, icons, and flowcharts." },
  { label: "Isometric Schematic Style", description: "A technical and 3D-looking design style, ideal for producing diagrams in engineering, architecture, and product explainer graphics. It uses clean technical line art and adheres to accurate angles and line weight." },
  { label: "Fact-Grounded / Scientifically Accurate", description: "A functional style constraint achieved using search grounding, which ensures the output adheres to factual constraints. This is used for creating diagrams like a scientifically accurate cross-section diagram." },
  { label: "Clean Infographic Layout", description: "A defined structure used specifically for map visualizations and other complex data sets that require clarity and organized labeling." },
  { label: "High Clarity", description: "A required quality standard often used in prompts for infographics to ensure that every element, label, and step is unambiguous and clearly visible." }
];

async function createControl(label, description) {
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Controls`;
  const payload = {
    fields: {
      "Label": label,
      "Description": description,
      "Category": "Style"
    },
    typecast: true
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`Failed to create "${label}": ${err.error?.message || response.statusText}`);
  }

  return await response.json();
}

async function main() {
  console.log(`Adding ${styles.length} visual styles to Airtable...`);

  for (let i = 0; i < styles.length; i++) {
    const item = styles[i];
    try {
      await createControl(item.label, item.description);
      console.log(`✓ [${i + 1}/${styles.length}] ${item.label}`);
      // Rate limit: Airtable allows 5 requests per second
      await new Promise(resolve => setTimeout(resolve, 220));
    } catch (error) {
      console.error(`✗ [${i + 1}/${styles.length}] ${item.label}: ${error.message}`);
    }
  }

  console.log('\nDone!');
}

main();
