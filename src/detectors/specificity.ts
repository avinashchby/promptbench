import type { ParsedConfig, DetectorResult } from '../types.js';

const TOOL_NAMES = [
  'react', 'vue', 'angular', 'svelte', 'next', 'nuxt', 'express', 'fastify',
  'typescript', 'eslint', 'prettier', 'jest', 'vitest', 'mocha', 'cypress',
  'playwright', 'webpack', 'vite', 'rollup', 'esbuild', 'docker', 'kubernetes',
  'postgres', 'mysql', 'redis', 'mongodb', 'sqlite', 'prisma', 'drizzle',
  'tailwind', 'sass', 'styled-components', 'pnpm', 'npm', 'yarn', 'bun',
  'git', 'github', 'gitlab', 'python', 'rust', 'go', 'node', 'deno',
  'zod', 'trpc', 'graphql', 'rest', 'grpc', 'aws', 'gcp', 'azure',
  'terraform', 'ansible',
];

const HAS_NUMBER = /\d+/;
const HAS_BACKTICK = /`.+`/;
const HAS_EXTENSION = /\.\w{2,4}\b/;
const HAS_ACTION_VERB = /\b(use|add|create|write|run|install|configure|set|enable|disable|import|export|return|throw|avoid|prefer|require|ensure|always|never)\b/i;

/** Score a single rule from 0-3 for specificity. */
function scoreRule(text: string): number {
  const lower = text.toLowerCase();
  const hasNumber = HAS_NUMBER.test(text);
  const hasBacktick = HAS_BACKTICK.test(text);
  const hasExtension = HAS_EXTENSION.test(text);
  const hasTool = TOOL_NAMES.some(t => lower.includes(t));
  const hasVerb = HAS_ACTION_VERB.test(text);

  const hasSpecific = hasTool || hasBacktick || hasExtension;
  const hasThreshold = hasNumber;

  if (hasThreshold && hasSpecific) return 3;
  if (hasSpecific || hasThreshold) return 2;
  if (hasVerb) return 1;
  return 0;
}

/** Detect rules that lack specificity and actionable detail. */
export function detectSpecificity(config: ParsedConfig): DetectorResult[] {
  const results: DetectorResult[] = [];
  let totalScore = 0;

  for (const rule of config.rules) {
    const score = scoreRule(rule.text);
    totalScore += score;

    if (score === 0) {
      results.push({
        detectorId: 'specificity',
        severity: 'warning',
        message: `Low specificity (0/3): "${rule.text.slice(0, 80)}"`,
        line: rule.line,
        section: rule.section,
        suggestion: 'Add a specific tool name, measurable threshold, or code example',
      });
    } else if (score === 1) {
      results.push({
        detectorId: 'specificity',
        severity: 'info',
        message: `Moderate specificity (1/3): "${rule.text.slice(0, 80)}"`,
        line: rule.line,
        section: rule.section,
        suggestion: 'Strengthen with a concrete tool/library name or numeric threshold',
      });
    }
  }

  const avg = config.rules.length > 0 ? totalScore / config.rules.length : 0;
  if (avg < 1.5 && config.rules.length > 0) {
    results.push({
      detectorId: 'specificity',
      severity: 'warning',
      message: `Average specificity is ${avg.toFixed(1)}/3 — rules lack actionable detail`,
      suggestion: 'Add numbers, tool names, code patterns, and file extensions to your rules',
    });
  }

  return results;
}
