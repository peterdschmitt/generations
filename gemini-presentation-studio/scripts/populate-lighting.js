// Script to add Lighting options to Airtable Controls table
// Usage: AIRTABLE_API_KEY=xxx AIRTABLE_BASE_ID=xxx node populate-lighting.js
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  console.error('Error: AIRTABLE_API_KEY and AIRTABLE_BASE_ID environment variables are required');
  process.exit(1);
}

const lighting = [
  { label: "Professional Studio Lighting", description: "A specific requirement for technical precision, often used for headshots, where the light source direction must be specified, such as a key light from camera left." },
  { label: "Even Commercial Photography Lighting", description: "A requirement for achieving consistent, flat, and professional illumination, typically used for product photos that meet the commercial photography standard." },
  { label: "Natural Directional Lighting", description: "Light coming from a specific angle (e.g., from camera left) that creates gentle modeling shadows on the subject, used for high-quality professional portraits." },
  { label: "Natural Window Light", description: "Used for creating ambient indoor lighting, typically generating soft shadows suitable for modern interiors or product shots." },
  { label: "Soft Daylight / Soft Morning Light", description: "A requirement for scenes that need diffuse, ambient light, such as a Scandinavian living room or an outdoor natural setting." },
  { label: "Soft Sunrise Lighting", description: "A specific time-of-day condition that can be generated for landscapes, such as a 3D-style aerial map of Banff National Park." },
  { label: "Golden Hour Backlighting", description: "Light coming from behind the subject during the golden hour, specified to create long shadows." },
  { label: "Subtle Rim Lighting", description: "A technique used in professional headshots to define the edges of the subject and separate them from the background." },
  { label: "Soft Side Reflections", description: "A requirement for precise product rendering, where light subtly reflects off polished or curved surfaces, such as a frosted glass skincare bottle." },
  { label: "Cinematic Color Grading", description: "A directorial prompt used to influence the overall color palette and mood of the scene, such as muted teal tones." },
  { label: "Dramatic Museum Lighting", description: "A specialized aesthetic requested for statue-style renders (e.g., marble or bronze) to highlight textures, form, and staging." },
  { label: "Neon Highlights", description: "An atmospheric element used to define the visual mood, such as for a science fiction thriller poster." },
  { label: "Neon Pink and Teal Signage Reflection", description: "A specific conceptual lighting effect used to characterize a genre environment, such as a cyberpunk coffee shop." },
  { label: "Neon-Lit Tokyo Street Lighting", description: "A specific environmental requirement used during background replacement, where the new scene must include detailed illumination and rain reflections matching lighting." },
  { label: "Vibrant Red Highlights", description: "Used as a stylistic constraint to achieve a specific branded look, such as a Coca-Cola style advertisement." },
  { label: "Warm Ambiance", description: "A conceptual lighting requirement used for setting a cozy mood in an interior environment, like a contemporary home interior." },
  { label: "Lighting Harmonization", description: "A requirement during complex edits (like multi-image fusion) to unify lighting across all elements and ensure consistency, regardless of the source images." },
  { label: "Preservation of Sunlight", description: "The ability to retain the sunlight exactly the same when editing the style or content of an image." },
  { label: "Reasoning Through Interactions", description: "The model uses its \"Thinking\" capability to logically process and generate visuals based on complex lighting conditions, such as lighting interactions between fire and ice." }
];

async function createControl(label, description) {
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Controls`;
  const payload = {
    fields: {
      "Label": label,
      "Description": description,
      "Category": "Lighting"
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
  console.log(`Adding ${lighting.length} lighting options to Airtable...`);

  for (let i = 0; i < lighting.length; i++) {
    const item = lighting[i];
    try {
      await createControl(item.label, item.description);
      console.log(`✓ [${i + 1}/${lighting.length}] ${item.label}`);
      // Rate limit: Airtable allows 5 requests per second
      await new Promise(resolve => setTimeout(resolve, 220));
    } catch (error) {
      console.error(`✗ [${i + 1}/${lighting.length}] ${item.label}: ${error.message}`);
    }
  }

  console.log('\nDone!');
}

main();
