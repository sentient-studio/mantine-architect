# @mantine-architect/mcp

MCP server that generates production-ready Mantine v7 components from Figma designs — using **your own** Anthropic and Figma API keys. Zero API costs on the package author's side.

## What it does

Exposes 5 tools to Claude Desktop / Claude Code:

| Tool | What it does |
|---|---|
| `mantine_plan` | Stage 1 — queries Figma for tokens, identifies variants, flags design conflicts. Returns job_id. ~5–10 min |
| `mantine_generate` | Stage 2+3 — writes TSX, CSS module, Storybook story, Playwright spec. Returns job_id. ~20–30 min |
| `mantine_status` | Poll a job's state + recent logs |
| `mantine_get_plan` | Read the plan markdown when Stage 1 is done |
| `mantine_get_files` | Read the generated files when Stage 2+3 is done |

## Prerequisites

- Node.js 20+
- [Claude Desktop](https://claude.ai/download) or [Claude Code](https://claude.ai/code)
- This repo cloned locally (provides `scripts/dispatch-agent.sh`)
- A Figma personal access token
- An Anthropic API key (already set up if you use Claude Desktop)

## Setup

### 1. Add to Claude Desktop config

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "mantine-architect": {
      "command": "npx",
      "args": ["@mantine-architect/mcp"],
      "env": {
        "MANTINE_SCRIPTS_DIR": "/path/to/figma-ai-project/scripts",
        "MANTINE_WORK_DIR": "/path/to/your/project",
        "FIGMA_ACCESS_TOKEN": "figd_your_token_here",
        "ANTHROPIC_API_KEY": "sk-ant-your-key-here"
      }
    }
  }
}
```

| Variable | Required | Description |
|---|---|---|
| `MANTINE_SCRIPTS_DIR` | ✅ | Path to the directory containing `dispatch-agent.sh` |
| `MANTINE_WORK_DIR` | ✅ | Root of your project — `02-generated/` and `logs/` live here |
| `FIGMA_ACCESS_TOKEN` | ✅ | Figma personal access token (figma.com → Settings → Security) |
| `ANTHROPIC_API_KEY` | ✅ | Your Anthropic API key |

### 2. Or add via Claude Code CLI

```bash
claude mcp add mantine-architect \
  --env MANTINE_SCRIPTS_DIR=/path/to/figma-ai-project/scripts \
  --env MANTINE_WORK_DIR=/path/to/your/project \
  --env FIGMA_ACCESS_TOKEN=figd_... \
  -- npx @mantine-architect/mcp
```

### 3. Restart Claude Desktop / Code

The server starts automatically when Claude launches.

---

## Typical workflow

```
You: Generate a Button component from this Figma URL: https://figma.com/design/...

Claude: [calls mantine_plan] → returns job_id abc-123

You: Check the status

Claude: [calls mantine_status job_id=abc-123] → state: "running" (still planning...)

... 8 minutes later ...

Claude: [calls mantine_status] → state: "complete"
        [calls mantine_get_plan] → returns full plan markdown

Claude: Here's the plan. It found 2 variants (Default, Hover), no conflicts.
        Shall I generate the component?

You: Yes, go ahead

Claude: [calls mantine_generate] → returns job_id def-456

... 25 minutes later ...

Claude: [calls mantine_status] → state: "complete"
        [calls mantine_get_files] → returns Button.tsx, Button.module.css, etc.

Claude: Here are your generated files. The component uses UnstyledButton,
        passes WCAG AA contrast at blue.8, and has 14 Playwright tests.
```

---

## Output files

Generated files are written to `$MANTINE_WORK_DIR/02-generated/<ComponentName>/`:

```
02-generated/
  Button/
    Button.tsx
    Button.module.css
    Button.stories.tsx
    Button.spec.ts
```

Plan documents are written to `$MANTINE_WORK_DIR/logs/plan-<ComponentName>-<timestamp>.md`.

---

## Notes

- Job state is held in memory. If Claude restarts, job_ids from the previous session are lost — but the output files and plan documents remain on disk.
- `dispatch-agent.sh` calls `claude` internally using your `ANTHROPIC_API_KEY`. All compute costs are billed to your Anthropic account.
- The Figma MCP integration in Stage 1 requires `FIGMA_ACCESS_TOKEN`. Stage 2+3 does not use Figma.
