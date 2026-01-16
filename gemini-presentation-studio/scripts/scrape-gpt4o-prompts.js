#!/usr/bin/env node

/**
 * GPT-4o Image Prompts Scraper
 *
 * Scrapes prompts from https://github.com/songguoxs/gpt4o-image-prompts
 * This repo has 615+ curated prompts with a structured JSON dataset.
 *
 * Usage:
 *   node scripts/scrape-gpt4o-prompts.js           # Dry run (preview only)
 *   node scripts/scrape-gpt4o-prompts.js --save    # Save to Airtable
 */

const crypto = require('crypto');

// ============================================================================
// Configuration
// ============================================================================

const AIRTABLE_API_KEY = process.env.VITE_AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.VITE_AIRTABLE_BASE_ID;
const TABLE_NAME = 'NanoBanana';

const REPO_OWNER = 'songguoxs';
const REPO_NAME = 'gpt4o-image-prompts';
const JSON_URL = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/master/data/prompts.json`;
const IMAGE_BASE_URL = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/master`;

// Category detection keywords - PRIORITY ORDER (Photorealistic and Infographic first)
const CATEGORY_KEYWORDS = {
  'Photorealistic': ['photorealistic', 'hyper-realistic', 'ultra-realistic', 'photo-realistic', 'realistic photo', 'real photo', 'professional photo', 'dslr', 'canon', 'nikon', 'sony', '85mm', '35mm', 'shallow depth', 'natural lighting', 'studio lighting', 'editorial', 'vanity fair', 'magazine', 'cover', 'professional headshot', 'business photo', 'fashion photography', 'portrait photography'],
  'Infographic': ['infographic', 'flowchart', 'diagram', 'chart', 'data visualization', 'visual explanation', 'educational', 'explain', 'process', 'steps', 'workflow', 'information design', 'data graphic', 'visual guide', 'isometric', 'schematic'],
  'Portrait & Character': ['portrait', 'headshot', 'face', 'person', 'character', 'avatar', 'selfie', 'chibi', 'anime', 'figure', 'doll', 'mascot'],
  'Product & Mockup': ['product', 'mockup', 'packaging', 'bottle', 'box', 'e-commerce', 'commercial', 'studio', 'advertising'],
  'Style Transfer': ['style', 'transfer', 'artistic', 'painting', 'convert', 'transform', 'film', 'kodak', 'retro'],
  'Scene & Environment': ['scene', 'environment', 'background', 'landscape', 'interior', 'room', 'space', 'city', 'urban'],
  'Icon & Logo': ['icon', 'logo', 'symbol', 'badge', 'emblem', 'brand', 'sticker', 'emoji'],
  'Creative Art': ['art', 'creative', 'surreal', 'abstract', 'fantasy', 'illustration', 'poster', 'silhouette'],
  'Miniature & Toy': ['miniature', 'tiny', 'small', 'toy', 'diorama', 'macro', 'tilt-shift', 'lego', 'funko', 'snow globe', '3d-printed'],
  'Text & Typography': ['text', 'typography', 'font', 'letter', 'word', 'title', 'headline', 'slogan'],
  'Food & Object': ['food', 'dish', 'meal', 'object', 'item', 'still life', 'keycap', 'cushion', 'noodles', 'cuisine'],
};

