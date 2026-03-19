import chalk from 'chalk';
import type { AuditReport, DetectorResult, Severity } from '../types.js';

const BOX_WIDTH = 50;
const INNER_WIDTH = BOX_WIDTH - 2; // minus left and right border chars

/** Pad or truncate text to fit inside the box */
function fitText(text: string, width: number): string {
  if (text.length > width) return text.slice(0, width - 1) + '\u2026';
  return text.padEnd(width);
}

/** Build the top border of the box */
function topBorder(): string {
  return '\u250c' + '\u2500'.repeat(INNER_WIDTH) + '\u2510';
}

/** Build the bottom border of the box */
function bottomBorder(): string {
  return '\u2514' + '\u2500'.repeat(INNER_WIDTH) + '\u2518';
}

/** Build a horizontal separator inside the box */
function separator(): string {
  return '\u251c' + '\u2500'.repeat(INNER_WIDTH) + '\u2524';
}

/** Build a content row inside the box */
function row(content: string): string {
  return '\u2502' + fitText(content, INNER_WIDTH) + '\u2502';
}

/** Colorize score based on threshold */
function colorScore(score: number): string {
  if (score >= 80) return chalk.green(String(score));
  if (score >= 50) return chalk.yellow(String(score));
  return chalk.red(String(score));
}

/** Icon for a severity level */
function severityIcon(severity: Severity): string {
  switch (severity) {
    case 'error': return chalk.red('\u2718');
    case 'warning': return chalk.yellow('\u26a0');
    case 'info': return chalk.blue('\u2714');
  }
}

/** Colorize a severity label */
function severityLabel(severity: Severity): string {
  switch (severity) {
    case 'error': return chalk.red('ERROR');
    case 'warning': return chalk.yellow('WARN');
    case 'info': return chalk.blue('INFO');
  }
}

/** Sort findings: errors first, then warnings, then info */
function sortBySeverity(results: DetectorResult[]): DetectorResult[] {
  const order: Record<Severity, number> = {
    error: 0,
    warning: 1,
    info: 2,
  };
  return [...results].sort((a, b) => order[a.severity] - order[b.severity]);
}

/** Count findings by severity */
function countBySeverity(
  results: DetectorResult[],
): Record<Severity, number> {
  const counts: Record<Severity, number> = { error: 0, warning: 0, info: 0 };
  for (const r of results) counts[r.severity]++;
  return counts;
}

/**
 * Format an audit report as a pretty terminal string with box drawing
 * and chalk colors.
 */
export function reportTerminal(report: AuditReport): string {
  const lines: string[] = [];
  const fileName = report.config.filePath;

  // Header
  lines.push(topBorder());
  lines.push(row(` Promptbench Audit`));
  lines.push(separator());
  lines.push(row(` File: ${fileName}`));
  lines.push(row(` Score: ${colorScore(report.score)}/100`));
  lines.push(separator());

  // Findings
  lines.push(row(` Findings`));
  lines.push(separator());

  const sorted = sortBySeverity(report.detectorResults);

  if (sorted.length === 0) {
    lines.push(row(` ${chalk.green('\u2714')} No issues found`));
  } else {
    for (const finding of sorted) {
      const icon = severityIcon(finding.severity);
      const label = severityLabel(finding.severity);
      const lineRef = finding.line ? `:${finding.line}` : '';
      const text = `${icon} [${label}] ${finding.message}${lineRef}`;
      lines.push(row(` ${text}`));
    }
  }

  lines.push(separator());

  // Metrics
  lines.push(row(` Metrics`));
  lines.push(separator());
  const m = report.metrics;
  lines.push(row(`  Lines: ${m.lineCount}`));
  lines.push(row(`  Tokens (est): ${m.tokenEstimate}`));
  lines.push(row(`  Sections: ${m.sectionCount}`));
  lines.push(row(`  Rules: ${m.ruleCount}`));
  lines.push(row(`  Avg rules/section: ${m.avgRulesPerSection}`));
  lines.push(row(`  Empty sections: ${m.emptySections}`));

  lines.push(separator());

  // Summary line
  const counts = countBySeverity(report.detectorResults);
  const summary =
    ` ${counts.error} errors, ${counts.warning} warnings, ` +
    `${counts.info} info - Score: ${colorScore(report.score)}/100`;
  lines.push(row(summary));

  lines.push(bottomBorder());

  return lines.join('\n');
}
