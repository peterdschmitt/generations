# ContentFlow - Technical Design Document (TDD)

---

## 1. Architecture Overview

### 1.1 System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Gemini Presentation Studio                    │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │  Research   │→│   Curate    │→│    Draft    │→│   Export    │ │
│  │    Tab      │  │    Tab      │  │    Tab      │  │    Tab      │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘ │
│         │                │                │                │        │
│         ▼                ▼                ▼                ▼        │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    Service Layer                              │  │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐  │  │
│  │  │ contentFlow  │ │  research    │ │ contentProcessor     │  │  │
│  │  │ Service      │ │  Service     │ │ Service              │  │  │
│  │  └──────┬───────┘ └──────┬───────┘ └──────────┬───────────┘  │  │
│  └─────────┼────────────────┼────────────────────┼──────────────┘  │
│            │                │                    │                  │
├────────────┼────────────────┼────────────────────┼──────────────────┤
│            ▼                ▼                    ▼                  │
│  ┌──────────────┐  ┌──────────────┐      ┌──────────────┐          │
│  │   Airtable   │  │  Perplexity  │      │    Gemini    │          │
│  │     API      │  │     API      │      │     API      │          │
│  └──────────────┘  └──────────────┘      └──────────────┘          │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | React 18 + TypeScript | UI framework |
| Styling | Tailwind CSS | Component styling |
| State | React hooks (useState, useEffect) | Local state management |
| Database | Airtable REST API | Persistent storage |
| Search | Perplexity Sonar API | Source discovery |
| AI Generation | Gemini API | Content & image generation |
| Build | Vite | Development & bundling |

---

## 2. File Structure

```
src/
├── components/
│   ├── ContentFlowResearchTab.tsx    # Research tab UI
│   ├── ContentFlowCurateTab.tsx      # Curation tab UI
│   ├── ContentFlowDraftTab.tsx       # Draft generation UI
│   ├── ContentFlowExportTab.tsx      # Export & comparison UI
│   ├── Icon.tsx                      # SVG icon component
│   └── Spinner.tsx                   # Loading indicator
│
├── services/
│   ├── contentFlowService.ts         # Airtable CRUD for ContentFlow
│   ├── contentProcessorService.ts    # AI content extraction & generation
│   ├── researchService.ts            # Perplexity & DuckDuckGo search
│   ├── geminiService.ts              # Image generation
│   └── airtableService.ts            # Base Airtable utilities
│
├── types/
│   └── contentFlow.ts                # TypeScript interfaces & constants
│
└── App.tsx                           # Main app with tab routing
```

---

## 3. Data Models

### 3.1 TypeScript Interfaces

