import Dexie, { type EntityTable } from 'dexie';
import type { Settings, Step, Task, TaskStatus } from './types';

/** 设置只存一行，用固定 id 定位 */
interface SettingsRow extends Settings {
  id: string;
}

export const SETTINGS_ID = 'default';

export const DEFAULT_SETTINGS: Settings = {
  maxMinutesPerStep: 25,
  appPassword: '',
};

class TodoPlannerDB extends Dexie {
  tasks!: EntityTable<Task, 'id'>;
  settings!: EntityTable<SettingsRow, 'id'>;

  constructor() {
    super('todo-planner');
    this.version(1).stores({
      tasks: 'id, createdAt, deadline, status',
      settings: 'id',
    });
  }
}

export const db = new TodoPlannerDB();

function genId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

/** 根据步骤完成情况推导任务状态 */
export function computeStatus(steps: Step[]): TaskStatus {
  if (steps.length === 0) return 'todo';
  const doneCount = steps.filter((s) => s.done).length;
  if (doneCount === 0) return 'todo';
  if (doneCount === steps.length) return 'done';
  return 'doing';
}

/** 列出所有任务（按创建时间从旧到新） */
export async function listTasks(): Promise<Task[]> {
  const tasks = await db.tasks.toArray();
  return tasks.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** 一次添加一个或多个任务，返回新增任务的 id */
export async function addTasks(tasks: Task[]): Promise<string[]> {
  const ids = tasks.map((t) => t.id);
  await db.tasks.bulkPut(tasks);
  return ids;
}

/** 更新整个任务，自动刷新 updatedAt 和状态 */
export async function updateTask(task: Task): Promise<void> {
  await db.tasks.put({
    ...task,
    status: computeStatus(task.steps),
    updatedAt: nowIso(),
  });
}

/** 删除整个任务 */
export async function deleteTask(taskId: string): Promise<void> {
  await db.tasks.delete(taskId);
}

/** 给任务添加一个步骤，返回新建的步骤 */
export async function addStep(
  taskId: string,
  input: { title: string; estimatedMinutes: number },
): Promise<Step> {
  const task = await db.tasks.get(taskId);
  if (!task) throw new Error(`任务不存在: ${taskId}`);

  const step: Step = {
    id: genId(),
    title: input.title,
    estimatedMinutes: input.estimatedMinutes,
    done: false,
    doneAt: null,
    order: task.steps.length,
  };

  const steps = [...task.steps, step];
  await db.tasks.put({
    ...task,
    steps,
    status: computeStatus(steps),
    updatedAt: nowIso(),
  });
  return step;
}

/** 更新某个步骤的标题 / 预估时间 / 完成状态 / 排序 */
export async function updateStep(
  taskId: string,
  stepId: string,
  changes: Partial<Pick<Step, 'title' | 'estimatedMinutes' | 'done' | 'order'>>,
): Promise<void> {
  const task = await db.tasks.get(taskId);
  if (!task) throw new Error(`任务不存在: ${taskId}`);

  const steps = task.steps.map((s) => {
    if (s.id !== stepId) return s;
    const next: Step = { ...s, ...changes };
    if (changes.done !== undefined) {
      next.doneAt = changes.done ? nowIso() : null;
    }
    return next;
  });

  await db.tasks.put({
    ...task,
    steps,
    status: computeStatus(steps),
    updatedAt: nowIso(),
  });
}

/** 删除某个步骤，并把剩余步骤重新从 0 排序 */
export async function deleteStep(taskId: string, stepId: string): Promise<void> {
  const task = await db.tasks.get(taskId);
  if (!task) throw new Error(`任务不存在: ${taskId}`);

  const steps = task.steps
    .filter((s) => s.id !== stepId)
    .map((s, i) => ({ ...s, order: i }));

  await db.tasks.put({
    ...task,
    steps,
    status: computeStatus(steps),
    updatedAt: nowIso(),
  });
}

/** 勾选 / 取消勾选某个步骤，并按规则自动更新任务状态 */
export async function toggleStep(taskId: string, stepId: string): Promise<void> {
  const task = await db.tasks.get(taskId);
  if (!task) throw new Error(`任务不存在: ${taskId}`);

  const steps = task.steps.map((s) =>
    s.id === stepId
      ? { ...s, done: !s.done, doneAt: !s.done ? nowIso() : null }
      : s,
  );

  await db.tasks.put({
    ...task,
    steps,
    status: computeStatus(steps),
    updatedAt: nowIso(),
  });
}

/** 上移 / 下移某个步骤 */
export async function moveStep(
  taskId: string,
  stepId: string,
  direction: 'up' | 'down',
): Promise<void> {
  const task = await db.tasks.get(taskId);
  if (!task) throw new Error(`任务不存在: ${taskId}`);

  const index = task.steps.findIndex((s) => s.id === stepId);
  if (index < 0) throw new Error(`步骤不存在: ${stepId}`);

  const swapWith = direction === 'up' ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= task.steps.length) return;

  const steps = [...task.steps];
  [steps[index], steps[swapWith]] = [steps[swapWith], steps[index]];
  const reordered = steps.map((s, i) => ({ ...s, order: i }));

  await db.tasks.put({
    ...task,
    steps: reordered,
    status: computeStatus(reordered),
    updatedAt: nowIso(),
  });
}

/** 读取设置，没有则返回默认值 */
export async function getSettings(): Promise<Settings> {
  const row = await db.settings.get(SETTINGS_ID);
  if (!row) return { ...DEFAULT_SETTINGS };
  const { id: _ignored, ...settings } = row;
  return settings;
}

/** 保存设置 */
export async function saveSettings(settings: Settings): Promise<void> {
  await db.settings.put({ ...settings, id: SETTINGS_ID });
}
