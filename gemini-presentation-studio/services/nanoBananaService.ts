// NanoBanana Airtable Service
// Handles CRUD operations for the NanoBanana prompt library

import {
  NanoBananaCase,
  NanoBananaCaseInput,
  NanoBananaCategory,
  GitHubSource,
  CATEGORY_KEYWORDS,
  TAG_KEYWORDS
} from '../types/nanobanana';

const TABLE_NAME = 'NanoBanana';

export interface NanoBananaConfig {
  apiKey: string;
  baseId: string;
}

// Fetch all cases from Airtable
export async function fetchNanoBananaCases(config: NanoBananaConfig): Promise<NanoBananaCase[]> {
  const allRecords: NanoBananaCase[] = [];
  let offset: string | undefined;

  do {
    const url = new URL(`https://api.airtable.com/v0/${config.baseId}/${encodeURIComponent(TABLE_NAME)}`);
    url.searchParams.set('pageSize', '100');
    if (offset) url.searchParams.set('offset', offset);

    const response = await fetch(url.toString(), {
      headers: { 'Authorization': `Bearer ${config.apiKey}` }
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(`Airtable Error: ${err.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const records = data.records.map(mapRecordToCase);
    allRecords.push(...records);
    offset = data.offset;
  } while (offset);

  return allRecords.sort((a, b) => (b.caseNumber || 0) - (a.caseNumber || 0));
}

// Create multiple cases in Airtable (with batching)
export async function createNanoBananaCases(
  config: NanoBananaConfig,
  cases: NanoBananaCaseInput[]
): Promise<string[]> {
  const createdIds: string[] = [];

  // Batch in groups of 10 (Airtable limit)
  for (let i = 0; i < cases.length; i += 10) {
    const batch = cases.slice(i, i + 10);

    const response = await fetch(
      `https://api.airtable.com/v0/${config.baseId}/${encodeURIComponent(TABLE_NAME)}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          records: batch.map(c => ({ fields: mapCaseToFields(c) })),
          typecast: true
        })
      }
    );

    if (!response.ok) {
      const err = await response.json();
      throw new Error(`Airtable Error: ${err.error?.message || response.statusText}`);
    }

    const data = await response.json();
    createdIds.push(...data.records.map((r: any) => r.id));

    // Rate limit: 5 req/sec - wait 250ms between batches
    if (i + 10 < cases.length) {
      await new Promise(r => setTimeout(r, 250));
    }
  }

  return createdIds;
}

// Check if a case already exists by Case ID
export async function findExistingCaseIds(
  config: NanoBananaConfig,
  caseIds: string[]
): Promise<Set<string>> {
  const existingIds = new Set<string>();

  // Fetch in batches using filterByFormula
  for (let i = 0; i < caseIds.length; i += 100) {
    const batch = caseIds.slice(i, i + 100);
    const formula = `OR(${batch.map(id => `{Case ID}='${id}'`).join(',')})`;

    const url = new URL(`https://api.airtable.com/v0/${config.baseId}/${encodeURIComponent(TABLE_NAME)}`);
    url.searchParams.set('filterByFormula', formula);
    url.searchParams.set('fields[]', 'Case ID');

    const response = await fetch(url.toString(), {
      headers: { 'Authorization': `Bearer ${config.apiKey}` }
    });

    if (response.ok) {
      const data = await response.json();
      data.records.forEach((r: any) => {
        if (r.fields['Case ID']) {
          existingIds.add(r.fields['Case ID']);
        }
      });
    }

    // Rate limiting
    if (i + 100 < caseIds.length) {
      await new Promise(r => setTimeout(r, 250));
    }
  }

  return existingIds;
}

// Upsert cases - only create new ones, skip existing
export async function upsertNanoBananaCases(
  config: NanoBananaConfig,
  cases: NanoBananaCaseInput[]
): Promise<{ created: number; skipped: number }> {
  if (cases.length === 0) return { created: 0, skipped: 0 };

  // Find existing case IDs
  const caseIds = cases.map(c => c.caseId);
  const existingIds = await findExistingCaseIds(config, caseIds);

  // Filter to only new cases
  const newCases = cases.filter(c => !existingIds.has(c.caseId));

  if (newCases.length > 0) {
    await createNanoBananaCases(config, newCases);
  }

  return {
    created: newCases.length,
    skipped: cases.length - newCases.length
  };
}

