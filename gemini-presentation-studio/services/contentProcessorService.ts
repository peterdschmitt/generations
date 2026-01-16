// Content Processor Service
// LLM-powered extraction, summarization, and content generation

import { GoogleGenAI, Type } from "@google/genai";
import {
  TalkingPointCategory,
  VisualPotential,
  TargetChannel,
  CFTalkingPoint,
  CFSource,
  ScopingAnswers,
  ToneSettings,
  ContentStyleSettings,
  VisualOpportunity,
  PLATFORM_CONFIGS
} from '../types/contentFlow';

// =============================================================================
// Client Setup
// =============================================================================

const getAiClient = () => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// =============================================================================
// Types
// =============================================================================

export interface ExtractedTalkingPoint {
  content: string;
  category: TalkingPointCategory;
  visualPotential: VisualPotential;
  rawStatistic?: string;           // Original stat for graphics
  confidence: 'high' | 'medium' | 'low';
  suggestedVisualFormat?: string;  // Specific visualization suggestion
}

export interface ScopingQuestion {
  id: string;
  question: string;
  placeholder?: string;
  required: boolean;
  type?: 'text' | 'select' | 'multi-select' | 'slider';
  options?: { value: string; label: string }[];
}

export interface GeneratedDraft {
  channel: TargetChannel;
  content: string;
  visualPrompts: string[];
  visualOpportunities: VisualOpportunity[];
  hooks: string[];                 // Alternative opening options
  closings: string[];              // Alternative closing options
  keyStatistics: string[];         // Stats formatted for graphics
}

export interface ContentAnalysis {
  statistics: ExtractedStatistic[];
  quotes: ExtractedQuote[];
  processes: ExtractedProcess[];
  comparisons: ExtractedComparison[];
  visualOpportunities: VisualOpportunity[];
}

export interface ExtractedStatistic {
  value: string;
  context: string;
  source: string;
  visualizable: boolean;
  suggestedChartType?: 'bar' | 'pie' | 'line' | 'number-highlight' | 'comparison';
}

export interface ExtractedQuote {
  text: string;
  speaker: string;
  context: string;
  impactful: boolean;
}

export interface ExtractedProcess {
  title: string;
  steps: string[];
  visualizable: boolean;
}

export interface ExtractedComparison {
  items: string[];
  criteria: string[];
  data: Record<string, Record<string, string>>;
  visualizable: boolean;
}

// =============================================================================
// Summarization
// =============================================================================

export const summarizeSource = async (
  content: string,
  title: string
): Promise<string> => {
  const ai = getAiClient();

  const prompt = `Summarize the following content from "${title}" in 2-3 sentences. Focus on the key insights, facts, or arguments presented.

Content:
${content.substring(0, 10000)}

Summary:`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts: [{ text: prompt }] }
  });

  return response.text?.trim() || '';
};

// =============================================================================
// Enhanced Talking Point Extraction
// =============================================================================

