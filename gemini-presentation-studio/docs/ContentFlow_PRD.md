# ContentFlow - AI-Powered Content Pipeline

## Product Requirements Document (PRD)

---

## 1. Executive Summary

ContentFlow is an AI-powered content creation pipeline integrated into Gemini Presentation Studio. It enables users to research topics, curate source material, generate platform-specific content drafts, and export polished multi-channel content—all from a single unified interface.

**Target Users:** Marketing professionals, content creators, thought leaders, and social media managers who need to create consistent, research-backed content across multiple platforms.

**Core Value Proposition:** Transform any topic into publication-ready content for LinkedIn, Twitter/X, blogs, newsletters, and Meta/Instagram with AI-assisted research, curation, and generation.

---

## 2. Problem Statement

Content creators face several challenges:
1. **Research Fragmentation** - Gathering sources from multiple platforms is time-consuming
2. **Inconsistent Quality** - Manual content adaptation across platforms leads to inconsistency
3. **Visual Integration** - Creating supporting graphics is a separate, disconnected workflow
4. **Version Control** - Managing drafts and revisions across channels is error-prone
5. **Export Friction** - Copying content to each platform requires manual formatting

---

## 3. Solution Overview

ContentFlow provides a 4-tab workflow:

| Tab | Purpose | Key Actions |
|-----|---------|-------------|
| **Research** | Discover and collect sources | Topic input, auto-discovery via Perplexity, manual URL addition |
| **Curate** | Select and weight content | Source selection, talking point extraction, tone configuration |
| **Draft** | Generate platform content | AI content generation, visual prompts, iterative editing |
| **Export** | Review and publish | Side-by-side comparison, image carousel, export to Markdown/JSON |

---

## 4. Feature Requirements

### 4.1 Research Tab

#### 4.1.1 Project Management
- Create new projects with topic and target channels
- Select from 5 target channels: LinkedIn, Blog, Twitter/X, Newsletter, Meta/Instagram
- View and switch between existing projects
- Project status tracking: `discovery → scoping → drafting → review → published`

#### 4.1.2 Source Discovery
- **Auto-Discovery**: Perplexity AI search with automatic citation extraction
- **Manual Addition**: Paste any URL to add as a source
- **Source Types**: Article, Reddit, YouTube, Academic, Official
- **Source Metadata**: Title, URL, type, discovery method, scrape timestamp

#### 4.1.3 Source Selection
- Checkbox selection for each source (include/exclude)
- Optimistic UI updates with error rollback
- Source count badge per project
- Filter by source type

### 4.2 Curate Tab

#### 4.2.1 Source Review
- Expandable source cards showing:
  - Title and URL (clickable)
  - Source type badge
  - Selection checkbox
  - Weight slider (1-5 priority)
  - Summary preview

#### 4.2.2 Talking Points Extraction
- AI-powered extraction of 5-12 talking points per source
- Categorization: `statistic | quote | process | opinion | comparison`
- Visual potential tagging: `infographic | chart | howto | diagram | none`
- Per-point selection and visual flagging

#### 4.2.3 Scoping Configuration
- **Tone Settings**:
  - Formality: casual → conversational → professional → academic
  - Energy: calm → balanced → energetic → provocative
  - Personality: authoritative, friendly, witty, empathetic, inspirational
  - Perspective: first-person, second-person, third-person
- **Content Style**:
  - Use emojis (boolean)
  - Use bullet points (boolean)
  - Use numbered lists (boolean)
  - Include rhetorical questions (boolean)
  - Hook style: question, statistic, story, bold-claim, contrast
  - Closing style: CTA, question, summary, future-look, personal-note

#### 4.2.4 Navigation
- Section tabs: Sources | Talking Points | Scoping
- Continue to Draft button

### 4.3 Draft Tab

#### 4.3.1 Content Generation
- Generate button per channel or all channels
- Platform-optimized content respecting character limits:
  - LinkedIn: 1,300 chars
  - Twitter/X: 280 chars
  - Blog: 1,500 words
  - Newsletter: 1,000 words
  - Meta/Instagram: 500 chars
- Draft versioning (increment on regeneration)

#### 4.3.2 Content Editor
- Inline editing of generated drafts
- Save with feedback for AI revision
- Status management: `draft → review → approved → exported`

#### 4.3.3 Visual Opportunities Panel
- **Key Statistics**: Extracted stats with copy buttons
- **Visual Prompts**: AI-generated image prompts for each output
- **Chart Data Points**: Data suitable for visualization
- Copy prompt button for Image Studio integration
- "Generate All Visuals" button using Gemini

#### 4.3.4 Navigation
- Back to Curate button
- View All Outputs button (to Export tab)

### 4.4 Export Tab

#### 4.4.1 View Modes
- **Grid View**: 2-column card layout with all channels
- **Compare View**: Side-by-side column comparison

#### 4.4.2 Channel Cards
- Platform icon and label
- Version number
- Status dropdown (draft/review/approved/exported)
- **Image Carousel** (if visual assets exist):
  - Main image display
  - Left/right navigation arrows
  - Image counter (e.g., "1 / 3")
  - Thumbnail strip
  - "Open full size" link