// Delete a case by Airtable record ID
export async function deleteNanoBananaCase(
  config: NanoBananaConfig,
  recordId: string
): Promise<void> {
  const response = await fetch(
    `https://api.airtable.com/v0/${config.baseId}/${encodeURIComponent(TABLE_NAME)}/${recordId}`,
    {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${config.apiKey}` }
    }
  );

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`Airtable Error: ${err.error?.message || response.statusText}`);
  }
}

// Map Airtable record to NanoBananaCase
function mapRecordToCase(record: any): NanoBananaCase {
  const f = record.fields;

  // Parse tags from comma-separated string
  const tagsRaw = f['Tags'] || '';
  const tags = tagsRaw ? tagsRaw.split(',').map((t: string) => t.trim()).filter(Boolean) : [];

  return {
    id: record.id,
    caseId: f['Case ID'] || '',
    caseNumber: f['Case Number'] || 0,
    title: f['Title (EN)'] || f['Title'] || '',
    prompt: f['Prompt (EN)'] || f['Prompt'] || '',
    author: f['Author'] || '',
    authorUrl: f['Author URL'] || '',
    sourceRepo: f['Source Repo'] || '',
    sourceUrl: f['Source URL'] || '',
    geminiImageUrl: f['Gemini Image URL'] || '',
    gpt4oImageUrl: f['GPT-4o Image URL'] || '',
    geminiImage: f['Gemini Image']?.[0]?.url || '',
    gpt4oImage: f['GPT-4o Image']?.[0]?.url || '',
    referenceRequired: f['Reference Required'] || false,
    referenceNote: f['Reference Note'] || '',
    tags,
    category: f['Category'] || 'General',
    scrapedAt: f['Scraped At'] || '',
    favorite: f['Favorite'] || false
  };
}

// Toggle favorite status for a case
export async function toggleFavorite(
  config: NanoBananaConfig,
  recordId: string,
  favorite: boolean
): Promise<void> {
  const response = await fetch(
    `https://api.airtable.com/v0/${config.baseId}/${encodeURIComponent(TABLE_NAME)}/${recordId}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: { 'Favorite': favorite }
      })
    }
  );

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`Airtable Error: ${err.error?.message || response.statusText}`);
  }
}

// Map NanoBananaCaseInput to Airtable fields
function mapCaseToFields(c: NanoBananaCaseInput): Record<string, any> {
  return {
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
    'Scraped At': c.scrapedAt
  };
}

// Utility: Generate MD5 hash for Case ID (browser-compatible)
export async function generateCaseId(prompt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(prompt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  // Use first 32 chars (like MD5 length) for shorter IDs
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
}

// Utility: Detect category from prompt text
export function detectCategory(prompt: string): NanoBananaCategory {
  const lower = prompt.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.length === 0) continue; // Skip 'General'
    if (keywords.some(keyword => lower.includes(keyword))) {
      return category as NanoBananaCategory;
    }
  }

  return 'General';
}

// Utility: Extract tags from prompt text
export function extractTags(prompt: string): string[] {
  const tags: string[] = [];
  const lower = prompt.toLowerCase();

  for (const [keyword, tag] of Object.entries(TAG_KEYWORDS)) {
    if (lower.includes(keyword) && !tags.includes(tag)) {
      tags.push(tag);
    }
  }

  return tags.slice(0, 5); // Limit to 5 tags
}

// Utility: Detect if reference image is required
export function detectReferenceRequired(prompt: string): { required: boolean; note: string } {
  const lower = prompt.toLowerCase();
  const refKeywords = [
    'uploaded', 'attached', 'reference', 'your photo', 'your image',
    'image 1', 'image 2', 'the image', 'this image', 'source image',
    'input image', 'original image', 'provided image', 'given image'
  ];

  const required = refKeywords.some(k => lower.includes(k));
  const note = required ? 'Upload a reference image to use this prompt' : '';

  return { required, note };
}