export const extractTalkingPoints = async (
  content: string,
  sourceTitle: string,
  topic: string
): Promise<ExtractedTalkingPoint[]> => {
  const ai = getAiClient();

  const prompt = `You are an expert content analyst specializing in extracting high-value talking points for social media and content marketing.

RESEARCH TOPIC: "${topic}"
SOURCE: "${sourceTitle}"

CONTENT TO ANALYZE:
${content.substring(0, 15000)}

YOUR TASK: Extract 5-12 distinct, high-quality talking points. Prioritize:

1. **STATISTICS & DATA** (HIGHEST PRIORITY)
   - Specific numbers, percentages, growth rates
   - Survey results, research findings
   - Comparisons with numerical data
   - Trends with quantifiable measures
   - For each statistic: include the raw data formatted for creating graphics

2. **EXPERT QUOTES & INSIGHTS**
   - Direct quotes from named experts
   - Authoritative opinions with attribution
   - Surprising or counterintuitive claims

3. **PROCESSES & FRAMEWORKS**
   - Step-by-step methodologies
   - Best practices with clear steps
   - Frameworks or models mentioned

4. **COMPARISONS & CONTRASTS**
   - Before/after scenarios
   - Option A vs Option B analysis
   - Industry comparisons

5. **UNIQUE OPINIONS & PERSPECTIVES**
   - Contrarian viewpoints
   - Predictions and forecasts
   - Analysis that adds new insight

For EACH talking point provide:
- content: The insight (150-250 words, detailed enough to be useful)
- category: "statistic" | "quote" | "process" | "opinion" | "comparison"
- visualPotential: "infographic" | "chart" | "howto" | "diagram" | "none"
- rawStatistic: If category is "statistic", include JUST the number/percentage for graphic use (e.g., "73%", "$4.2M", "3x increase")
- confidence: "high" (directly stated), "medium" (clearly implied), "low" (interpretation)
- suggestedVisualFormat: Specific visual type (e.g., "bar chart comparing X and Y", "pie chart showing distribution", "numbered list infographic")

BE AGGRESSIVE about finding statistics - content creators need quantitative data for engaging visuals.

Return as JSON with structure: { "talkingPoints": [...] }`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [{ text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            talkingPoints: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  content: { type: Type.STRING },
                  category: { type: Type.STRING },
                  visualPotential: { type: Type.STRING },
                  rawStatistic: { type: Type.STRING },
                  confidence: { type: Type.STRING },
                  suggestedVisualFormat: { type: Type.STRING }
                },
                required: ["content", "category", "visualPotential"]
              }
            }
          }
        }
      }
    });

    const result = JSON.parse(response.text || '{}');

    if (result.talkingPoints && Array.isArray(result.talkingPoints)) {
      return result.talkingPoints.map((tp: any) => ({
        content: tp.content || '',
        category: validateCategory(tp.category),
        visualPotential: validateVisualPotential(tp.visualPotential),
        rawStatistic: tp.rawStatistic || undefined,
        confidence: validateConfidence(tp.confidence),
        suggestedVisualFormat: tp.suggestedVisualFormat || undefined
      }));
    }

    return [];
  } catch (error) {
    console.error('Talking point extraction error:', error);
    return [];
  }
};

// =============================================================================
// Deep Content Analysis
// =============================================================================

export const analyzeContentForVisuals = async (
  content: string,
  topic: string
): Promise<VisualOpportunity[]> => {
  const ai = getAiClient();

  const prompt = `You are a data visualization expert analyzing content to identify opportunities for compelling graphics.

TOPIC: "${topic}"

CONTENT:
${content.substring(0, 12000)}

Identify ALL opportunities for visual content. For each opportunity:

1. What TYPE of visual would work?
   - statistic: Single powerful number/percentage
   - comparison: Side-by-side comparison
   - timeline: Chronological progression
   - process: Step-by-step flow
   - hierarchy: Ranked list or pyramid
   - relationship: How elements connect

2. What FORMAT would be most effective?
   - bar-chart: Comparing quantities
   - pie-chart: Showing parts of whole
   - line-graph: Trends over time
   - infographic: Mixed visual summary
   - flowchart: Process or decision tree
   - comparison-table: Feature/option comparison
   - icon-grid: List with visual icons

3. What DATA POINTS to include? (Be specific - extract actual numbers!)

4. Priority: high (will significantly boost engagement), medium (adds value), low (nice to have)

Return as JSON: { "visualOpportunities": [...] }`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [{ text: prompt }] },
      config: {
        responseMimeType: "application/json"
      }
    });

    const result = JSON.parse(response.text || '{}');
    return result.visualOpportunities || [];
  } catch (error) {
    console.error('Visual analysis error:', error);
    return [];
  }
};

// =============================================================================
// Enhanced Scoping Questions
// =============================================================================

