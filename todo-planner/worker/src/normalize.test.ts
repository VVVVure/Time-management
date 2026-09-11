import { describe, expect, it } from 'vitest';
import { normalizeDecompose } from './normalize';

describe('normalizeDecompose', () => {
  it('空 steps 时生成兜底步骤，且包含 energy: null', () => {
    const result = normalizeDecompose({
      question: null,
      tasks: [
        {
          title: '取快递',
          deadline: '2026-09-12',
          time: '11:15',
          priority: 'medium',
          steps: [],
        },
      ],
    });

    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0].steps).toHaveLength(1);
    expect(result.tasks[0].steps[0]).toEqual({
      title: '取快递',
      estimatedMinutes: 15,
      energy: null,
    });
  });

  it('正常 steps 保留并规整 energy', () => {
    const result = normalizeDecompose({
      question: null,
      tasks: [
        {
          title: '写报告',
          deadline: null,
          time: null,
          priority: 'high',
          steps: [
            { title: '写初稿', estimatedMinutes: 25, energy: 'high' },
            { title: '倒垃圾', estimatedMinutes: 5, energy: 'low' },
            { title: '发邮件', estimatedMinutes: 3, energy: 'unknown' },
          ],
        },
      ],
    });

    expect(result.tasks[0].steps).toEqual([
      { title: '写初稿', estimatedMinutes: 25, energy: 'high' },
      { title: '倒垃圾', estimatedMinutes: 5, energy: 'low' },
      { title: '发邮件', estimatedMinutes: 3, energy: null },
    ]);
  });
});
