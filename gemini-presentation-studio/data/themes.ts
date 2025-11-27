
export interface ThemeDeck {
    id: string;
    label: string;
    description: string;
    color: string;
    modifiers: string; // The prompt injection
}

export const THEME_DECKS: ThemeDeck[] = [
    {
        id: 'corporate-blue',
        label: 'Corporate Blue',
        description: 'Trustworthy, clean, navy & white palette, vector style.',
        color: 'from-blue-600 to-blue-800',
        modifiers: "in a professional Corporate Memphis style. Use a strict color palette of Navy Blue (#003366), Clean White, and soft grey accents. Flat vector illustration, minimalist composition, sans-serif typography compatibility."
    },
    {
        id: 'tech-neon',
        label: 'Tech Neon',
        description: 'Dark mode, glowing accents, cyberpunk vibes.',
        color: 'from-purple-600 to-cyan-500',
        modifiers: "in a futuristic Cyberpunk aesthetic. Dark background with glowing neon accents in Cyan and Magenta. High-tech interface elements, holographic texture, grid lines, volumetric lighting."
    },
    {
        id: 'eco-minimal',
        label: 'Eco Minimal',
        description: 'Earthy tones, soft lighting, natural textures.',
        color: 'from-green-500 to-emerald-700',
        modifiers: "in an Eco-Minimalist style. Use earthy tones (Sage Green, Beige, Warm Grey). Soft natural lighting, matte paper texture finish, organic shapes, clean and breathable layout."
    },
    {
        id: 'hand-drawn',
        label: 'Sketchbook',
        description: 'Playful, marker style, white background.',
        color: 'from-orange-400 to-red-400',
        modifiers: "in a Hand-Drawn Sketch style. Whiteboard aesthetic with black marker outlines and playful scribble fills. Rough edges, human touch, creative and brainstorming vibe."
    },
    {
        id: 'luxury-3d',
        label: 'Luxury 3D',
        description: 'Gold/Black, glossy, high-end render.',
        color: 'from-yellow-600 to-yellow-800',
        modifiers: "in a High-End Luxury 3D Render style. Black and Gold color scheme. Glossy metallic textures, studio lighting with dramatic rim lights, shallow depth of field, photorealistic 8k render."
    },
    {
        id: 'editorial',
        label: 'Editorial',
        description: 'Muted tones, grain, cinematic photography.',
        color: 'from-gray-500 to-gray-700',
        modifiers: "in a Cinematic Editorial Photography style. Muted, desaturated color grading. Film grain texture, soft window lighting, realistic and emotive, high-fashion magazine aesthetic."
    }
];
