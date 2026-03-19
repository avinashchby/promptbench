/** Severity level for detector findings */
export type Severity = 'error' | 'warning' | 'info';

/** Output format for reports */
export type ReportFormat = 'terminal' | 'json' | 'markdown';

/** Config file format */
export type ConfigFormat = 'markdown' | 'yaml' | 'text';

/** A parsed section from a config file */
export interface Section {
  heading: string;
  level: number;
  content: string;
  lineStart: number;
  lineEnd: number;
}

/** An individual instruction/rule extracted from a section */
export interface Rule {
  text: string;
  section: string;
  line: number;
}

/** Metadata about a config file */
export interface ConfigMetadata {
  filePath: string;
  format: ConfigFormat;
  lineCount: number;
  tokenEstimate: number;
}

/** Parsed representation of a config file */
export interface ParsedConfig {
  raw: string;
  sections: Section[];
  rules: Rule[];
  metadata: ConfigMetadata;
}

/** Result from a detector */
export interface DetectorResult {
  detectorId: string;
  severity: Severity;
  message: string;
  line?: number;
  section?: string;
  suggestion?: string;
}

/** Metrics from the metrics detector */
export interface MetricsResult {
  lineCount: number;
  tokenEstimate: number;
  sectionCount: number;
  ruleCount: number;
  avgRulesPerSection: number;
  maxSectionLength: number;
  emptySections: number;
}

/** Full audit report */
export interface AuditReport {
  config: ConfigMetadata;
  score: number;
  detectorResults: DetectorResult[];
  metrics: MetricsResult;
  timestamp: string;
}

/** Check type for test specs - matching the YAML format */
export type CheckType =
  | 'behavioral'
  | 'config_contains'
  | 'config_metrics'
  | 'config_consistency';

/** Expectation for a test case */
export interface TestExpect {
  contains?: string[];
  not_contains?: string[];
  pattern?: string;
  config_has?: string[];
  max_lines?: number;
  max_tokens?: number;
  no_contradictions?: boolean;
}

/** A single test case from .promptbench.yml */
export interface TestCase {
  name: string;
  scenario?: string;
  check?: CheckType;
  expect: TestExpect;
}

/** Parsed .promptbench.yml test spec */
export interface TestSpec {
  configPath: string;
  tests: TestCase[];
}

/** Test run result */
export interface TestResult {
  name: string;
  pass: boolean;
  message: string;
  details?: string;
}

/** Simulation scenario */
export interface SimulationScenario {
  prompt: string;
  expected: string;
}

/** Simulation result */
export interface SimulationResult {
  scenario: string;
  expectedBehavior: string;
  actualResponse: string;
  pass: boolean;
  explanation: string;
}

/** Simulation options */
export interface SimulationOptions {
  provider: 'anthropic' | 'openai';
  apiKey: string;
  model?: string;
}

/** CLI configuration */
export interface CLIConfig {
  format: ReportFormat;
  configPath?: string;
  testFile?: string;
  ciMode: boolean;
  minScore: number;
}
