import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectSpecificity } from '../../src/detectors/specificity.js';
import { parseConfig } from '../../src/parser.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const fixturePath = (name: string) => resolve(__dirname, '../fixtures', name);

describe('detectSpecificity', () => {
  it('sample-claude.md has a lower proportion of zero-specificity rules than bad-claude.md', async () => {
    const sampleConfig = await parseConfig(fixturePath('sample-claude.md'));
    const badConfig = await parseConfig(fixturePath('bad-claude.md'));

    // Per-rule warnings (score === 0), excluding the summary avg warning that has no line
    const perRuleWarning = (r: { severity: string; line?: number }) =>
      r.severity === 'warning' && r.line !== undefined;

    const sampleResults = detectSpecificity(sampleConfig);
    const badResults = detectSpecificity(badConfig);

    const sampleRatio =
      sampleResults.filter(perRuleWarning).length / sampleConfig.rules.length;
    const badRatio =
      badResults.filter(perRuleWarning).length / badConfig.rules.length;

    // sample-claude.md has specific tool names (pnpm, Vitest, TypeScript, PostgreSQL)
    // so a smaller fraction of its rules should score 0 than bad-claude.md
    expect(sampleRatio).toBeLessThan(badRatio);
  });

  it('returns warnings for vague rules in bad-claude.md', async () => {
    const config = await parseConfig(fixturePath('bad-claude.md'));
    const results = detectSpecificity(config);

    const warnings = results.filter(r => r.severity === 'warning');
    expect(warnings.length).toBeGreaterThan(0);

    // "Be careful with errors", "Try to be clean", "Consider using proper naming"
    // all have score 0 — no tool, number, backtick, extension, or action verb
    const messages = warnings.map(r => r.message).join('\n');
    expect(messages).toMatch(/be careful with errors/i);
    expect(messages).toMatch(/try to be clean/i);
  });

  it('flags low average specificity on bad-claude.md', async () => {
    const config = await parseConfig(fixturePath('bad-claude.md'));
    const results = detectSpecificity(config);

    const avgWarning = results.find(
      r => r.severity === 'warning' && r.message.includes('Average specificity'),
    );
    expect(avgWarning).toBeDefined();
    // average should be below 1.5/3
    expect(avgWarning?.message).toMatch(/[0-9.]+\/3/);
  });

  it('reports info severity for action-verb-only rules in bad-claude.md', async () => {
    const config = await parseConfig(fixturePath('bad-claude.md'));
    const results = detectSpecificity(config);

    const infoResults = results.filter(r => r.severity === 'info');
    // "Use best practices", "Use tabs for indentation", "If possible, write tests"
    // each has an action verb but no tool/number/backtick → score 1 → info
    expect(infoResults.length).toBeGreaterThan(0);
  });

  it('all results include a suggestion', async () => {
    const config = await parseConfig(fixturePath('bad-claude.md'));
    const results = detectSpecificity(config);

    for (const r of results) {
      expect(r.suggestion).toBeTruthy();
    }
  });

  it('all results have detectorId set to specificity', async () => {
    const config = await parseConfig(fixturePath('bad-claude.md'));
    const results = detectSpecificity(config);

    for (const r of results) {
      expect(r.detectorId).toBe('specificity');
    }
  });
});
