// Script to add Asset Type layouts to Airtable Controls table
// Usage: AIRTABLE_API_KEY=xxx AIRTABLE_BASE_ID=xxx node populate-asset-types.js
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  console.error('Error: AIRTABLE_API_KEY and AIRTABLE_BASE_ID environment variables are required');
  process.exit(1);
}

const assetTypes = [
  { label: "AI Infographics", description: "Ideal for educators, analysts, and product teams, this asset type handles structured visuals with shockingly strong accuracy. It designs layouts using chart-like blocks, arrows, and labeled boxes, and is set apart by its ability to generate directly readable text inside the image. It can incorporate real-time data through search grounding to create accurate diagrams." },
  { label: "Flowcharts & Whiteboard Illustrations", description: "Converts text-heavy topics into clean, structured graphics suitable for explanatory content, such as biology processes or historical timelines. It handles diagrams, arrows, labels, icons, and flowcharts with precise text rendering." },
  { label: "Graphs & Dashboard Graphics", description: "Creates visual summaries of metrics using a clear hierarchy of bar charts, pie graphs, and KPI display blocks. These are technical visualizations that include clean, legible text." },
  { label: "Isometric Schematic Drawings", description: "Produces 3D-looking technical designs, used in engineering, gaming, and architecture, by applying deep geometric reasoning. It understands angles, depth, and structure, and can embed clean, readable text directly into the diagram." },
  { label: "Ad Photos & Marketing Creatives", description: "Generates marketing visuals with brand-consistent backgrounds, ad layouts, carousel assets, and banners. It can transform an existing photo into a specific style of advertisement (e.g., adding branding, logo placement, and highlights) while preserving the original content." },
  { label: "Meta Ads & LinkedIn Ads", description: "Creates text-rich marketing assets like print advertisements, business cards, flyers, and brochures. It handles the integration of text legibly within visuals while maintaining design aesthetics and hierarchy. It can also generate executive portrait quality images suitable for professional platforms." },
  { label: "AI Posters", description: "Generates text-rich visuals, such as movie posters and event invitations, in different aspect ratios, interpreting layout, typography, and color harmonies. The model preserves realism and depth, making the output suitable for print distribution as well as digital use." },
  { label: "Product Mockups", description: "Allows designers to place logos, taglines, or brand visuals on surfaces like shirts, packaging, or phone screens with precise alignment and real lighting. The model understands materials, ensuring logos sit naturally on surfaces like fabric." },
  { label: "Product Rendering", description: "Interprets product ideas (like a bottle or gadget) with material awareness and lighting logic to construct fully realized concepts, including textures, light physics, and volume. It reacts precisely to material descriptions, such as \"frosted glass skincare bottle, brushed aluminum cap\"." },
  { label: "Knolling", description: "Creates precision-styled top-down flat-lay images that are perfectly arranged and evenly spaced, commonly used in product marketing, industrial design, and DTC campaigns. It handles spacing, alignment, and visual clarity intuitively." },
  { label: "Video Storyboards", description: "Converts descriptive prompts into visual narratives, generating consistent, high-quality frames that form the foundation for video pre-production. It maintains character consistency across multiple panels and can generate a shot list of eight shots from a specific scene." },
  { label: "Cinematic Film Scenes (I2V Foundation)", description: "Integrates seamlessly with Image-to-Video (I2V) workflows, enabling the transformation of static AI-generated images into cinematic film sequences by defining scene compositions, lighting, and motion paths." },
  { label: "Character Sheets / Turnaround", description: "Generates multi-panel layouts that demand consistency. It can create a four-panel turnaround for a figure, showing frontal, right side, left side, and back views. It maintains proportions, clothing, and accessories across multiple poses and expressions." },
  { label: "Manga and Stylized Art", description: "Generates manga-style panels with crisp line art, expressive characters, accurate anatomy, and stylistic shading. It understands storytelling context, framing scenes with the correct perspective and camera angle." },
  { label: "Game Design Assets", description: "Accelerates game development by producing assets like characters, props, weapons, UI elements, and landscapes, maintaining style consistency across multiple asset types." },
  { label: "Professional Headshots", description: "Produces hyper-realistic images suitable for corporate use, handling facial features, skin tones, and lighting accurately. It can generate a portrait photo for use as a business headshot." },
  { label: "Photo Cleanup & Enhancement", description: "Provides professional-level photo editing by enhancing lighting, adjusting shadows, correcting color grading, and refining textures. It can also perform retouching, such as removing blemishes or whitening teeth." },
  { label: "Background Removal/Replacement", description: "Easily removes people or objects from an image or replaces the background with a new scene (e.g., neon-lit Tokyo street) while matching lighting and perspective." },
  { label: "Multi-Image Fusion", description: "Merges elements from several images (up to 14 reference images, depending on the surface) into one seamless scene while preserving natural lighting, shadows, and depth of field." },
  { label: "Restore Old Photos", description: "Restores old photos by removing damage, sharpening faces, and adding natural color (colorization), while preserving the original look and making the photo appear like a high-quality photograph taken in the present." },
  { label: "9-Grid Image", description: "A single input image can be used to generate 9 different ID-style photos." },
  { label: "Annotate Image Information", description: "Highlights specific points of interest in an image and provides relevant, annotated information, functioning as a location-based AR experience generator." },
  { label: "Outfit Swap", description: "Changes the outfits of characters in an image." },
  { label: "Sketch Rendering", description: "Renders a rough sketch as a colorful 3D cartoon car with smooth shading." },
  { label: "Statue Renders", description: "Transforms characters, people, or concepts into statue-style renders with accurate materials (e.g., marble, bronze, obsidian), lighting reflections, and museum-style staging." },
  { label: "FC26 Player of the Week Card", description: "Generates sports trading cards with high-contrast action portraits, dynamic background effects, and clean text overlays that highlight stats and achievements." },
  { label: "Wardrobe Label Visualization", description: "Creates flatlay stickers, handwritten labels, and sortable layout images to help users organize wardrobes or plan outfits." },
  { label: "Spotify Profile Visualization", description: "Produces mood-driven cover art, feature images, and promotional assets that match an artist's sonic identity and align with playlist themes and release campaigns." },
  { label: "Image-on-Dollar-Bill Trend", description: "Recreates currency textures, engravings, shading, and borders with high detail, allowing a portrait to be placed onto a dollar bill illustration." }
];

async function createControl(label, description) {
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Controls`;
  const payload = {
    fields: {
      "Label": label,
      "Description": description,
      "Category": "Layout"
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
  console.log(`Adding ${assetTypes.length} asset types to Airtable...`);

  for (let i = 0; i < assetTypes.length; i++) {
    const item = assetTypes[i];
    try {
      await createControl(item.label, item.description);
      console.log(`✓ [${i + 1}/${assetTypes.length}] ${item.label}`);
      // Rate limit: Airtable allows 5 requests per second
      await new Promise(resolve => setTimeout(resolve, 220));
    } catch (error) {
      console.error(`✗ [${i + 1}/${assetTypes.length}] ${item.label}: ${error.message}`);
    }
  }

  console.log('\nDone!');
}

main();
