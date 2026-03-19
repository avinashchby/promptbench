import type { ParsedConfig, DetectorResult } from '../types.js';

const VAGUE_WORDS = [
  'appropriate', 'reasonable', 'good', 'proper', 'clean', 'nice',
  'simple', 'when needed', 'as necessary', 'if possible', 'try to',
  'should generally', 'best practices', 'be careful', 'as needed',
  'when appropriate', 'if applicable', 'consider', 'might want to',
  'could be', 'ideally',
];

const QUALIFIER_PATTERNS = [
  /\d+/,           // numbers
  /`.+`/,          // backtick content
  /\.\w{2,4}\b/,   // file extensions
  /\/[\w./]+/,     // file paths
];

/** Check whether a rule has a concrete qualifier that offsets vagueness. */
function hasConcreteQualifier(text: string): boolean {
  return QUALIFIER_PATTERNS.some(p => p.test(text));
}

/** Detect vague rules lacking concrete, actionable details. */
export function detectVagueness(config: ParsedConfig): DetectorResult[] {
  const results: DetectorResult[] = [];
  let vagueCount = 0;

  for (const rule of config.rules) {
    const lower = rule.text.toLowerCase();
    const found = VAGUE_WORDS.filter(w => lower.includes(w));

    if (found.length > 0 && !hasConcreteQualifier(rule.text)) {
      vagueCount++;
      results.push({
        detectorId: 'vagueness',
        severity: 'warning',
        message: `Vague language: "${found.join('", "')}" without concrete details`,
        line: rule.line,
        section: rule.section,
        suggestion: `Add specifics: numbers, tool names, file paths, or code patterns in backticks`,
      });
    }
  }

  if (config.rules.length > 0 && vagueCount / config.rules.length > 0.5) {
    results.push({
      detectorId: 'vagueness',
      severity: 'error',
      message: `${vagueCount}/${config.rules.length} rules (${Math.round(vagueCount / config.rules.length * 100)}%) are vague — config lacks actionable specifics`,
      suggestion: 'Rewrite rules with measurable criteria, specific tools, and concrete examples',
    });
  }

  return results;
}
