import type { AuditReport } from '../types.js';

/** Format an audit report as pretty-printed JSON */
export function reportJson(report: AuditReport): string {
  return JSON.stringify(report, null, 2);
}