export const generateScopingQuestions = async (
  topic: string,
  sourcesSummary: string
): Promise<ScopingQuestion[]> => {
  return [
    {
      id: 'audience',
      question: 'Who is your target audience?',
      placeholder: 'e.g., Marketing professionals, beginners in the field, C-suite executives',
      required: true,
      type: 'text'
    },
    {
      id: 'angle',
      question: 'What angle or perspective should the content take?',
      placeholder: 'e.g., Practical tips, thought leadership, case study analysis',
      required: true,
      type: 'text'
    },
    {
      id: 'formality',
      question: 'How formal should the content be?',
      type: 'select',
      required: true,
      options: [
        { value: 'casual', label: 'Casual - Friendly, relaxed' },
        { value: 'conversational', label: 'Conversational - Professional but approachable' },
        { value: 'professional', label: 'Professional - Business appropriate' },
        { value: 'academic', label: 'Academic - Formal, scholarly' }
      ]
    },
    {
      id: 'energy',
      question: 'What energy level should the content have?',
      type: 'select',
      required: true,
      options: [
        { value: 'calm', label: 'Calm - Measured, thoughtful' },
        { value: 'balanced', label: 'Balanced - Engaged but not pushy' },
        { value: 'energetic', label: 'Energetic - Enthusiastic, motivating' },
        { value: 'provocative', label: 'Provocative - Bold, challenging' }
      ]
    },
    {
      id: 'personality',
      question: 'What personality should come through?',
      type: 'select',
      required: true,
      options: [
        { value: 'authoritative', label: 'Authoritative - Expert, confident' },
        { value: 'friendly', label: 'Friendly - Warm, supportive' },
        { value: 'witty', label: 'Witty - Clever, engaging' },
        { value: 'empathetic', label: 'Empathetic - Understanding, relatable' },
        { value: 'inspirational', label: 'Inspirational - Motivating, uplifting' }
      ]
    },
    {
      id: 'hookStyle',
      question: 'How should the content open?',
      type: 'select',
      required: false,
      options: [
        { value: 'question', label: 'Question - Engage with a thought-provoking question' },
        { value: 'statistic', label: 'Statistic - Lead with a surprising number' },
        { value: 'story', label: 'Story - Open with a brief anecdote' },
        { value: 'bold-claim', label: 'Bold Claim - Make a strong statement' },
        { value: 'contrast', label: 'Contrast - Set up a before/after or problem/solution' }
      ]
    },
    {
      id: 'closingStyle',
      question: 'How should the content close?',
      type: 'select',
      required: false,
      options: [
        { value: 'cta', label: 'Call to Action - Direct next step' },
        { value: 'question', label: 'Question - End with reflection prompt' },
        { value: 'summary', label: 'Summary - Recap key points' },
        { value: 'future-look', label: 'Future Look - What\'s next in this space' },
        { value: 'personal-note', label: 'Personal Note - Share your take' }
      ]
    },
    {
      id: 'useEmojis',
      question: 'Include emojis?',
      type: 'select',
      required: false,
      options: [
        { value: 'yes', label: 'Yes - Add relevant emojis' },
        { value: 'no', label: 'No - Keep it emoji-free' },
        { value: 'minimal', label: 'Minimal - Only for emphasis' }
      ]
    },
    {
      id: 'keyPoints',
      question: 'Are there specific points you want to emphasize?',
      placeholder: 'e.g., Cost savings, efficiency gains, industry trends',
      required: false,
      type: 'text'
    },
    {
      id: 'callToAction',
      question: 'What action do you want readers to take?',
      placeholder: 'e.g., Sign up for newsletter, book a demo, share the post',
      required: false,
      type: 'text'
    }
  ];
};

// =============================================================================
// Enhanced Content Generation
// =============================================================================

