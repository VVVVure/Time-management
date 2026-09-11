import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { exportData, importData } from './backup';
import { addTasks, db, saveSettings } from './db';
import type { Task } from './types';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 't1',
    title: '测试任务',
    rawInput: '测试原话',
    deadline: '2026-09-18',
    priority: 'high',
    status: 'doing',
    steps: [
      {
        id: 's1',
        title: '第一步',
        estimatedMinutes: 25,
        done: true,
        doneAt: '2026-09-11T00:00:00.000Z',
        order: 0,
      },
    ],
    createdAt: '2026-09-11T00:00:00.000Z',
    updatedAt: '2026-09-11T00:00:00.000Z',
    ...overrides,
  };
}

beforeEach(async () => {
  await db.tasks.clear();
  await db.settings.clear();
});

describe('exportData', () => {
  it('导出内容包含任务和设置，文件名带日期', async () => {
    await addTasks([makeTask()]);
    await saveSettings({ maxMinutesPerStep: 45, appPassword: 'pwd' });

    const { filename, content } = await exportData();
    expect(filename).toMatch(/^todo-planner-backup-\d{4}-\d{2}-\d{2}\.json$/);

    const parsed = JSON.parse(content);
    expect(parsed.version).toBe(1);
    expect(parsed.tasks).toHaveLength(1);
    expect(parsed.settings.maxMinutesPerStep).toBe(45);
    expect(parsed.settings.appPassword).toBe('pwd');
  });
});

describe('importData', () => {
  it('导出 → 清空 → 导入后数据完全一致', async () => {
    await addTasks([makeTask(), makeTask({ id: 't2', title: '第二个任务' })]);
    await saveSettings({ maxMinutesPerStep: 15, appPassword: 'secret' });

    const { content } = await exportData();

    // 清空
    await db.tasks.clear();
    await db.settings.clear();

    const file = new File([content], 'backup.json', { type: 'application/json' });
    await importData(file);

    const restored = await exportData();
    const before = JSON.parse(content);
    const after = JSON.parse(restored.content);

    expect(after.tasks).toEqual(before.tasks);
    expect(after.settings).toEqual(before.settings);
  });

  it('导入会覆盖现有数据', async () => {
    await addTasks([makeTask({ id: 'old', title: '旧任务' })]);
    const { content } = await exportData();
    await db.tasks.clear();
    await addTasks([makeTask({ id: 'new', title: '新任务' })]);

    const file = new File([content], 'backup.json', { type: 'application/json' });
    await importData(file);

    const tasks = await db.tasks.toArray();
    expect(tasks.map((t) => t.id)).toEqual(['old']);
  });

  it('不是 JSON 时给出错误提示', async () => {
    const file = new File(['不是 JSON'], 'backup.json', { type: 'application/json' });
    await expect(importData(file)).rejects.toThrow('文件不是有效的 JSON');
  });

  it('结构不对时给出错误提示', async () => {
    const file = new File(
      [JSON.stringify({ version: 1, tasks: 'oops', settings: {} })],
      'backup.json',
      { type: 'application/json' },
    );
    await expect(importData(file)).rejects.toThrow('备份格式不对');
  });
});
