import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { basename, join, extname } from 'node:path';
import yaml from 'js-yaml';
import type {
  ParsedConfig,
  Section,
  Rule,
  ConfigMetadata,
  ConfigFormat,
  TestSpec,
  TestCase,
  TestExpect,
  CheckType,
} from './types.js';

/** Well-known config file paths, searched in priority order. */
const CONFIG_FILE_CANDIDATES = [
  'CLAUDE.md',
  '.cursorrules',
  '.windsurfrules',
  '.github/copilot-instructions.md',
  'codex-instructions.md',
];

const HEADING_RE = /^(#{1,6})\s+(.+)$/;
const LIST_ITEM_RE = /^\s*[-*]\s+(.+)/;

/**
 * Detect config format from file extension.
 */
function detectFormat(filePath: string): ConfigFormat {
  const ext = extname(filePath).toLowerCase();
  if (ext === '.md' || ext === '.markdown') return 'markdown';
  if (ext === '.yml' || ext === '.yaml') return 'yaml';
  return 'text';
}

/**
 * Parse markdown content into sections by splitting on headings.
 */
function parseMarkdownSections(raw: string): Section[] {
  const lines = raw.split('\n');
  const sections: Section[] = [];
  let current: { heading: string; level: number; lineStart: number; lines: string[] } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(HEADING_RE);
    if (match) {
      if (current) {
        sections.push(finalizeSection(current, i - 1));
      }
      current = { heading: match[2], level: match[1].length, lineStart: i + 1, lines: [] };
    } else if (current) {
      current.lines.push(lines[i]);
    }
  }

  if (current) {
    sections.push(finalizeSection(current, lines.length));
  }
  return sections;
}

/**
 * Convert accumulated section data into a Section object.
 */
function finalizeSection(
  sec: { heading: string; level: number; lineStart: number; lines: string[] },
  lineEnd: number,
): Section {
  return {
    heading: sec.heading,
    level: sec.level,
    content: sec.lines.join('\n').trim(),
    lineStart: sec.lineStart,
    lineEnd,
  };
}

/**
 * Parse YAML content into sections. Each top-level key becomes a section.
 */
function parseYamlSections(raw: string): Section[] {
  const doc = yaml.load(raw);
  if (typeof doc !== 'object' || doc === null) {
    return [{ heading: 'root', level: 1, content: raw.trim(), lineStart: 1, lineEnd: raw.split('\n').length }];
  }

  const entries = Object.entries(doc as Record<string, unknown>);
  return entries.map((entry, idx) => {
    const [key, value] = entry;
    const content = typeof value === 'string' ? value : yaml.dump(value).trim();
    return {
      heading: key,
      level: 1,
      content,
      lineStart: idx + 1,
      lineEnd: idx + 1,
    };
  });
}

/**
 * Parse plain text content as a single section.
 */
function parseTextSections(raw: string): Section[] {
  const lineCount = raw.split('\n').length;
  return [{
    heading: 'root',
    level: 1,
    content: raw.trim(),
    lineStart: 1,
    lineEnd: lineCount,
  }];
}

/**
 * Extract rules (list items) from parsed sections.
 */
function extractRules(sections: Section[], raw: string): Rule[] {
  const rules: Rule[] = [];
  const lines = raw.split('\n');

  for (const section of sections) {
    for (let i = section.lineStart - 1; i < section.lineEnd && i < lines.length; i++) {
      const match = lines[i].match(LIST_ITEM_RE);
      if (match) {
        rules.push({ text: match[1].trim(), section: section.heading, line: i + 1 });
      }
    }
  }
  return rules;
}

/**
 * Build config metadata from raw content and file path.
 */
function buildMetadata(filePath: string, format: ConfigFormat, raw: string): ConfigMetadata {
  return {
    filePath,
    format,
    lineCount: raw.split('\n').length,
    tokenEstimate: Math.ceil(raw.length / 4),
  };
}

/**
 * Parse a config file (CLAUDE.md, .cursorrules, etc.) into structured data.
 */
export async function parseConfig(filePath: string): Promise<ParsedConfig> {
  const raw = await readFile(filePath, 'utf-8');
  const format = detectFormat(filePath);

  let sections: Section[];
  switch (format) {
    case 'markdown':
      sections = parseMarkdownSections(raw);
      break;
    case 'yaml':
      sections = parseYamlSections(raw);
      break;
    default:
      sections = parseTextSections(raw);
  }

  const rules = extractRules(sections, raw);
  const metadata = buildMetadata(filePath, format, raw);

  return { raw, sections, rules, metadata };
}

/**
 * Validate and map a raw YAML test case into a TestCase.
 */
function mapTestCase(entry: Record<string, unknown>, index: number): TestCase {
  if (typeof entry.name !== 'string' || !entry.name) {
    throw new Error(`Test case at index ${index} is missing required field "name"`);
  }
  if (!entry.expect || typeof entry.expect !== 'object') {
    throw new Error(`Test case "${entry.name}" is missing required field "expect"`);
  }

  return {
    name: entry.name,
    scenario: typeof entry.scenario === 'string' ? entry.scenario : undefined,
    check: typeof entry.check === 'string' ? (entry.check as CheckType) : undefined,
    expect: entry.expect as TestExpect,
  };
}

/**
 * Parse a .promptbench.yml test spec file.
 */
export async function parseTestFile(filePath: string): Promise<TestSpec> {
  const raw = await readFile(filePath, 'utf-8');
  const doc = yaml.load(raw) as Record<string, unknown> | null;

  if (!doc || typeof doc !== 'object') {
    throw new Error(`Invalid test spec: ${filePath} did not parse as a YAML object`);
  }
  if (typeof doc.config !== 'string') {
    throw new Error(`Invalid test spec: missing required "config" field (string) in ${filePath}`);
  }
  if (!Array.isArray(doc.tests)) {
    throw new Error(`Invalid test spec: missing required "tests" field (array) in ${filePath}`);
  }

  const tests = (doc.tests as Record<string, unknown>[]).map(mapTestCase);
  return { configPath: doc.config, tests };
}

/**
 * Search the current working directory for well-known config files.
 * Returns absolute paths of files that exist, in priority order.
 */
export function detectConfigFiles(): string[] {
  const cwd = process.cwd();
  return CONFIG_FILE_CANDIDATES
    .map((name) => join(cwd, name))
    .filter((fullPath) => existsSync(fullPath));
}
