import type {
  ParsedConfig,
  TestSpec,
  TestCase,
  TestResult,
  AuditReport,
  DetectorResult,
} from './types.js';
import { detectContradictions } from './detectors/contradictions.js';
import { detectVagueness } from './detectors/vagueness.js';
import { detectCompleteness } from './detectors/completeness.js';
import { detectSpecificity } from './detectors/specificity.js';
import { computeMetrics, detectMetricIssues } from './detectors/metrics.js';
import { computeScore } from './scorer.js';

/** Run all detectors against a parsed config and return a full audit report. */
export function analyze(config: ParsedConfig): AuditReport {
  const detectorResults: DetectorResult[] = [
    ...detectContradictions(config),
    ...detectVagueness(config),
    ...detectCompleteness(config),
    ...detectSpecificity(config),
  ];

  const metrics = computeMetrics(config);
  const metricIssues = detectMetricIssues(config);
  detectorResults.push(...metricIssues);

  const score = computeScore(detectorResults, metrics);

  return {
    config: config.metadata,
    score,
    detectorResults,
    metrics,
    timestamp: new Date().toISOString(),
  };
}

/** Check a behavioral/no-check test case against raw config content. */
function evaluateBehavioral(test: TestCase, raw: string): TestResult {
  const lower = raw.toLowerCase();

  if (test.expect.contains) {
    for (const s of test.expect.contains) {
      if (!lower.includes(s.toLowerCase())) {
        return { name: test.name, pass: false, message: `Missing expected string: "${s}"` };
      }
    }
  }

  if (test.expect.not_contains) {
    for (const s of test.expect.not_contains) {
      if (lower.includes(s.toLowerCase())) {
        return { name: test.name, pass: false, message: `Found forbidden string: "${s}"` };
      }
    }
  }

  if (test.expect.pattern) {
    const re = new RegExp(test.expect.pattern);
    if (!re.test(raw)) {
      return { name: test.name, pass: false, message: `Pattern not matched: ${test.expect.pattern}` };
    }
  }

  return { name: test.name, pass: true, message: 'All behavioral checks passed' };
}

/** Check config_contains: each string in config_has must appear in raw. */
function evaluateConfigContains(test: TestCase, raw: string): TestResult {
  const items = test.expect.config_has ?? [];
  const lower = raw.toLowerCase();

  for (const s of items) {
    if (!lower.includes(s.toLowerCase())) {
      return { name: test.name, pass: false, message: `Config missing required content: "${s}"` };
    }
  }

  return { name: test.name, pass: true, message: 'All config_has items found' };
}

/** Check config_metrics: validate line/token counts against thresholds. */
function evaluateConfigMetrics(test: TestCase, config: ParsedConfig): TestResult {
  const { max_lines, max_tokens } = test.expect;
  const { lineCount, tokenEstimate } = config.metadata;

  if (max_lines !== undefined && lineCount > max_lines) {
    return {
      name: test.name,
      pass: false,
      message: `Line count ${lineCount} exceeds max ${max_lines}`,
    };
  }

  if (max_tokens !== undefined && tokenEstimate > max_tokens) {
    return {
      name: test.name,
      pass: false,
      message: `Token estimate ${tokenEstimate} exceeds max ${max_tokens}`,
    };
  }

  return { name: test.name, pass: true, message: 'Metrics within thresholds' };
}

/** Check config_consistency: run contradiction detector and check for errors. */
function evaluateConfigConsistency(test: TestCase, config: ParsedConfig): TestResult {
  if (!test.expect.no_contradictions) {
    return { name: test.name, pass: true, message: 'No consistency check requested' };
  }

  const contradictions = detectContradictions(config);
  const errors = contradictions.filter(r => r.severity === 'error');

  if (errors.length > 0) {
    return {
      name: test.name,
      pass: false,
      message: `Found ${errors.length} contradiction error(s)`,
      details: errors.map(e => e.message).join('; '),
    };
  }

  return { name: test.name, pass: true, message: 'No contradictions detected' };
}

/** Check config_completeness: run completeness detector and validate missing section count. */
function evaluateConfigCompleteness(test: TestCase, config: ParsedConfig): TestResult {
  const findings = detectCompleteness(config);
  const missingCount = findings.length;
  const maxMissing = test.expect.max_missing_sections ?? 0;

  if (missingCount > maxMissing) {
    return {
      name: test.name,
      pass: false,
      message: `Missing ${missingCount} section(s), max allowed: ${maxMissing}`,
      details: findings.map(f => f.message).join('; '),
    };
  }

  return { name: test.name, pass: true, message: `Completeness OK (${missingCount} missing, max ${maxMissing})` };
}

/** Check config_specificity: run specificity detector and validate average score. */
function evaluateConfigSpecificity(test: TestCase, config: ParsedConfig): TestResult {
  const findings = detectSpecificity(config);
  const minScore = test.expect.min_specificity ?? 1.5;

  let totalScore = 0;
  for (const rule of config.rules) {
    const lower = rule.text.toLowerCase();
    const hasTool = ['react', 'vue', 'typescript', 'eslint', 'prettier', 'jest', 'vitest',
      'pnpm', 'npm', 'yarn', 'docker', 'postgres', 'redis', 'tailwind', 'vite',
      'node', 'python', 'rust', 'go', 'zod', 'graphql', 'aws'].some(t => lower.includes(t));
    const hasBacktick = /`.+`/.test(rule.text);
    const hasNumber = /\d+/.test(rule.text);
    const hasExtension = /\.\w{2,4}\b/.test(rule.text);
    const hasVerb = /\b(use|add|create|write|run|install|avoid|prefer|require|ensure|always|never)\b/i.test(rule.text);

    const hasSpecific = hasTool || hasBacktick || hasExtension;
    if (hasNumber && hasSpecific) totalScore += 3;
    else if (hasSpecific || hasNumber) totalScore += 2;
    else if (hasVerb) totalScore += 1;
  }

  const avg = config.rules.length > 0 ? totalScore / config.rules.length : 0;

  if (avg < minScore) {
    return {
      name: test.name,
      pass: false,
      message: `Average specificity ${avg.toFixed(1)}/3, minimum required: ${minScore}`,
      details: findings.filter(f => f.severity === 'warning').map(f => f.message).join('; '),
    };
  }

  return { name: test.name, pass: true, message: `Specificity OK (avg ${avg.toFixed(1)}/3)` };
}

/** Run test cases from a test spec against a parsed config. */
export function runTests(config: ParsedConfig, spec: TestSpec): TestResult[] {
  return spec.tests.map((test) => {
    switch (test.check) {
      case 'config_contains':
        return evaluateConfigContains(test, config.raw);
      case 'config_metrics':
        return evaluateConfigMetrics(test, config);
      case 'config_consistency':
        return evaluateConfigConsistency(test, config);
      case 'config_completeness':
        return evaluateConfigCompleteness(test, config);
      case 'config_specificity':
        return evaluateConfigSpecificity(test, config);
      case 'behavioral':
      default:
        return evaluateBehavioral(test, config.raw);
    }
  });
}