export const generateDraft = async (
  channel: TargetChannel,
  topic: string,
  talkingPoints: CFTalkingPoint[],
  scopingAnswers: ScopingAnswers,
  sources: CFSource[]
): Promise<GeneratedDraft> => {
  const ai = getAiClient();
  const config = PLATFORM_CONFIGS[channel];

  // Build talking points with statistics highlighted
  const statisticsPoints = talkingPoints.filter(tp => tp.selected && tp.category === 'statistic');
  const otherPoints = talkingPoints.filter(tp => tp.selected && tp.category !== 'statistic');

  const tpContent = talkingPoints
    .filter(tp => tp.selected)
    .map((tp, i) => {
      let entry = `${i + 1}. [${tp.category.toUpperCase()}] ${tp.content}`;
      if (tp.category === 'statistic') {
        entry += '\n   📊 KEY STAT - prioritize for visual impact';
      }
      return entry;
    })
    .join('\n\n');

  // Build sources attribution
  const sourceAttribution = sources
    .filter(s => s.selected)
    .map(s => `- ${s.title}: ${s.url}`)
    .join('\n');

  // Build tone instructions
  const toneInstructions = buildToneInstructions(scopingAnswers);
  const styleInstructions = buildStyleInstructions(scopingAnswers, channel);

  const prompt = `You are an expert content creator specializing in ${config.label} content that drives engagement.

TOPIC: ${topic}

═══════════════════════════════════════════════════════════════
TARGET AUDIENCE
═══════════════════════════════════════════════════════════════
${scopingAnswers.audience || 'General professional audience'}

═══════════════════════════════════════════════════════════════
CONTENT ANGLE
═══════════════════════════════════════════════════════════════
${scopingAnswers.angle || 'Informative and practical'}

═══════════════════════════════════════════════════════════════
TONE & VOICE
═══════════════════════════════════════════════════════════════
${toneInstructions}

═══════════════════════════════════════════════════════════════
STRUCTURE & STYLE
═══════════════════════════════════════════════════════════════
${styleInstructions}

═══════════════════════════════════════════════════════════════
TALKING POINTS TO INCORPORATE
═══════════════════════════════════════════════════════════════
${tpContent}

${statisticsPoints.length > 0 ? `
⭐ KEY STATISTICS TO HIGHLIGHT:
${statisticsPoints.map(tp => `• ${tp.content}`).join('\n')}
` : ''}

═══════════════════════════════════════════════════════════════
PLATFORM REQUIREMENTS
═══════════════════════════════════════════════════════════════
- Platform: ${config.label}
- Maximum length: ${config.maxLength} ${channel === 'blog' || channel === 'newsletter' ? 'words' : 'characters'}
- Citation style: ${config.citationStyle}

═══════════════════════════════════════════════════════════════
SOURCES FOR ATTRIBUTION
═══════════════════════════════════════════════════════════════
${sourceAttribution}

═══════════════════════════════════════════════════════════════
YOUR TASK
═══════════════════════════════════════════════════════════════

Create a compelling ${config.label} post that:

1. **OPENS STRONG**: Use the specified hook style to immediately grab attention
   ${getHookGuidance(scopingAnswers)}

2. **BODY STRUCTURE**:
   - Lead with your strongest point (usually a statistic if available)
   - Use bullet points or numbered lists for scanability
   - Each paragraph should deliver clear value
   - Statistics should be formatted to stand out
   ${channel === 'linkedin' ? '- Use line breaks for readability on mobile' : ''}

3. **INCLUDE STATISTICS PROMINENTLY**:
   - Format key numbers to pop (e.g., "📊 73% of...")
   - Provide brief context for each stat
   - These will be used for accompanying graphics

4. **CLOSES EFFECTIVELY**: End with the specified closing style
   ${getClosingGuidance(scopingAnswers)}

5. **ATTRIBUTION**: Include proper source attribution using ${config.citationStyle} style

${scopingAnswers.callToAction ? `CALL TO ACTION: ${scopingAnswers.callToAction}` : ''}

Return ONLY the final content, properly formatted for ${config.label}.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [{ text: prompt }] }
    });

    const content = response.text?.trim() || '';

    // Generate alternative hooks
    const hooks = await generateAlternativeHooks(topic, talkingPoints, scopingAnswers, channel);

    // Generate alternative closings
    const closings = await generateAlternativeClosings(topic, talkingPoints, scopingAnswers, channel);

    // Generate visual prompts for talking points marked for visuals
    const visualPrompts = await generateVisualPrompts(
      talkingPoints.filter(tp => tp.useForVisual),
      topic
    );

    // Analyze for visual opportunities
    const visualOpportunities = await analyzeContentForVisuals(content, topic);

    // Extract key statistics for graphics
    const keyStatistics = statisticsPoints.map(tp => tp.content);

    return {
      channel,
      content,
      visualPrompts,
      visualOpportunities,
      hooks,
      closings,
      keyStatistics
    };
  } catch (error) {
    console.error('Draft generation error:', error);
    throw error;
  }
};

// =============================================================================
// Alternative Hooks & Closings
// =============================================================================

const generateAlternativeHooks = async (
  topic: string,
  talkingPoints: CFTalkingPoint[],
  scopingAnswers: ScopingAnswers,
  channel: TargetChannel
): Promise<string[]> => {
  const ai = getAiClient();
  const stats = talkingPoints.filter(tp => tp.category === 'statistic').slice(0, 3);

  const prompt = `Generate 4 different opening hooks for a ${channel} post about "${topic}".

Available statistics to use:
${stats.map(s => `- ${s.content}`).join('\n')}

Create hooks in these styles:
1. QUESTION - A thought-provoking question
2. STATISTIC - Lead with a surprising number
3. BOLD CLAIM - A strong, attention-grabbing statement
4. STORY/SCENARIO - Brief relatable situation

Each hook should be 1-2 sentences max. Return as JSON: { "hooks": ["...", "...", "...", "..."] }`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [{ text: prompt }] },
      config: { responseMimeType: "application/json" }
    });

    const result = JSON.parse(response.text || '{}');
    return result.hooks || [];
  } catch (error) {
    console.error('Hook generation error:', error);
    return [];
  }
};

const generateAlternativeClosings = async (
  topic: string,
  talkingPoints: CFTalkingPoint[],
  scopingAnswers: ScopingAnswers,
  channel: TargetChannel
): Promise<string[]> => {
  const ai = getAiClient();

  const prompt = `Generate 4 different closing statements for a ${channel} post about "${topic}".

CTA (if any): ${scopingAnswers.callToAction || 'None specified'}

Create closings in these styles:
1. CALL TO ACTION - Direct next step
2. QUESTION - Reflection prompt for engagement
3. SUMMARY - Quick recap of key value
4. FORWARD-LOOKING - What this means for the future

Each closing should be 1-2 sentences max. Return as JSON: { "closings": ["...", "...", "...", "..."] }`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [{ text: prompt }] },
      config: { responseMimeType: "application/json" }
    });

    const result = JSON.parse(response.text || '{}');
    return result.closings || [];
  } catch (error) {
    console.error('Closing generation error:', error);
    return [];
  }
};

// =============================================================================
// Visual Prompt Generation
// =============================================================================

export const generateVisualPrompts = async (
  talkingPoints: CFTalkingPoint[],
  topic: string
): Promise<string[]> => {
  if (talkingPoints.length === 0) return [];

  const ai = getAiClient();
  const prompts: string[] = [];

  for (const tp of talkingPoints.slice(0, 3)) {
    const templateMap: Record<VisualPotential, string> = {
      infographic: `Create a modern, clean infographic visualizing: ${tp.content}
Style: Flat design, bold typography, data-forward layout
Topic context: ${topic}
Include accurate text labels and clear visual hierarchy.
Use a professional color palette suitable for social media.`,

      chart: `Create a professional data visualization chart showing: ${tp.content}
Style: Clean business chart, clear labels, professional color palette
Make the data easy to understand at a glance.
Include a clear title and data labels.`,

      howto: `Create a step-by-step visual guide for: ${tp.content}
Style: Numbered steps, clear icons, minimal text
Layout: Horizontal flow or vertical stack with clear progression.
Use consistent iconography throughout.`,

      diagram: `Create a diagram illustrating: ${tp.content}
Style: Clean lines, clear relationships, professional appearance
Show connections and flow clearly.
Use color coding to differentiate elements.`,

      none: ''
    };

    const visualPrompt = templateMap[tp.visualPotential];
    if (visualPrompt) {
      prompts.push(visualPrompt);
    }
  }

  return prompts;
};

// =============================================================================
// Content Revision
// =============================================================================

export const reviseDraft = async (
  currentContent: string,
  feedback: string,
  channel: TargetChannel,
  scopingAnswers?: ScopingAnswers
): Promise<string> => {
  const ai = getAiClient();
  const config = PLATFORM_CONFIGS[channel];

  const toneInstructions = scopingAnswers ? buildToneInstructions(scopingAnswers) : config.tone;

  const prompt = `You are revising a ${config.label} post based on user feedback.

CURRENT CONTENT:
${currentContent}

USER FEEDBACK:
${feedback}

TONE & VOICE TO MAINTAIN:
${toneInstructions}

PLATFORM REQUIREMENTS:
- Maximum length: ${config.maxLength} ${channel === 'blog' || channel === 'newsletter' ? 'words' : 'characters'}

Instructions:
1. Address the specific feedback
2. Maintain the established tone and voice
3. Keep statistics and key points prominent
4. Ensure proper formatting for ${config.label}

Return only the revised content.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [{ text: prompt }] }
    });

    return response.text?.trim() || currentContent;
  } catch (error) {
    console.error('Revision error:', error);
    throw error;
  }
};

