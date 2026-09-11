import { describe, expect, it } from 'vitest';
import type { Task } from './types';
import { buildDateWindow, groupByTimeOfDay, loadDotsForDate, tasksForDate } from './utils';

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

describe('tasksForDate', () => {
  it('只取 deadline 等于目标日期且不是杂物箱的任务', () => {
    const tasks = [
      makeTask({ id: 'a', deadline: '2026-09-12' }),
      makeTask({ id: 'b', deadline: '2026-09-12', isBrainDump: true }),
      makeTask({ id: 'c', deadline: '2026-09-13' }),
      makeTask({ id: 'd', deadline: null }),
    ];
    const result = tasksForDate(tasks, '2026-09-12');
    expect(result.map((t) => t.id)).toEqual(['a']);
  });
});

describe('loadDotsForDate', () => {
  it('1 个任务 1 个点，3 个及以上封顶为 3', () => {
    const one = [makeTask({ deadline: '2026-09-12' })];
    expect(loadDotsForDate(one, '2026-09-12')).toBe(1);

    const five = Array.from({ length: 5 }, (_, i) =>
      makeTask({ id: `t${i}`, deadline: '2026-09-12' }),
    );
    expect(loadDotsForDate(five, '2026-09-12')).toBe(3);
  });
});

describe('groupByTimeOfDay', () => {
  it('按 time 粗分晨间/午后/晚间，无 time 归入未定时间，空区块不出现', () => {
    const tasks = [
      makeTask({ id: 'm', time: '09:30', deadline: '2026-09-12' }),
      makeTask({ id: 'a', time: '14:00', deadline: '2026-09-12' }),
      makeTask({ id: 'e', time: '19:00', deadline: '2026-09-12' }),
      makeTask({ id: 'x', time: null, deadline: '2026-09-12' }),
    ];
    const blocks = groupByTimeOfDay(tasks);
    expect(blocks.map((b) => b.key)).toEqual(['morning', 'afternoon', 'evening', 'anytime']);
    expect(blocks[0].tasks.map((t) => t.id)).toEqual(['m']);
    expect(blocks[3].tasks.map((t) => t.id)).toEqual(['x']);
  });

  it('没有任务时返回空数组', () => {
    expect(groupByTimeOfDay([])).toEqual([]);
  });
});

describe('buildDateWindow', () => {
  it('生成 10 天窗口，且只有一天标记为今天', () => {
    const days = buildDateWindow(2, 7);
    expect(days).toHaveLength(10);
    expect(days.filter((d) => d.isToday)).toHaveLength(1);
    expect(days[2].isToday).toBe(true);
    expect(days[0].date < days[2].date).toBe(true);
    expect(days[9].date > days[2].date).toBe(true);
  });
});
