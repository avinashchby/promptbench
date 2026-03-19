import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyze, runTests } from '../src/analyzer.js';
import { parseConfig, parseTestFile } from '../src/parser.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const fixturePath = (name: string) => resolve(__dirname, 'fixtures', name);

describe('analyze', () => {
  it('returns an AuditReport with all fields populated', async () => {
    const config = await parseConfig(fixturePath('sample-claude.md'));
    const report = analyze(config);

    expect(report.config).toBeDefined();
    expect(report.config.filePath).toContain('sample-claude.md');
    expect(typeof report.score).toBe('number');
    expect(Array.isArray(report.detectorResults)).toBe(true);
    expect(report.metrics).toBeDefined();
    expect(report.metrics.lineCount).toBeGreaterThan(0);
    expect(report.metrics.sectionCount).toBeGreaterThan(0);
    expect(report.metrics.ruleCount).toBeGreaterThan(0);
    expect(report.timestamp).toBeTruthy();
  });

  it('scores sample-claude.md above 60', async () => {
    const config = await parseConfig(fixturePath('sample-claude.md'));
    const report = analyze(config);

    expect(report.score).toBeGreaterThan(60);
  });

  it('scores bad-claude.md lower than sample-claude.md', async () => {
    const sampleConfig = await parseConfig(fixturePath('sample-claude.md'));
    const badConfig = await parseConfig(fixturePath('bad-claude.md'));

    const sampleReport = analyze(sampleConfig);
    const badReport = analyze(badConfig);

    expect(badReport.score).toBeLessThan(sampleReport.score);
  });
});

describe('runTests', () => {
  it('passes config_contains checks for build commands', async () => {
    const config = await parseConfig(fixturePath('sample-claude.md'));
    const spec = {
      configPath: fixturePath('sample-claude.md'),
      tests: [
        {
          name: 'Has build commands',
          check: 'config_contains' as const,
          expect: { config_has: ['pnpm install', 'pnpm run build'] },
        },
        {
          name: 'Has tech stack section',
          check: 'config_contains' as const,
          expect: { config_has: ['Tech Stack', 'TypeScript'] },
        },
      ],
    };
    const results = runTests(config, spec);

    for (const r of results) {
      expect(r.pass).toBe(true);
    }
  });

  it('catches metric violations with strict thresholds', async () => {
    const config = await parseConfig(fixturePath('sample-claude.md'));

    const strictSpec = {
      configPath: fixturePath('sample-claude.md'),
      tests: [
        {
          name: 'Impossible line limit',
          check: 'config_metrics' as const,
          expect: { max_lines: 1 },
        },
      ],
    };

    const results = runTests(config, strictSpec);
    expect(results[0].pass).toBe(false);
    expect(results[0].message).toContain('exceeds max');
  });

  it('passes config_completeness for a comprehensive config', async () => {
    const config = await parseConfig(fixturePath('sample-claude.md'));
    const spec = {
      configPath: fixturePath('sample-claude.md'),
      tests: [
        {
          name: 'Config is mostly complete',
          check: 'config_completeness' as const,
          expect: { max_missing_sections: 2 },
        },
      ],
    };

    const results = runTests(config, spec);
    expect(results[0].pass).toBe(true);
  });

  it('fails config_completeness for an incomplete config', async () => {
    const config = await parseConfig(fixturePath('bad-claude.md'));
    const spec = {
      configPath: fixturePath('bad-claude.md'),
      tests: [
        {
          name: 'Config must be complete',
          check: 'config_completeness' as const,
          expect: { max_missing_sections: 0 },
        },
      ],
    };

    const results = runTests(config, spec);
    expect(results[0].pass).toBe(false);
    expect(results[0].message).toContain('Missing');
  });

  it('passes config_specificity for a specific config', async () => {
    const config = await parseConfig(fixturePath('sample-claude.md'));
    const spec = {
      configPath: fixturePath('sample-claude.md'),
      tests: [
        {
          name: 'Config is specific enough',
          check: 'config_specificity' as const,
          expect: { min_specificity: 1.0 },
        },
      ],
    };

    const results = runTests(config, spec);
    expect(results[0].pass).toBe(true);
  });

  it('fails config_specificity for a vague config', async () => {
    const config = await parseConfig(fixturePath('bad-claude.md'));
    const spec = {
      configPath: fixturePath('bad-claude.md'),
      tests: [
        {
          name: 'Config must be very specific',
          check: 'config_specificity' as const,
          expect: { min_specificity: 2.5 },
        },
      ],
    };

    const results = runTests(config, spec);
    expect(results[0].pass).toBe(false);
    expect(results[0].message).toContain('specificity');
  });
});
