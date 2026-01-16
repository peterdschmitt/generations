#!/usr/bin/env node

/**
 * NanoBanana GitHub Scraper
 *
 * Scrapes AI image generation prompts from GitHub repositories
 * and syncs them to Airtable.
 *
 * Usage:
 *   node scripts/scrape-nanobanana.js [--dry-run] [--repo owner/repo]
 *
 * Options:
 *   --dry-run    Preview what would be scraped without saving to Airtable
 *   --repo       Scrape only a specific repository
 *
 * Environment variables:
 *   VITE_AIRTABLE_API_KEY  - Airtable API key
 *   VITE_AIRTABLE_BASE_ID  - Airtable base ID
 *   VITE_GITHUB_TOKEN      - Optional GitHub token for higher rate limits
 */

const crypto = require('crypto');

// Configuration
const AIRTABLE_API_KEY = process.env.VITE_AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.VITE_AIRTABLE_BASE_ID;
const GITHUB_TOKEN = process.env.VITE_GITHUB_TOKEN;
const TABLE_NAME = 'NanoBanana';

// Default repositories to scrape
const DEFAULT_REPOS = [
  { owner: 'JimmyLv', repo: 'awesome-nano-banana' },
  { owner: 'ZeroLu', repo: 'awesome-nanobanana-pro' },
  { owner: 'PicoTrex', repo: 'Awesome-Nano-Banana-images' },
  { owner: 'Super-Maker-AI', repo: 'awesome-nano-banana' },
  { owner: 'muset-ai', repo: 'awesome-nano-banana-pro' },
];

// Category detection keywords - PRIORITY ORDER (Photorealistic and Infographic first)
const CATEGORY_KEYWORDS = {
  // High priority categories for professional use
  'Photorealistic': ['photorealistic', 'hyper-realistic', 'ultra-realistic', 'photo-realistic', 'realistic photo', 'real photo', 'professional photo', 'dslr', 'canon', 'nikon', 'sony', '85mm', '35mm', 'shallow depth', 'natural lighting', 'studio lighting', 'editorial', 'vanity fair', 'magazine', 'cover', 'professional headshot', 'business photo'],
  'Infographic': ['infographic', 'flowchart', 'diagram', 'chart', 'data visualization', 'visual explanation', 'educational', 'explain', 'process', 'steps', 'workflow', 'information design', 'data graphic', 'visual guide'],
  // Standard categories
  'Portrait & Character': ['portrait', 'headshot', 'face', 'person', 'character', 'avatar', 'selfie', 'chibi', 'anime', 'figure', 'doll', 'mascot'],
  'Product & Mockup': ['product', 'mockup', 'packaging', 'bottle', 'box', 'e-commerce', 'commercial', 'studio', 'photography'],
  'Style Transfer': ['style', 'transfer', 'artistic', 'painting', 'convert', 'transform', 'film', 'kodak', 'retro'],
  'Scene & Environment': ['scene', 'environment', 'background', 'landscape', 'interior', 'room', 'space', 'city', 'urban'],
  'Icon & Logo': ['icon', 'logo', 'symbol', 'badge', 'emblem', 'brand', 'sticker', 'emoji'],
  'Creative Art': ['art', 'creative', 'surreal', 'abstract', 'fantasy', 'illustration', 'poster', 'silhouette'],
  'Miniature & Toy': ['miniature', 'tiny', 'small', 'toy', 'diorama', 'macro', 'tilt-shift', 'lego', 'funko', 'snow globe'],
  'Text & Typography': ['text', 'typography', 'font', 'letter', 'word', 'title', 'headline'],
  'Food & Object': ['food', 'dish', 'meal', 'object', 'item', 'still life', 'keycap', 'cushion'],
};

// Tag extraction keywords
const TAG_KEYWORDS = {
  // Photorealistic tags
  'photorealistic': 'Photorealistic', 'hyper-realistic': 'Photorealistic',
  'dslr': 'DSLR', 'canon': 'Professional', 'nikon': 'Professional', 'sony': 'Professional',
  '85mm': 'Portrait Lens', '35mm': 'Wide Lens', 'editorial': 'Editorial',
  'magazine': 'Magazine', 'vanity fair': 'Editorial',
  // Infographic tags
  'infographic': 'Infographic', 'flowchart': 'Flowchart', 'diagram': 'Diagram',
  'data visualization': 'Data Viz', 'educational': 'Educational',
  // Business tags
  'business': 'Business', 'corporate': 'Corporate', 'mckinsey': 'McKinsey',
  'linkedin': 'LinkedIn', 'professional': 'Professional',
  // Standard tags
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
};

