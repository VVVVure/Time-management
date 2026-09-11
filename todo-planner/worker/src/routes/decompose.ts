import type { Env } from '../index';
import { callClaude, extractToolInput } from '../claude';
import { corsHeaders, errorJson, json, readJson } from '../http';
import { normalizeDecompose } from '../normalize';
import { decomposeTool } from '../schemas';

const MAX_INPUT_LENGTH = 2000;

export async function handleDecompose(request: Request, env: Env): Promise<Response> {
  const cors = corsHeaders(request, env);

  const body = await readJson(request);
  const input = (body as { input?: unknown; maxMinutesPerStep?: unknown })?.input;
  if (typeof input !== 'string' || !input.trim()) {
    return errorJson('BAD_REQUEST', '缺少要拆解的内容', 400, cors);
  }
  if (input.length > MAX_INPUT_LENGTH) {
    return errorJson(
      'INPUT_TOO_LONG',
      `输入内容超过 ${MAX_INPUT_LENGTH} 字，请缩短后重试`,
      400,
      cors,
    );
  }

  const b = body as {
    today?: unknown;
    weekday?: unknown;
    maxMinutesPerStep?: unknown;
    clarification?: unknown;
  };
  const today = typeof b.today === 'string' ? b.today : new Date().toISOString().slice(0, 10);
  const weekday = typeof b.weekday === 'string' ? b.weekday : '';
  const maxMinutes =
    typeof b.maxMinutesPerStep === 'number' ? b.maxMinutesPerStep : 25;

  const lines = [
    `今天日期：${today}${weekday ? `（${weekday}）` : ''}`,
    `每步最长分钟数：${maxMinutes}`,
    `用户输入：\n${input}`,
  ];
  const clarification = b.clarification;
  if (
    clarification &&
    typeof clarification === 'object' &&
    (clarification as { question?: unknown }).question
  ) {
    const c = clarification as { question: string; answer?: unknown };
    lines.push(
      `\n之前的追问：${c.question}`,
      `用户的回答：${typeof c.answer === 'string' ? c.answer : ''}`,
    );
  }

  const data = await callClaude(env, decomposeTool, lines.join('\n'));
  const toolInput = extractToolInput(data, 'return_decompose_result');
  const result = normalizeDecompose(toolInput);

  if (result.question) {
    return json({ tasks: [], question: result.question }, 200, cors);
  }
  if (result.tasks.length === 0) {
    return errorJson('AI_EMPTY', 'AI 没有返回有效结果，请换个说法再试', 502, cors);
  }
  return json({ tasks: result.tasks, question: null }, 200, cors);
}
