
export interface PromptTemplate {
  id: string;
  title: string;
  description: string;
  prompt: string;
  category?: string;
}

export interface TemplateCategory {
  id: string;
  label: string;
  templates: PromptTemplate[];
}

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  {
    id: 'illustration',
    label: 'Illustration & Character',
    templates: [
      {
        id: 'character-turnaround',
        title: 'Character Turnaround',
        description: '4-view character sheet with expressions.',
        prompt: "Create a complete four-view turnaround sheet for a high-detail fictional role: [content]. Show frontal, right side, left side, and back views, plus three distinct emotional expressions. Use a clean vector illustration style, maintaining consistent character identity and color palette across all panels."
      },
      {
        id: 'manga-panel',
        title: 'Manga / Graphic Novel',
        description: 'Dynamic action scene with high contrast.',
        prompt: "Generate a Manga panel depicting [content] in a [topic]. Use a dynamic low-angle shot with dramatic, high-contrast shadows."
      }
    ]
  },
  {
    id: 'infographic',
    label: 'Infographics & Diagrams',
    templates: [
      {
        id: 'info-process',
        title: 'Informational Infographic',
        description: 'Detailed process with legible text.',
        prompt: "Generate an educational infographic about [topic] outlining a detailed, multi-step process: [content]. Use labeled boxes, clear arrows connecting steps, and concise definitions. Ensure the text is perfectly legible in crisp sans-serif typography. Use a clean vector art style with a three-color brand palette."
      },
      {
        id: 'flowchart',
        title: 'Flowchart / Process Map',
        description: 'Vertical flow with hand-drawn style.',
        prompt: "Transform a sequential decision pathway into a vertical flowchart about [topic]: [content]. Ensure arrows clearly connect each labeled box or decision point. Use a whiteboard illustration style with a readable, hand-drawn marker font."
      },
      {
        id: 'isometric-schematic',
        title: 'Isometric Schematic',
        description: 'Technical diagram with 3D depth.',
        prompt: "Generate an isometric schematic diagram of [content]. Include clearly labeled components and devices. Use clean technical line art on a white background. Ensure accurate angles and depth for the 3D-looking design."
      },
      {
        id: 'dashboard',
        title: 'Dashboard Graphic',
        description: 'Business metrics with charts.',
        prompt: "Create a clean dashboard graphic summarizing [content] using a clear hierarchy of bar charts, pie graphs, and KPI display blocks. Integrate a small, legible title text: '[topic]'. Use a modern UI design aesthetic."
      }
    ]
  },
  {
    id: 'photo',
    label: 'Realism & Products',
    templates: [
      {
        id: 'exec-headshot',
        title: 'Executive Headshot',
        description: 'Professional portrait, modern office.',
        prompt: "Create an executive-level professional headshot of [content] in tailored business attire with a natural, confident expression. Set the scene in a modern corporate office with soft natural window lighting, creating a high-resolution professional finish."
      },
      {
        id: 'product-render',
        title: 'Luxury Product Render',
        description: 'High-end materials and lighting.',
        prompt: "Produce a luxury product rendering of [content] for [topic]. Use a brushed aluminum cap and embossed surface texture. Use soft side reflections and studio lighting, ensuring realistic light physics and material awareness."
      }
    ]
  },
  {
    id: 'ads',
    label: 'Advertising & Social',
    templates: [
      {
        id: 'social-ad',
        title: 'Social Media Ad',
        description: 'High impact creative with headline.',
        prompt: "Design a high-impact social media ad creative. Feature [content] in a bright, appealing lifestyle setting. The bold, white headline '[topic]' must be rendered flawlessly at the top. Use commercial photography standard."
      },
      {
        id: 'product-mockup',
        title: 'Apparel/Product Mockup',
        description: 'Realistic mockup with alignment.',
        prompt: "Minimal [content] mockup made of soft fabric with realistic fold shadows. Place a placeholder logo printed in deep black ink with precise alignment. Use studio lighting and a front view."
      }
    ]
  },
  {
    id: 'video',
    label: 'Video Prep & Cinematic',
    templates: [
      {
        id: 'storyboard',
        title: 'Storyboard Sequence',
        description: '3-panel cinematic sequence.',
        prompt: "Create a cinematic storyboard sequence showing [content]. Use three separate frames with varying dynamic camera angles (low-angle, close-up, wide shot). Maintain exact character consistency across all panels."
      },
      {
        id: 'scene-foundation',
        title: 'Cinematic Scene Foundation',
        description: 'Photorealistic film establishing shot.',
        prompt: "Generate a photorealistic film scene foundation of [content]. Use a wide shot with Golden hour backlighting creating volumetric atmospheric effects. Apply cinematic color grading with muted tones."
      }
    ]
  }
];