// ============================================================================
// Utility Functions
// ============================================================================

function generateCaseId(prompt) {
  return crypto.createHash('md5').update(prompt.trim()).digest('hex');
}

// Detect if text contains significant Chinese/Japanese/Korean characters
function isAsianLanguage(text) {
  // Match CJK Unified Ideographs and common ranges
  const cjkPattern = /[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/g;
  const matches = text.match(cjkPattern) || [];
  // If more than 5% of the text is CJK characters, consider it Asian language
  // (stricter threshold to catch mixed content)
  return matches.length > text.length * 0.05;
}

// Skip prompts that are primarily in Asian languages (since we prefer English)
function shouldSkipPrompt(prompt) {
  return isAsianLanguage(prompt);
}

// Extract all image URLs from a markdown section
function extractAllImages(content) {
  const images = [];
  // Match all img tags with src attributes
  const imgPattern = /<img[^>]*src="([^"]+)"[^>]*>/gi;
  let match;
  while ((match = imgPattern.exec(content)) !== null) {
    const url = match[1];
    // Filter out badges, icons, and other non-content images
    if (!url.includes('badge') &&
        !url.includes('shields.io') &&
        !url.includes('rawgit.com') &&
        !url.includes('img.shields') &&
        url.length > 20) {
      images.push(url);
    }
  }
  return images;
}

function detectCategory(prompt) {
  const lower = prompt.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(keyword => lower.includes(keyword))) {
      return category;
    }
  }
  return 'General';
}

function extractTags(prompt) {
  const tags = [];
  const lower = prompt.toLowerCase();
  for (const [keyword, tag] of Object.entries(TAG_KEYWORDS)) {
    if (lower.includes(keyword) && !tags.includes(tag)) {
      tags.push(tag);
    }
  }
  return tags.slice(0, 5);
}

function detectReferenceRequired(prompt) {
  const lower = prompt.toLowerCase();
  const refKeywords = [
    'uploaded', 'attached', 'reference', 'your photo', 'your image',
    'image 1', 'image 2', 'the image', 'this image', 'source image',
    'input image', 'original image', 'provided image', 'given image',
    'upload a photo', 'upload image', 'keep the face', 'keep the facial'
  ];
  return refKeywords.some(k => lower.includes(k));
}

function cleanPrompt(prompt) {
  // Remove common markdown artifacts
  return prompt
    .replace(/^\s*```\w*\s*/gm, '')
    .replace(/```\s*$/gm, '')
    .replace(/^\s*>\s*/gm, '')
    .trim();
}

function extractTitle(text, prompt, caseNumber) {
  // If the text title is in Asian language, prefer extracting from prompt
  const textIsAsian = text && isAsianLanguage(text);

  // Try to extract a meaningful title from the text (if not Asian)
  if (text && text.length > 0 && text.length < 100 && !textIsAsian) {
    return text.trim();
  }

  // Use first line of prompt if short enough and looks like a title
  const firstLine = prompt.split('\n')[0].trim();
  // Clean up common prompt prefixes
  const cleanedFirstLine = firstLine
    .replace(/^(Create|Generate|Make|Design|Build|Draw|Render|Produce)\s+(a|an|the)?\s*/i, '')
    .substring(0, 80);

  if (cleanedFirstLine.length > 10 && cleanedFirstLine.length < 80 && !isAsianLanguage(cleanedFirstLine)) {
    // Capitalize first letter
    return cleanedFirstLine.charAt(0).toUpperCase() + cleanedFirstLine.slice(1);
  }

  // Fallback: use case number or generic
  return `Prompt ${caseNumber || 'Unknown'}`;
}

// ============================================================================
// GitHub Fetching
// ============================================================================