// =============================================================================
// Helper Functions
// =============================================================================

const buildToneInstructions = (scopingAnswers: ScopingAnswers): string => {
  const tone = scopingAnswers.tone as ToneSettings | string | undefined;

  if (typeof tone === 'object' && tone !== null) {
    return `
- Formality: ${tone.formality || 'professional'}
- Energy: ${tone.energy || 'balanced'}
- Personality: ${tone.personality || 'authoritative'}
- Perspective: ${tone.perspective || 'second-person'}`;
  }

  // Handle legacy string format or defaults
  const toneString = typeof tone === 'string' ? tone : 'professional';
  const formality = (scopingAnswers as any).formality || 'professional';
  const energy = (scopingAnswers as any).energy || 'balanced';
  const personality = (scopingAnswers as any).personality || 'authoritative';

  return `
- Formality: ${formality}
- Energy: ${energy}
- Personality: ${personality}
- Overall tone: ${toneString}`;
};

const buildStyleInstructions = (scopingAnswers: ScopingAnswers, channel: TargetChannel): string => {
  const style = scopingAnswers.contentStyle;
  const useEmojis = (scopingAnswers as any).useEmojis;

  let instructions = '';

  if (useEmojis === 'yes') {
    instructions += '- Include relevant emojis to add visual interest\n';
  } else if (useEmojis === 'minimal') {
    instructions += '- Use emojis sparingly, only for key emphasis\n';
  } else {
    instructions += '- Avoid emojis\n';
  }

  instructions += '- Use bullet points for lists of 3+ items\n';
  instructions += '- Keep paragraphs short (2-3 sentences max for social)\n';

  if (channel === 'linkedin' || channel === 'twitter') {
    instructions += '- Use line breaks generously for mobile readability\n';
  }

  if (channel === 'blog' || channel === 'newsletter') {
    instructions += '- Use subheadings to organize content\n';
    instructions += '- Include a clear introduction and conclusion\n';
  }

  return instructions;
};

