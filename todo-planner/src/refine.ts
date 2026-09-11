import { callRefine } from './decompose';
import { getSettings, updateTask } from './db';
import type { Step, Task } from './types';

/**
 * 把任务里第一个未完成步骤用 /refine 拆成更细的步骤，并在原位置替换。
 * 失败时抛出带中文提示的 Error。
 */
export async function resplitStep(task: Task): Promise<void> {
  const target = task.steps.find((s) => !s.done);
  if (!target) throw new Error('这个任务没有未完成的步骤，不需要再切碎');

  const settings = await getSettings();
  if (!settings.appPassword) {
    throw new Error('还没有设置 App 密码，请先到设置页填写');
  }

  const outcome = await callRefine({
    taskTitle: task.title,
    stepTitle: target.title,
    maxMinutesPerStep: settings.maxMinutesPerStep,
    password: settings.appPassword,
  });

  if (outcome.kind === 'error') {
    throw new Error(outcome.message);
  }

  const replacement: Step[] = outcome.steps.map((s) => ({
    id: crypto.randomUUID(),
    title: s.title,
    estimatedMinutes: s.estimatedMinutes,
    done: false,
    doneAt: null,
    order: 0,
    energy: s.energy ?? null,
  }));

  const index = task.steps.findIndex((s) => s.id === target.id);
  const next = [
    ...task.steps.slice(0, index),
    ...replacement,
    ...task.steps.slice(index + 1),
  ].map((s, i) => ({ ...s, order: i }));

  await updateTask({ ...task, steps: next });
}
