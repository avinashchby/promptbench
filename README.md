# promptbench

**The testing framework for AI coding assistant configuration files.**

[![npm version](https://img.shields.io/npm/v/promptbench.svg)](https://www.npmjs.com/package/promptbench)
[![license](https://img.shields.io/npm/l/promptbench.svg)](https://github.com/avinashchaubey/promptbench/blob/main/LICENSE)

You spend hours writing your CLAUDE.md and .cursorrules. But does your AI assistant actually follow them? Does it use pnpm like you told it? Does it avoid `any` types? You don't know until you waste tokens finding out.

**promptbench** analyzes your AI config files for quality, consistency, and completeness — then lets you write test cases to verify expected behavior.

## Install

```bash
npm install -g promptbench
# or
npx promptbench
```

## Quick Start

```bash
# Audit your CLAUDE.md
npx promptbench --audit

# Generate a test file
npx promptbench init

# Run tests
npx promptbench
```

## How It Works

### Mode 1: Config Analysis (no LLM needed)

Analyzes your config file itself for quality issues:

```bash
npx promptbench --audit
```

```
┌──────────────────────────────────────────────────┐
│  CLAUDE.md Audit Report                          │
├──────────────────────────────────────────────────┤
│  Overall Score: 72/100                           │
├──────────────────────────────────────────────────┤
│  ✅ Has project overview                         │
│  ✅ Has build commands                           │
│  ✅ Has coding style rules                       │
│  ⚠️  Missing testing section                     │
│  ⚠️  No error handling rules                     │
│  ❌ Contradicting rules found:                   │
│     Line 12: "use tabs"                          │
│     Line 45: "use 2 spaces"                      │
│  ❌ 3 vague instructions found                   │
│     Line 23: "write good code"                   │
│     Line 67: "be careful"                        │
├──────────────────────────────────────────────────┤
│  2 errors, 2 warnings, 3 info                    │
└──────────────────────────────────────────────────┘
```

Detectors:
- **Contradictions** — finds conflicting rules (tabs vs spaces, npm vs pnpm)
- **Vagueness** — flags weasel words ("best practices", "be careful", "write good code")
- **Completeness** — checks for recommended sections (overview, build commands, testing, etc.)
- **Specificity** — scores how actionable your instructions are
- **Metrics** — line count, token estimate, section analysis

### Mode 2: Behavioral Simulation (optional, needs API key)

Test if your config actually produces expected AI behavior:

```bash
export ANTHROPIC_API_KEY=sk-...
npx promptbench --simulate
```

## Test File Format

Create `.promptbench.yml` in your project root:

```yaml
config: ./CLAUDE.md

tests:
  - name: "Uses pnpm not npm"
    scenario: "Install a new package"
    expect:
      contains: ["pnpm add", "pnpm install"]
      not_contains: ["npm install", "yarn add"]

  - name: "No any types in TypeScript"
    scenario: "Create a TypeScript function"
    expect:
      not_contains: ["any"]
      contains: ["interface", "type"]

  - name: "Uses conventional commits"
    scenario: "Commit changes"
    expect:
      pattern: "^(feat|fix|chore|docs|refactor|test)"

  - name: "Has build commands"
    check: "config_contains"
    expect:
      config_has: ["npm run build", "npm run test"]

  - name: "Config not too long"
    check: "config_metrics"
    expect:
      max_lines: 500
      max_tokens: 8000

  - name: "No contradictions"
    check: "config_consistency"
    expect:
      no_contradictions: true
```

## CLI

```bash
npx promptbench                        # Run all tests in .promptbench.yml
npx promptbench --config CLAUDE.md     # Analyze a specific config
npx promptbench --audit                # Full quality audit report
npx promptbench --score                # 0-100 quality score
npx promptbench --fix                  # Suggest improvements
npx promptbench --simulate             # Behavioral tests (needs API key)
npx promptbench --ci                   # CI mode: JSON output, exit 1 on failure
npx promptbench --format json          # JSON output
npx promptbench --format markdown      # Markdown report
npx promptbench init                   # Generate sample .promptbench.yml
```

## CI Integration

```yaml
# .github/workflows/promptbench.yml
name: Config Quality
on: [push, pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npx promptbench --ci --min-score 70
```

## Programmatic API

```typescript
import { audit, analyze, parseConfig } from 'promptbench';

const report = await audit('./CLAUDE.md');
console.log(report.score); // 85

const config = parseConfig('./CLAUDE.md');
const report = analyze(config);
```

## Supported Config Files

Auto-detected in order:
1. `CLAUDE.md`
2. `.cursorrules`
3. `.windsurfrules`
4. `.github/copilot-instructions.md`
5. `codex-instructions.md`

## vs "Just Hoping It Works"

| | Without promptbench | With promptbench |
|---|---|---|
| Config quality | Unknown | Scored 0-100 |
| Contradictions | Found after wasting tokens | Caught instantly |
| Vague rules | "It should work..." | Flagged with suggestions |
| Missing sections | Noticed weeks later | Detected immediately |
| CI enforcement | None | Exit code on failure |

## License

MIT