const getHookGuidance = (scopingAnswers: ScopingAnswers): string => {
  const hookStyle = (scopingAnswers as any).hookStyle || 'statistic';

  const guidance: Record<string, string> = {
    'question': 'Open with a thought-provoking question that makes readers reflect',
    'statistic': 'Lead with your most surprising or impactful statistic',
    'story': 'Start with a brief, relatable scenario or anecdote',
    'bold-claim': 'Open with a strong, attention-grabbing statement',
    'contrast': 'Set up a compelling before/after or problem/solution contrast'
  };

  return guidance[hookStyle] || guidance['statistic'];
};

const getClosingGuidance = (scopingAnswers: ScopingAnswers): string => {
  const closingStyle = (scopingAnswers as any).closingStyle || 'cta';

  const guidance: Record<string, string> = {
    'cta': 'End with a clear, specific call to action',
    'question': 'Close with a question that encourages comments/engagement',
    'summary': 'Wrap up with a quick recap of the key takeaway',
    'future-look': 'End by looking ahead - what this means for the future',
    'personal-note': 'Close with a brief personal reflection or opinion'
  };

  return guidance[closingStyle] || guidance['cta'];
};

const validateCategory = (category: string): TalkingPointCategory => {
  const valid: TalkingPointCategory[] = ['statistic', 'quote', 'process', 'opinion', 'comparison'];
  const normalized = category?.toLowerCase() as TalkingPointCategory;
  return valid.includes(normalized) ? normalized : 'quote';
};

