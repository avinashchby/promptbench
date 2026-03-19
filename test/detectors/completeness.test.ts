import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectCompleteness } from '../../src/detectors/completeness.js';
import { parseConfig } from '../../src/parser.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const fixturePath = (name: string) => resolve(__dirname, '..', 'fixtures', name);

describe('detectCompleteness', () => {
  it('sample-claude.md has few missing sections', async () => {
    const config = await parseConfig(fixturePath('sample-claude.md'));
    const results = detectCompleteness(config);

    // sample covers most expected sections, so few findings
    expect(results.length).toBeLessThanOrEqual(2);
  });

  it('bad-claude.md is missing many sections', async () => {
    const config = await parseConfig(fixturePath('bad-claude.md'));
    const results = detectCompleteness(config);

    // bad config only has "Style" and "Other" - misses most expected sections
    expect(results.length).toBeGreaterThanOrEqual(5);

    const labels = results.map(r => r.message);
    expect(labels.some(m => m.includes('Missing section'))).toBe(true);
  });

  it('bad-claude.md findings escalated to warning severity', async () => {
    const config = await parseConfig(fixturePath('bad-claude.md'));
    const results = detectCompleteness(config);

    // With >= 3 missing, severity should be 'warning'
    const warnings = results.filter(r => r.severity === 'warning');
    expect(warnings.length).toBeGreaterThan(0);
  });
});
