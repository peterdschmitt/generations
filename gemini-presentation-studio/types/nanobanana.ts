// Types for NanoBanana Prompt Library

export interface NanoBananaCase {
  id: string;                    // Airtable record ID
  caseId: string;               // Case ID (MD5 hash for deduplication)
  caseNumber: number;           // Case Number (auto-increment)
  title: string;                // Title (EN) - English only
  prompt: string;               // Prompt (EN) - English only
  author: string;               // Author (GitHub username)
  authorUrl: string;            // Author URL (GitHub profile link)
  sourceRepo: string;           // Source Repo (owner/repo format)
  sourceUrl: string;            // Source URL (direct link to source)
  geminiImageUrl: string;       // Gemini Image URL
  gpt4oImageUrl: string;        // GPT-4o Image URL
  geminiImage?: string;         // Gemini Image (attachment URL from Airtable)
  gpt4oImage?: string;          // GPT-4o Image (attachment URL from Airtable)
  referenceRequired: boolean;   // Reference Required checkbox
  referenceNote: string;        // Reference Note
  tags: string[];               // Tags (parsed from comma-separated string)
  category: NanoBananaCategory; // Category (single select)
  scrapedAt: string;            // Scraped At (ISO date string)
  favorite: boolean;            // Favorite checkbox
}

export type NanoBananaCategory =
  | 'Photorealistic'
  | 'Infographic'
  | 'Portrait & Character'
  | 'Product & Mockup'
  | 'Style Transfer'
  | 'Scene & Environment'
  | 'Icon & Logo'
  | 'Creative Art'
  | 'Miniature & Toy'
  | 'Text & Typography'
  | 'Food & Object'
  | 'General';

export interface GitHubSource {
  id: string;
  owner: string;
  repo: string;
  enabled: boolean;
  promptCount: number;
  lastSynced?: string;
}

// For creating new cases (without Airtable-generated fields)
export interface NanoBananaCaseInput {
  caseId: string;
  title: string;
  prompt: string;
  author: string;
  authorUrl: string;
  sourceRepo: string;
  sourceUrl: string;
  geminiImageUrl?: string;
  gpt4oImageUrl?: string;
  referenceRequired: boolean;
  referenceNote: string;
  tags: string[];
  category: NanoBananaCategory;
  scrapedAt: string;
}

// Default GitHub sources from PRD
export const DEFAULT_GITHUB_SOURCES: Omit<GitHubSource, 'id' | 'promptCount' | 'lastSynced'>[] = [
  { owner: 'JimmyLv', repo: 'awesome-nano-banana', enabled: true },
  { owner: 'ZeroLu', repo: 'awesome-nanobanana-pro', enabled: true },
  { owner: 'PicoTrex', repo: 'Awesome-Nano-Banana-images', enabled: true },
  { owner: 'Super-Maker-AI', repo: 'awesome-nano-banana', enabled: true },
  { owner: 'muset-ai', repo: 'awesome-nano-banana-pro', enabled: true },
];

// Category detection keywords
export const CATEGORY_KEYWORDS: Record<NanoBananaCategory, string[]> = {
  'Photorealistic': ['photorealistic', 'photo', 'realistic', 'dslr', 'cinematic', 'bokeh', 'highly detailed'],
  'Infographic': ['infographic', 'diagram', 'chart', 'graph', 'flowchart', 'timeline', 'data viz', 'dataviz'],
  'Portrait & Character': ['portrait', 'headshot', 'face', 'person', 'character', 'avatar', 'selfie', 'chibi'],
  'Product & Mockup': ['product', 'mockup', 'packaging', 'bottle', 'box', 'e-commerce', 'commercial'],
  'Style Transfer': ['style', 'transfer', 'artistic', 'painting', 'convert', 'transform'],
  'Scene & Environment': ['scene', 'environment', 'background', 'landscape', 'interior', 'room', 'space'],
  'Icon & Logo': ['icon', 'logo', 'symbol', 'badge', 'emblem', 'brand'],
  'Creative Art': ['art', 'creative', 'surreal', 'abstract', 'fantasy', 'illustration'],
  'Miniature & Toy': ['miniature', 'tiny', 'small', 'toy', 'diorama', 'macro', 'tilt-shift'],
  'Text & Typography': ['text', 'typography', 'font', 'letter', 'word', 'title', 'headline'],
  'Food & Object': ['food', 'dish', 'meal', 'object', 'item', 'still life'],
  'General': [],
};

// Tag extraction keywords
export const TAG_KEYWORDS: Record<string, string> = {
  'miniature': 'Miniature',
  'studio': 'Studio',
  'e-commerce': 'E-Commerce',
  'ecommerce': 'E-Commerce',
  'flowchart': 'Flowchart',
  'business': 'Business',
  'corporate': 'Corporate',
  'mckinsey': 'McKinsey',
  'instagram': 'Instagram',
  'linkedin': 'LinkedIn',
  '3d': '3D',
  'chibi': 'Chibi',
  'headshot': 'Headshot',
  'surreal': 'Surreal',
  'creative': 'Creative',
  'fashion': 'Fashion',
  'neon': 'Neon',
  'diorama': 'Diorama',
  'product': 'Product',
  'isolation': 'Isolation',
  'infographic': 'Infographic',
  'portrait': 'Portrait',
  'brand': 'Brand',
  'futuristic': 'Futuristic',
  'try-on': 'Try-On',
  'virtual': 'Virtual',
};
