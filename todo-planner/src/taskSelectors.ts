import type { Task } from './types';
import { daysUntil, isFocusRelevant } from './utils';

export function normalTasksOf(tasks: Task[]): Task[] {
  return tasks.filter((t) => !t.isBrainDump);
}

export function brainDumpTasksOf(tasks: Task[]): Task[] {
  return tasks.filter((t) => t.isBrainDump);
}

export function focusScopeTasksOf(tasks: Task[]): Task[] {
  return normalTasksOf(tasks).filter(isFocusRelevant);
}

export function lowEnergyTasksOf(tasks: Task[]): Task[] {
  return focusScopeTasksOf(tasks).filter((t) =>
    t.steps.some((s) => !s.done && s.energy === 'low'),
  );
}

export function overdueTasksOf(tasks: Task[]): Task[] {
  return normalTasksOf(tasks).filter(
    (t) => t.status !== 'done' && t.deadline && daysUntil(t.deadline) < 0,
  );
}
