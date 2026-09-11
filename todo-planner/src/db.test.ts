import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  addStep,
  addTasks,
  computeStatus,
  db,
  DEFAULT_SETTINGS,
  deleteStep,
  deleteTask,
  getSettings,
  listTasks,
  moveStep,
  saveSettings,
  toggleStep,
  updateStep,
  updateTask,
} from './db';
import type { Step, Task } from './types';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 't1',
    title: '测试任务',
    rawInput: '测试原话',
    deadline: null,
    time: null,
    priority: 'medium',
    status: 'todo',
    steps: [],
    isBrainDump: false,
    createdAt: '2026-09-11T00:00:00.000Z',
    updatedAt: '2026-09-11T00:00:00.000Z',
    ...overrides,
  };
}

function makeStep(id: string, done = false, order = 0): Step {
  return {
    id,
    title: `步骤 ${id}`,
    estimatedMinutes: 10,
    done,
    doneAt: done ? '2026-09-11T00:00:00.000Z' : null,
    order,
    energy: null,
  };
}

beforeEach(async () => {
  await db.tasks.clear();
  await db.settings.clear();
});

describe('computeStatus', () => {
  it('无步骤时是 todo', () => {
    expect(computeStatus([])).toBe('todo');
  });

  it('没有勾选时是 todo', () => {
    expect(computeStatus([makeStep('a'), makeStep('b')])).toBe('todo');
  });

  it('部分勾选时是 doing', () => {
    expect(computeStatus([makeStep('a', true), makeStep('b', false)])).toBe('doing');
  });

  it('全部勾选时是 done', () => {
    expect(computeStatus([makeStep('a', true), makeStep('b', true)])).toBe('done');
  });
});

describe('addTasks / listTasks', () => {
  it('一次添加多个任务并能列出', async () => {
    await addTasks([
      makeTask({ id: 'a', title: 'A' }),
      makeTask({ id: 'b', title: 'B' }),
    ]);
    const tasks = await listTasks();
    expect(tasks.map((t) => t.id)).toEqual(['a', 'b']);
  });

  it('按创建时间排序', async () => {
    await addTasks([
      makeTask({ id: 'newer', createdAt: '2026-09-12T00:00:00.000Z' }),
      makeTask({ id: 'older', createdAt: '2026-09-10T00:00:00.000Z' }),
    ]);
    const tasks = await listTasks();
    expect(tasks.map((t) => t.id)).toEqual(['older', 'newer']);
  });
});

describe('addStep / updateStep / deleteStep', () => {
  it('添加步骤并返回完整步骤对象', async () => {
    await addTasks([makeTask()]);
    const step = await addStep('t1', { title: '写报告', estimatedMinutes: 25 });
    expect(step.id).toBeTruthy();
    expect(step.order).toBe(0);
    expect(step.done).toBe(false);

    const [task] = await listTasks();
    expect(task.steps).toHaveLength(1);
    expect(task.steps[0].title).toBe('写报告');
  });

  it('更新步骤文字和预估时间', async () => {
    await addTasks([makeTask()]);
    const step = await addStep('t1', { title: '写报告', estimatedMinutes: 25 });
    await updateStep('t1', step.id, { title: '写总结', estimatedMinutes: 15 });
    const [task] = await listTasks();
    expect(task.steps[0].title).toBe('写总结');
    expect(task.steps[0].estimatedMinutes).toBe(15);
  });

  it('删除步骤后重新排序', async () => {
    await addTasks([makeTask()]);
    await addStep('t1', { title: '一', estimatedMinutes: 10 });
    const second = await addStep('t1', { title: '二', estimatedMinutes: 10 });
    await addStep('t1', { title: '三', estimatedMinutes: 10 });
    await deleteStep('t1', second.id);
    const [task] = await listTasks();
    expect(task.steps.map((s) => s.title)).toEqual(['一', '三']);
    expect(task.steps.map((s) => s.order)).toEqual([0, 1]);
  });
});

