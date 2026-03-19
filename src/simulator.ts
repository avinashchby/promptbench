/**
 * Mode 2 - Behavioral simulation using LLM APIs.
 * Optional module, only used when --simulate is passed.
 */

import type {
  ParsedConfig,
  SimulationResult,
  SimulationOptions,
  SimulationScenario,
} from './types.js';

/** Check env for available API keys. Prefers Anthropic. */
export function checkAvailability(): {
  available: boolean;
  provider: string;
  apiKey: string;
} {
  const anthropicKey = process.env['ANTHROPIC_API_KEY'] ?? '';
  if (anthropicKey) {
    return { available: true, provider: 'anthropic', apiKey: anthropicKey };
  }

  const openaiKey = process.env['OPENAI_API_KEY'] ?? '';
  if (openaiKey) {
    return { available: true, provider: 'openai', apiKey: openaiKey };
  }

  return { available: false, provider: '', apiKey: '' };
}

/** Call OpenAI chat completions API. No retries, no streaming. */
export async function callOpenAI(
  systemPrompt: string,
  userMessage: string,
  apiKey: string,
  model: string = 'gpt-4o-mini',
): Promise<string> {
  const response = await fetch(
    'https://api.openai.com/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `OpenAI API error: ${response.status} ${body}`,
    );
  }

  const data = (await response.json()) as {
    choices: { message: { content: string } }[];
  };

  return data.choices[0].message.content;
}

/** Call Anthropic messages API. No retries, no streaming. */
export async function callAnthropic(
  systemPrompt: string,
  userMessage: string,
  apiKey: string,
  model: string = 'claude-haiku-4-5-20251001',
): Promise<string> {
  const response = await fetch(
    'https://api.anthropic.com/v1/messages',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Anthropic API error: ${response.status} ${body}`,
    );
  }

  const data = (await response.json()) as {
    content: { type: string; text: string }[];
  };

  return data.content[0].text;
}

/**
 * Evaluate whether a response matches expected behavior.
 * Simple heuristic: split expected string into key terms and check
 * if they appear (case-insensitive) in the response.
 */
function evaluateResponse(
  response: string,
  expected: string,
): { pass: boolean; explanation: string } {
  const responseLower = response.toLowerCase();
  const terms = expected
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2);

  if (terms.length === 0) {
    return { pass: true, explanation: 'No key terms to check' };
  }

  const matched = terms.filter((t) => responseLower.includes(t));
  const ratio = matched.length / terms.length;
  const pass = ratio >= 0.5;

  const explanation = pass
    ? `Matched ${matched.length}/${terms.length} key terms`
    : `Only matched ${matched.length}/${terms.length} key terms: missing [${terms.filter((t) => !responseLower.includes(t)).join(', ')}]`;

  return { pass, explanation };
}

/**
 * Run behavioral simulations against an LLM API.
 * Sends config.raw as system prompt with each scenario's prompt as user message.
 */
export async function simulate(
  config: ParsedConfig,
  scenarios: SimulationScenario[],
  options: SimulationOptions,
): Promise<SimulationResult[]> {
  const callFn =
    options.provider === 'openai' ? callOpenAI : callAnthropic;
  const model = options.model ?? undefined;
  const results: SimulationResult[] = [];

  for (const scenario of scenarios) {
    let actualResponse: string;
    try {
      actualResponse = await callFn(
        config.raw,
        scenario.prompt,
        options.apiKey,
        model as string,
      );
    } catch (err) {
      results.push({
        scenario: scenario.prompt,
        expectedBehavior: scenario.expected,
        actualResponse: '',
        pass: false,
        explanation: `API call failed: ${(err as Error).message}`,
      });
      continue;
    }

    const { pass, explanation } = evaluateResponse(
      actualResponse,
      scenario.expected,
    );

    results.push({
      scenario: scenario.prompt,
      expectedBehavior: scenario.expected,
      actualResponse,
      pass,
      explanation,
    });
  }

  return results;
}
