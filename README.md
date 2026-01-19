# Google Doc AI Comments Bot

An AI-powered bot that responds to your comments in Google Docs. Highlight text, ask a question with `@AI`, and get intelligent, context-aware answers as reply comments.

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                     Google Doc                               │
│                                                              │
│  "The quarterly revenue increased by 15%..."                │
│                    │                                         │
│                    ▼ (highlighted)                          │
│  ┌──────────────────────────────────────┐                   │
│  │ Comment: @AI Is this growth on track │                   │
│  │ with our projections?                │                   │
│  │                                       │                   │
│  │ ┌────────────────────────────────┐   │                   │
│  │ │ 🤖 Bot Reply: Based on the     │   │                   │
│  │ │ document context, the 15%      │   │                   │
│  │ │ growth exceeds the projected   │   │                   │
│  │ │ 12% target set in Q1...        │   │                   │
│  │ └────────────────────────────────┘   │                   │
│  └──────────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

## Features

- **Context-Aware**: Understands the highlighted text AND the surrounding document
- **Natural Comments**: Just use `@AI`, `@Bot`, or `@Claude` to trigger
- **Automatic Monitoring**: Checks for new comments every minute
- **No Infrastructure**: Runs entirely within Google Apps Script
- **Powered by Claude**: Uses Anthropic's Claude for intelligent responses

## Quick Setup (5 minutes)

### Step 1: Create the Script

1. Open your Google Doc
2. Go to **Extensions** → **Apps Script**
3. Delete any existing code in `Code.gs`
4. Copy and paste the entire contents of [`Code.gs`](./Code.gs)
5. Click **Save** (Ctrl+S / Cmd+S)

### Step 2: Enable Drive API

1. In Apps Script, click **Services** (+ icon) in the left sidebar
2. Find **Drive API** and click **Add**
3. Click **Add** to confirm

### Step 3: Add Your API Key

1. In Apps Script, click the **gear icon** (Project Settings)
2. Scroll down to **Script Properties**
3. Click **Add script property**
4. Set:
   - **Property**: `ANTHROPIC_API_KEY`
   - **Value**: Your Anthropic API key (get one at [console.anthropic.com](https://console.anthropic.com))
5. Click **Save script properties**

### Step 4: Run Initial Setup

1. In the code editor, select `initialSetup` from the function dropdown (top bar)
2. Click **Run**
3. **First time only**: Grant permissions when prompted
   - Click "Review permissions"
   - Select your Google account
   - Click "Advanced" → "Go to [project name]"
   - Click "Allow"

### Step 5: Test It!

1. Go back to your Google Doc
2. Highlight some text
3. Add a comment: `@AI What does this mean?`
4. Wait ~1 minute for the response!

## Usage

### Trigger Keywords

Start your comment with any of these (case-insensitive):
- `@AI` - e.g., "@AI explain this in simple terms"
- `@Bot` - e.g., "@Bot what's wrong with this paragraph?"
- `@Claude` - e.g., "@Claude can you suggest improvements?"

### Example Questions

| Highlighted Text | Comment | Bot Response |
|-----------------|---------|--------------|
| Technical paragraph | `@AI Explain this simply` | Plain English explanation |
| Code snippet | `@AI Is there a bug here?` | Code analysis |
| Any text | `@AI Summarize this` | Concise summary |
| Sentence | `@AI Is this grammatically correct?` | Grammar feedback |
| Data/stats | `@AI What does this imply?` | Analysis and insights |

## Configuration

Edit these values in `Code.gs` to customize:

```javascript
const CONFIG = {
  BOT_TRIGGERS: ['@ai', '@bot', '@claude'],  // Add custom triggers
  MODEL: 'claude-sonnet-4-20250514',                 // Claude model to use
  MAX_CONTEXT_CHARS: 8000,                   // Document context limit
  CHECK_INTERVAL_MINUTES: 1                  // How often to check
};
```

## Available Functions

Run these from the Apps Script editor:

| Function | Description |
|----------|-------------|
| `initialSetup` | First-time setup - configures triggers |
| `testRun` | Manually check and reply to comments |
| `testAPIConnection` | Verify your API key works |
| `setupTrigger` | Re-enable automatic checking |
| `removeTriggers` | Disable automatic checking |
| `clearProcessedComments` | Reset (re-process old comments) |

## Troubleshooting

### Bot isn't responding

1. **Check the trigger is running**:
   - Apps Script → Triggers (clock icon) → Verify trigger exists
   - Run `setupTrigger()` to recreate it

2. **Check for errors**:
   - Apps Script → Executions (play icon with list) → Look for failed runs

3. **Verify API key**:
   - Run `testAPIConnection()` to test

### "API key not configured" error

- Go to Project Settings → Script Properties
- Ensure `ANTHROPIC_API_KEY` is set correctly (no extra spaces)

### Permission errors

- Run `initialSetup()` again and re-authorize when prompted

### Comments being skipped

- Bot only responds to **unresolved** comments
- Bot only responds once per comment (won't re-reply)
- To re-test same comment: run `clearProcessedComments()`

## Costs

- **Google Apps Script**: Free (within quotas)
- **Claude API**: Pay per use (~$0.003 per request with Sonnet)
  - See [Anthropic pricing](https://www.anthropic.com/pricing)

## Limitations

- **Polling delay**: Checks every 1 minute (not instant)
- **Quotas**: Apps Script has [daily quotas](https://developers.google.com/apps-script/guides/services/quotas)
- **Document size**: Very large docs may be truncated for context

## Security Notes

- Your API key is stored in Google's Script Properties (encrypted at rest)
- Document content is sent to Anthropic's API for processing
- Bot replies are visible to anyone with document access

## License

MIT License - feel free to modify and use as needed!
