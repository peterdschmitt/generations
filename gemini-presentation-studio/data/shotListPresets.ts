// Pre-built shot list templates for common sequence types

export interface ShotListPreset {
    id: string;
    name: string;
    description: string;
    category: 'product' | 'character' | 'location' | 'narrative' | 'social';
    shots: {
        angle: string;
        purpose: string;
    }[];
}

export const SHOT_LIST_PRESETS: ShotListPreset[] = [
    // Product Photography
    {
        id: 'product-hero-6',
        name: 'Product Launch (6 shots)',
        description: 'Complete product showcase from hero to lifestyle',
        category: 'product',
        shots: [
            { angle: 'Hero shot - product centered, dramatic lighting, clean background', purpose: 'Primary marketing image' },
            { angle: 'Environment shot - product in lifestyle context, natural setting', purpose: 'Lifestyle appeal' },
            { angle: 'Detail close-up - texture, craftsmanship, material quality visible', purpose: 'Quality showcase' },
            { angle: 'Scale shot - product with human hand interaction', purpose: 'Size reference' },
            { angle: 'Feature highlight - specific capability or unique element', purpose: 'USP emphasis' },
            { angle: 'Brand shot - product with logo/packaging visible', purpose: 'Brand recognition' },
        ]
    },
    {
        id: 'product-minimal-3',
        name: 'Product Quick (3 shots)',
        description: 'Essential product views for fast campaigns',
        category: 'product',
        shots: [
            { angle: 'Front-facing hero shot, product fills 70% of frame, soft gradient background', purpose: 'Primary image' },
            { angle: '45-degree angle showing depth and dimension, subtle shadow', purpose: 'Dimensional view' },
            { angle: 'Lifestyle context shot, product in natural use environment', purpose: 'Contextual appeal' },
        ]
    },
    {
        id: 'product-ecommerce-4',
        name: 'E-commerce Standard (4 shots)',
        description: 'Standard product listing imagery',
        category: 'product',
        shots: [
            { angle: 'Front view, pure white background, product centered', purpose: 'Main listing image' },
            { angle: 'Back view, same angle and lighting as front', purpose: 'Complete view' },
            { angle: 'Side profile view, consistent lighting', purpose: 'Dimensional reference' },
            { angle: 'Detail/texture close-up, macro-style', purpose: 'Quality indication' },
        ]
    },

    // Character/Portrait
    {
        id: 'character-intro-4',
        name: 'Character Introduction (4 shots)',
        description: 'Introduce a character from environment to detail',
        category: 'character',
        shots: [
            { angle: 'Wide establishing shot - character in their environment, full body visible', purpose: 'Context and setting' },
            { angle: 'Medium shot at eye level - character from waist up, demeanor visible', purpose: 'Personality reveal' },
            { angle: 'Close-up portrait - face fills frame, emotional state clear', purpose: 'Emotional connection' },
            { angle: 'Detail shot - defining accessory or characteristic feature', purpose: 'Character signature' },
        ]
    },
    {
        id: 'character-action-5',
        name: 'Character in Action (5 shots)',
        description: 'Dynamic character doing an activity',
        category: 'character',
        shots: [
            { angle: 'Wide shot establishing the activity space and character position', purpose: 'Scene setting' },
            { angle: 'Medium tracking shot as if following the character in motion', purpose: 'Dynamic energy' },
            { angle: 'Over-the-shoulder POV showing what character sees', purpose: 'Immersion' },
            { angle: 'Low angle looking up at character mid-action, heroic framing', purpose: 'Power and agency' },
            { angle: 'Close-up on hands or face during key moment of activity', purpose: 'Focus and detail' },
        ]
    },

    // Location/Architecture
    {
        id: 'location-showcase-5',
        name: 'Location Showcase (5 shots)',
        description: 'Comprehensive location documentation',
        category: 'location',
        shots: [
            { angle: 'Wide aerial/elevated establishing shot showing full scope', purpose: 'Grand overview' },
            { angle: 'Ground-level entrance perspective, human eye height', purpose: 'Approachable view' },
            { angle: 'Architectural detail shot - unique design element or texture', purpose: 'Character detail' },
            { angle: 'Interior/exterior transition shot with human for scale', purpose: 'Scale reference' },
            { angle: 'Golden hour atmospheric mood shot, dramatic lighting', purpose: 'Emotional impact' },
        ]
    },
    {
        id: 'real-estate-6',
        name: 'Real Estate Tour (6 shots)',
        description: 'Property listing photo sequence',
        category: 'location',
        shots: [
            { angle: 'Exterior front facade, slightly elevated angle, full property visible', purpose: 'Curb appeal' },
            { angle: 'Living area wide shot from corner, maximize space perception', purpose: 'Main living space' },
            { angle: 'Kitchen shot from best angle, counters and appliances visible', purpose: 'Kitchen showcase' },
            { angle: 'Master bedroom, window light, bed centered', purpose: 'Primary bedroom' },
            { angle: 'Bathroom detail, clean and bright, fixtures visible', purpose: 'Bathroom quality' },
            { angle: 'Outdoor/backyard wide shot, lifestyle potential evident', purpose: 'Outdoor space' },
        ]
    },

    // Narrative/Storyboard
    {
        id: 'story-arc-6',
        name: 'Story Arc (6 shots)',
        description: 'Classic narrative structure in images',
        category: 'narrative',
        shots: [
            { angle: 'Wide establishing shot - setting the world and atmosphere', purpose: 'Setup' },
            { angle: 'Medium shot introducing the subject in their normal state', purpose: 'Character intro' },
            { angle: 'Close-up showing moment of realization or decision', purpose: 'Inciting incident' },
            { angle: 'Dynamic angle showing action or movement, tension building', purpose: 'Rising action' },
            { angle: 'Dramatic composition at peak emotional moment', purpose: 'Climax' },
            { angle: 'Calm wide shot showing new equilibrium, resolution', purpose: 'Resolution' },
        ]
    },
    {
        id: 'before-after-4',
        name: 'Before & After (4 shots)',
        description: 'Transformation sequence',
        category: 'narrative',
        shots: [
            { angle: 'Before state - wide shot showing initial condition, neutral lighting', purpose: 'Starting point' },
            { angle: 'Before detail - close-up on problem area or key element', purpose: 'Problem emphasis' },
            { angle: 'After state - same angle as first shot, improved lighting', purpose: 'Transformation' },
            { angle: 'After detail - same angle as second shot, showing improvement', purpose: 'Result proof' },
        ]
    },

    // Social Media
    {
        id: 'social-carousel-5',
        name: 'Social Carousel (5 shots)',
        description: 'Swipeable social media sequence',
        category: 'social',
        shots: [
            { angle: 'Hook shot - bold, attention-grabbing, subject prominent', purpose: 'Stop the scroll' },
            { angle: 'Context shot - wider view explaining the situation', purpose: 'Story context' },
            { angle: 'Detail shot - interesting close-up that rewards swiping', purpose: 'Engagement reward' },
            { angle: 'Lifestyle shot - aspirational context, emotional appeal', purpose: 'Desire creation' },
            { angle: 'CTA shot - clear, simple composition with space for text', purpose: 'Call to action' },
        ]
    },
    {
        id: 'social-story-3',
        name: 'Story Sequence (3 shots)',
        description: 'Quick 3-part story format',
        category: 'social',
        shots: [
            { angle: 'Opening hook - dramatic or intriguing, vertical framing', purpose: 'Attention grab' },
            { angle: 'Middle reveal - the key information or transformation', purpose: 'Value delivery' },
            { angle: 'Closing shot - memorable final image, CTA-ready', purpose: 'Retention' },
        ]
    },
];

export const PRESET_CATEGORIES = [
    { id: 'product', label: 'Product' },
    { id: 'character', label: 'Character' },
    { id: 'location', label: 'Location' },
    { id: 'narrative', label: 'Narrative' },
    { id: 'social', label: 'Social Media' },
];

export const getPresetById = (id: string): ShotListPreset | undefined => {
    return SHOT_LIST_PRESETS.find(p => p.id === id);
};

export const getPresetsByCategory = (category: string): ShotListPreset[] => {
    return SHOT_LIST_PRESETS.filter(p => p.category === category);
};
