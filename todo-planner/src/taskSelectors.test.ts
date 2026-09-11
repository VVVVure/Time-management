import { describe, expect, it } from 'vitest';
import {
  brainDumpTasksOf,
  focusScopeTasksOf,
  lowEnergyTasksOf,
  normalTasksOf,
  overdueTasksOf,
} from './taskSelectors';
import type { Task } from './types';
import { todayISO, tomorrowISO } from './utils';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 't1',
    title: '测试任务',
    rawInput: '测试',
    deadline: null,
    time: null,
    priority: 'medium',
    status: 'todo',
    steps: [],
    isBrainDump: false,
    recurrence: null,
    recurrenceRootId: null,
    createdAt: '2026-09-11T00:00:00.000Z',
    updatedAt: '2026-09-11T00:00:00.000Z',
    ...overrides,
  };
}

function lowStepTask(id: string): Task {
  return makeTask({
    id,
    steps: [
      {
        id: `s-${id}`,
        title: '倒垃圾',
        estimatedMinutes: 5,
        done: false,
        doneAt: null,
        order: 0,
        energy: 'low',
      },
    ],
  });
}

describe('taskSelectors', () => {
  it('normalTasksOf 排除杂物箱', () => {
    const tasks = [makeTask({ id: 'a' }), makeTask({ id: 'b', isBrainDump: true })];
    expect(normalTasksOf(tasks).map((t) => t.id)).toEqual(['a']);
  });

  it('brainDumpTasksOf 只取杂物箱', () => {
    const tasks = [makeTask({ id: 'a' }), makeTask({ id: 'b', isBrainDump: true })];
    expect(brainDumpTasksOf(tasks).map((t) => t.id)).toEqual(['b']);
  });

  it('focusScopeTasksOf 只包含无日期/今天/过期任务', () => {
    const tasks = [
      makeTask({ id: 'no-date', deadline: null }),
      makeTask({ id: 'today', deadline: todayISO() }),
      makeTask({ id: 'overdue', deadline: '2020-01-01' }),
      makeTask({ id: 'future', deadline: tomorrowISO() }),
      makeTask({ id: 'brain-future', deadline: tomorrowISO(), isBrainDump: true }),
    ];
    expect(focusScopeTasksOf(tasks).map((t) => t.id)).toEqual(['no-date', 'today', 'overdue']);
  });

  it('lowEnergyTasksOf 只取有未完成低精力步骤的聚焦任务', () => {
    const tasks = [
      lowStepTask('low'),
      makeTask({ id: 'no-steps', deadline: todayISO() }),
      makeTask({
        id: 'high',
        deadline: todayISO(),
        steps: [
          {
            id: 's-high',
            title: '写报告',
            estimatedMinutes: 25,
            done: false,
            doneAt: null,
            order: 0,
            energy: 'high',
          },
        ],
      }),
    ];
    expect(lowEnergyTasksOf(tasks).map((t) => t.id)).toEqual(['low']);
  });

  it('overdueTasksOf 只取未完成且已过期的非杂物箱任务', () => {
    const tasks = [
      makeTask({ id: 'overdue', deadline: '2020-01-01' }),
      makeTask({ id: 'overdue-done', deadline: '2020-01-01', status: 'done' }),
      makeTask({ id: 'future', deadline: tomorrowISO() }),
      makeTask({ id: 'overdue-brain', deadline: '2020-01-01', isBrainDump: true }),
    ];
    expect(overdueTasksOf(tasks).map((t) => t.id)).toEqual(['overdue']);
  });
});