const validateVisualPotential = (visual: string): VisualPotential => {
  const valid: VisualPotential[] = ['infographic', 'chart', 'howto', 'diagram', 'none'];
  const normalized = visual?.toLowerCase() as VisualPotential;
  return valid.includes(normalized) ? normalized : 'none';
};

const validateConfidence = (confidence: string): 'high' | 'medium' | 'low' => {
  const valid = ['high', 'medium', 'low'];
  const normalized = confidence?.toLowerCase();
  return valid.includes(normalized) ? normalized as 'high' | 'medium' | 'low' : 'medium';
};

// =============================================================================
// Batch Processing
// =============================================================================

export const processSourceBatch = async (
  sources: CFSource[],
  topic: string,
  onProgress?: (current: number, total: number, sourceTitle: string) => void
): Promise<Map<string, ExtractedTalkingPoint[]>> => {
  const results = new Map<string, ExtractedTalkingPoint[]>();

  for (let i = 0; i < sources.length; i++) {
    const source = sources[i];

    if (onProgress) {
      onProgress(i + 1, sources.length, source.title);
    }

    if (source.scrapedContent && source.scrapedContent.length > 100) {
      try {
        const points = await extractTalkingPoints(
          source.scrapedContent,
          source.title,
          topic
        );
        results.set(source.id, points);
      } catch (error) {
        console.error(`Failed to process source ${source.title}:`, error);
        results.set(source.id, []);
      }

      // Rate limiting - wait between API calls
      await new Promise(r => setTimeout(r, 500));
    } else {
      results.set(source.id, []);
    }
  }

  return results;
};

// Generate drafts for multiple channels
export const generateDraftsForChannels = async (
  channels: TargetChannel[],
  topic: string,
  talkingPoints: CFTalkingPoint[],
  scopingAnswers: ScopingAnswers,
  sources: CFSource[],
  onProgress?: (channel: TargetChannel) => void
): Promise<GeneratedDraft[]> => {
  const drafts: GeneratedDraft[] = [];

  for (const channel of channels) {
    if (onProgress) {
      onProgress(channel);
    }

    try {
      const draft = await generateDraft(
        channel,
        topic,
        talkingPoints,
        scopingAnswers,
        sources
      );
      drafts.push(draft);
    } catch (error) {
      console.error(`Failed to generate draft for ${channel}:`, error);
    }

    // Rate limiting
    await new Promise(r => setTimeout(r, 1000));
  }

  return drafts;
};
