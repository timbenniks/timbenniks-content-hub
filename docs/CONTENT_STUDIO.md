# Content Studio - How It Works

## Overview

The Content Studio is a project-scoped tool that generates **social post summaries** from your RSS feed items using AI. You manually assemble these summaries into newsletters or other content.

## Core Concepts

### 1. Voice Profile (Project-Level)

**What it is:** Your writing style guide that tells the AI how to write summaries.

**Where:** `/p/[slug]/studio/voice`

**Contains:**
- **Display Name**: Friendly name for your voice (e.g., "My Writing Voice")
- **Style Guide**: Long-form description of your writing style, tone, and preferences
- **Do List**: Things to include/emphasize (e.g., "Use short sentences", "Be opinionated")
- **Don't List**: Things to avoid (e.g., "No corporate jargon", "Avoid passive voice")
- **Banned Phrases**: Phrases that should never appear (e.g., "leverage", "synergy")

**Why it matters:** Every AI-generated summary follows this voice profile to maintain consistency.

### 2. Drafts

**What it is:** A container for selected RSS items and their generated summaries.

**Lifecycle:**
1. **DRAFT** - Created, no summaries generated yet
2. **NEEDS_REVIEW** - Summaries generated, ready for review
3. **APPROVED** - You've approved the summaries
4. **FAILED** - Something went wrong

**Contains:**
- Title (you provide)
- Selected RSS items (you choose)
- Generated summaries (AI creates)
- Combined markdown (all summaries together)

### 3. Workflow Runs

**What it is:** A record of each time the AI generates summaries.

**Tracks:**
- Which workflow ran
- Status (RUNNING, SUCCEEDED, FAILED, SUSPENDED)
- Input/output data
- Errors if any
- Timing information

**Why it matters:** Debug issues, see what happened, track performance.

## Step-by-Step Workflow

### Step 1: Set Up Your Voice Profile

1. Go to `/p/[slug]/studio/voice`
2. Fill in:
   - Display name
   - Style guide (describe how you write)
   - Do list (add items one by one)
   - Don't list (add items one by one)
   - Banned phrases (add phrases one by one)
3. Click "Save Voice Profile"

**Note:** You can skip this step, but summaries will be generic without your voice.

### Step 2: Create a Draft

1. Go to `/p/[slug]/studio` (Drafts tab)
2. Click "New Draft"
3. In the dialog:
   - Enter a title (e.g., "Weekly Roundup - Dec 15")
   - Check the RSS items you want summaries for
   - Click "Create Draft"
4. You're redirected to the draft detail page

**What happens:** A draft is created with status `DRAFT`. No AI generation yet.

### Step 3: Generate Summaries

1. On the draft detail page, you'll see:
   - All selected RSS items listed
   - A "Generate with AI" button (if status is DRAFT)
2. Click "Generate with AI"
3. The system:
   - Loads your voice profile
   - Loads the selected RSS items
   - Generates a 1-3 sentence summary for each item (in parallel)
   - Saves summaries to the draft
   - Sets status to `NEEDS_REVIEW`

**What you see:** Each RSS item now shows its generated summary in a card.

### Step 4: Review and Use

1. Review each summary:
   - Each item shows its original title, source, and generated summary
   - Click "Source" link to view the original article
2. Use the summaries:
   - Copy individual summaries from the cards
   - Or copy the combined markdown from the "Combined Content" section
3. Assemble manually:
   - Put summaries into your newsletter/blog/social posts
   - Edit as needed
   - Add your own commentary

### Step 5: Approve (Optional)

1. If you're happy with the summaries, click "Approve"
2. Status changes to `APPROVED`
3. You can still view/edit/delete the draft anytime

## Data Flow

```
RSS Items (from your feeds)
    ↓
You select items → Create Draft
    ↓
Draft created (status: DRAFT)
    ↓
You click "Generate with AI"
    ↓
Workflow Run created (status: RUNNING)
    ↓
AI generates summaries (using Voice Profile)
    ↓
Summaries saved to draft
    ↓
Draft status → NEEDS_REVIEW
Workflow Run status → SUCCEEDED
    ↓
You review summaries
    ↓
You approve → Draft status → APPROVED
```

## Key Files & Their Roles

### Database Models

- **VoiceProfile**: One per project, stores your writing style
- **ContentDraft**: Container for summaries
- **DraftItem**: Links RSS items to drafts (many-to-many)
- **WorkflowRun**: Tracks each AI generation attempt
- **WorkflowEvent**: Logs steps and errors during generation

### UI Components

- **`/studio`**: Drafts list page
- **`/studio/drafts/[draftId]`**: Draft detail with summaries
- **`/studio/voice`**: Voice profile editor
- **`/studio/runs`**: Workflow execution history
- **`/studio/automations`**: Daily automation settings

### API Routes

- **`POST /api/studio/drafts`**: Create a new draft
- **`GET /api/studio/drafts`**: List drafts
- **`DELETE /api/studio/drafts/[draftId]`**: Delete a draft
- **`POST /api/studio/drafts/[draftId]/approve`**: Approve/reject draft
- **`POST /api/studio/workflows/run`**: Trigger AI generation
- **`DELETE /api/studio/workflows/runs/[runId]`**: Delete workflow run
- **`POST /api/studio/voice`**: Save voice profile

## Daily Automation

**What it does:** Automatically creates a draft daily with recent RSS items.

**Setup:**
1. Go to `/p/[slug]/studio/automations`
2. Toggle "Enable Daily Automation"
3. Set "Maximum Items per Draft"
4. Click "Save Settings"

**When it runs:** Daily at 1 AM UTC (via Vercel Cron)

**What happens:**
- Creates a draft with recent items (last 24 hours)
- Links items to the draft
- **Does NOT** automatically generate summaries
- You still need to click "Generate with AI" manually

## Common Questions

### Q: Do I need a voice profile?
**A:** No, but summaries will be generic. With a voice profile, summaries match your style.

### Q: Can I edit summaries after generation?
**A:** Not directly in the UI yet, but you can copy them and edit elsewhere. The markdown is read-only for now.

### Q: What if generation fails?
**A:** Check the "Runs" tab to see error details. The draft stays in DRAFT status, so you can try again.

### Q: Can I add more items to an existing draft?
**A:** Not yet - create a new draft with all items you want.

### Q: What happens if I delete a draft?
**A:** The draft, its items links, and related workflow runs are deleted. The original RSS items remain.

### Q: Can I delete workflow runs?
**A:** Yes! Click the trash icon in the Runs table. This only deletes the tracking record, not the draft.

## Tips

1. **Start with a good voice profile** - The better your style guide, the better the summaries
2. **Select relevant items** - Don't select too many at once (10-15 is good)
3. **Review before approving** - Check summaries match your voice
4. **Use the combined markdown** - Easier to copy all summaries at once
5. **Check workflow runs** - If summaries seem off, check the Runs tab for errors

