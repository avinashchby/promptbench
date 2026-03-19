export { parseConfig, parseTestFile, detectConfigFiles } from './parser.js';
export { analyze, runTests } from './analyzer.js';
export { audit, auditWithTests } from './auditor.js';
export { computeScore } from './scorer.js';
export { formatReport } from './reporters/index.js';
export { simulate, checkAvailability } from './simulator.js';
export type {
  ParsedConfig,
  Section,
  Rule,
  ConfigMetadata,
  DetectorResult,
  MetricsResult,
  AuditReport,
  TestSpec,
  TestCase,
  TestResult,
  SimulationResult,
  Severity,
  ReportFormat,
} from './types.js';
