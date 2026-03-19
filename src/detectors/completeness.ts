import type { ParsedConfig, DetectorResult } from '../types.js';

interface ExpectedSection {
  keywords: string[];
  label: string;
  suggestion: string;
}

const EXPECTED_SECTIONS: ExpectedSection[] = [
  { keywords: ['project overview', 'about', 'description'], label: 'Project Overview', suggestion: 'Add a section describing what the project does and its goals' },
  { keywords: ['tech stack', 'technologies', 'dependencies'], label: 'Tech Stack', suggestion: 'List the key technologies, frameworks, and libraries used' },
  { keywords: ['build', 'scripts', 'development', 'commands'], label: 'Build Commands', suggestion: 'Document build, dev, and run commands' },
  { keywords: ['coding style', 'code quality', 'conventions'], label: 'Coding Style', suggestion: 'Define formatting, naming, and style conventions' },
  { keywords: ['testing', 'tests', 'test'], label: 'Testing', suggestion: 'Describe testing framework, patterns, and coverage expectations' },
  { keywords: ['error handling', 'errors'], label: 'Error Handling', suggestion: 'Specify error handling patterns and logging approach' },
  { keywords: ['file structure', 'project structure', 'architecture'], label: 'File Structure', suggestion: 'Outline directory layout and module organization' },
  { keywords: ['git', 'commits', 'version control'], label: 'Git / Version Control', suggestion: 'Define commit message format, branching strategy, and PR process' },
  { keywords: ['communication', 'tone', 'response format'], label: 'Communication Style', suggestion: 'Specify how the AI should communicate (tone, length, format)' },
];

/** Detect missing sections that a comprehensive config should cover. */
export function detectCompleteness(config: ParsedConfig): DetectorResult[] {
  const headings = config.sections.map(s => s.heading.toLowerCase());
  const results: DetectorResult[] = [];
  let missingCount = 0;

  for (const expected of EXPECTED_SECTIONS) {
    const found = expected.keywords.some(kw =>
      headings.some(h => h.includes(kw))
    );
    if (!found) {
      missingCount++;
      results.push({
        detectorId: 'completeness',
        severity: 'info',
        message: `Missing section: ${expected.label}`,
        suggestion: expected.suggestion,
      });
    }
  }

  if (missingCount >= 3) {
    for (const r of results) {
      r.severity = 'warning';
    }
  }

  return results;
}
