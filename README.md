# Mantine Architect

Generates production-ready Mantine v7 components from Figma designs using a
3-stage AI workflow (Plan → Act → Reflect), validated by Storybook and Playwright.

---

## What it does

Point it at a Figma node. It:

1. **Plans** — queries Figma for exact design tokens, maps every variant, flags
   architectural conflicts (custom widgets Mantine already covers, absolute layouts
   that must become flow, WCAG contrast failures), and posts conflict comments back
   to Figma so designers see them inline.
2. **Acts** — generates four production files: `<Name>.tsx`, `<Name>.module.css`,
   `<Name>.stories.tsx`, `<Name>.spec.ts`.
3. **Reflects** — runs 11 automated quality gates (token compliance, PostCSS rules,
   Storybook autodocs, Playwright tests, visual snapshots, portal CSS scope) and
   fixes any failures before exiting.

Each stage runs as a separate Claude Code invocation. Stage 1 has Figma MCP access;
Stage 2+3 receives only the approved plan — no re-querying Figma.

For the full rules, patterns, and gotchas see **[CLAUDE.md](CLAUDE.md)**.

---

## Prerequisites

| Requirement | Notes |
|---|---|
| Node.js 20+ | Used by Claude Code CLI and the MCP server |
| [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) | `npm install -g @anthropic-ai/claude-code` |
| Anthropic API key | [console.anthropic.com](https://console.anthropic.com) → API keys |
| Figma personal access token | figma.com → Settings → Security → Personal access tokens |

---

## Setup

### 1. Clone and install

```bash
git clone git@github.com:sentient-studio/mantine-architect.git
cd mantine-architect
npm install
```

### 2. Install Playwright browsers

```bash
npx playwright install chromium
```

### 3. Set environment variables

The scripts resolve `FIGMA_ACCESS_TOKEN` from the environment. The Anthropic key
is used by the Claude Code CLI internally.

```bash
export FIGMA_ACCESS_TOKEN="figd_your_token_here"
export ANTHROPIC_API_KEY="sk-ant-your_key_here"
```

Or add them to your shell profile (`~/.zshrc`, `~/.bash_profile`).

---

## Workflows

There are three ways to use Mantine Architect: conversational via the MCP server,
single-component via the shell script, and parallel batch via the batch launcher.

---

### Workflow 1 — MCP server (conversational, Claude Desktop)

The MCP server wraps the pipeline so you can drive it in conversation from
Claude Desktop.

#### Build the server

```bash
cd mantine-architect-mcp
npm install
npm run build
cd ..
```

#### Add to Claude Desktop config

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "mantine-architect": {
      "command": "node",
      "args": ["/path/to/mantine-architect/mantine-architect-mcp/dist/index.js"],
      "env": {
        "MANTINE_SCRIPTS_DIR": "/path/to/mantine-architect/scripts",
        "MANTINE_WORK_DIR":    "/path/to/mantine-architect",
        "FIGMA_ACCESS_TOKEN":  "figd_your_token_here",
        "ANTHROPIC_API_KEY":   "sk-ant-your_key_here"
      }
    }
  }
}
```

Restart Claude Desktop. The server exposes five tools:

| Tool | Description |
|---|---|
| `mantine_plan` | Stage 1 — query Figma, produce architectural plan. ~5–10 min. Returns instantly on cache hit (<24 h). |
| `mantine_generate` | Stage 2+3 — write TSX/CSS/stories/spec. Skips Stage 1 if a plan exists. ~15–20 min. |
| `mantine_status` | Poll a running job — returns state, timestamps, recent log tail. |
| `mantine_get_plan` | Read the full plan markdown after `mantine_plan` completes. |
| `mantine_get_files` | Read all 4 generated files after `mantine_generate` completes. |

#### Example conversation

```
You:    Generate a Select component from https://figma.com/design/abc/Test?node-id=78-1313

Claude: [calls mantine_plan] → job started, ~8 min

You:    Status?

Claude: [calls mantine_status] → complete. Calls mantine_get_plan.
        Plan found 3 variants, 1 ADAPT conflict (fixed width → responsive).
        Conflict comment posted to Figma. Shall I generate?

You:    Go ahead

Claude: [calls mantine_generate] → job started, ~18 min

Claude: [calls mantine_get_files] → complete. Here are the 4 files.
        All 11 quality gates passed.
```

---

### Workflow 2 — Single component (shell script)

```bash
# Stage 1: plan only — review before generating
./scripts/dispatch-agent.sh MyComponent "https://figma.com/design/..." --plan-only

