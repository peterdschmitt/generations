// Script to add full Visual Styles list to Airtable Controls table
// Usage: AIRTABLE_API_KEY=xxx AIRTABLE_BASE_ID=xxx node populate-styles-full.js
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  console.error('Error: AIRTABLE_API_KEY and AIRTABLE_BASE_ID environment variables are required');
  process.exit(1);
}

const styles = [
  { label: "Photorealistic / Hyper-Realistic", description: "The foundational style aimed at high-fidelity realism, creating images suitable for professional portfolios and corporate headshots. This is often combined with high-resolution professional finish." },
  { label: "Cinematic", description: "A style that directs the composition, lighting, and color grading of the scene, allowing for features like cinematic 8k render and cinematic 21:9 wide shot. It can include specific color treatments like muted teal tones." },
  { label: "Film Noir", description: "A specific genre or aesthetic style that the model can adhere to." },
  { label: "Manga-Style Panels", description: "An illustrative style characterized by crisp line art, expressive characters, accurate anatomy, and stylistic shading that matches classic and modern comic styles." },
  { label: "Sharp Monochrome Line Art", description: "A specialized aesthetic used within the Manga style to create dramatic effects and high contrast." },
  { label: "Pixar Animated Style", description: "A specific animation aesthetic that the model can apply to an existing sequence or image, allowing for the flawless recreation of the scene in that style." },
  { label: "Sketch Style", description: "Used for generating preliminary visual concepts, such as frames within a storyboard." },
  { label: "3D Animation", description: "A general aesthetic definition for generating animated visuals." },
  { label: "Watercolor Painting", description: "A style based on the look of traditional watercolor artistic medium." },
  { label: "1990s Product Photography", description: "A specific retro aesthetic that can be applied to visuals." },
  { label: "Coca-Cola Style Advertisement", description: "A specific branding aesthetic defined by vibrant red highlights and \"refreshing summer vibes\"." },
  { label: "Halftone Pattern Style Design", description: "A detailed graphic style that uses dots of varying sizes, which the model can adhere to when provided with a detailed creative brief." },
  { label: "Graphic Poster Style", description: "A general aesthetic for creating graphical posters." },
  { label: "Psychedelic-Inspired Typeface", description: "A specific font style characterized by soft, rounded, and fluid letterforms, rooted in the retro aesthetics of the 1960s and 1970s." },
  { label: "Calligram", description: "A style where text and image are merged, and the word's form visually embodies its meaning." },
  { label: "Corporate Photography Style", description: "A high-standard aesthetic suitable for professional contexts like business materials and LinkedIn profiles." },
  { label: "Editorial Fashion Presentation", description: "A high-end photographic style suitable for magazines and premium content." },
  { label: "Lifestyle Brand Aesthetic", description: "A style used for placing products or subjects in a desirable, everyday context, often used for product marketing and knolling." },
  { label: "Knolling (High-End DTC Aesthetic)", description: "A specialized, precision-styled flat-lay image that is perfectly arranged and evenly spaced, essential for catalogs and DTC (Direct-to-Consumer) brands." },
  { label: "Moody Synthwave Scene", description: "An aesthetic defined by a specific atmosphere and color palette, such as neon cyan and magenta." },
  { label: "Statue-Style Renders", description: "Transforms subjects into visuals that adhere to sculptural anatomy, allowing for material aesthetics like marble, bronze, jade, obsidian, resin, or stone." },
  { label: "Classical Greek Sculpture Aesthetics", description: "A specific historical and artistic sub-style of statue rendering." },
  { label: "Engraved Style", description: "A precise style used to recreate the textures, shading, and borders found on currency illustrations." },
  { label: "Hand-Painted Style", description: "An illustrative style used specifically for generating digital assets like swords, potions, and icons for a fantasy RPG." },
  { label: "Scandinavian Design", description: "A specific interior design and décor style that the model can interpret when generating fully furnished room visualizations from a floor plan." },
  { label: "Luxury Design", description: "A specific interior design and décor style that the model can interpret when generating fully furnished room visualizations from a floor plan." },
  { label: "Industrial Design", description: "A specific interior design and décor style that the model can interpret when generating fully furnished room visualizations from a floor plan." },
  { label: "Cyberpunk Aesthetic", description: "A futuristic, high-contrast style often featuring detailed street markets and neon signs." },
  { label: "ID-Style Photos", description: "A standardized style used for generating multiple small, professional portrait photos from a single input." }
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