async function fetchReadme(owner, repo) {
  const branches = ['main', 'master'];
  const headers = {
    'User-Agent': 'NanoBanana-Scraper/1.0',
  };
  if (GITHUB_TOKEN) {
    headers['Authorization'] = `token ${GITHUB_TOKEN}`;
  }

  // Special handling for JimmyLv repo - use main README which has images
  // The prompts inside are mostly English even though titles are Chinese
  const isJimmyLv = owner === 'JimmyLv' && repo === 'awesome-nano-banana';

  if (!isJimmyLv) {
    // For other repos, try README_en.md FIRST for English version (preferred)
    for (const branch of branches) {
      const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/README_en.md`;
      try {
        const response = await fetch(url, { headers });
        if (response.ok) {
          console.log(`  ✓ Fetched ${owner}/${repo}/README_en.md (${branch} branch) [English]`);
          return { content: await response.text(), branch, isEnglish: true };
        }
      } catch (e) {
        // Continue
      }
    }
  }

  // Use main README.md (for JimmyLv, or as fallback for others)
  for (const branch of branches) {
    const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/README.md`;
    try {
      const response = await fetch(url, { headers });
      if (response.ok) {
        console.log(`  ✓ Fetched ${owner}/${repo} (${branch} branch)${isJimmyLv ? ' [Main with images]' : ''}`);
        return { content: await response.text(), branch, isEnglish: false };
      }
    } catch (e) {
      // Continue to next branch
    }
  }

  throw new Error(`Failed to fetch README for ${owner}/${repo}`);
}

// ============================================================================
// Markdown Parsing
// ============================================================================

function parseMarkdown(markdown, source) {
  const cases = [];

  // Strategy 1: Parse "### Case N:" format (JimmyLv style)
  const casePattern = /###\s*Case\s*(\d+)[:\s]*([^\n]*)\n([\s\S]*?)(?=###\s*Case\s*\d+|---\s*\n|## |$)/gi;
  let match;

  while ((match = casePattern.exec(markdown)) !== null) {
    const caseNumber = parseInt(match[1], 10);
    const caseTitle = match[2].trim();
    const caseContent = match[3];

    // Extract prompt from code block
    const promptMatch = caseContent.match(/\*\*Prompt\*\*\s*\n*```[\w]*\n([\s\S]*?)```/i);
    if (promptMatch) {
      const prompt = cleanPrompt(promptMatch[1]);
      // Skip if prompt is too short or primarily in Asian language
      if (prompt.length > 30 && !shouldSkipPrompt(prompt)) {
        // Extract author from title or content
        const authorMatch = caseTitle.match(/\(by\s*[@]?([\w_]+)\)/i) ||
                           caseContent.match(/Source[:\s]*\[@?([\w_]+)\]/i) ||
                           caseContent.match(/by\s*\[@?([\w_]+)\]/i);
        const author = authorMatch ? authorMatch[1] : source.owner;

        // Extract source link
        const sourceLinkMatch = caseContent.match(/\[Source\s*Link\]\((https?:\/\/[^\)]+)\)/i) ||
                                caseContent.match(/Source[:\s]*\[(https?:\/\/[^\]]+)\]/i);
        const sourceLink = sourceLinkMatch ? sourceLinkMatch[1] : `https://github.com/${source.owner}/${source.repo}`;

        // Extract ALL image URLs from the section
        const allImages = extractAllImages(caseContent);

        // Determine source (input) and result (output) images
        let sourceImageUrl = '';
        let resultImageUrl = '';

        if (allImages.length === 1) {
          resultImageUrl = allImages[0];
        } else if (allImages.length >= 2) {
          sourceImageUrl = allImages[0];
          resultImageUrl = allImages[allImages.length - 1];
        }

        const title = extractTitle(caseTitle.replace(/\(by[^)]+\)/i, '').trim(), prompt, caseNumber);

        cases.push({
          caseId: generateCaseId(prompt),
          title,
          prompt,
          author,
          authorUrl: author.startsWith('@') ? `https://x.com/${author.substring(1)}` : `https://github.com/${author}`,
          sourceRepo: `${source.owner}/${source.repo}`,
          sourceUrl: sourceLink,
          geminiImageUrl: resultImageUrl,
          gpt4oImageUrl: sourceImageUrl, // Repurposing for source/reference image
          referenceRequired: detectReferenceRequired(prompt),
          referenceNote: detectReferenceRequired(prompt) ? 'Upload a reference image to use this prompt' : '',
          tags: extractTags(prompt),
          category: detectCategory(prompt),
          scrapedAt: new Date().toISOString().split('T')[0],
        });
      }
    }
  }

  // Strategy 2: Parse "### N.N. Title" format (ZeroLu style)
  const sectionPattern = /###\s*(\d+\.\d+\.?)\s*([^\n]+)\n([\s\S]*?)(?=###\s*\d+\.\d+|## \d+\.|$)/gi;

  while ((match = sectionPattern.exec(markdown)) !== null) {
    const sectionNumber = match[1];
    const sectionTitle = match[2].trim();
    const sectionContent = match[3];

    // Extract prompt from code block (can be ```text, ```json, or just ```)
    const promptMatches = sectionContent.matchAll(/\*\*Prompt[:\*]*\*\*\s*\n*```[\w]*\n([\s\S]*?)```/gi);

    for (const promptMatch of promptMatches) {
      let prompt = cleanPrompt(promptMatch[1]);

      // Handle JSON prompts - extract the raw text or stringify
      if (prompt.trim().startsWith('{')) {
        try {
          const jsonPrompt = JSON.parse(prompt);
          // Use the description field if available, otherwise stringify
          prompt = jsonPrompt.description || JSON.stringify(jsonPrompt, null, 2);
        } catch (e) {
          // Keep as-is if not valid JSON
        }
      }

      // Skip if prompt is too short or primarily in Asian language
      if (prompt.length > 30 && !shouldSkipPrompt(prompt)) {
        // Extract author from source line
        const authorMatch = sectionContent.match(/Source[:\s]*\[@?([\w_]+)\]/i) ||
                           sectionContent.match(/\*Source[:\s]*\[@?([\w_]+)\]/i);
        const author = authorMatch ? authorMatch[1] : source.owner;

        // Extract source link
        const sourceLinkMatch = sectionContent.match(/Source[:\s]*\[.*?\]\((https?:\/\/[^\)]+)\)/i) ||
                                sectionContent.match(/\*Source[:\s]*\[.*?\]\((https?:\/\/[^\)]+)\)/i);
        const sourceLink = sourceLinkMatch ? sourceLinkMatch[1] : `https://github.com/${source.owner}/${source.repo}`;

        // Extract ALL image URLs from the section
        const allImages = extractAllImages(sectionContent);

        // Determine source (input) and result (output) images
        // Usually: first image is source/reference, last image is result
        // Or if only one image, it's the result
        let sourceImageUrl = '';
        let resultImageUrl = '';

        if (allImages.length === 1) {
          resultImageUrl = allImages[0];
        } else if (allImages.length >= 2) {
          // First is typically the source/reference, last is the result
          sourceImageUrl = allImages[0];
          resultImageUrl = allImages[allImages.length - 1];
        }

        const title = extractTitle(sectionTitle, prompt, sectionNumber);

        cases.push({
          caseId: generateCaseId(prompt),
          title,
          prompt,
          author,
          authorUrl: author.startsWith('@') ? `https://x.com/${author.substring(1)}` : `https://github.com/${author}`,
          sourceRepo: `${source.owner}/${source.repo}`,
          sourceUrl: sourceLink,
          geminiImageUrl: resultImageUrl,
          gpt4oImageUrl: sourceImageUrl, // Repurposing this field for source/reference image
          referenceRequired: detectReferenceRequired(prompt),
          referenceNote: detectReferenceRequired(prompt) ? 'Upload a reference image to use this prompt' : '',
          tags: extractTags(prompt),
          category: detectCategory(prompt),
          scrapedAt: new Date().toISOString().split('T')[0],
        });
      }
    }
  }

  // Strategy 3: Fallback - extract any code blocks that look like prompts
  if (cases.length === 0) {
    const codeBlockPattern = /```(?:text|prompt)?\n([\s\S]*?)```/g;
    let blockNum = 0;

    while ((match = codeBlockPattern.exec(markdown)) !== null) {
      const prompt = cleanPrompt(match[1]);
      blockNum++;

      // Filter: must be long enough, look like a prompt (not code), and be in English
      if (prompt.length > 50 &&
          !prompt.includes('function ') &&
          !prompt.includes('const ') &&
          !prompt.includes('import ') &&
          !prompt.includes('npm ') &&
          !shouldSkipPrompt(prompt)) {

        cases.push({
          caseId: generateCaseId(prompt),
          title: extractTitle('', prompt, blockNum),
          prompt,
          author: source.owner,
          authorUrl: `https://github.com/${source.owner}`,
          sourceRepo: `${source.owner}/${source.repo}`,
          sourceUrl: `https://github.com/${source.owner}/${source.repo}`,
          geminiImageUrl: '',
          referenceRequired: detectReferenceRequired(prompt),
          referenceNote: detectReferenceRequired(prompt) ? 'Upload a reference image to use this prompt' : '',
          tags: extractTags(prompt),
          category: detectCategory(prompt),
          scrapedAt: new Date().toISOString().split('T')[0],
        });
      }
    }
  }

  return cases;
}