```typescript
// types/contentFlow.ts

// =============================================================================
// Enums
// =============================================================================

export type ProjectStatus = 'discovery' | 'scoping' | 'drafting' | 'review' | 'published';
export type TargetChannel = 'linkedin' | 'blog' | 'twitter' | 'newsletter' | 'meta';
export type SourceType = 'reddit' | 'youtube' | 'article' | 'academic' | 'official';
export type DiscoveryMethod = 'auto_discovery' | 'find_more' | 'manual_add';
export type TalkingPointCategory = 'statistic' | 'quote' | 'process' | 'opinion' | 'comparison';
export type VisualPotential = 'infographic' | 'chart' | 'howto' | 'diagram' | 'none';
export type OutputStatus = 'draft' | 'review' | 'approved' | 'exported';

// =============================================================================
// Core Entities
// =============================================================================

export interface CFProject {
  id: string;                          // Airtable record ID
  name: string;                        // Auto-generated project name
  topic: string;                       // User-provided research topic
  status: ProjectStatus;               // Workflow state
  targetChannels: TargetChannel[];     // Selected output platforms
  scopingAnswers?: ScopingAnswers;     // Q&A responses (parsed from JSON)
  createdAt: string;                   // ISO timestamp
}

export interface ScopingAnswers {
  audience?: string;
  angle?: string;
  tone?: ToneSettings;
  keyPoints?: string[];
  avoidPoints?: string[];
  callToAction?: string;
  contentStyle?: ContentStyleSettings;
}

export interface ToneSettings {
  formality: 'casual' | 'conversational' | 'professional' | 'academic';
  energy: 'calm' | 'balanced' | 'energetic' | 'provocative';
  personality: 'authoritative' | 'friendly' | 'witty' | 'empathetic' | 'inspirational';
  perspective: 'first-person' | 'second-person' | 'third-person';
}

export interface ContentStyleSettings {
  useEmojis: boolean;
  useBulletPoints: boolean;
  useNumberedLists: boolean;
  includeQuestions: boolean;
  hookStyle: 'question' | 'statistic' | 'story' | 'bold-claim' | 'contrast';
  closingStyle: 'cta' | 'question' | 'summary' | 'future-look' | 'personal-note';
}

export interface CFSource {
  id: string;
  projectId: string;
  url: string;
  title: string;
  sourceType: SourceType;
  weight: number;                      // 1-5 priority
  selected: boolean;
  scrapedContent?: string;
  summary?: string;
  discoveryMethod: DiscoveryMethod;
  scrapedAt?: string;
}

export interface CFTalkingPoint {
  id: string;
  projectId: string;
  sourceId: string;
  content: string;
  category: TalkingPointCategory;
  visualPotential: VisualPotential;
  selected: boolean;
  useForVisual: boolean;
  sourceTitle?: string;                // Derived
  sourceUrl?: string;                  // Derived
}

export interface CFOutput {
  id: string;
  projectId: string;
  channel: TargetChannel;
  draftContent: string;
  version: number;
  visualAssets?: VisualAsset[];
  visualPrompts?: string[];
  userFeedback?: string;
  status: OutputStatus;
}

export interface VisualAsset {
  id: string;
  url: string;
  filename?: string;
  thumbnailUrl?: string;
}

export interface VisualOpportunity {
  type: 'statistic' | 'comparison' | 'timeline' | 'process' | 'hierarchy' | 'relationship';
  description: string;
  suggestedFormat: 'bar-chart' | 'pie-chart' | 'line-graph' | 'infographic' | 'flowchart' | 'comparison-table' | 'icon-grid';
  dataPoints: string[];
  priority: 'high' | 'medium' | 'low';
}
```

### 3.2 Platform Configuration

```typescript
export const PLATFORM_CONFIGS: Record<TargetChannel, PlatformConfig> = {
  linkedin: {
    channel: 'linkedin',
    label: 'LinkedIn',
    maxLength: 1300,
    citationStyle: 'footnotes',
    imageDimensions: { width: 1200, height: 1200 },
    tone: 'Professional, authoritative',
    icon: 'linkedin'
  },
  blog: {
    channel: 'blog',
    label: 'Blog Post',
    maxLength: 1500,  // words
    citationStyle: 'inline',
    imageDimensions: { width: 1200, height: 630 },
    tone: 'Educational, SEO-aware',
    icon: 'file-text'
  },
  twitter: {
    channel: 'twitter',
    label: 'Twitter/X',
    maxLength: 280,
    citationStyle: 'thread',
    imageDimensions: { width: 1200, height: 675 },
    tone: 'Punchy, hook-driven',
    icon: 'twitter'
  },
  newsletter: {
    channel: 'newsletter',
    label: 'Newsletter',
    maxLength: 1000,  // words
    citationStyle: 'inline',
    imageDimensions: { width: 600, height: 400 },
    tone: 'Personal, conversational',
    icon: 'mail'
  },
  meta: {
    channel: 'meta',
    label: 'Meta/Instagram',
    maxLength: 500,
    citationStyle: 'comment',
    imageDimensions: { width: 1080, height: 1080 },
    tone: 'Casual, visual-first',
    icon: 'instagram'
  }
};
```

---

## 4. Airtable Schema

### 4.1 Table Mapping

| TypeScript Field | Airtable Field | Type |
|------------------|----------------|------|
| **Projects Table** | | |
| topic | topic | Long Text |
| status | status | Single Select |
| targetChannels | target_channels | Multiple Select |
| scopingAnswers | scoping_answers | Long Text (JSON) |
| createdAt | created_at | Created Time |
| **Sources Table** | | |
| projectId | project | Link to Projects |
| url | url | URL |
| title | title | Single Line Text |
| sourceType | source_type | Single Select |
| weight | weight | Number |
| selected | selected | Checkbox |
| scrapedContent | scraped_content | Long Text |
| summary | summary | Long Text |
| discoveryMethod | discovery_method | Single Select |
| **TalkingPoints Table** | | |
| projectId | project | Link to Projects |
| sourceId | source | Link to Sources |
| content | content | Long Text |
| category | category | Single Select |
| visualPotential | visual_potential | Single Select |
| selected | selected | Checkbox |
| useForVisual | use_for_visual | Checkbox |
| **Outputs Table** | | |
| projectId | project | Link to Projects |
| channel | channel | Single Select |
| draftContent | draft_content | Long Text |
| version | version | Number |
| visualAssets | visual_assets | Attachment |
| visualPrompts | visual_prompts | Long Text (JSON) |
| userFeedback | user_feedback | Long Text |
| status | status | Single Select |

