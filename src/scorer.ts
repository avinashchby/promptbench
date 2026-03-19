import type { DetectorResult, MetricsResult } from './types.js';

/** Per-detector max deductions */
const MAX_DEDUCTIONS: Record<string, number> = {
  contradictions: 30,
  vagueness: 25,
  completeness: 20,
  specificity: 15,
};

/** Compute deduction for contradiction findings */
function scoreContradictions(findings: DetectorResult[]): number {
  let deduction = 0;
  for (const f of findings) {
    if (f.severity === 'error') deduction += 15;
    if (f.severity === 'warning') deduction += 5;
  }
  return Math.min(deduction, MAX_DEDUCTIONS.contradictions);
}

/** Compute deduction for vagueness findings */
function scoreVagueness(findings: DetectorResult[]): number {
  let deduction = 0;
  for (const f of findings) {
    if (f.severity === 'error') deduction += 10;
    if (f.severity === 'warning') deduction += 2;
  }
  return Math.min(deduction, MAX_DEDUCTIONS.vagueness);
}

/** Compute deduction for completeness findings */
function scoreCompleteness(findings: DetectorResult[]): number {
  let deduction = 0;
  for (const f of findings) {
    if (f.severity === 'warning') deduction += 5;
    if (f.severity === 'info') deduction += 3;
  }
  return Math.min(deduction, MAX_DEDUCTIONS.completeness);
}

/** Compute deduction for specificity findings */
function scoreSpecificity(findings: DetectorResult[]): number {
  let deduction = 0;
  for (const f of findings) {
    if (f.severity === 'warning') deduction += 2;
    if (f.severity === 'info') deduction += 1;
  }
  return Math.min(deduction, MAX_DEDUCTIONS.specificity);
}

/** Group detector results by detectorId */
function groupByDetector(
  results: DetectorResult[],
): Record<string, DetectorResult[]> {
  const groups: Record<string, DetectorResult[]> = {};
  for (const r of results) {
    if (!groups[r.detectorId]) groups[r.detectorId] = [];
    groups[r.detectorId].push(r);
  }
  return groups;
}

/**
 * Compute a 0-100 audit score from detector results and metrics.
 *
 * Starts at 100, applies per-detector deductions with caps,
 * adds metrics bonuses, then clamps to [0, 100].
 */
export function computeScore(
  results: DetectorResult[],
  metrics: MetricsResult,
): number {
  const grouped = groupByDetector(results);

  let score = 100;

  score -= scoreContradictions(grouped.contradictions ?? []);
  score -= scoreVagueness(grouped.vagueness ?? []);
  score -= scoreCompleteness(grouped.completeness ?? []);
  score -= scoreSpecificity(grouped.specificity ?? []);

  if (metrics.ruleCount > 10) score += 5;
  if (metrics.sectionCount > 3) score += 5;

  return Math.max(0, Math.min(100, score));
}
