import { z } from 'zod';
import { workerFetch } from './workerClient';

const stepSchema = z.object({
  title: z.string().min(1),
  estimatedMinutes: z.number().int().positive(),
  energy: z.enum(['high', 'low']).nullable(),
});

const recurrenceSchema = z.object({
  freq: z.enum(['daily', 'weekly', 'monthly']),
  interval: z.number().int().positive(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
});

const taskSchema = z.object({
  title: z.string().min(1),
  deadline: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  time: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .nullable(),
  priority: z.enum(['high', 'medium', 'low']),
  recurrence: recurrenceSchema.nullable(),
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

/** 调用 Worker 的 /decompose 接口，返回统一的结果/错误结构，不抛异常 */
export async function callDecompose(req: DecomposeRequest): Promise<DecomposeOutcome> {
  const outcome = await workerFetch('/decompose', {
    password: req.password,
    json: {
      input: req.input,
      today: req.today,
      weekday: req.weekday,
      maxMinutesPerStep: req.maxMinutesPerStep,
      clarification: req.clarification ?? null,
    },
    timeoutMessage: '请求超时（超过 20 秒），请重试',
    parseFailMessage: 'AI 返回的内容无法解析，请重试',
    serverFallbackMessage: 'AI 服务暂时不可用，请稍后再试',
  });

  if (outcome.kind === 'error') {
    return { kind: 'error', errorKind: outcome.errorKind, message: outcome.message };
  }

  const parsed = responseSchema.safeParse(outcome.data);
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
  const outcome = await workerFetch('/refine', {
    password: req.password,
    json: {
      taskTitle: req.taskTitle,
      stepTitle: req.stepTitle,
      maxMinutesPerStep: req.maxMinutesPerStep,
    },
    timeoutMessage: '请求超时（超过 20 秒），请重试',
    parseFailMessage: 'AI 返回的内容无法解析，请重试',
    serverFallbackMessage: 'AI 服务暂时不可用，请稍后再试',
  });

  if (outcome.kind === 'error') {
    return { kind: 'error', errorKind: outcome.errorKind, message: outcome.message };
  }

  const parsed = refineResponseSchema.safeParse(outcome.data);
  if (!parsed.success || parsed.data.steps.length === 0) {
    return {
      kind: 'error',
      errorKind: 'format',
      message: 'AI 返回格式不对，请重试',
    };
  }

  return { kind: 'ok', steps: parsed.data.steps };
}