### 4.2 Airtable API Patterns

```typescript
// Batch create (max 10 records)
const payload = {
  records: items.map(item => ({
    fields: {
      'project': [projectId],  // Linked records are arrays
      'content': item.content,
      'selected': true
    }
  })),
  typecast: true  // Auto-create select options
};

// Rate limiting
for (let i = 0; i < items.length; i += 10) {
  const batch = items.slice(i, i + 10);
  await airtableRequest(config, TABLE, 'POST', undefined, { records: batch, typecast: true });
  if (i + 10 < items.length) {
    await new Promise(r => setTimeout(r, 250));  // 4 req/sec
  }
}
```

---

## 5. Service Layer

### 5.1 ContentFlow Service (`contentFlowService.ts`)

Primary CRUD operations for all ContentFlow tables.

```typescript
// Key Functions
export const fetchProjects = async (config: AirtableConfig): Promise<CFProject[]>
export const createProject = async (config, topic, channels): Promise<CFProject>
export const updateProjectStatus = async (config, projectId, status): Promise<CFProject>
export const updateProjectScoping = async (config, projectId, scopingAnswers): Promise<CFProject>

export const fetchSourcesForProject = async (config, projectId): Promise<CFSource[]>
export const createSource = async (config, projectId, url, title, sourceType, discoveryMethod): Promise<CFSource>
export const updateSource = async (config, sourceId, updates): Promise<CFSource>
export const createSourcesBatch = async (config, projectId, sources): Promise<CFSource[]>

export const fetchTalkingPointsForProject = async (config, projectId): Promise<CFTalkingPoint[]>
export const createTalkingPoint = async (config, projectId, sourceId, content, category, visualPotential): Promise<CFTalkingPoint>
export const updateTalkingPoint = async (config, pointId, updates): Promise<CFTalkingPoint>
export const createTalkingPointsBatch = async (config, projectId, sourceId, points): Promise<CFTalkingPoint[]>

export const fetchOutputsForProject = async (config, projectId): Promise<CFOutput[]>
export const createOutput = async (config, projectId, channel, draftContent, visualPrompts): Promise<CFOutput>
export const updateOutput = async (config, outputId, updates): Promise<CFOutput>
```

### 5.2 Research Service (`researchService.ts`)

Source discovery via Perplexity and fallback APIs.

```typescript
// Perplexity Search (Primary)
export const searchWithPerplexity = async (query: string, maxResults: number = 10): Promise<DiscoveredSource[]>

// DuckDuckGo Fallback
export const searchWeb = async (query: string, maxResults: number = 10): Promise<DiscoveredSource[]>

// Reddit Search
export const searchReddit = async (query: string, maxResults: number = 5): Promise<DiscoveredSource[]>

// Query Expansion
export const expandSearchQueries = async (topic: string): Promise<string[]>

// Helper Functions
const detectSourceType = (url: string): SourceType
const extractTitleFromUrl = (url: string): string
```

**Perplexity API Configuration:**
```typescript
const response = await fetch('https://api.perplexity.ai/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'sonar',
    messages: [
      { role: 'system', content: 'You are a research assistant...' },
      { role: 'user', content: `Find the best sources about: ${query}` }
    ],
    return_citations: true,
    search_recency_filter: 'month'
  })
});
```

### 5.3 Content Processor Service (`contentProcessorService.ts`)

AI-powered content extraction and generation.

```typescript
// Talking Point Extraction
export const extractTalkingPoints = async (
  content: string,
  sourceTitle: string
): Promise<ExtractedTalkingPoint[]>

// Scoping Questions Generation
export const generateScopingQuestions = (): ScopingQuestion[]

// Draft Generation
export const generateDraft = async (
  channel: TargetChannel,
  topic: string,
  talkingPoints: CFTalkingPoint[],
  scopingAnswers: ScopingAnswers
): Promise<GeneratedDraft>

// Alternative Generation
export const generateAlternativeHooks = async (content: string, count: number): Promise<string[]>
export const generateAlternativeClosings = async (content: string, count: number): Promise<string[]>
```

