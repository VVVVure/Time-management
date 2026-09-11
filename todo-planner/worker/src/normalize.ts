export interface NormalizedStep {
  title: string;
  estimatedMinutes: number;
  energy: 'high' | 'low' | null;
}

export interface NormalizedRecurrence {
  freq: 'daily' | 'weekly' | 'monthly';
  interval: number;
  endDate: string | null;
}

export interface NormalizedTask {
  title: string;
  deadline: string | null;
  time: string | null;
  priority: 'high' | 'medium' | 'low';
  recurrence: NormalizedRecurrence | null;
  steps: NormalizedStep[];
}

export function normalizeRecurrence(value: unknown): NormalizedRecurrence | null {
  const r = value as { freq?: unknown; interval?: unknown; endDate?: unknown };
  if (!r || typeof r !== 'object') return null;
  const freq =
    r.freq === 'daily' || r.freq === 'weekly' || r.freq === 'monthly' ? r.freq : null;
  if (!freq) return null;
  const intervalNum = Number(r.interval);
  const interval =
    Number.isFinite(intervalNum) && intervalNum >= 1 ? Math.max(1, Math.round(intervalNum)) : 1;
  const endDate =
    typeof r.endDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.endDate) ? r.endDate : null;
  return { freq, interval, endDate };
}

export function normalizeStep(value: unknown): NormalizedStep | null {
  const s = value as { title?: unknown; estimatedMinutes?: unknown; energy?: unknown };
  if (!s || typeof s !== 'object') return null;
  const title = typeof s.title === 'string' ? s.title.trim() : '';
  if (!title) return null;
  const minutes = Math.max(1, Math.round(Number(s.estimatedMinutes) || 15));
  const energy = s.energy === 'high' || s.energy === 'low' ? s.energy : null;
  return { title, estimatedMinutes: minutes, energy };
}

export function normalizeDecompose(input: unknown): {
  tasks: NormalizedTask[];
  question: string | null;
} {
  const raw = (input ?? {}) as { question?: unknown; tasks?: unknown };
  const question =
    typeof raw.question === 'string' && raw.question.trim() ? raw.question.trim() : null;

  const rawTasks = Array.isArray(raw.tasks) ? raw.tasks : [];
  const tasks = rawTasks
    .map((t) => {
      const task = t as {
        title?: unknown;
        deadline?: unknown;
        time?: unknown;
        priority?: unknown;
        recurrence?: unknown;
        steps?: unknown;
      };
      if (!task || typeof task !== 'object') return null;
      const title = typeof task.title === 'string' ? task.title.trim() : '';
      if (!title) return null;
      const deadline =
        typeof task.deadline === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(task.deadline)
          ? task.deadline
          : null;
      const time =
        typeof task.time === 'string' && /^\d{2}:\d{2}$/.test(task.time) ? task.time : null;
      const priority =
        task.priority === 'high' || task.priority === 'medium' || task.priority === 'low'
          ? task.priority
          : 'medium';
      const recurrence = normalizeRecurrence(task.recurrence);
      const normalizedSteps = (Array.isArray(task.steps) ? task.steps : [])
        .map(normalizeStep)
        .filter((s): s is NormalizedStep => s !== null);
      // 双重保险：AI 万一返回空 steps，生成一个兜底步骤，绝不返回空数组
      const steps =
        normalizedSteps.length > 0
          ? normalizedSteps
          : [{ title, estimatedMinutes: 15, energy: null }];
      return { title, deadline, time, priority, recurrence, steps };
    })
    .filter((t): t is NormalizedTask => t !== null);

  return { tasks, question };
}
