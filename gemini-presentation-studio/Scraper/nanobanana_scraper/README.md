# 🍌 Nano Banana Prompt Scraper

Automated tool to scrape Nano Banana (Gemini 2.5 Flash Image) prompts and sample images from GitHub repositories and store them in an Airtable database.

## What is Nano Banana?

Nano Banana is Google's Gemini 2.5 Flash Image model - a state-of-the-art AI image generation and editing model. This scraper collects prompts and example images from community-curated GitHub repositories to build your own prompt library.

## 📚 Scraped Repositories

| Repository | Description | Cases |
|------------|-------------|-------|
| [JimmyLv/awesome-nano-banana](https://github.com/JimmyLv/awesome-nano-banana) | Main curated collection with 100+ cases | ~100 |
| [ZeroLu/awesome-nanobanana-pro](https://github.com/ZeroLu/awesome-nanobanana-pro) | Pro version prompts | ~50 |
| [PicoTrex/Awesome-Nano-Banana-images](https://github.com/PicoTrex/Awesome-Nano-Banana-images) | Images with dataset release | ~110 |
| [Super-Maker-AI/awesome-nano-banana](https://github.com/Super-Maker-AI/awesome-nano-banana) | SuperMaker AI playbook | ~30 |
| [muset-ai/awesome-nano-banana-pro](https://github.com/muset-ai/awesome-nano-banana-pro) | Early-access Pro cases | ~50 |

## 🚀 Quick Start

### 1. Clone and Setup

```bash
cd nanobanana_scraper
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your credentials
```

### 3. Run Scraper

```bash
# Basic run (outputs JSON/CSV only)
python scraper.py --skip-airtable

# Full run with Airtable upload
python scraper.py

# With explicit credentials
python scraper.py --github-token YOUR_TOKEN --airtable-key YOUR_KEY --airtable-base YOUR_BASE
```

## ⚙️ Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_TOKEN` | No | Personal access token (avoids rate limits) |
| `AIRTABLE_API_KEY` | Yes* | Airtable personal access token |
| `AIRTABLE_BASE_ID` | Yes* | Your Airtable base ID |

*Required only for Airtable upload

### Getting Credentials

#### GitHub Token (Optional but Recommended)
1. Go to [GitHub Settings > Tokens](https://github.com/settings/tokens)
2. Generate new token (classic)
3. No special scopes needed for public repos

#### Airtable API Key
1. Go to [Airtable API Tokens](https://airtable.com/create/tokens)
2. Create a personal access token
3. Grant access to your base with these scopes:
   - `data.records:read`
   - `data.records:write`

#### Airtable Base ID
1. Open your Airtable base
2. Look at the URL: `https://airtable.com/[BASE_ID]/...`
3. The Base ID starts with `app`

## 📊 Airtable Schema

Create a table named `NanoBanana` with these fields:

| Field Name | Type | Description |
|------------|------|-------------|
| Case ID | Single line text | Unique identifier |
| Case Number | Number | Original case number |
| Title | Single line text | Chinese title |
| Title (EN) | Single line text | English title |
| Prompt | Long text | Full prompt text |
| Prompt (EN) | Long text | English prompt |
| Author | Single line text | Creator's handle |
| Author URL | URL | Link to author profile |
| Source Repo | Single line text | GitHub repo name |
| Source URL | URL | Link to source |
| Gemini Image URL | URL | Direct link to Gemini image |
| GPT-4o Image URL | URL | Direct link to GPT-4o image |
| Gemini Image | Attachment | Image file |
| GPT-4o Image | Attachment | Image file |
| Reference Required | Checkbox | Needs reference image? |
| Reference Note | Long text | Reference image instructions |
| Tags | Single line text | Comma-separated tags |
| Category | Single select | Content category |
| Scraped At | Date | When scraped |

### Category Options
- Portrait & Character
- Product & Mockup
- Style Transfer
- Scene & Environment
- Icon & Logo
- Creative Art
- Miniature & Toy
- Text & Typography
- Food & Object
- General

## 📁 Output Files

| File | Description |
|------|-------------|
| `nanobanana_cases.json` | Full structured data |
| `nanobanana_cases.csv` | Spreadsheet-compatible export |

## 🔄 Automation Options

### GitHub Actions (Scheduled)

Create `.github/workflows/scrape.yml`:

```yaml
name: Scrape Nano Banana

on:
  schedule:
    - cron: '0 6 * * 1'  # Weekly on Monday at 6 AM
  workflow_dispatch:  # Manual trigger

jobs:
  scrape:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: pip install -r requirements.txt
      - run: python scraper.py
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          AIRTABLE_API_KEY: ${{ secrets.AIRTABLE_API_KEY }}
          AIRTABLE_BASE_ID: ${{ secrets.AIRTABLE_BASE_ID }}
```

### n8n Workflow

1. HTTP Request node to trigger this script via webhook
2. Or use n8n's GitHub and Airtable nodes directly

### Make (Integromat)

1. Create scenario with GitHub webhook trigger
2. Run script via code module
3. Create Airtable records

## 🏷️ Tag Categories

The scraper automatically extracts and applies tags:

- **Style**: 3D, Q版, 像素, 复古, 极简, 超现实
- **Theme**: 动漫, 手办, 海报, Logo, Emoji
- **Aesthetic**: 玻璃, 乐高, 蒸汽朋克, 赛博朋克, 吉卜力
- **Technique**: 写实, 水晶球, 针织, 珐琅

## 🤝 Contributing

To add more repositories:

1. Edit `GitHubScraper.REPOS` in `scraper.py`
2. Add repository info with owner, repo, readme_path, and branch

## 📄 License

MIT License - Feel free to use and modify!

---

Built for Pine Lake Capital / Conversely AI prompt library management.
