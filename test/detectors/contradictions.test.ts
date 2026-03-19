import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectContradictions } from '../../src/detectors/contradictions.js';
import { parseConfig } from '../../src/parser.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const fixturePath = (name: string) => resolve(__dirname, '..', 'fixtures', name);

describe('detectContradictions', () => {
  it('detects contradictions in bad-claude.md', async () => {
    const config = await parseConfig(fixturePath('bad-claude.md'));
    const results = detectContradictions(config);

    expect(results.length).toBeGreaterThan(0);

    const messages = results.map(r => r.message.toLowerCase());
    const hasIndentation = messages.some(m => m.includes('tabs') || m.includes('indentation'));
    const hasPackageManager = messages.some(m => m.includes('npm') || m.includes('pnpm'));
    expect(hasIndentation).toBe(true);
    expect(hasPackageManager).toBe(true);
  });

  it('finds no contradictions in sample-claude.md', async () => {
    const config = await parseConfig(fixturePath('sample-claude.md'));
    const results = detectContradictions(config);

    expect(results.length).toBe(0);
  });

  it('returns error severity for same-section contradictions', async () => {
    const config = await parseConfig(fixturePath('bad-claude.md'));
    const results = detectContradictions(config);
    const errors = results.filter(r => r.severity === 'error');

    expect(errors.length).toBeGreaterThan(0);
  });
});
