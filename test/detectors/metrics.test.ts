import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { computeMetrics, detectMetricIssues } from '../../src/detectors/metrics.js';
import { parseConfig } from '../../src/parser.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const fixturePath = (name: string) => resolve(__dirname, '../fixtures', name);

describe('computeMetrics', () => {
  it('returns correct counts for sample-claude.md', async () => {
    const config = await parseConfig(fixturePath('sample-claude.md'));
    const m = computeMetrics(config);

    expect(m.lineCount).toBe(56);
    expect(m.tokenEstimate).toBe(318);
    expect(m.sectionCount).toBe(8);
    expect(m.ruleCount).toBe(31);
    expect(m.avgRulesPerSection).toBe(3.9);
    expect(m.maxSectionLength).toBe(9);
    expect(m.emptySections).toBe(0);
  });

  it('returns correct counts for bad-claude.md', async () => {
    const config = await parseConfig(fixturePath('bad-claude.md'));
    const m = computeMetrics(config);

    expect(m.lineCount).toBe(18);
    expect(m.sectionCount).toBe(3);
    expect(m.ruleCount).toBe(10);
    // Top-level "#" heading has no content before the first "##"
    expect(m.emptySections).toBe(1);
  });
});

describe('detectMetricIssues', () => {
  it('returns no issues for a well-sized config (sample-claude.md)', async () => {
    const config = await parseConfig(fixturePath('sample-claude.md'));
    const results = detectMetricIssues(config);

    // 56 lines, ~318 tokens, 8 sections, 31 rules — all within thresholds
    expect(results).toHaveLength(0);
  });

  it('returns no errors or warnings for sample-claude.md', async () => {
    const config = await parseConfig(fixturePath('sample-claude.md'));
    const results = detectMetricIssues(config);

    const errorsAndWarnings = results.filter(
      (r) => r.severity === 'error' || r.severity === 'warning',
    );
    expect(errorsAndWarnings).toHaveLength(0);
  });

  it('flags empty section issue for bad-claude.md', async () => {
    const config = await parseConfig(fixturePath('bad-claude.md'));
    const results = detectMetricIssues(config);

    const emptyIssue = results.find((r) => r.message.includes('empty section'));
    expect(emptyIssue).toBeDefined();
    expect(emptyIssue?.severity).toBe('info');
    expect(emptyIssue?.detectorId).toBe('metrics');
  });

  it('all findings for bad-claude.md carry the metrics detector id', async () => {
    const config = await parseConfig(fixturePath('bad-claude.md'));
    const results = detectMetricIssues(config);

    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.detectorId === 'metrics')).toBe(true);
  });
});
