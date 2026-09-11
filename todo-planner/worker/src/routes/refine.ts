import type { Env } from '../index';
import { callClaude, extractToolInput } from '../claude';
import { corsHeaders, errorJson, json, readJson } from '../http';
import { normalizeStep, type NormalizedStep } from '../normalize';
import { refineTool } from '../schemas';

export async function handleRefine(request: Request, env: Env): Promise<Response> {
  const cors = corsHeaders(request, env);

  const body = await readJson(request);
  const b = body as {
    taskTitle?: unknown;
    stepTitle?: unknown;
    maxMinutesPerStep?: unknown;
  };
  const taskTitle = typeof b.taskTitle === 'string' ? b.taskTitle.trim() : '';
  const stepTitle = typeof b.stepTitle === 'string' ? b.stepTitle.trim() : '';
  if (!taskTitle || !stepTitle) {
    return errorJson('BAD_REQUEST', '缺少任务标题或步骤标题', 400, cors);
  }
  const maxMinutes =
    typeof b.maxMinutesPerStep === 'number' ? b.maxMinutesPerStep : 15;

  const userText = [
    `任务标题：${taskTitle}`,
    `要拆细的步骤：${stepTitle}`,
    `每步最长分钟数：${maxMinutes}`,
  ].join('\n');

  const data = await callClaude(env, refineTool, userText);
  const toolInput = extractToolInput(data, 'return_refine_result');
  const rawSteps = (toolInput as { steps?: unknown })?.steps;
  const steps = (Array.isArray(rawSteps) ? rawSteps : [])
    .map(normalizeStep)
    .filter((s): s is NormalizedStep => s !== null);

  if (steps.length === 0) {
    return errorJson('AI_EMPTY', 'AI 没有返回有效结果，请稍后再试', 502, cors);
  }
  return json({ steps }, 200, cors);
}
