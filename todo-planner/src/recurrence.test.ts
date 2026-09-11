import { describe, expect, it } from 'vitest';
import { occurrenceDatesInRange } from './recurrence';
import type { RecurrenceRule } from './types';

function rule(
  freq: RecurrenceRule['freq'],
  interval: number,
  endDate: string | null = null,
): RecurrenceRule {
  return { freq, interval, endDate };
}

describe('occurrenceDatesInRange', () => {
  it('每天（daily）按天累加', () => {
    expect(occurrenceDatesInRange(rule('daily', 1), '2026-09-11', '2026-09-11', '2026-09-15')).toEqual([
      '2026-09-11',
      '2026-09-12',
      '2026-09-13',
      '2026-09-14',
      '2026-09-15',
    ]);
  });

  it('每周（weekly）按 7 天累加', () => {
    expect(occurrenceDatesInRange(rule('weekly', 1), '2026-09-11', '2026-09-11', '2026-09-25')).toEqual([
      '2026-09-11',
      '2026-09-18',
      '2026-09-25',
    ]);
  });

  it('每两周（weekly interval=2）', () => {
    expect(occurrenceDatesInRange(rule('weekly', 2), '2026-09-11', '2026-09-11', '2026-09-30')).toEqual([
      '2026-09-11',
      '2026-09-25',
    ]);
  });

  it('每月（monthly）普通日期', () => {
    expect(occurrenceDatesInRange(rule('monthly', 1), '2026-03-15', '2026-03-15', '2026-05-31')).toEqual([
      '2026-03-15',
      '2026-04-15',
      '2026-05-15',
    ]);
  });

  it('月末溢出：1/31 每月重复收缩到当月最后一天，下月回到 31 号', () => {
    expect(occurrenceDatesInRange(rule('monthly', 1), '2026-01-31', '2026-01-31', '2026-05-31')).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
      '2026-05-31',
    ]);
  });

  it('endDate 截止（含当天）', () => {
    expect(
      occurrenceDatesInRange(rule('daily', 1, '2026-09-13'), '2026-09-11', '2026-09-11', '2026-09-20'),
    ).toEqual([
      '2026-09-11',
      '2026-09-12',
      '2026-09-13',
    ]);
  });

  it('区间开始晚于 seedDate 时从区间起点开始返回', () => {
    expect(occurrenceDatesInRange(rule('daily', 1), '2026-09-01', '2026-09-10', '2026-09-12')).toEqual([
      '2026-09-10',
      '2026-09-11',
      '2026-09-12',
    ]);
  });
});
