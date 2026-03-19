import { Command } from 'commander';
import { readFile, writeFile, access } from 'node:fs/promises';
import { resolve, basename } from 'node:path';
import { parseConfig, parseTestFile, detectConfigFiles } from './parser.js';
import { analyze, runTests } from './analyzer.js';
import { audit, auditWithTests } from './auditor.js';
import { formatReport } from './reporters/index.js';
import { reportTerminal } from './reporters/terminal.js';
import type { ReportFormat, TestResult } from './types.js';

const SAMPLE_YML = `# promptbench test configuration
# Docs: https://github.com/avinashchaubey/promptbench

config: ./CLAUDE.md

tests:
  - name: "Has project overview"
    check: "config_contains"
    expect:
      config_has: ["## Project", "## Overview"]

  - name: "Has build commands"
    check: "config_contains"
    expect:
      config_has: ["build", "test", "lint"]

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

  - name: "Mentions error handling"
    scenario: "Write code"
    expect:
      contains: ["error", "try", "catch"]
`;

/** Resolve the config file path - explicit or auto-detect */
async function resolveConfigPath(
  explicit?: string,
): Promise<string> {
  if (explicit) {
    const full = resolve(explicit);
    await access(full);
    return full;
  }
  const found = await detectConfigFiles();
  if (found.length === 0) {
    throw new Error(
      'No config file found. Specify one with --config or create a CLAUDE.md.',
    );
  }
  return found[0];
}

/** Resolve the test file path */
async function resolveTestFile(
  explicit?: string,
): Promise<string | null> {
  if (explicit) return resolve(explicit);
  const defaultPath = resolve('.promptbench.yml');
  try {
    await access(defaultPath);
    return defaultPath;
  } catch {
    return null;
  }
}

/** Format and print test results */
function printTestResults(results: TestResult[]): void {
  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;

  console.log('\n  Test Results:\n');
  for (const r of results) {
    const icon = r.pass ? '\x1b[32m  PASS\x1b[0m' : '\x1b[31m  FAIL\x1b[0m';
    console.log(`${icon}  ${r.name}`);
    if (!r.pass && r.message) {
      console.log(`        ${r.message}`);
    }
  }
  console.log(
    `\n  ${passed} passed, ${failed} failed, ${results.length} total\n`,
  );
}

const program = new Command();

program
  .name('promptbench')
  .description(
    'The testing framework for AI coding assistant configuration files',
  )
  .version('0.1.0');

program
  .command('init')
  .description('Generate a sample .promptbench.yml')
  .action(async () => {
    const target = resolve('.promptbench.yml');
    try {
      await access(target);
      console.error('.promptbench.yml already exists.');
      process.exitCode = 1;
      return;
    } catch {
      // File doesn't exist, good
    }
    await writeFile(target, SAMPLE_YML, 'utf-8');
    console.log('Created .promptbench.yml');
  });

program
  .command('run', { isDefault: true })
  .description('Run tests and analyze config')
  .option('-c, --config <path>', 'Path to config file')
  .option('-t, --test-file <path>', 'Path to .promptbench.yml')
  .option('--audit', 'Full quality audit report')
  .option('--score', 'Show score only')
  .option('--fix', 'Suggest improvements')
  .option('--simulate', 'Run behavioral simulation (needs API key)')
  .option('--ci', 'CI mode: exit 1 on failures')
  .option(
    '-f, --format <format>',
    'Output format: terminal, json, markdown',
    'terminal',
  )
  .option('--min-score <n>', 'Minimum passing score for CI', '70')
  .action(async (opts) => {
    try {
      const configPath = await resolveConfigPath(opts.config);
      const format = (opts.format || 'terminal') as ReportFormat;
      const ciMode = opts.ci || false;
      const minScore = parseInt(opts.minScore, 10);

      if (ciMode) {
        // CI mode always uses JSON
        const report = (await audit(configPath));
        const output = formatReport(report, 'json');
        console.log(output);
        if (report.score < minScore) {
          process.exitCode = 1;
        }
        return;
      }

      if (opts.score) {
        const report = await audit(configPath);
        console.log(report.score);
        return;
      }

      if (opts.audit || opts.fix) {
        const report = await audit(configPath);
        const output = formatReport(report, format);
        console.log(output);
        if (opts.fix) {
          printFixSuggestions(report.detectorResults);
        }
        return;
      }

      if (opts.simulate) {
        await runSimulation(configPath);
        return;
      }

      // Default: run tests if available, else audit
      const testFilePath = await resolveTestFile(opts.testFile);
      if (testFilePath) {
        const { report, testResults } = await auditWithTests(
          configPath,
          testFilePath,
        );
        const output = formatReport(report, format);
        console.log(output);
        printTestResults(testResults);
        const failed = testResults.filter((r) => !r.pass).length;
        if (failed > 0) {
          process.exitCode = 1;
        }
      } else {
        const report = await audit(configPath);
        const output = formatReport(report, format);
        console.log(output);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`Error: ${msg}`);
      process.exitCode = 1;
    }
  });

/** Print fix suggestions based on detector results */
function printFixSuggestions(
  results: import('./types.js').DetectorResult[],
): void {
  const withSuggestions = results.filter((r) => r.suggestion);
  if (withSuggestions.length === 0) {
    console.log('\n  No specific fix suggestions.\n');
    return;
  }
  console.log('\n  Suggested Fixes:\n');
  for (let i = 0; i < withSuggestions.length; i++) {
    const r = withSuggestions[i];
    const loc = r.line ? ` (line ${r.line})` : '';
    console.log(`  ${i + 1}. ${r.suggestion}${loc}`);
  }
  console.log('');
}

/** Run behavioral simulation */
async function runSimulation(configPath: string): Promise<void> {
  const { checkAvailability, simulate } = await import('./simulator.js');
  const avail = checkAvailability();
  if (!avail.available) {
    console.error(
      'No API key found. Set ANTHROPIC_API_KEY or OPENAI_API_KEY.',
    );
    process.exitCode = 1;
    return;
  }

  const config = await parseConfig(configPath);
  const testFilePath = await resolveTestFile();
  if (!testFilePath) {
    console.error(
      'No .promptbench.yml found. Create one with: promptbench init',
    );
    process.exitCode = 1;
    return;
  }

  const spec = await parseTestFile(testFilePath);
  const scenarios = spec.tests
    .filter((t) => t.scenario && !t.check)
    .map((t) => ({
      prompt: t.scenario!,
      expected: (t.expect.contains || []).join(', '),
    }));

  if (scenarios.length === 0) {
    console.log('No behavioral test scenarios found in test file.');
    return;
  }

  console.log(`Running ${scenarios.length} simulations...`);
  const results = await simulate(config, scenarios, {
    provider: avail.provider as 'anthropic' | 'openai',
    apiKey: avail.apiKey,
  });

  for (const r of results) {
    const icon = r.pass ? '\x1b[32m  PASS\x1b[0m' : '\x1b[31m  FAIL\x1b[0m';
    console.log(`${icon}  ${r.scenario}`);
    if (!r.pass) {
      console.log(`        ${r.explanation}`);
    }
  }

  const passed = results.filter((r) => r.pass).length;
  console.log(
    `\n  ${passed}/${results.length} simulations passed.\n`,
  );
}

program.parse();