// Tag extraction keywords
const TAG_KEYWORDS = {
  'photorealistic': 'Photorealistic', 'hyper-realistic': 'Photorealistic',
  'dslr': 'DSLR', 'canon': 'Professional', 'nikon': 'Professional', 'sony': 'Professional',
  '85mm': 'Portrait Lens', '35mm': 'Wide Lens', 'editorial': 'Editorial',
  'magazine': 'Magazine', 'vanity fair': 'Editorial',
  'infographic': 'Infographic', 'flowchart': 'Flowchart', 'diagram': 'Diagram',
  'data visualization': 'Data Viz', 'educational': 'Educational',
  'business': 'Business', 'corporate': 'Corporate', 'mckinsey': 'McKinsey',
  'linkedin': 'LinkedIn', 'professional': 'Professional',
  'miniature': 'Miniature', 'studio': 'Studio', 'e-commerce': 'E-Commerce',
  'ecommerce': 'E-Commerce', 'instagram': 'Instagram',
  '3d': '3D', 'chibi': 'Chibi', 'headshot': 'Headshot',
  'surreal': 'Surreal', 'creative': 'Creative', 'fashion': 'Fashion',
  'neon': 'Neon', 'diorama': 'Diorama', 'product': 'Product',
  'isolation': 'Isolation', 'portrait': 'Portrait',
  'brand': 'Brand', 'futuristic': 'Futuristic', 'try-on': 'Try-On',
  'virtual': 'Virtual', 'anime': 'Anime', 'lego': 'Lego', 'pixel': 'Pixel',
  'retro': 'Retro', 'film': 'Film', 'poster': 'Poster', 'sticker': 'Sticker',
  'glass': 'Glass', 'knitted': 'Knitted', 'ceramic': 'Ceramic',
  'food': 'Food', 'photography': 'Photography', 'typography': 'Typography',
  'interior': 'Interior', 'nature': 'Nature', 'minimalist': 'Minimalist',
};

// ============================================================================
// Utility Functions
// ============================================================================

function generateCaseId(prompt) {
  return crypto.createHash('md5').update(prompt.trim()).digest('hex');
}

// Detect if text contains significant Chinese/Japanese/Korean characters
function isAsianLanguage(text) {
  const cjkPattern = /[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/g;
  const matches = text.match(cjkPattern) || [];
  return matches.length > text.length * 0.05;
}

function detectCategory(prompt, tags = []) {
  const lower = prompt.toLowerCase();
  const tagStr = tags.join(' ').toLowerCase();
  const combined = lower + ' ' + tagStr;

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(keyword => combined.includes(keyword))) {
      return category;
    }
  }
  return 'General';
}

function extractTags(prompt, existingTags = []) {
  const tags = [...existingTags];
  const lower = prompt.toLowerCase();

  for (const [keyword, tag] of Object.entries(TAG_KEYWORDS)) {
    if (lower.includes(keyword) && !tags.includes(tag)) {
      tags.push(tag);
    }
  }

  return [...new Set(tags)].slice(0, 8); // Dedupe and limit
}

function detectReferenceRequired(prompt) {
  const lower = prompt.toLowerCase();
  const refKeywords = [
    'uploaded', 'attached', 'reference', 'your photo', 'your image',
    'image 1', 'image 2', 'the image', 'this image', 'source image',
    'input image', 'original image', 'provided image', 'given image',
    '[character', '[brand', '[product', '[landmark', '[country'
  ];
  return refKeywords.some(k => lower.includes(k));
}

function cleanTitle(title) {
  // Remove Chinese characters if mixed with English
  if (isAsianLanguage(title)) {
    // Try to extract English portion
    const englishMatch = title.match(/[A-Za-z][A-Za-z\s\-&]+[A-Za-z]/);
    if (englishMatch && englishMatch[0].length > 10) {
      return englishMatch[0].trim();
    }
    return null; // Will use prompt-based title
  }
  return title.trim();
}

function extractEnglishPrompt(prompts) {
  if (!prompts || prompts.length === 0) return null;

  // Find the first English prompt (not primarily Asian characters)
  for (const prompt of prompts) {
    if (typeof prompt === 'string' && prompt.length > 30 && !isAsianLanguage(prompt)) {
      return prompt.trim();
    }
  }

  // If all prompts are Asian, return null
  return null;
}

