import type { Step, Task } from './types';

/** 今天的本地日期 "YYYY-MM-DD" */
export function todayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 今天的星期几（中文） */
export function weekdayCN(): string {
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  return weekdays[new Date().getDay()];
}

/** 明天的本地日期 "YYYY-MM-DD" */
export function tomorrowISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** "延后 15 分钟"对应的截止日期：当天，深夜则顺延到明天 */
export function postpone15Deadline(): string {
  const now = new Date();
  const nearMidnight = now.getHours() === 23 && now.getMinutes() >= 45;
  return nearMidnight ? tomorrowISO() : todayISO();
}

/** 触发一次轻震动（不支持时静默忽略，不报错） */
export function vibrate(pattern: number | number[] = 12): void {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    // 忽略
  }
}

/** 把 "YYYY-MM-DD" 解析成当天 0 点（本地时区），避免被当成 UTC 造成偏移一天 */
function parseLocalDate(date: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** 距离截止日期还有几天：负数表示已过期 */
export function daysUntil(deadline: string): number {
  const dl = parseLocalDate(deadline);
  const today = new Date();
  const today0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((dl.getTime() - today0.getTime()) / 86_400_000);
}

/** 截止日期的中文显示 + 是否过期 */
export function formatDeadline(deadline: string): { text: string; overdue: boolean } {
  const diff = daysUntil(deadline);
  if (diff < 0) {
    const n = Math.abs(diff);
    return { text: n === 1 ? '已过期 1 天' : `已过期 ${n} 天`, overdue: true };
  }
  if (diff === 0) return { text: '今天截止', overdue: false };
  if (diff === 1) return { text: '明天截止', overdue: false };
  return { text: `剩余 ${diff} 天`, overdue: false };
}

/** 已完成步骤数 */
export function doneStepCount(steps: Step[]): number {
  return steps.filter((s) => s.done).length;
}

/** 剩余预估分钟数（未完成步骤之和） */
export function remainingMinutes(steps: Step[]): number {
  return steps.reduce((sum, s) => (s.done ? sum : sum + s.estimatedMinutes), 0);
}

/** 分钟数的人类可读格式 */
export function formatMinutes(minutes: number): string {
  if (minutes <= 0) return '0 分钟';
  if (minutes < 60) return `${minutes} 分钟`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} 小时` : `${h} 小时 ${m} 分`;
}

/** 列表排序：有截止日期的按日期从近到远，没截止日期的排在后面 */
export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.deadline && b.deadline) {
      const d = a.deadline.localeCompare(b.deadline);
      if (d !== 0) return d;
    } else if (a.deadline) {
      return -1;
    } else if (b.deadline) {
      return 1;
    }
    return a.createdAt.localeCompare(b.createdAt);
  });
}