describe('toggleStep 自动状态', () => {
  it('勾选一个步骤后任务变 doing', async () => {
    await addTasks([makeTask()]);
    const a = await addStep('t1', { title: '一', estimatedMinutes: 10 });
    await addStep('t1', { title: '二', estimatedMinutes: 10 });
    await toggleStep('t1', a.id);
    const [task] = await listTasks();
    expect(task.status).toBe('doing');
    expect(task.steps.find((s) => s.id === a.id)?.done).toBe(true);
    expect(task.steps.find((s) => s.id === a.id)?.doneAt).toBeTruthy();
  });

  it('全部勾选后任务变 done', async () => {
    await addTasks([makeTask()]);
    const a = await addStep('t1', { title: '一', estimatedMinutes: 10 });
    const b = await addStep('t1', { title: '二', estimatedMinutes: 10 });
    await toggleStep('t1', a.id);
    await toggleStep('t1', b.id);
    const [task] = await listTasks();
    expect(task.status).toBe('done');
  });

  it('取消勾选后任务回退', async () => {
    await addTasks([makeTask()]);
    const a = await addStep('t1', { title: '一', estimatedMinutes: 10 });
    const b = await addStep('t1', { title: '二', estimatedMinutes: 10 });
    await toggleStep('t1', a.id);
    await toggleStep('t1', b.id);
    await toggleStep('t1', a.id);
    const [task] = await listTasks();
    expect(task.status).toBe('doing');
    expect(task.steps.find((s) => s.id === a.id)?.doneAt).toBeNull();
  });
});

describe('moveStep', () => {
  it('上移 / 下移并保持 order 连续', async () => {
    await addTasks([makeTask()]);
    const a = await addStep('t1', { title: '一', estimatedMinutes: 10 });
    await addStep('t1', { title: '二', estimatedMinutes: 10 });
    const c = await addStep('t1', { title: '三', estimatedMinutes: 10 });

    await moveStep('t1', c.id, 'up');
    let [task] = await listTasks();
    expect(task.steps.map((s) => s.title)).toEqual(['一', '三', '二']);
    expect(task.steps.map((s) => s.order)).toEqual([0, 1, 2]);

    await moveStep('t1', a.id, 'down');
    [task] = await listTasks();
    expect(task.steps.map((s) => s.title)).toEqual(['三', '一', '二']);
    expect(task.steps.map((s) => s.order)).toEqual([0, 1, 2]);
  });

  it('边界处移动不会越界', async () => {
    await addTasks([makeTask()]);
    const a = await addStep('t1', { title: '一', estimatedMinutes: 10 });
    await moveStep('t1', a.id, 'up');
    const [task] = await listTasks();
    expect(task.steps.map((s) => s.title)).toEqual(['一']);
  });
});

describe('deleteTask / updateTask', () => {
  it('删除任务', async () => {
    await addTasks([makeTask()]);
    await deleteTask('t1');
    expect(await listTasks()).toHaveLength(0);
  });

  it('更新整个任务会刷新状态', async () => {
    await addTasks([makeTask()]);
    const task = (await listTasks())[0];
    await updateTask({
      ...task,
      title: '新标题',
      steps: [makeStep('a', true), makeStep('b', true)],
    });
    const [updated] = await listTasks();
    expect(updated.title).toBe('新标题');
    expect(updated.status).toBe('done');
    expect(updated.updatedAt).not.toBe('2026-09-11T00:00:00.000Z');
  });
});

describe('settings', () => {
  it('未保存时返回默认值', async () => {
    const settings = await getSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

  it('保存后能读回', async () => {
    await saveSettings({ maxMinutesPerStep: 45, appPassword: 'secret' });
    const settings = await getSettings();
    expect(settings.maxMinutesPerStep).toBe(45);
    expect(settings.appPassword).toBe('secret');
  });
});