**Extraction Prompt Template:**
```typescript
const extractionPrompt = `
Analyze the following content and extract 5-12 key talking points.
For each point, classify:
- Category: statistic | quote | process | opinion | comparison
- Visual Potential: infographic | chart | howto | diagram | none

PRIORITIZE statistics and quantitative data.
Look for percentages, growth rates, comparisons, and numerical trends.

Content:
${content}

Return JSON array with: content, category, visualPotential, confidence (0-1)
`;
```

---

## 6. Component Architecture

### 6.1 ContentFlowResearchTab

**State:**
```typescript
const [projects, setProjects] = useState<CFProject[]>([]);
const [selectedProject, setSelectedProject] = useState<CFProject | null>(null);
const [sources, setSources] = useState<CFSource[]>([]);
const [topic, setTopic] = useState('');
const [isDiscovering, setIsDiscovering] = useState(false);
```

**Key Handlers:**
- `handleCreateProject()` - Creates project, triggers discovery
- `handleDiscover()` - Calls Perplexity API, creates sources
- `handleAddManualSource()` - Adds URL as new source
- `handleSourceToggle()` - Optimistic update with rollback

### 6.2 ContentFlowCurateTab

**State:**
```typescript
const [sources, setSources] = useState<CFSource[]>([]);
const [talkingPoints, setTalkingPoints] = useState<CFTalkingPoint[]>([]);
const [scopingAnswers, setScopingAnswers] = useState<ScopingAnswers>({});
const [activeSection, setActiveSection] = useState<'sources' | 'points' | 'scoping'>('sources');
const [filterCategory, setFilterCategory] = useState<TalkingPointCategory | 'all'>('all');
```

**Key Handlers:**
- `handleExtractTalkingPoints()` - Calls AI extraction for selected sources
- `handlePointToggle()` - Toggle talking point selection
- `handleVisualToggle()` - Toggle "use for visual" flag
- `handleSaveScoping()` - Persist scoping answers to project

### 6.3 ContentFlowDraftTab

**State:**
```typescript
const [outputs, setOutputs] = useState<CFOutput[]>([]);
const [selectedOutputId, setSelectedOutputId] = useState<string | null>(null);
const [generatedVisuals, setGeneratedVisuals] = useState<Map<string, string>>(new Map());
const [isGenerating, setIsGenerating] = useState(false);
const [isGeneratingVisuals, setIsGeneratingVisuals] = useState(false);
```

**Key Handlers:**
- `handleGenerateDrafts()` - Generate content for all/selected channels
- `handleSaveDraft()` - Update draft content in Airtable
- `handleGenerateVisuals()` - Call Gemini API for each visual prompt

### 6.4 ContentFlowExportTab

**State:**
```typescript
const [outputs, setOutputs] = useState<CFOutput[]>([]);
const [selectedChannels, setSelectedChannels] = useState<Set<TargetChannel>>(new Set());
const [viewMode, setViewMode] = useState<'grid' | 'compare'>('grid');
```

**Key Handlers:**
- `handleStatusChange()` - Update output status
- `handleCopyContent()` - Copy to clipboard
- `handleExportAll()` - Generate Markdown file
- `handleExportJSON()` - Generate JSON file

**ImageCarousel Component:**
```typescript
interface ImageCarouselProps {
  images: VisualAsset[];
  onImageClick?: (image: VisualAsset) => void;
}

const ImageCarousel: React.FC<ImageCarouselProps> = ({ images, onImageClick }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Navigation functions
  const goToPrevious = () => setCurrentIndex(prev => (prev === 0 ? images.length - 1 : prev - 1));
  const goToNext = () => setCurrentIndex(prev => (prev === images.length - 1 ? 0 : prev + 1));

  // Render: Main image, arrows, counter, thumbnail strip, "Open full size" link
};
```

---

## 7. API Integration

### 7.1 Airtable API

| Property | Value |
|----------|-------|
| Base URL | `https://api.airtable.com/v0/{BASE_ID}/{TABLE_NAME}` |
| Authentication | `Authorization: Bearer {API_KEY}` |
| Rate Limit | 5 requests/second |
| Batch Size | 10 records max per request |
| Linked Records | Always arrays: `[recordId]` |

### 7.2 Perplexity API

