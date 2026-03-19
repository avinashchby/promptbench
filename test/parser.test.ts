import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseConfig, parseTestFile, detectConfigFiles } from '../src/parser.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const fixturePath = (name: string) => resolve(__dirname, 'fixtures', name);

describe('parseConfig', () => {
  it('reads a markdown file and extracts sections', async () => {
    const config = await parseConfig(fixturePath('sample-claude.md'));
    const headings = config.sections.map(s => s.heading);

    expect(headings).toContain('Project Overview');
    expect(headings).toContain('Tech Stack');
    expect(headings).toContain('Build Commands');
    expect(headings).toContain('Coding Style');
    expect(headings).toContain('Error Handling');
    expect(headings).toContain('Testing');
    expect(headings).toContain('Git Conventions');
    expect(headings).toContain('Communication Style');
  });

  it('extracts rules from bullet points', async () => {
    const config = await parseConfig(fixturePath('sample-claude.md'));

    expect(config.rules.length).toBeGreaterThan(0);
    const ruleTexts = config.rules.map(r => r.text);
    expect(ruleTexts).toContain('Use 2 spaces for indentation');
    expect(ruleTexts).toContain('No semicolons');
    // Every rule references a section
    for (const rule of config.rules) {
      expect(rule.section).toBeTruthy();
      expect(rule.line).toBeGreaterThan(0);
    }
  });

  it('computes a token estimate', async () => {
    const config = await parseConfig(fixturePath('sample-claude.md'));

    expect(config.metadata.tokenEstimate).toBeGreaterThan(0);
    expect(config.metadata.lineCount).toBeGreaterThan(0);
    expect(config.metadata.format).toBe('markdown');
  });
});

describe('parseTestFile', () => {
  it('reads YAML and returns a TestSpec', async () => {
    const spec = await parseTestFile(fixturePath('sample.promptbench.yml'));

    expect(spec.configPath).toBe('./test/fixtures/sample-claude.md');
    expect(spec.tests.length).toBeGreaterThan(0);
    expect(spec.tests[0].name).toBe('Has project overview');
    expect(spec.tests[0].check).toBe('config_contains');
    expect(spec.tests[0].expect.config_has).toContain('# Project Overview');
  });

  it('throws on invalid YAML missing required fields', async () => {
    // Write a temp invalid file
    const { writeFile, unlink } = await import('node:fs/promises');
    const tmpPath = resolve(__dirname, 'fixtures', '_invalid_test.yml');
    await writeFile(tmpPath, 'foo: bar\n');

    try {
      await expect(parseTestFile(tmpPath)).rejects.toThrow('missing required');
    } finally {
      await unlink(tmpPath);
    }
  });
});

describe('detectConfigFiles', () => {
  it('returns an array', () => {
    const files = detectConfigFiles();
    expect(Array.isArray(files)).toBe(true);
  });
});
