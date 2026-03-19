import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectVagueness } from '../../src/detectors/vagueness.js';
import { parseConfig } from '../../src/parser.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const fixturePath = (name: string) => resolve(__dirname, '..', 'fixtures', name);

describe('detectVagueness', () => {
  it('detects vague words in bad-claude.md', async () => {
    const config = await parseConfig(fixturePath('bad-claude.md'));
    const results = detectVagueness(config);

    expect(results.length).toBeGreaterThan(0);

    const allMessages = results.map(r => r.message.toLowerCase()).join(' ');
    expect(allMessages).toContain('good');
    expect(allMessages).toContain('best practices');
    expect(allMessages).toContain('careful');
  });

  it('has fewer vague findings in sample-claude.md', async () => {
    const badConfig = await parseConfig(fixturePath('bad-claude.md'));
    const sampleConfig = await parseConfig(fixturePath('sample-claude.md'));

    const badResults = detectVagueness(badConfig);
    const sampleResults = detectVagueness(sampleConfig);

    expect(sampleResults.length).toBeLessThan(badResults.length);
  });

  it('includes suggestions for vague findings', async () => {
    const config = await parseConfig(fixturePath('bad-claude.md'));
    const results = detectVagueness(config);
    const warnings = results.filter(r => r.severity === 'warning');

    for (const r of warnings) {
      expect(r.suggestion).toBeTruthy();
    }
  });
});