function generateTitleFromPrompt(prompt) {
  if (!prompt) return 'Untitled Prompt';

  const firstLine = prompt.split('\n')[0].trim();
  const cleaned = firstLine
    .replace(/^(Create|Generate|Make|Design|Build|Draw|Render|Produce|Imagine)\s+(a|an|the)?\s*/i, '')
    .replace(/^[{"\s]+/, '') // Remove JSON/quote prefixes
    .substring(0, 80);

  if (cleaned.length > 10) {
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  return 'Untitled Prompt';
}

// ============================================================================
// Airtable Functions
// ============================================================================

async function fetchExistingCaseIds() {
  const existingIds = new Set();
  let offset;

  do {
    const url = new URL(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(TABLE_NAME)}`);
    url.searchParams.set('fields[]', 'Case ID');
    url.searchParams.set('pageSize', '100');
    if (offset) url.searchParams.set('offset', offset);

    const response = await fetch(url.toString(), {
      headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}` }
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(`Airtable Error: ${err.error?.message || response.statusText}`);
    }

    const data = await response.json();
    data.records.forEach(r => {
      if (r.fields['Case ID']) {
        existingIds.add(r.fields['Case ID']);
      }
    });
    offset = data.offset;
  } while (offset);

  return existingIds;
}

async function createCases(cases) {
  const createdIds = [];

  for (let i = 0; i < cases.length; i += 10) {
    const batch = cases.slice(i, i + 10);

    const response = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(TABLE_NAME)}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          records: batch.map(c => ({
            fields: {
              'Case ID': c.caseId,
              'Title': c.title,
              'Title (EN)': c.title,
              'Prompt': c.prompt,
              'Prompt (EN)': c.prompt,
              'Author': c.author,
              'Author URL': c.authorUrl,
              'Source Repo': c.sourceRepo,
              'Source URL': c.sourceUrl,
              'Gemini Image URL': c.geminiImageUrl || '',
              'GPT-4o Image URL': c.gpt4oImageUrl || '',
              'Reference Required': c.referenceRequired,
              'Reference Note': c.referenceNote,
              'Tags': c.tags.join(', '),
              'Category': c.category,
              'Scraped At': c.scrapedAt,
            }
          })),
          typecast: true
        })
      }
    );

    if (!response.ok) {
      const err = await response.json();
      throw new Error(`Airtable Error: ${err.error?.message || response.statusText}`);
    }

    const data = await response.json();
    createdIds.push(...data.records.map(r => r.id));

    // Progress indicator
    process.stdout.write(`\r   Saved ${createdIds.length}/${cases.length} records...`);

    // Rate limit: 5 req/sec
    if (i + 10 < cases.length) {
      await new Promise(r => setTimeout(r, 250));
    }
  }

  console.log(''); // New line after progress
  return createdIds;
}

// ============================================================================
// Scraping Functions
// ============================================================================

