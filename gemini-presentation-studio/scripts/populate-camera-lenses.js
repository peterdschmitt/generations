// Script to add Camera Lens options to Airtable Controls table
// Usage: AIRTABLE_API_KEY=xxx AIRTABLE_BASE_ID=xxx node populate-camera-lenses.js
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  console.error('Error: AIRTABLE_API_KEY and AIRTABLE_BASE_ID environment variables are required');
  process.exit(1);
}

const cameraLenses = [
  { label: "Portrait Standard 85mm", description: "85mm at f/1.4-f/2.8. The classic portrait lens. Creates flattering facial compression and creamy bokeh backgrounds. Perfect for headshots, beauty photography, LinkedIn profiles, and professional portraits. Sharp focus on eyes with blurred background separation. Example prompt: Shot on 85mm lens at f/2.8, sharp focus on eyes, creamy bokeh background, professional portrait lighting" },
  { label: "Nifty Fifty 50mm", description: "50mm at f/1.4-f/1.8. The versatile workhorse lens with natural perspective closest to human vision. Ideal for lifestyle portraits, e-commerce lookbooks, and standard product photography. Clean, professional results without distortion. Example prompt: Shot on Canon EOS R5 with 50mm f/1.8 lens for a natural, professional look" },
  { label: "Wide Portrait 35mm", description: "35mm at f/1.4-f/2.0. Environmental portrait lens that captures subject plus surroundings. Great for lifestyle content, behind-the-scenes shots, and social media where context matters. Slight distortion when too close to subject. Example prompt: 35mm lens at f/2.0, environmental portrait showing workspace context, natural lighting" },
  { label: "Beauty Telephoto 105mm", description: "105mm at f/2.8. Tight framing lens for beauty and detail work. Excellent for skincare product ads, makeup tutorials, and close-up facial features. Creates pleasing skin rendering with working distance from subject. Example prompt: 105mm macro at f/2.8, beauty close-up, detailed skin texture, soft studio lighting" },
  { label: "Fashion Telephoto 135mm", description: "135mm at f/2.0. Editorial and fashion favorite with strong background compression. Creates dreamy, cinematic portraits with heavily blurred backgrounds. Perfect for fashion campaigns and dramatic headshots. Example prompt: 135mm f/2.0, strong background compression, cinematic color grading, fashion editorial style" },
  { label: "Interior Wide 24mm", description: "24mm at f/1.4-f/2.8. Expansive interior and landscape lens. Captures entire rooms, dramatic architecture, and sweeping scenes. Ideal for real estate listings, hotel photography, and location shots with dramatic perspective. Example prompt: 24mm wide angle, interior real estate shot, deep focus, natural window lighting" },
  { label: "Street Wide 28mm", description: "28mm at f/2.0-f/2.8. Classic street photography focal length. Wide enough for environmental context but minimal distortion. Perfect for documentary style, urban scenes, and lifestyle content with background detail. Example prompt: 28mm street photography style, environmental context, candid moment, urban background" },
  { label: "Architecture Ultra-Wide 16mm", description: "16mm at f/2.8. Ultra-wide for architecture and real estate. Captures entire building facades and room interiors in single frame. Watch for barrel distortion at edges. Great for dramatic architectural presentations. Example prompt: 16mm ultra-wide, architectural interior, corrected verticals, dramatic ceiling height" },
  { label: "Dramatic Ultra-Wide 14mm", description: "14mm at f/2.8. Extreme wide angle for dramatic landscapes and creative perspectives. Creates curved horizon effect and exaggerated depth. Use for impactful hero images and dramatic scene-setting shots. Example prompt: 14mm ultra-wide landscape, dramatic sky, curved horizon, epic scale" },
  { label: "Fisheye 8-15mm", description: "8-15mm at f/2.8. Creative distortion lens with 180-degree field of view. Barrel distortion creates spherical effect. Best for action sports, skateboarding content, creative ads, and unique perspectives. Example prompt: Fisheye lens, 180-degree view, barrel distortion, action sports perspective, dynamic angle" },
  { label: "Zoom Telephoto 70-200mm", description: "70-200mm at f/2.8. Versatile professional zoom for events, sports, and fashion. Background compression isolates subjects from busy environments. Industry standard for fashion runways, sports events, and corporate photography. Example prompt: 70-200mm at 200mm f/2.8, compressed background, subject isolation, event photography" },
  { label: "Wildlife Telephoto 200mm", description: "200mm at f/2.0-f/2.8. Strong compression for isolated subjects. Flattens perspective and creates intimate feel from distance. Perfect for wildlife, candid portraits from afar, and sports photography. Example prompt: 200mm telephoto, wildlife portrait, heavily compressed background, isolated subject" },
  { label: "Super Telephoto 300mm", description: "300mm at f/2.8-f/4.0. Extreme background compression for distant subjects. Maximum subject isolation with completely flattened depth. Ideal for wildlife, stadium sports, and surveillance-style documentary shots. Example prompt: 300mm super telephoto, extreme compression, distant subject isolation, wildlife detail" },
  { label: "Product Macro 100mm", description: "100mm at f/2.8-f/4.0. 1:1 magnification for extreme product detail. Captures textures, materials, and fine craftsmanship. Essential for jewelry, watches, cosmetics, food photography, and small product e-commerce. Example prompt: Macro lens 100mm at f/4, extreme detail on texture, shallow depth of field, jewelry close-up" },
  { label: "Compact Macro 60mm", description: "60mm at f/2.8. Close-up capability with comfortable working distance. Good for small products, food details, and texture shots. Slightly wider perspective than 100mm macro for context. Example prompt: 60mm macro, product texture detail, shallow DOF, studio lighting, cosmetic close-up" },
  { label: "Tilt-Shift 17-24mm", description: "17-24mm at f/3.5-f/4.0. Corrects perspective distortion and creates selective focus plane. Essential for architectural photography with straight verticals. Also creates miniature/toy-like effect on cityscapes. Example prompt: 24mm tilt-shift lens, corrected verticals, architectural photography, deep focus throughout" },
  { label: "Soft Focus Lensbaby", description: "Variable focal length and aperture. Creates dreamy, ethereal portraits with selective sharp zone surrounded by blur. Perfect for romantic portraits, dreamy product shots, and artistic creative content. Example prompt: Soft focus lens, dreamy portrait, ethereal glow, selective sharpness, romantic mood" },
  { label: "Medium Format 80mm", description: "80mm equivalent at f/2.8. Larger sensor creates unique depth rendering and exceptional detail. Luxury fashion and advertising standard. Hasselblad, Phase One, Fujifilm GFX quality for high-end campaigns. Example prompt: Shot on Hasselblad medium format, exceptional detail, luxury fashion, advertising quality" },
  { label: "Vintage Disposable Camera", description: "Fixed 35mm at f/8-f/11. Lo-fi aesthetic with harsh on-camera flash. Creates authentic 90s/2000s nostalgia. Perfect for retro campaigns, Y2K aesthetic, and intentionally imperfect social content. Example prompt: Shot on disposable camera, harsh flash, early 2000s digital aesthetic, nostalgic grain" },
  { label: "Polaroid Instant Film", description: "Fixed focal length at f/8. Instant film look with characteristic color rendering and white frame border. Creates nostalgic, one-of-a-kind feel. Great for memory collages, vintage storytelling, and authentic retro content. Example prompt: Polaroid instant film style, white border frame, vintage color rendering, nostalgic moment" }
];

async function createControl(label, description) {
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Controls`;
  const payload = {
    fields: {
      "Label": label,
      "Description": description,
      "Category": "Camera"
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
  console.log(`Adding ${cameraLenses.length} camera lens options to Airtable...`);

  for (let i = 0; i < cameraLenses.length; i++) {
    const item = cameraLenses[i];
    try {
      await createControl(item.label, item.description);
      console.log(`✓ [${i + 1}/${cameraLenses.length}] ${item.label}`);
      // Rate limit: Airtable allows 5 requests per second
      await new Promise(resolve => setTimeout(resolve, 220));
    } catch (error) {
      console.error(`✗ [${i + 1}/${cameraLenses.length}] ${item.label}: ${error.message}`);
    }
  }

  console.log('\nDone!');
}

main();
