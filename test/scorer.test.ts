import { computeScore } from '../src/scorer.js';
import type { DetectorResult, MetricsResult } from '../src/types.js';

const baseMetrics: MetricsResult = {
  lineCount: 50,
  tokenEstimate: 500,
  sectionCount: 5,
  ruleCount: 15,
  avgRulesPerSection: 3,
  maxSectionLength: 200,
  emptySections: 0,
};

describe('computeScore', () => {
  it('returns 100 (+ bonuses) for empty results with decent metrics', () => {
    const score = computeScore([], baseMetrics);

    // 100 base + 5 (ruleCount > 10) + 5 (sectionCount > 3) = 100 (clamped)
    expect(score).toBe(100);
  });

  it('deducts points for contradictions', () => {
    const results: DetectorResult[] = [
      {
        detectorId: 'contradictions',
        severity: 'error',
        message: 'Conflict: tabs vs spaces',
      },
    ];

    const score = computeScore(results, baseMetrics);
    // 100 - 15 (error) + 5 + 5 = 95
    expect(score).toBeLessThan(100);
    expect(score).toBe(95);
  });

  it('deducts points for vagueness', () => {
    const results: DetectorResult[] = [
      {
        detectorId: 'vagueness',
        severity: 'warning',
        message: 'Vague: "good"',
      },
      {
        detectorId: 'vagueness',
        severity: 'warning',
        message: 'Vague: "best practices"',
      },
    ];

    const score = computeScore(results, baseMetrics);
    // 100 - 4 (2 warnings * 2) + 5 + 5 = 100 (clamped)
    expect(score).toBeLessThanOrEqual(100);
  });

  it('clamps score to 0-100 range', () => {
    // Generate enough errors to drive score well below 0
    const results: DetectorResult[] = [];
    for (let i = 0; i < 10; i++) {
      results.push({
        detectorId: 'contradictions',
        severity: 'error',
        message: `Contradiction ${i}`,
      });
      results.push({
        detectorId: 'vagueness',
        severity: 'error',
        message: `Vague ${i}`,
      });
      results.push({
        detectorId: 'completeness',
        severity: 'warning',
        message: `Missing ${i}`,
      });
      results.push({
        detectorId: 'specificity',
        severity: 'warning',
        message: `Unspecific ${i}`,
      });
    }

    const lowMetrics: MetricsResult = {
      ...baseMetrics,
      ruleCount: 2,
      sectionCount: 1,
    };

    const score = computeScore(results, lowMetrics);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});
