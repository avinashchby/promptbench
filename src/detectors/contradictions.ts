import type { ParsedConfig, DetectorResult } from '../types.js';

/** Each pair uses regex patterns with word boundaries to avoid substring matches (e.g. "npm" inside "pnpm") */
const CONFLICT_PAIRS: [RegExp, RegExp, string][] = [
  [/\bnpm\b(?!\.)/i, /\bpnpm\b/i, 'Package manager conflict'],
  [/\bnpm\b(?!\.)/i, /\byarn\b/i, 'Package manager conflict'],
  [/\bpnpm\b/i, /\byarn\b/i, 'Package manager conflict'],
  [/\bjest\b/i, /\bvitest\b/i, 'Test framework conflict'],
  [/\bjest\b/i, /\bmocha\b/i, 'Test framework conflict'],
  [/\bvitest\b/i, /\bmocha\b/i, 'Test framework conflict'],
  [/\btabs\b/i, /\bspaces\b/i, 'Indentation style conflict'],
  [/single quotes/i, /double quotes/i, 'Quote style conflict'],
  [/\bsemicolons\b/i, /no semicolons/i, 'Semicolon style conflict'],
  [/class components/i, /functional components/i, 'Component style conflict'],
  [/\brest\s*api\b/i, /\bgraphql\b/i, 'API style conflict'],
  [/\bmongoose\b/i, /\bprisma\b/i, 'ORM conflict'],
  [/\bmongoose\b/i, /raw sql/i, 'Database access conflict'],
  [/\bprisma\b/i, /raw sql/i, 'Database access conflict'],
  [/css modules/i, /styled-components/i, 'Styling approach conflict'],
  [/\bmoment\b/i, /\bdayjs\b/i, 'Date library conflict'],
];

const PATTERN_CONFLICTS: [RegExp, RegExp, string][] = [
  [/always\s+(\w+)/i, /never\s+(\w+)/i, 'Contradictory always/never'],
  [/\buse\s+(\w+)/i, /avoid\s+(\w+)/i, 'Contradictory use/avoid'],
  [/prefer\s+(\w+)/i, /don't use\s+(\w+)/i, 'Contradictory prefer/don\'t use'],
];

/** Detect conflicting rules within a parsed config. */
export function detectContradictions(config: ParsedConfig): DetectorResult[] {
  const results: DetectorResult[] = [];

  for (const [re1, re2, desc] of CONFLICT_PAIRS) {
    const matches1 = config.rules.filter(r => re1.test(r.text));
    const matches2 = config.rules.filter(r => re2.test(r.text));
    for (const r1 of matches1) {
      for (const r2 of matches2) {
        if (r1 === r2) continue;
        const sameSection = r1.section === r2.section;
        results.push({
          detectorId: 'contradictions',
          severity: sameSection ? 'error' : 'warning',
          message: `${desc}: "${r1.text.slice(0, 40)}" vs "${r2.text.slice(0, 40)}"`,
          line: r1.line,
          section: r1.section,
          suggestion: `Resolve conflict between line ${r1.line} and line ${r2.line}`,
        });
      }
    }
  }

  for (const [re1, re2, desc] of PATTERN_CONFLICTS) {
    for (const r1 of config.rules) {
      const m1 = r1.text.match(re1);
      if (!m1) continue;
      for (const r2 of config.rules) {
        if (r1 === r2) continue;
        const m2 = r2.text.match(re2);
        if (!m2 && m1[1] && m2) continue;
        if (m2 && m1[1] && m2[1] && m1[1].toLowerCase() === m2[1].toLowerCase()) {
          const sameSection = r1.section === r2.section;
          results.push({
            detectorId: 'contradictions',
            severity: sameSection ? 'error' : 'warning',
            message: `${desc} for "${m1[1]}": "${r1.text.slice(0, 60)}" vs "${r2.text.slice(0, 60)}"`,
            line: r1.line,
            section: r1.section,
            suggestion: `Reconcile conflicting instructions about "${m1[1]}"`,
          });
        }
      }
    }
  }

  return results;
}