- Content preview (scrollable)
- Character count and image count
- Copy button

#### 4.4.3 Export Options
- **Export Markdown**: All channels with image links in MD format
- **Export JSON**: Structured data including:
  - Project metadata
  - All outputs with content, status, version
  - Visual prompts array
  - Image URLs (url, filename, thumbnail)

#### 4.4.4 Summary Statistics
- Total outputs count
- In Review count
- Approved count
- Exported count

---

## 5. User Flows

### 5.1 New Content Project Flow

```
1. User clicks "Research" tab
2. User enters topic (e.g., "AI trends in healthcare 2024")
3. User selects target channels (LinkedIn, Blog, Twitter)
4. User clicks "Start Discovery"
5. System searches via Perplexity, displays sources
6. User selects/deselects sources
7. User clicks "Continue to Curate"
8. System extracts talking points
9. User selects talking points, configures tone
10. User clicks "Continue to Draft"
11. User clicks "Generate All Drafts"
12. System generates platform-specific content
13. User reviews, edits, approves drafts
14. User clicks "View All Outputs"
15. User reviews in Export tab
16. User exports to JSON or copies individual posts
```

### 5.2 Visual Generation Flow

```
1. User is in Draft tab with generated content
2. User views "Visual Opportunities" panel
3. User sees AI-generated visual prompts
4. User clicks "Copy Prompt" to use in Image Studio
   OR
5. User clicks "Generate All Visuals"
6. System generates images via Gemini
7. Generated images appear in Visual Prompts section
8. Images are attached to output in Airtable
9. User navigates to Export tab
10. Images appear in carousel on each channel card
```

---

## 6. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Time to First Draft | < 5 minutes | From topic input to generated drafts |
| Sources Discovered | 5-10 per search | Perplexity citation extraction |
| Talking Points Extracted | 5-12 per source | AI extraction quality |
| Platform Adoption | 3+ channels per project | Average channels selected |
| Visual Generation Rate | > 50% projects | Projects with visual assets |
| Export Completion | > 80% | Projects reaching "exported" status |

---

## 7. Platform Configurations

| Platform | Max Length | Citation Style | Image Dimensions | Default Tone |
|----------|------------|----------------|------------------|--------------|
| LinkedIn | 1,300 chars | Footnotes | 1200x1200 | Professional, authoritative |
| Blog | 1,500 words | Inline | 1200x630 | Educational, SEO-aware |
| Twitter/X | 280 chars | Thread | 1200x675 | Punchy, hook-driven |
| Newsletter | 1,000 words | Inline | 600x400 | Personal, conversational |
| Meta/Instagram | 500 chars | Comment | 1080x1080 | Casual, visual-first |

---

## 8. Non-Functional Requirements

### 8.1 Performance
- Source discovery: < 10 seconds
- Talking point extraction: < 15 seconds per source
- Draft generation: < 30 seconds per channel
- Visual generation: < 60 seconds per image

### 8.2 Reliability
- Optimistic UI updates with error rollback
- Airtable batch operations (10 records max)
- Rate limiting: 5 requests/second to Airtable
- Perplexity fallback to DuckDuckGo if API fails

### 8.3 Data Persistence
- All data stored in Airtable
- JSON serialization for complex fields (scopingAnswers, visualPrompts)
- Linked records between tables

### 8.4 Security
- API keys stored in environment variables
- No sensitive data in client logs
- CORS-compliant API calls

---

## 9. Future Enhancements

### Phase 2
- Direct publishing to platforms via API (LinkedIn, Twitter)
- A/B testing of hooks and closings
- Analytics dashboard (engagement tracking)
- Team collaboration with shared projects

### Phase 3
- Content calendar integration
- AI-powered content scheduling optimization
- Multi-language support with translation
- Brand voice training/fine-tuning

---

## 10. Dependencies

| Dependency | Purpose | Status |
|------------|---------|--------|
| Airtable | Database storage | Required |
| Perplexity API | Source discovery | Required |
| Gemini API | Content & image generation | Required |
| DuckDuckGo API | Fallback search | Optional |

---

## 11. Acceptance Criteria

### Research Tab
- [ ] Can create new project with topic and channels
- [ ] Auto-discovery returns 3-10 relevant sources
- [ ] Can manually add source by URL
- [ ] Checkboxes toggle source selection with optimistic updates
- [ ] Can delete sources

### Curate Tab
- [ ] Displays all sources from project
- [ ] Extracts 5-12 talking points per source
- [ ] Talking points categorized correctly
- [ ] Can configure all tone settings
- [ ] Scoping saves to project

### Draft Tab
- [ ] Generates content for selected channels
- [ ] Respects character/word limits per platform
- [ ] Shows visual opportunities panel
- [ ] Can edit draft inline
- [ ] Can regenerate with feedback

### Export Tab
- [ ] Grid and Compare views work
- [ ] Image carousel displays visual assets
- [ ] Status dropdown updates Airtable
- [ ] Export Markdown includes images
- [ ] Export JSON includes all data

---

*Document Version: 1.0*
*Last Updated: November 2024*
