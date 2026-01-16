# Gemini Presentation Studio

A professional-grade asset generation platform powered by Google's **Gemini 3 Pro** (Nano Banana Pro) and **Veo**. 

This application allows users to generate high-fidelity images, diagrams, and videos specifically tailored for corporate presentations, marketing campaigns, and social media.

## Features

- **Nano Banana Pro Integration**: Access the `gemini-3-pro-image-preview` model for superior text rendering and prompt adherence.
- **Smart Prompt Synthesizer**: Automatically converts simple inputs into complex, professionally engineered prompts.
- **Airtable Integration**:
  - Auto-save generation metadata (Prompts, Settings, Topics).
  - **ImgBB Bridge**: Automatically upload generated images to the cloud and attach them to Airtable records.
  - **Dynamic Configuration**: Manage Layouts, Styles, and Templates directly from your Airtable base.
- **History & Remixing**: Browse past creations, filter by Campaign/Topic, and instantly "Remix" (restore settings) from any previous job.
- **Local Persistence**: Images are instantly saved to a local IndexedDB, preventing data loss if the browser closes.

## Setup

1. **Clone the repo**
   ```bash
   git clone https://github.com/your-username/gemini-presentation-studio.git
   cd gemini-presentation-studio
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Run Development Server**
   ```bash
   npm run dev
   ```

## Environment Variables

Create a `.env.local` file in the project root with your API keys:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
VITE_AIRTABLE_API_KEY=your_airtable_api_key_here
VITE_AIRTABLE_BASE_ID=your_airtable_base_id_here
VITE_AIRTABLE_TABLE_NAME=Generations
VITE_IMGBB_API_KEY=your_imgbb_api_key_here
```

### Troubleshooting: API Key Quota Errors

If you see errors like `"You exceeded your current quota"` with `free_tier_requests, limit: 0`, check the following:

1. **Shell environment variables may override `.env.local`**

   Vite loads environment variables in this order (later overrides earlier):
   - `.env.local` file
   - Shell environment variables (e.g., from `~/.zshrc` or `~/.bashrc`)

   Check if you have a conflicting key set in your shell:
   ```bash
   echo $GEMINI_API_KEY
   ```

   If this shows a different key than your `.env.local`, remove it from your shell config:
   ```bash
   # Check these files for GEMINI_API_KEY exports:
   grep GEMINI_API_KEY ~/.zshrc ~/.bashrc ~/.bash_profile
   ```

   **Permanent fix**: If the variable keeps coming back (e.g., from VSCode or a parent process), add this to your `~/.zshrc`:
   ```bash
   # Clear any inherited GEMINI_API_KEY to use .env.local instead
   unset GEMINI_API_KEY
   ```

2. **Verify the correct key is loaded**

   When the dev server starts, check the console output:
   ```
   [VITE CONFIG] GEMINI_API_KEY: AIzaSyXXXXX...
   ```

   Ensure this matches your paid-tier API key.

3. **Restart the dev server** after making any changes to environment variables.

## Configuration

Click the **Settings (Gear Icon)** in the top right to configure:

1. **Airtable**:
   - **Base ID**: The ID of your Airtable Base.
   - **API Key**: A Personal Access Token (PAT) with `data.records:write` scope.
   - **Table Name**: Default is `Generations`.
2. **ImgBB (Optional)**:
   - Add a free API key to enable automatic image uploading to Airtable.

## Airtable Schema

To utilize the full dynamic capabilities, create the following tables in your Base:

**Table: `Generations`**
- `Prompt` (Long Text)
- `Type` (Single Select: Image, Video)
- `Topic` (Single Line Text)
- `Campaign` (Single Line Text)
- `Attachments` (Attachment)
- `Favorite` (Single Select: Yes, No)
- *Plus standard style fields (Layout, Style, etc.)*

**Table: `Themes`** (For Creative Direction presets)
- `Name` (Single Line Text)
- `Prompt` (Long Text)

**Table: `Controls`** (For dynamic dropdowns)
- `Label` (Single Line Text)
- `Value` (Single Line Text)
- `Category` (Single Select: Layout, Style, Lighting, Camera)

**Table: `Templates`**
- `Title` (Single Line Text)
- `Description` (Single Line Text)
- `Prompt` (Long Text)
- `Category` (Single Line Text)
