# promptbench

The testing framework for AI coding assistant configuration files.

## Quick Start

```bash
npx @avinashchby/promptbench
```

## What It Does

You spend time writing `CLAUDE.md`, `.cursorrules`, or similar config files to instruct your AI coding assistant — but there's no guarantee the file is consistent, complete, or well-formed enough to be effective. promptbench analyzes these files statically, scoring them across four quality dimensions: contradictions, vagueness, completeness, and specificity. It also lets you write a `.promptbench.yml` test spec to assert that required content is present, metrics stay within bounds, and rules don't conflict — with optional LLM-backed behavioral simulation to verify the AI actually follows your instructions.

## Features

- Auto-detects `CLAUDE.md`, `.cursorrules`, `.windsurfrules`, `.github/copilot-instructions.md`, and `codex-instructions.md`
- Contradiction detector — catches conflicting rules (e.g. "use tabs" vs "use 2 spaces")
- Vagueness detector — flags weasel-word instructions like "write good code" or "be careful"
- Completeness detector — checks for recommended sections (overview, build commands, testing, error handling)
- Specificity scorer — rates how actionable each rule is on a 0-3 scale
- Metrics reporter — line count, token estimate, section count, rules per section
- Test specs via `.promptbench.yml` with six check types: `config_contains`, `config_metrics`, `config_consistency`, `config_completeness`, `config_specificity`, and behavioral pattern matching
- CI mode with JSON output and configurable minimum score threshold

## Usage

```bash
# Auto-detect your config and run audit
npx @avinashchby/promptbench --audit

# Run tests defined in .promptbench.yml (default behavior when the file exists)
npx @avinashchby/promptbench

# Get a single 0-100 quality score
npx @avinashchby/promptbench --score

# Print improvement suggestions alongside the audit
npx @avinashchby/promptbench --fix

# CI mode: outputs JSON, exits 1 if score is below the minimum (default 70)
npx @avinashchby/promptbench --ci --min-score 80

# Run behavioral simulations against a live LLM (requires ANTHROPIC_API_KEY or OPENAI_API_KEY)
npx @avinashchby/promptbench --simulate

# Output report as markdown or JSON instead of the default terminal UI
npx @avinashchby/promptbench --audit --format markdown
npx @avinashchby/promptbench --audit --format json

# Point at a specific config or test file
npx @avinashchby/promptbench --config path/to/CLAUDE.md --test-file path/to/tests.yml

# Generate a sample .promptbench.yml to get started
npx @avinashchby/promptbench init
```

## Example Output

Terminal audit report (default format):

```
┌────────────────────────────────────────────────┐
│ Promptbench Audit                              │
├────────────────────────────────────────────────┤
│ File: /project/CLAUDE.md                      │
│ Score: 78/100                                  │
├────────────────────────────────────────────────┤
│ Findings                                       │
├────────────────────────────────────────────────┤
│ ✘ [ERROR] Contradicting rules: "use tabs" vs … │
│ ⚠ [WARN]  Vague instruction: "write good code" │
│ ✔ [INFO]  Missing section: error handling      │
├────────────────────────────────────────────────┤
│ Metrics                                        │
├────────────────────────────────────────────────┤
│  Lines: 120                                    │
│  Tokens (est): 890                             │
│  Sections: 6                                   │
│  Rules: 24                                     │
│  Avg rules/section: 4                          │
│  Empty sections: 0                             │
├────────────────────────────────────────────────┤
│ 1 errors, 1 warnings, 1 info - Score: 78/100  │
└────────────────────────────────────────────────┘
```

Test run output (when `.promptbench.yml` is present):

```
  Test Results:

  PASS  Has project overview
  PASS  Has build commands
  PASS  Config is not too long
  FAIL  No contradicting rules
        Found 1 contradiction error(s)

  3 passed, 1 failed, 4 total
```

Sample `.promptbench.yml`:

```yaml
config: ./CLAUDE.md

tests:
  - name: "Has project overview"
    check: "config_contains"
    expect:
      config_has: ["## Project", "## Overview"]

  - name: "Config is not too long"
    check: "config_metrics"
    expect:
      max_lines: 500
      max_tokens: 8000

  - name: "No contradicting rules"
    check: "config_consistency"
    expect:
      no_contradictions: true

  - name: "Uses conventional commits"
    scenario: "Commit changes"
    expect:
      contains: ["feat:", "fix:", "chore:"]
```

## Installation

```bash
npm install -g @avinashchby/promptbench
# or
npx @avinashchby/promptbench
```

## License

MIT
