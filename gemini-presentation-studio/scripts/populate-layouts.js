// Script to populate Airtable Controls table with Layout options
// Usage: AIRTABLE_API_KEY=xxx AIRTABLE_BASE_ID=xxx node populate-layouts.js
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  console.error('Error: AIRTABLE_API_KEY and AIRTABLE_BASE_ID environment variables are required');
  process.exit(1);
}

const layouts = [
  { label: "Miniature in Hand", value: "Product held between thumb and index finger, white background, shallow depth of field. Well-groomed hand, studio lighting, soft shadows, hyper-detailed product" },
  { label: "White Studio Isolation", value: "Product on pure white background (RGB 255,255,255) with subtle contact shadow. Even illumination, no glare, color-corrected, sharp focus" },
  { label: "Textured Surface Display", value: "Product on stone, wood, or marble surface with three-point softbox lighting. Earthy tones, natural shadows, glossy textures" },
  { label: "Exploded View", value: "Components floating in mid-air, perfectly aligned, revealing inner structure. 8K resolution, cinematic lighting, futuristic aesthetic" },
  { label: "Flat Lay Garment", value: "Clothing displayed flat or on invisible mannequin, white/transparent background. Natural fabric folds, seams visible, high-res" },
  { label: "Acrylic Base Sculpture", value: "3D product sculpture on clear acrylic base with neon lighting. Neon accents, modern appeal, display piece style" },
  { label: "Branded Packaging Mockup", value: "Product in packaging with condensation, straw, or realistic details. Glossy surface, typography, brand colors" },
  { label: "Jewelry Hand Close-up", value: "Hand holding pendant or ring, blurred neutral beige background. Natural lighting, realistic skin, polished metal" },
  { label: "Virtual Try-On Composite", value: "Garment composited onto model with natural draping and lighting match. Canon EOS R5 style, fabric texture preservation" },
  { label: "Pixelated Transformation", value: "Half product intact, half fragmenting into floating cubes. Motion blur on cubes, geometric abstraction, cinematic" },
  { label: "Promotional Poster", value: "Hero image with title, offer badge, and footer CTA integrated into scene. Gold serif title, badge/sticker offer, clean footer text" },
  { label: "Brand Diorama Shop", value: "Miniature shop made of oversized products, polymer-clay look. Macro photo, soft light, shallow DOF, logo sign" },
  { label: "Surreal Product Scene", value: "Product with dreamlike element (underwater scene inside, floating objects). Soft-focus background, high-end photography style" },
  { label: "Gigantic Statue", value: "Person as massive statue in city square with crowd looking up. Tokyo/NYC setting, dramatic scale, photorealistic" },
  { label: "OOH Mockup System", value: "Brand shown across billboards, bus stops, and outdoor touchpoints. Consistent logo placement, multiple touchpoints" },
  { label: "Polaroid Cork Board", value: "Multiple instant photos pinned to cork board telling a story. Vintage photos, handwritten captions, pins/tape" },
  { label: "Logo-Shaped Furniture", value: "Object (bookshelf, lamp) designed in shape of brand logo. Matte black metal, LED strips, neutral wall" },
  { label: "Vehicle Wrap Design", value: "Car with character artwork (itasha style) at scenic location. Sporty car, professional automotive photography" },
  { label: "McKinsey Flowchart", value: "Clean lines, blue-gray palette, ample whitespace, geometric shapes. Minimalist, drop shadows, directional arrows" },
  { label: "Educational Infographic", value: "Flat vector icons with arrows and labels showing process flow. Textbook style, clear labels, flow arrows" },
  { label: "Recipe Step-by-Step", value: "Top-down view: ingredients → dashed lines → steps → final dish. White background, labeled photos, minimalist" },
  { label: "Blueprint Overlay", value: "White chalk-style annotations over real photograph. Technical data, measurements, cross-sections" },
  { label: "Architecture Diagram", value: "System components with connection lines and logical grouping. Clean styling, labeled nodes, color-coded" },
  { label: "Data Flow Diagram", value: "Sources → transformations → destinations with directional arrows. Professional styling, labeled stages" },
  { label: "Process Flowchart", value: "Decision points, success/failure paths, integration touchpoints. Diamond decisions, rectangular steps, arrows" },
  { label: "Facial Aesthetic Report", value: "Portrait with white lines pointing to features plus percentage scores. Soft beige background, premium clinic style" },
  { label: "Anatomical Diagram", value: "3D model with annotations explaining functions and principles. Highly detailed, realistic, labeled parts" },
  { label: "Instagram Frame", value: "Character sitting on edge of giant IG post frame, social icons floating. 3D chibi style, finger heart, username display" },
  { label: "Corporate Headshot", value: "Neutral background, business attire, professional studio lighting. Sharp focus on face, clean and polished" },
  { label: "Vertical Story Card", value: "Hand-drawn style with bold fonts, hierarchy, paper texture background. Accent colors for keywords, icons/illustrations" },
  { label: "Sticker Grid 3x3", value: "9 chibi expressions in grid, transparent background, white outlines. Diverse emotions, consistent style, no text" },
  { label: "Infographic Resume", value: "PDF transformed into visual resume with icons and highlights. Key achievements, skills visualization" },
  { label: "Dramatic B&W Portrait", value: "High-contrast black and white, side lighting, reflective sunglasses. City skyline reflection, confident upward gaze" },
  { label: "Anthropic PPT Style", value: "Warm beige (#F3F0E9), Terracotta Red, Mustard Yellow, hand-drawn line art. Serif titles, sans-serif body, minimal charts" },
  { label: "Magazine Article Layout", value: "Hero image, pull quotes, body columns, elegant typography. Editorial styling, glossy finish" },
  { label: "Storyboard Panels", value: "Key moments with cinematic angles but camera movement notes. Multiple frames, angle annotations" },
  { label: "Floor Plan to 3D Isometric", value: "Overhead architectural rendering with furniture and lighting. Photorealistic materials, furnished rooms" },
  { label: "Tilt-Shift Miniature", value: "Top-down cityscape with toy-like depth of field effect. Vibrant colors, strong contrast, CG rendered" },
  { label: "Weather Transformation", value: "Same scene with different weather (rain, snow, fog, sun). Natural lighting adjustments, environmental FX" },
  { label: "Pose Transfer", value: "Subject's pose changed to match reference image in studio setting. Professional studio, maintained features" },
  { label: "B&W Colorization", value: "Historical photo with natural, period-appropriate colors added. Realistic skin tones, historically accurate" },
  { label: "Portrait Enhancement", value: "Upscaled with clear pores, fine lines, realistic shadow transitions. High-end beauty photograph quality" }
];

async function createControl(label, value, category) {
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Controls`;
  const payload = { fields: { "Label": label, "Value": value, "Category": category }, typecast: true };

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
  console.log(`Adding ${layouts.length} layouts to Airtable...`);

  for (let i = 0; i < layouts.length; i++) {
    const layout = layouts[i];
    try {
      await createControl(layout.label, layout.value, 'Layout');
      console.log(`✓ [${i + 1}/${layouts.length}] ${layout.label}`);
      // Rate limit: Airtable allows 5 requests per second
      await new Promise(resolve => setTimeout(resolve, 220));
    } catch (error) {
      console.error(`✗ [${i + 1}/${layouts.length}] ${layout.label}: ${error.message}`);
    }
  }

  console.log('\nDone!');
}

main();