| Property | Value |
|----------|-------|
| Endpoint | `https://api.perplexity.ai/chat/completions` |
| Model | `sonar` (search-optimized) |
| Features | `return_citations: true` |
| Recency | `search_recency_filter: 'month'` |

### 7.3 Gemini API

| Property | Value |
|----------|-------|
| Model | `gemini-2.0-flash-exp` |
| Features | Image generation via `generateContent` |
| Response | Base64 image data |

---

## 8. Error Handling

### 8.1 Optimistic Updates Pattern

```typescript
const handleToggle = async (id: string) => {
  const item = items.find(i => i.id === id);
  if (!item) return;

  const newValue = !item.selected;

  // Optimistic update
  setItems(prev => prev.map(i => i.id === id ? { ...i, selected: newValue } : i));

  try {
    await updateItem(config, id, { selected: newValue });
  } catch (e: any) {
    // Rollback on error
    setItems(prev => prev.map(i => i.id === id ? { ...i, selected: !newValue } : i));
    setError(`Failed to update: ${e.message}`);
  }
};
```

### 8.2 API Error Handling

```typescript
const airtableRequest = async (config, table, method, recordId?, payload?, queryParams?) => {
  const response = await fetch(url, options);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error?.message || `HTTP ${response.status}`;
    throw new Error(`Airtable error: ${errorMessage}`);
  }

  return response.json();
};
```

---

## 9. Performance Optimizations

### 9.1 Batch Operations

- Airtable creates/updates batched in groups of 10
- 250ms delay between batches (4 req/sec)
- Client-side filtering for linked record queries

### 9.2 Lazy Loading

- Projects loaded on tab mount
- Sources/TalkingPoints loaded when project selected
- Outputs loaded when entering Draft/Export tabs

### 9.3 Memoization

```typescript
const filteredPoints = useMemo(() => {
  return talkingPoints.filter(tp => {
    if (filterCategory !== 'all' && tp.category !== filterCategory) return false;
    if (showOnlySelected && !tp.selected) return false;
    return true;
  });
}, [talkingPoints, filterCategory, showOnlySelected]);
```

---

## 10. Testing Strategy

### 10.1 Unit Tests

- Service function tests with mocked API responses
- Utility function tests (category detection, URL parsing)
- Component rendering tests

### 10.2 Integration Tests

- Full workflow: Research → Curate → Draft → Export
- API integration with test Airtable base
- Error scenario handling

### 10.3 E2E Tests

- Complete user flows with Cypress/Playwright
- Visual regression testing for Export tab

---

## 11. Deployment Considerations

### 11.1 Environment Variables

```bash
VITE_AIRTABLE_API_KEY=pat...
VITE_AIRTABLE_BASE_ID=app...
VITE_PERPLEXITY_API_KEY=pplx-...
VITE_GEMINI_API_KEY=AIza...
```

### 11.2 Build Configuration

```typescript
// vite.config.ts
export default defineConfig({
  define: {
    'process.env': {}
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'contentflow': [
            './src/components/ContentFlowResearchTab',
            './src/components/ContentFlowCurateTab',
            './src/components/ContentFlowDraftTab',
            './src/components/ContentFlowExportTab',
            './src/services/contentFlowService',
            './src/services/contentProcessorService',
            './src/services/researchService'
          ]
        }
      }
    }
  }
});
```

---

## 12. Security Considerations

### 12.1 API Key Protection

- All API keys stored in environment variables
- Keys not committed to version control
- Server-side proxy recommended for production

### 12.2 Input Validation

- URL validation before source creation
- Content length validation for drafts
- XSS prevention in rendered content

### 12.3 CORS

- Airtable API: CORS-enabled
- Perplexity API: CORS-enabled
- Gemini API: CORS-enabled

---

## 13. Monitoring & Logging

### 13.1 Console Logging

```typescript
console.log(`Perplexity found ${sources.length} sources for "${query}"`);
console.error('Failed to extract talking points:', error);
```

### 13.2 Error Reporting

- UI error toasts with dismissable messages
- API error details captured in catch blocks
- Rate limit warnings logged

---

## 14. Future Technical Improvements

### Phase 2
- WebSocket for real-time collaboration
- Service Worker for offline support
- IndexedDB for local caching

### Phase 3
- GraphQL API layer
- Redis caching for API responses
- Kubernetes deployment with auto-scaling

---

*Document Version: 1.0*
*Last Updated: November 2024*
