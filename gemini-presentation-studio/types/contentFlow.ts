// ContentFlow TypeScript Types
// Aligned with Airtable schema in docs/ContentFlow_AirtableSchema.md

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
  audience?: string;                   // Target audience description
  angle?: string;                      // Content angle/perspective
  tone?: ToneSettings;                 // Detailed tone controls
  keyPoints?: string[];                // Points to emphasize
  avoidPoints?: string[];              // Points to avoid
  callToAction?: string;               // Desired CTA
  contentStyle?: ContentStyleSettings; // Structure preferences
}

// Detailed tone controls
export interface ToneSettings {
  formality: 'casual' | 'conversational' | 'professional' | 'academic';
  energy: 'calm' | 'balanced' | 'energetic' | 'provocative';
  personality: 'authoritative' | 'friendly' | 'witty' | 'empathetic' | 'inspirational';
  perspective: 'first-person' | 'second-person' | 'third-person';
}

// Content structure preferences
export interface ContentStyleSettings {
  useEmojis: boolean;
  useBulletPoints: boolean;
  useNumberedLists: boolean;
  includeQuestions: boolean;           // Rhetorical questions
  hookStyle: 'question' | 'statistic' | 'story' | 'bold-claim' | 'contrast';
  closingStyle: 'cta' | 'question' | 'summary' | 'future-look' | 'personal-note';
}

// Visual opportunity detection
export interface VisualOpportunity {
  type: 'statistic' | 'comparison' | 'timeline' | 'process' | 'hierarchy' | 'relationship';
  description: string;
  suggestedFormat: 'bar-chart' | 'pie-chart' | 'line-graph' | 'infographic' | 'flowchart' | 'comparison-table' | 'icon-grid';
  dataPoints: string[];                // Raw data to visualize
  priority: 'high' | 'medium' | 'low';
}

export interface CFSource {
  id: string;                          // Airtable record ID
  projectId: string;                   // Link to CF_Projects
  url: string;                         // Original source URL
  title: string;                       // Source title/headline
  sourceType: SourceType;              // reddit | youtube | article | etc.
  weight: number;                      // 1-5 priority weighting
  selected: boolean;                   // Include in content generation
  scrapedContent?: string;             // Full extracted text
  summary?: string;                    // AI-generated summary
  discoveryMethod: DiscoveryMethod;    // How source was found
  scrapedAt?: string;                  // ISO timestamp
  // Derived/computed
  talkingPointCount?: number;          // Number of extracted points
}

export interface CFTalkingPoint {
  id: string;                          // Airtable record ID
  projectId: string;                   // Link to CF_Projects
  sourceId: string;                    // Link to CF_Sources
  content: string;                     // The extracted insight/fact/quote
  category: TalkingPointCategory;      // statistic | quote | process | etc.
  visualPotential: VisualPotential;    // infographic | chart | none | etc.
  selected: boolean;                   // Include in final content
  useForVisual: boolean;               // Flag for visual generation
  // Derived/joined
  sourceTitle?: string;                // Source title for display
  sourceUrl?: string;                  // Source URL for attribution
}

export interface CFOutput {
  id: string;                          // Airtable record ID
  projectId: string;                   // Link to CF_Projects
  channel: TargetChannel;              // linkedin | blog | twitter | etc.
  draftContent: string;                // Platform-formatted content
  version: number;                     // Draft iteration number
  visualAssets?: VisualAsset[];        // Nanobanana Pro images
  visualPrompts?: string[];            // Prompts used for generation
  userFeedback?: string;               // Edit requests
  status: OutputStatus;                // draft | review | approved | exported
}

export interface VisualAsset {
  id: string;
  url: string;
  filename?: string;
  thumbnailUrl?: string;
}

// =============================================================================
// API Request/Response Types
// =============================================================================

export interface CreateProjectRequest {
  topic: string;
  targetChannels: TargetChannel[];
  autoDiscover?: boolean;
}

export interface DiscoverSourcesRequest {
  projectId: string;
  query?: string;                      // Optional refinement query
  sourceTypes?: SourceType[];          // Filter by source type
  maxResults?: number;                 // Limit results (default: 10)
}

export interface AddSourceRequest {
  projectId: string;
  url: string;
  sourceType?: SourceType;             // Auto-detect if not provided
}

export interface GenerateContentRequest {
  projectId: string;
  channels: TargetChannel[];
  generateVisuals?: boolean;
  visualStyle?: string;                // e.g., "modern infographic"
}

export interface ReviseOutputRequest {
  outputId: string;
  feedback: string;
  regenerateVisuals?: boolean;
}

// =============================================================================
// UI State Types
// =============================================================================

export interface ContentFlowState {
  // Current project context
  currentProject: CFProject | null;
  projects: CFProject[];

  // Sources
  sources: CFSource[];
  selectedSourceIds: Set<string>;

  // Talking Points
  talkingPoints: CFTalkingPoint[];
  selectedTalkingPointIds: Set<string>;

  // Outputs
  outputs: CFOutput[];
  selectedOutputId: string | null;

  // UI State
  isLoading: boolean;
  isDiscovering: boolean;
  isGenerating: boolean;
  error: string | null;
}

export interface ContentFlowUIState {
  activeView: 'research' | 'curate' | 'draft';
  expandedSourceId: string | null;
  filterCategory: TalkingPointCategory | null;
  filterVisualPotential: VisualPotential | null;
  showOnlySelected: boolean;
}

// =============================================================================
// Platform Configuration
// =============================================================================

export interface PlatformConfig {
  channel: TargetChannel;
  label: string;
  maxLength: number;                   // Character/word limit
  citationStyle: 'footnotes' | 'inline' | 'thread' | 'comment';
  imageDimensions: { width: number; height: number };
  tone: string;
  icon: string;                        // Lucide icon name
}

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
    maxLength: 1500, // words, not chars
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
    maxLength: 1000, // words
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

// =============================================================================
// Category Styling
// =============================================================================

export interface CategoryStyle {
  bgClass: string;
  borderClass: string;
  textClass: string;
  label: string;
}

export const CATEGORY_STYLES: Record<TalkingPointCategory, CategoryStyle> = {
  statistic: {
    bgClass: 'bg-emerald-50',
    borderClass: 'border-emerald-200',
    textClass: 'text-emerald-700',
    label: 'Statistic'
  },
  quote: {
    bgClass: 'bg-sky-50',
    borderClass: 'border-sky-200',
    textClass: 'text-sky-700',
    label: 'Quote'
  },
  process: {
    bgClass: 'bg-amber-50',
    borderClass: 'border-amber-200',
    textClass: 'text-amber-700',
    label: 'Process'
  },
  opinion: {
    bgClass: 'bg-violet-50',
    borderClass: 'border-violet-200',
    textClass: 'text-violet-700',
    label: 'Opinion'
  },
  comparison: {
    bgClass: 'bg-rose-50',
    borderClass: 'border-rose-200',
    textClass: 'text-rose-700',
    label: 'Comparison'
  }
};

export const VISUAL_POTENTIAL_LABELS: Record<VisualPotential, string> = {
  infographic: 'Infographic',
  chart: 'Chart',
  howto: 'How-To',
  diagram: 'Diagram',
  none: 'None'
};