# Review the plan
cat logs/plan-MyComponent-<timestamp>.md

# Stage 2+3: generate (uses the plan from Stage 1)
./scripts/dispatch-agent.sh MyComponent "https://figma.com/design/..." --stage2

# Or run both stages in one shot (skips the review gate)
./scripts/dispatch-agent.sh MyComponent "https://figma.com/design/..." --auto-approve
```

Logs are written to `logs/`:

| File | Stage |
|---|---|
| `logs/generate-<Name>-<ts>.log` | Stage 1 agent output |
| `logs/plan-<Name>-<ts>.md` | Extracted plan document |
| `logs/generate-<Name>-<ts>-stage23.log` | Stage 2+3 agent output |

---

### Workflow 3 — Batch (parallel Stage 1 for multiple components)

```bash
# Edit components.txt — one ComponentName,FigmaURL per line
./scripts/batch-generate.sh components.txt
```

Runs Stage 1 for all components in parallel, then opens an interactive review loop:

```
✅ Select   0🔴 1🟡 2🔵  ·  component set  ·  5 ambiguities  ·  14K
✅ Modal    1🔴 0🟡 1🔵  ·  single node    ·  8 ambiguities  ·  16K  ← REVIEW REQUIRED

[1/2]  Select  0🔴 1🟡 2🔵
   Launch Stage 2? [y/n/q]

[2/2]  Modal  1🔴 0🟡 1🔵  ← REVIEW REQUIRED
   Open full plan? [Y/n]
   Launch Stage 2? [y/n/q]
```

Stage 2+3 is **never** launched automatically from batch — each component requires
explicit approval after reviewing its plan.

---

## Quality gates

Run manually with:

```bash
./scripts/quality-gate.sh <ComponentName> [--skip-deps]
```

Also runs automatically as a pre-commit hook on any staged component files.

| # | Gate | What it checks |
|---|---|---|
| 1 | Token Compliance | No hex codes, raw RGB, or bare `px` in CSS |
| 2 | File Integrity | All 4 files exist and are non-empty |
| 3 | PostCSS Standard | `rem()` spacing, `@mixin hover`, no bare `:hover` |
| 4 | Storybook Autodocs | `tags: ['autodocs']` present in story meta |
| 5 | Tracker Update | Component row present in `03-figma-links/components.md` |
| 6 | data-* Attributes | State props forwarded via `data-*` attributes |
| 7 | Size Variant Coverage | `data-size` in TSX, Sizes story, and spec (when `size` prop present) |
| 8 | Test Coverage | At least one test case in spec file |
| 9 | Dependency Audit | No missing packages or npm vulnerabilities |
| 10 | Visual Snapshot | `toHaveScreenshot` assertion present in spec |
| 11 | Portal CSS Variable Scope | Component-scoped CSS vars not leaked into portal classes |

---

## Running tests

```bash
# Start Storybook (required for Playwright)
npm run storybook

# Run Playwright tests in a second terminal
npm run test:playwright

# Playwright UI mode
npm run test:playwright:ui
```

---

## Project structure

```
00-setup/           — Agent prompts and style guide (stage1-prompt.md, stage23-prompt.md,
                      AGENT-CLAUDE.md, style_guide.md)
01-golden-examples/ — Canonical reference components (Button, Card, TextInput, etc.)
02-generated/       — AI-generated components (one folder per component)
03-figma-links/     — components.md tracker (Figma URL → status)
.storybook/         — Storybook config
scripts/            — dispatch-agent.sh, batch-generate.sh, quality-gate.sh,
                      figma-pushback.sh, dependency-audit.sh
mantine-architect-mcp/ — MCP server source (TypeScript)
logs/               — Per-run logs and plan files
```

---

## Tech stack

| Layer | Package | Version |
|---|---|---|
| UI library | `@mantine/core` | ^7 |
| Icons | `@tabler/icons-react` | ^3 |
| Storybook | `@storybook/react-vite` | ^8 |
| Testing | `@playwright/test` | ^1.51 |
| A11y testing | `@axe-core/playwright` | ^4.11 |
| CSS pipeline | `postcss-preset-mantine` | — |

---

## Further reading

- **[CLAUDE.md](CLAUDE.md)** — full workflow rules, component patterns, silent failure catalogue,
  CSS rules, Playwright spec patterns, Storybook config, and quality gate details.
- **[CHANGELOG.md](CHANGELOG.md)** — version history.
- **[mantine-architect-mcp/README.md](mantine-architect-mcp/README.md)** — MCP server reference.
