# ContentFlow Airtable Schema

This document defines the Airtable tables required for ContentFlow functionality.

## Overview

ContentFlow adds 4 new tables to your existing Airtable base:
- **CF_Projects** - Content projects/campaigns
- **CF_Sources** - Discovered/added research sources
- **CF_TalkingPoints** - Extracted insights from sources
- **CF_Outputs** - Generated content drafts per platform

---

## Table 1: CF_Projects

Main project entity that contains the research topic and workflow state.

| Field Name | Type | Description |
|------------|------|-------------|
| `Name` | Single Line Text | Auto-generated project name (e.g., "equitation-scoring-2024") |
| `Topic` | Long Text | User-provided research topic/question |
| `Status` | Single Select | `discovery` \| `scoping` \| `drafting` \| `review` \| `published` |
| `TargetChannels` | Multiple Select | `linkedin` \| `blog` \| `twitter` \| `newsletter` \| `meta` |
| `ScopingAnswers` | Long Text | JSON string with Q&A responses |
| `CreatedAt` | Created Time | Auto-generated timestamp |

### Status Values (Single Select Options)
- discovery (default)
- scoping
- drafting
- review
- published

### TargetChannels Options (Multiple Select)
- linkedin
- blog
- twitter
- newsletter
- meta

---

## Table 2: CF_Sources

Research sources discovered or manually added to a project.

| Field Name | Type | Description |
|------------|------|-------------|
| `ProjectId` | Link to CF_Projects | Parent project reference |
| `URL` | URL | Original source URL |
| `Title` | Single Line Text | Source title/headline |
| `SourceType` | Single Select | `reddit` \| `youtube` \| `article` \| `academic` \| `official` |
| `Weight` | Number (1-5) | User priority weighting (default: 3) |
| `Selected` | Checkbox | Include in content generation (default: true) |
| `ScrapedContent` | Long Text | Full extracted text content |
| `Summary` | Long Text | AI-generated summary (2-3 sentences) |
| `DiscoveryMethod` | Single Select | `auto_discovery` \| `find_more` \| `manual_add` |
| `ScrapedAt` | Date | When source was scraped |

### SourceType Options (Single Select)
- reddit
- youtube
- article
- academic
- official

### DiscoveryMethod Options (Single Select)
- auto_discovery
- find_more
- manual_add

---

## Table 3: CF_TalkingPoints

Extracted insights/facts from sources for content generation.

| Field Name | Type | Description |
|------------|------|-------------|
| `ProjectId` | Link to CF_Projects | Parent project reference |
| `SourceId` | Link to CF_Sources | Source attribution |
| `Content` | Long Text | The extracted insight/fact/quote |
| `Category` | Single Select | `statistic` \| `quote` \| `process` \| `opinion` \| `comparison` |
| `VisualPotential` | Single Select | `infographic` \| `chart` \| `howto` \| `diagram` \| `none` |
| `Selected` | Checkbox | Include in final content (default: true) |
| `UseForVisual` | Checkbox | Flag for Nanobanana Pro visual generation |

### Category Options (Single Select)
- statistic (Emerald color)
- quote (Sky color)
- process (Amber color)
- opinion (Violet color)
- comparison (Rose color)

### VisualPotential Options (Single Select)
- infographic
- chart
- howto
- diagram
- none

---

## Table 4: CF_Outputs

Generated content drafts for each target platform.

| Field Name | Type | Description |
|------------|------|-------------|
| `ProjectId` | Link to CF_Projects | Parent project reference |
| `Channel` | Single Select | `linkedin` \| `blog` \| `twitter` \| `newsletter` \| `meta` |
| `DraftContent` | Long Text | Platform-formatted content |
| `Version` | Number | Draft iteration number (default: 1) |
| `VisualAssets` | Attachment | Nanobanana Pro generated images |
| `VisualPrompts` | Long Text | JSON array of prompts used for generation |
| `UserFeedback` | Long Text | Edit requests for revision |
| `Status` | Single Select | `draft` \| `review` \| `approved` \| `exported` |

### Channel Options (Single Select)
- linkedin
- blog
- twitter
- newsletter
- meta

### Status Options (Single Select)
- draft
- review
- approved
- exported

---

## Quick Setup Instructions

1. **Create the tables** in your existing Airtable base with the exact names above
2. **Add all fields** as specified (types must match)
3. **Create Single Select options** for each enum field
4. **Set up Links** between tables:
   - CF_Sources.ProjectId → CF_Projects
   - CF_TalkingPoints.ProjectId → CF_Projects
   - CF_TalkingPoints.SourceId → CF_Sources
   - CF_Outputs.ProjectId → CF_Projects

---

## Airtable Formula Examples

### Project Name Auto-Generation
For the `Name` field, you can use a formula like:
```
CONCATENATE(
  LOWER(SUBSTITUTE(LEFT({Topic}, 30), " ", "-")),
  "-",
  DATETIME_FORMAT(CREATED_TIME(), "YYYYMMDD")
)
```

### Source Count per Project (Rollup)
Add a Rollup field to CF_Projects:
- Field: `SourceCount`
- Link field: (reverse link from CF_Sources)
- Aggregation: COUNT(values)

---

## API Usage Notes

- All tables use the same Airtable API key and base ID as existing tables
- Batch operations limited to 10 records per request
- Rate limit: 5 requests/second
- Use `typecast: true` for automatic Single Select option creation