// ============================================================================
// Airtable Operations
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
      console.error('Failed to fetch existing cases:', await response.text());
      break;
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
  const created = [];

  // Batch in groups of 10
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
      console.error(`  ✗ Batch ${Math.floor(i/10) + 1} failed:`, err.error?.message || 'Unknown error');
    } else {
      const data = await response.json();
      created.push(...data.records.map(r => r.id));
      console.log(`  ✓ Created batch ${Math.floor(i/10) + 1} (${batch.length} records)`);
    }

    // Rate limiting
    if (i + 10 < cases.length) {
      await new Promise(r => setTimeout(r, 250));
    }
  }

  return created;
}

// ============================================================================
// Main Script
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const repoIndex = args.indexOf('--repo');
  const specificRepo = repoIndex !== -1 ? args[repoIndex + 1] : null;

  console.log('');
  console.log('🍌 NanoBanana GitHub Scraper');
  console.log('============================');
  console.log('');

  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    console.error('❌ Missing environment variables:');
    console.error('   VITE_AIRTABLE_API_KEY and VITE_AIRTABLE_BASE_ID are required');
    process.exit(1);
  }

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made to Airtable\n');
  }

  // Determine repos to scrape
  let repos = DEFAULT_REPOS;
  if (specificRepo) {
    const [owner, repo] = specificRepo.split('/');
    if (!owner || !repo) {
      console.error('❌ Invalid repo format. Use: owner/repo');
      process.exit(1);
    }
    repos = [{ owner, repo }];
    console.log(`📂 Scraping single repo: ${specificRepo}\n`);
  } else {
    console.log(`📂 Scraping ${repos.length} repositories\n`);
  }

  // Fetch existing case IDs for deduplication
  let existingIds = new Set();
  if (!dryRun) {
    console.log('📊 Fetching existing cases from Airtable...');
    existingIds = await fetchExistingCaseIds();
    console.log(`   Found ${existingIds.size} existing cases\n`);
  }

  // Scrape each repository
  const allCases = [];
  const stats = { repos: 0, total: 0, new: 0, skipped: 0 };

  for (const source of repos) {
    console.log(`📥 Scraping ${source.owner}/${source.repo}...`);

    try {
      const { content } = await fetchReadme(source.owner, source.repo);
      const cases = parseMarkdown(content, source);

      console.log(`   Found ${cases.length} prompts`);

      // Filter: only keep cases with images and that aren't duplicates
      const withImages = cases.filter(c => c.geminiImageUrl);
      const noImages = cases.length - withImages.length;
      if (noImages > 0) {
        console.log(`   Skipping ${noImages} without images`);
      }

      const newCases = withImages.filter(c => !existingIds.has(c.caseId));
      const duplicates = withImages.length - newCases.length;

      if (duplicates > 0) {
        console.log(`   Skipping ${duplicates} duplicates`);
      }

      allCases.push(...newCases);
      stats.repos++;
      stats.total += withImages.length;
      stats.new += newCases.length;
      stats.skipped += duplicates;

    } catch (error) {
      console.error(`   ✗ Error: ${error.message}`);
    }

    console.log('');
  }

  // Summary
  console.log('📈 Summary');
  console.log('----------');
  console.log(`   Repositories scraped: ${stats.repos}`);
  console.log(`   Total prompts found:  ${stats.total}`);
  console.log(`   New prompts:          ${stats.new}`);
  console.log(`   Duplicates skipped:   ${stats.skipped}`);
  console.log('');

  // Save to Airtable
  if (dryRun) {
    // Count how many have images
    const withImages = allCases.filter(c => c.geminiImageUrl).length;
    console.log(`🖼️  Prompts with images: ${withImages}/${allCases.length}\n`);

    console.log('🔍 Dry run complete. Sample of new prompts:\n');
    allCases.slice(0, 5).forEach((c, i) => {
      console.log(`--- Prompt ${i + 1} ---`);
      console.log(`Title: ${c.title}`);
      console.log(`Author: ${c.author}`);
      console.log(`Category: ${c.category}`);
      console.log(`Tags: ${c.tags.join(', ')}`);
      console.log(`Image: ${c.geminiImageUrl ? c.geminiImageUrl.substring(0, 60) + '...' : '(none)'}`);
      console.log(`Prompt: ${c.prompt.substring(0, 100)}...`);
      console.log('');
    });
  } else if (allCases.length > 0) {
    console.log(`💾 Saving ${allCases.length} new prompts to Airtable...`);
    const created = await createCases(allCases);
    console.log(`\n✅ Successfully created ${created.length} records`);
  } else {
    console.log('✨ No new prompts to add - database is up to date!');
  }

  console.log('');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
