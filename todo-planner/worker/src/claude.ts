import type { Env } from './index';
import { SYSTEM_PROMPT } from './prompts';

const CLAUDE_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

export function extractToolInput(data: unknown, toolName: string): unknown {
  const content = (data as { content?: unknown })?.content;
  if (!Array.isArray(content)) throw new Error('NO_TOOL_USE');
  for (const block of content) {
    const b = block as { type?: string; name?: string; input?: unknown };
    if (b.type === 'tool_use' && b.name === toolName) return b.input;
  }
  throw new Error('NO_TOOL_USE');
}

export async function callClaude(
  env: Env,
  tool: unknown,
  userText: string,
): Promise<unknown> {
  const res = await fetch(CLAUDE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: env.MODEL,
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      tools: [tool],
      tool_choice: { type: 'tool', name: (tool as { name: string }).name },
      messages: [{ role: 'user', content: userText }],
    }),
  });

  if (!res.ok) {
    // 不把上游原始报错细节透露给前端，只打到 Worker 日志里用于排障
    const status = res.status;
    const body = await res.text();
    console.error(`[upstream] Anthropic HTTP ${status}: ${body}`);
    throw new Error('UPSTREAM_ERROR');
  }
  return res.json();
}
