import { parseConfig, parseTestFile } from './parser.js';
import { analyze, runTests } from './analyzer.js';
import type { AuditReport, TestResult } from './types.js';

/** Parse a config file and run a full audit, returning the report. */
export async function audit(configPath: string): Promise<AuditReport> {
  const config = await parseConfig(configPath);
  return analyze(config);
}

/** Parse a config and test spec, run audit + tests, return both. */
export async function auditWithTests(
  configPath: string,
  testFilePath: string,
): Promise<{ report: AuditReport; testResults: TestResult[] }> {
  const config = await parseConfig(configPath);
  const spec = await parseTestFile(testFilePath);
  const report = analyze(config);
  const testResults = runTests(config, spec);
  return { report, testResults };
}
