import type { AuditReport, ReportFormat } from '../types.js';
import { reportTerminal } from './terminal.js';
import { reportJson } from './json.js';
import { reportMarkdown } from './markdown.js';

/**
 * Format an audit report using the specified output format.
 *
 * Delegates to the appropriate reporter module based on the format string.
 */
export function formatReport(
  report: AuditReport,
  format: ReportFormat,
): string {
  switch (format) {
    case 'terminal':
      return reportTerminal(report);
    case 'json':
      return reportJson(report);
    case 'markdown':
      return reportMarkdown(report);
  }
}
