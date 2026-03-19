import type { ParsedConfig, DetectorResult, MetricsResult } from '../types.js';

/** Compute quantitative metrics for a parsed config. */
export function computeMetrics(config: ParsedConfig): MetricsResult {
  const lines = config.raw.split('\n');
  const lineCount = lines.length;
  const tokenEstimate = Math.ceil(config.raw.length / 4);
  const sectionCount = config.sections.length;
  const ruleCount = config.rules.length;
  const avgRulesPerSection = sectionCount > 0
    ? Math.round((ruleCount / sectionCount) * 10) / 10
    : 0;

  let maxSectionLength = 0;
  let emptySections = 0;
  for (const section of config.sections) {
    const len = section.lineEnd - section.lineStart + 1;
    if (len > maxSectionLength) maxSectionLength = len;
    if (section.content.trim().length === 0) emptySections++;
  }

  return {
    lineCount,
    tokenEstimate,
    sectionCount,
    ruleCount,
    avgRulesPerSection,
    maxSectionLength,
    emptySections,
  };
}

/** Flag metric-based issues in a parsed config. */
export function detectMetricIssues(config: ParsedConfig): DetectorResult[] {
  const m = computeMetrics(config);
  const results: DetectorResult[] = [];
  const id = 'metrics';

  if (m.lineCount > 1000) {
    results.push({ detectorId: id, severity: 'error', message: `Config is ${m.lineCount} lines — excessively long`, suggestion: 'Split into multiple focused config files' });
  } else if (m.lineCount > 500) {
    results.push({ detectorId: id, severity: 'warning', message: `Config is ${m.lineCount} lines — consider splitting`, suggestion: 'Break into smaller, topic-focused files' });
  }

  if (m.tokenEstimate > 8000) {
    results.push({ detectorId: id, severity: 'warning', message: `Estimated ${m.tokenEstimate} tokens — may exceed context window limits`, suggestion: 'Reduce verbosity or split across files' });
  }

  if (m.emptySections > 0) {
    results.push({ detectorId: id, severity: 'info', message: `${m.emptySections} empty section(s) found`, suggestion: 'Add content or remove empty sections' });
  }

  if (m.ruleCount < 5) {
    results.push({ detectorId: id, severity: 'warning', message: `Only ${m.ruleCount} rules defined — very few`, suggestion: 'Add more specific rules covering style, testing, and error handling' });
  }

  if (m.sectionCount < 2) {
    results.push({ detectorId: id, severity: 'warning', message: `Only ${m.sectionCount} section(s) — consider organizing into sections`, suggestion: 'Group rules under descriptive headings' });
  }

  return results;
}