async function fetchPromptsJson() {
  console.log(`📥 Fetching prompts from ${REPO_OWNER}/${REPO_NAME}...`);

  const response = await fetch(JSON_URL, {
    headers: { 'User-Agent': 'NanoBanana-Scraper/1.0' }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch JSON: ${response.statusText}`);
  }

  const data = await response.json();
  console.log(`   ✓ Found ${data.items?.length || 0} prompts in dataset\n`);
  return data;
}

function parsePrompts(data) {
  const cases = [];
  const items = data.items || [];

  for (const item of items) {
    // Extract English prompt
    const englishPrompt = extractEnglishPrompt(item.prompts);
    if (!englishPrompt) {
      continue; // Skip if no English prompt found
    }

    // Get images
    const images = item.images || [];
    if (images.length === 0) {
      continue; // Skip if no images
    }

    // Build image URLs
    const resultImageUrl = `${IMAGE_BASE_URL}/${images[0].replace(/^\.\//, '')}`;
    const sourceImageUrl = images.length > 1
      ? `${IMAGE_BASE_URL}/${images[1].replace(/^\.\//, '')}`
      : '';

    // Get or generate title
    let title = cleanTitle(item.title);
    if (!title) {
      title = generateTitleFromPrompt(englishPrompt);
    }

    // Extract author info
    const source = item.source || {};
    const author = source.name || REPO_OWNER;
    const authorUrl = source.url || `https://github.com/${REPO_OWNER}`;

    // Combine existing tags with detected ones
    const existingTags = (item.tags || []).map(t =>
      t.charAt(0).toUpperCase() + t.slice(1) // Capitalize
    );
    const tags = extractTags(englishPrompt, existingTags);

    // Detect category
    const category = detectCategory(englishPrompt, tags);

    // Check if reference is required
    const referenceRequired = detectReferenceRequired(englishPrompt);

    cases.push({
      caseId: generateCaseId(englishPrompt),
      title,
      prompt: englishPrompt,
      author,
      authorUrl,
      sourceRepo: `${REPO_OWNER}/${REPO_NAME}`,
      sourceUrl: `https://github.com/${REPO_OWNER}/${REPO_NAME}`,
      geminiImageUrl: resultImageUrl,
      gpt4oImageUrl: sourceImageUrl,
      referenceRequired,
      referenceNote: referenceRequired ? 'Upload a reference image to use this prompt' : '',
      tags,
      category,
      scrapedAt: new Date().toISOString().split('T')[0],
    });
  }

  return cases;
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const dryRun = !process.argv.includes('--save');

  console.log('');
  console.log('🍌 GPT-4o Image Prompts Scraper');
  console.log('================================');
  console.log(`Mode: ${dryRun ? 'DRY RUN (preview only)' : 'SAVE TO AIRTABLE'}`);
  console.log('');

  if (!dryRun && (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID)) {
    console.error('❌ Error: VITE_AIRTABLE_API_KEY and VITE_AIRTABLE_BASE_ID must be set');
    process.exit(1);
  }

  try {
    // Fetch existing case IDs to avoid duplicates
    let existingIds = new Set();
    if (!dryRun) {
      console.log('📋 Fetching existing records from Airtable...');
      existingIds = await fetchExistingCaseIds();
      console.log(`   Found ${existingIds.size} existing records\n`);
    }

    // Fetch and parse prompts
    const data = await fetchPromptsJson();
    const allCases = parsePrompts(data);

    console.log(`📊 Parsing Results:`);
    console.log(`   Total parsed:     ${allCases.length}`);

    // Filter duplicates
    const newCases = allCases.filter(c => !existingIds.has(c.caseId));
    const duplicates = allCases.length - newCases.length;

    if (duplicates > 0) {
      console.log(`   Duplicates:       ${duplicates}`);
    }
    console.log(`   New prompts:      ${newCases.length}`);

    // Category breakdown
    const categoryBreakdown = {};
    newCases.forEach(c => {
      categoryBreakdown[c.category] = (categoryBreakdown[c.category] || 0) + 1;
    });
    console.log('\n📂 Category Breakdown:');
    Object.entries(categoryBreakdown)
      .sort((a, b) => b[1] - a[1])
      .forEach(([cat, count]) => {
        console.log(`   ${cat}: ${count}`);
      });

    console.log('');

    if (dryRun) {
      console.log('🔍 Dry run complete. Sample prompts:\n');
      newCases.slice(0, 5).forEach((c, i) => {
        console.log(`--- Prompt ${i + 1} ---`);
        console.log(`Title: ${c.title}`);
        console.log(`Author: ${c.author}`);
        console.log(`Category: ${c.category}`);
        console.log(`Tags: ${c.tags.join(', ')}`);
        console.log(`Image: ${c.geminiImageUrl.substring(0, 70)}...`);
        console.log(`Prompt: ${c.prompt.substring(0, 120)}...`);
        console.log('');
      });
      console.log('💡 Run with --save to add these prompts to Airtable');
    } else if (newCases.length > 0) {
      console.log(`💾 Saving ${newCases.length} new prompts to Airtable...`);
      const created = await createCases(newCases);
      console.log(`\n✅ Successfully created ${created.length} records`);
    } else {
      console.log('✨ No new prompts to add - database is up to date!');
    }

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  }
}

main();
