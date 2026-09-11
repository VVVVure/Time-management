import { z } from 'zod';

const stepSchema = z.object({
  title: z.string().min(1),
  estimatedMinutes: z.number().int().positive(),
});

const taskSchema = z.object({
  title: z.string().min(1),
  deadline: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  priority: z.enum(['high', 'medium', 'low']),
  steps: z.array(stepSchema),
});

const responseSchema = z.object({
  tasks: z.array(taskSchema),
  question: z.string().nullable(),
});

export type DecomposeStep = z.infer<typeof stepSchema>;
export type DecomposeTask = z.infer<typeof taskSchema>;

export type DecomposeResult =
  | { kind: 'tasks'; tasks: DecomposeTask[] }
  | { kind: 'question'; question: string };

export type DecomposeErrorKind =
  | 'network'
  | 'timeout'
  | 'unauthorized'
  | 'format'
  | 'server';

export type DecomposeOutcome =
  | { kind: 'ok'; result: DecomposeResult }
  | { kind: 'error'; errorKind: DecomposeErrorKind; message: string };

export interface DecomposeRequest {
  input: string;
  password: string;
  maxMinutesPerStep: number;
  today: string;
  weekday: string;
  clarification?: { question: string; answer: string } | null;
}

const TIMEOUT_MS = 20_000;

/** 调用 Worker 的 /decompose 接口，返回统一的结果/错误结构，不抛异常 */
export async function callDecompose(req: DecomposeRequest): Promise<DecomposeOutcome> {
  const workerUrl = String(import.meta.env.VITE_WORKER_URL ?? '').replace(/\/+$/, '');
  if (!workerUrl) {
    return {
      kind: 'error',
      errorKind: 'server',
      message: '未配置 Worker 地址（VITE_WORKER_URL），请检查 .env.local',
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${workerUrl}/decompose`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-App-Password': req.password,
      },
      body: JSON.stringify({
        input: req.input,
        today: req.today,
        weekday: req.weekday,
        maxMinutesPerStep: req.maxMinutesPerStep,
        clarification: req.clarification ?? null,
      }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if ((err as { name?: string })?.name === 'AbortError') {
      return {
        kind: 'error',
        errorKind: 'timeout',
        message: '请求超时（超过 20 秒），请重试',
      };
    }
    return {
      kind: 'error',
      errorKind: 'network',
      message: '网络不可用，请检查网络连接后重试',
    };
  }
  clearTimeout(timer);

  if (res.status === 401) {
    return {
      kind: 'error',
      errorKind: 'unauthorized',
      message: '密码错误，请到设置页检查 App 密码',
    };
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    return {
      kind: 'error',
      errorKind: 'format',
      message: 'AI 返回的内容无法解析，请重试',
    };
  }

  if (!res.ok) {
    const message = (data as { error?: { message?: string } })?.error?.message;
    return {
      kind: 'error',
      errorKind: 'server',
      message: message ?? 'AI 服务暂时不可用，请稍后再试',
    };
  }

  const parsed = responseSchema.safeParse(data);
  if (!parsed.success) {
    return {
      kind: 'error',
      errorKind: 'format',
      message: 'AI 返回格式不对，请重试',
    };
  }

  const { tasks, question } = parsed.data;
  if (question && question.trim()) {
    return { kind: 'ok', result: { kind: 'question', question: question.trim() } };
  }
  return { kind: 'ok', result: { kind: 'tasks', tasks } };
}

const refineResponseSchema = z.object({
  steps: z.array(stepSchema),
});

export type RefineOutcome =
  | { kind: 'ok'; steps: DecomposeStep[] }
  | { kind: 'error'; errorKind: DecomposeErrorKind; message: string };

/** 调用 Worker 的 /refine 接口，把某个步骤拆得更细 */
export async function callRefine(req: {
  taskTitle: string;
  stepTitle: string;
  maxMinutesPerStep: number;
  password: string;
}): Promise<RefineOutcome> {
  const workerUrl = String(import.meta.env.VITE_WORKER_URL ?? '').replace(/\/+$/, '');
  if (!workerUrl) {
    return {
      kind: 'error',
      errorKind: 'server',
      message: '未配置 Worker 地址（VITE_WORKER_URL），请检查 .env.local',
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${workerUrl}/refine`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-App-Password': req.password,
      },
      body: JSON.stringify({
        taskTitle: req.taskTitle,
        stepTitle: req.stepTitle,
        maxMinutesPerStep: req.maxMinutesPerStep,
      }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if ((err as { name?: string })?.name === 'AbortError') {
      return {
        kind: 'error',
        errorKind: 'timeout',
        message: '请求超时（超过 20 秒），请重试',
      };
    }
    return {
      kind: 'error',
      errorKind: 'network',
      message: '网络不可用，请检查网络连接后重试',
    };
  }
  clearTimeout(timer);

  if (res.status === 401) {
    return {
      kind: 'error',
      errorKind: 'unauthorized',
      message: '密码错误，请到设置页检查 App 密码',
    };
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    return {
      kind: 'error',
      errorKind: 'format',
      message: 'AI 返回的内容无法解析，请重试',
    };
  }

  if (!res.ok) {
    const message = (data as { error?: { message?: string } })?.error?.message;
    return {
      kind: 'error',
      errorKind: 'server',
      message: message ?? 'AI 服务暂时不可用，请稍后再试',
    };
  }

  const parsed = refineResponseSchema.safeParse(data);
  if (!parsed.success || parsed.data.steps.length === 0) {
    return {
      kind: 'error',
      errorKind: 'format',
      message: 'AI 返回格式不对，请重试',
    };
  }

  return { kind: 'ok', steps: parsed.data.steps };
}
