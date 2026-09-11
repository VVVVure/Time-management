import { addTasks, bulkDeleteTasks, listTasks, updateTask } from './db';
import type { RecurrenceRule, Task } from './types';
import { todayISO } from './utils';

const SYNC_WINDOW_DAYS = 60;

function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(dateStr: string, days: number): string {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + days);
  return toDateStr(d);
}

/** 第 idx 次出现的日期（idx 从 0 开始，0 就是 seedDate 当天） */
function nthOccurrence(rule: RecurrenceRule, seed: Date, idx: number): Date {
  if (rule.freq === 'daily') {
    const d = new Date(seed);
    d.setDate(d.getDate() + idx * rule.interval);
    return d;
  }
  if (rule.freq === 'weekly') {
    const d = new Date(seed);
    d.setDate(d.getDate() + idx * rule.interval * 7);
    return d;
  }
  // monthly：以 seedDate 的"日"为锚点，逐月累加；遇到当月没有这一天（如 1/31），
  // 收缩到该月最后一天，下个月仍回到锚点日，避免日期漂移。
  const totalMonths = idx * rule.interval;
  const monthIndex = seed.getMonth() + totalMonths;
  const year = seed.getFullYear() + Math.floor(monthIndex / 12);
  const month = ((monthIndex % 12) + 12) % 12;
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(seed.getDate(), lastDay));
}

/** 计算 rule 在 [rangeStart, rangeEnd] 区间内所有应该出现的日期（含 seedDate） */
export function occurrenceDatesInRange(
  rule: RecurrenceRule,
  seedDate: string,
  rangeStart: string,
  rangeEnd: string,
): string[] {
  const seed = parseDate(seedDate);
  const start = parseDate(rangeStart);
  const end = parseDate(rangeEnd);
  const endLimit = rule.endDate ? parseDate(rule.endDate) : null;

  const results: string[] = [];
  for (let idx = 0; idx < 10000; idx++) {
    const d = nthOccurrence(rule, seed, idx);
    if (d > end) break;
    if (endLimit && d > endLimit) break;
    if (d >= start) results.push(toDateStr(d));
  }
  return results;
}

function buildInstance(root: Task, date: string): Task {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title: root.title,
    rawInput: root.rawInput,
    deadline: date,
    time: root.time,
    priority: root.priority,
    status: 'todo',
    steps: root.steps.map((s) => ({
      id: crypto.randomUUID(),
      title: s.title,
      estimatedMinutes: s.estimatedMinutes,
      done: false,
      doneAt: null,
      order: s.order,
      energy: s.energy ?? null,
    })),
    isBrainDump: false,
    recurrence: null,
    recurrenceRootId: root.id,
    createdAt: now,
    updatedAt: now,
  };
}

/** 删除某个系列里未来（deadline > 今天）且未完成的已生成实例 */
export async function deleteFutureIncompleteInstances(
  rootId: string,
  allTasks: Task[],
): Promise<void> {
  const today = todayISO();
  const ids = allTasks
    .filter(
      (t) => t.recurrenceRootId === rootId && t.status !== 'done' && t.deadline && t.deadline > today,
    )
    .map((t) => t.id);
  await bulkDeleteTasks(ids);
}

/** 删除整个系列：根任务 + 所有实例（不分过去未来） */
export async function deleteSeries(rootId: string, allTasks: Task[]): Promise<void> {
  const ids = [rootId, ...allTasks.filter((t) => t.recurrenceRootId === rootId).map((t) => t.id)];
  await bulkDeleteTasks(ids);
}

/** 为所有根任务补齐今天到 60 天窗口内的缺失实例 */
export async function syncRecurrenceInstances(allTasks: Task[]): Promise<void> {
  const today = todayISO();
  const rangeEnd = addDays(today, SYNC_WINDOW_DAYS);
  const roots = allTasks.filter((t) => t.recurrence && t.deadline);

  const existingByRoot = new Map<string, Set<string>>();
  for (const t of allTasks) {
    if (!t.recurrenceRootId || !t.deadline) continue;
    let set = existingByRoot.get(t.recurrenceRootId);
    if (!set) {
      set = new Set();
      existingByRoot.set(t.recurrenceRootId, set);
    }
    set.add(t.deadline);
  }

  const toAdd: Task[] = [];
  for (const root of roots) {
    const rule = root.recurrence as RecurrenceRule;
    const dates = occurrenceDatesInRange(rule, root.deadline as string, today, rangeEnd);
    const existing = existingByRoot.get(root.id) ?? new Set<string>();
    for (const date of dates) {
      if (date === root.deadline) continue; // 根任务本身就代表它自己那次
      if (existing.has(date)) continue;
      toAdd.push(buildInstance(root, date));
    }
  }

  if (toAdd.length > 0) {
    await addTasks(toAdd);
  }
}

/** 设置/修改根任务的重复规则，并清理未来旧实例后重新生成 */
export async function applyRecurrence(task: Task, rule: RecurrenceRule | null): Promise<void> {
  const all = await listTasks();
  await updateTask({ ...task, recurrence: rule, recurrenceRootId: null });
  await deleteFutureIncompleteInstances(task.id, all);
  if (rule) {
    await syncRecurrenceInstances(await listTasks());
  }
}
