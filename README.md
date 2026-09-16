# Google Doc AI Comments Bot

A Google Apps Script that answers comments in a Google Doc. Highlight text, leave a comment starting with `@AI`, and Claude replies in the comment thread with an answer grounded in the highlighted text and the surrounding document.

## How it works

1. A time-driven trigger runs `checkAndReplyToComments()` every minute.
2. It lists unresolved comments through the Drive API (v3) and picks the ones that start with `@AI`, `@Bot` or `@Claude` and have no replies yet.
3. It builds a context window (up to 8000 characters, centred on the highlighted text) and calls the Claude Messages API.
4. The answer is posted as a reply on the comment, and the comment id is marked as processed in Script Properties so it is never answered twice.

Everything runs inside Apps Script. No server, no infrastructure.

## Setup

### Option A: clasp (recommended)

```bash
npm install
npx clasp login
cp .clasp.json.example .clasp.json   # paste your Script ID (Apps Script > Project Settings)
npm run push
```

The Drive advanced service is declared in `src/appsscript.json`, so nothing needs to be enabled by hand.

### Option B: paste into the editor

1. In the Google Doc: **Extensions > Apps Script**.
2. Replace the contents of `Code.gs` with `src/Code.gs`.
3. **Services (+)** > add **Drive API** (version v3).

### Then, for either option

1. **Project Settings > Script Properties**, add:
   - `ANTHROPIC_API_KEY` (required): from [console.anthropic.com](https://console.anthropic.com)
   - `CLAUDE_MODEL` (optional): defaults to `claude-sonnet-5`
2. In the editor, run `initialSetup` once and grant the requested permissions.
3. Back in the Doc, highlight some text and comment `@AI What does this mean?`. A reply arrives within about a minute.

## Usage

Comments must start with one of the triggers (case-insensitive): `@AI`, `@Bot`, `@Claude`.

| Highlighted text | Comment | Reply |
|------------------|---------|-------|
| Technical paragraph | `@AI Explain this simply` | Plain-English explanation |
| Code snippet | `@AI Is there a bug here?` | Code analysis |
| Sentence | `@AI Is this grammatically correct?` | Grammar feedback |
| Data or stats | `@AI What does this imply?` | Analysis |

## Functions you can run from the editor

| Function | Purpose |
|----------|---------|
| `initialSetup` | Checks the API key and installs the trigger |
| `testRun` | Manually check and reply to comments once |
| `testAPIConnection` | Verifies the API key and model |
| `setupTrigger` / `removeTriggers` | Enable or disable automatic checking |
| `clearProcessedComments` | Forget processed comments so they get answered again |

## Configuration

`CONFIG` at the top of `src/Code.gs`:

| Key | Default | Meaning |
|-----|---------|---------|
| `BOT_TRIGGERS` | `['@ai', '@bot', '@claude']` | Prefixes that address the bot |
| `DEFAULT_MODEL` | `claude-sonnet-5` | Used when `CLAUDE_MODEL` is not set |
| `MAX_CONTEXT_CHARS` | `8000` | Document context sent per request |
| `MAX_RESPONSE_TOKENS` | `1024` | Reply length cap |
| `CHECK_INTERVAL_MINUTES` | `1` | Trigger cadence |

## Development

```bash
npm run lint   # syntax-check Code.gs and appsscript.json
npm test       # node:test suite for the pure helpers
```

The tests load `src/Code.gs` in a sandbox with stubbed Apps Script globals and exercise trigger detection, question extraction and the context window logic. CI runs both on every push and pull request.

## Troubleshooting

- **No reply**: Apps Script > Triggers, confirm the trigger exists (or run `setupTrigger`). Check **Executions** for errors.
- **"API key not configured"**: set `ANTHROPIC_API_KEY` in Script Properties with no extra whitespace.
- **Comment skipped**: the bot only answers unresolved comments that have no replies, and only once. Run `clearProcessedComments` to retest.
- **Permission errors**: run `initialSetup` again and re-authorize.

## Limits and costs

- Polling delay of about one minute; Apps Script [daily quotas](https://developers.google.com/apps-script/guides/services/quotas) apply.
- Claude usage is billed per request; see [Anthropic pricing](https://www.anthropic.com/pricing).
- Document content is sent to Anthropic. Replies are visible to everyone with access to the Doc.

## License

MIT
