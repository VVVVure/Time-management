import { useState } from 'react';
import type { PreviewTask } from './components/DecomposePreview';
import { addTasks, getSettings, updateTask } from './db';
import { callDecompose, type DecomposeErrorKind, type DecomposeTask } from './decompose';
import { brainDumpTasksOf } from './taskSelectors';
import type { Task } from './types';
import { resolvePreviewDeadline, todayISO, weekdayCN } from './utils';

export type DecomposeFlow =
  | { status: 'loading'; text: string; updateTaskId?: string }
  | { status: 'preview'; text: string; tasks: DecomposeTask[]; updateTaskId?: string }
  | { status: 'question'; text: string; question: string; updateTaskId?: string }
  | {
      status: 'error';
      text: string;
      errorKind: DecomposeErrorKind | 'no-password';
      message: string;
      updateTaskId?: string;
    };

export function useDecomposeFlow(options: {
  tasks: Task[];
  refresh: () => Promise<void>;
  refreshWithSync: () => Promise<void>;
}) {
  const { tasks, refresh, refreshWithSync } = options;
  const [flow, setFlow] = useState<DecomposeFlow | null>(null);

  const brainDumpTasks = brainDumpTasksOf(tasks);

  const runDecompose = async (text: string, updateTaskId?: string) => {
    if (flow?.status === 'loading') return;
    setFlow({ status: 'loading', text, updateTaskId });

    const settings = await getSettings();
    if (!settings.appPassword) {
      setFlow({
        status: 'error',
        text,
        errorKind: 'no-password',
        message: '还没有设置 App 密码，请先到设置页填写',
        updateTaskId,
      });
      return;
    }

    const outcome = await callDecompose({
      input: text,
      password: settings.appPassword,
      maxMinutesPerStep: settings.maxMinutesPerStep,
      today: todayISO(),
      weekday: weekdayCN(),
    });

    if (outcome.kind === 'error') {
      setFlow({
        status: 'error',
        text,
        errorKind: outcome.errorKind,
        message: outcome.message,
        updateTaskId,
      });
      return;
    }

    if (outcome.result.kind === 'question') {
      setFlow({ status: 'question', text, question: outcome.result.question, updateTaskId });
    } else {
      setFlow({ status: 'preview', text, tasks: outcome.result.tasks, updateTaskId });
    }
  };

  const handleSend = (text: string) => runDecompose(text);

  const saveDirect = async (text: string, updateTaskId?: string) => {
    if (updateTaskId) {
      const existing = tasks.find((x) => x.id === updateTaskId);
      if (existing) {
        await updateTask({
          ...existing,
          title: text,
          rawInput: text,
          deadline: null,
          time: null,
          priority: 'medium',
          steps: [],
          isBrainDump: false,
        });
        await refresh();
        setFlow(null);
        return;
      }
    }

    const now = new Date().toISOString();
    await addTasks([
      {
        id: crypto.randomUUID(),
        title: text,
        rawInput: text,
        deadline: null,
        time: null,
        priority: 'medium',
        status: 'todo',
        steps: [],
        isBrainDump: false,
        recurrence: null,
        recurrenceRootId: null,
        createdAt: now,
        updatedAt: now,
      },
    ]);
    await refresh();
    setFlow(null);
  };

  const confirmPreview = async (previewTasks: PreviewTask[], updateTaskId?: string) => {
    if (!flow || flow.status !== 'preview') return;
    const now = new Date().toISOString();
    const hasRecurrence = previewTasks.some((pt) => pt.recurrence != null);
    const reloadAfterSave = async () => {
      if (hasRecurrence) {
        await refreshWithSync();
      } else {
        await refresh();
      }
    };

    const buildTask = (pt: PreviewTask, id: string): Task => ({
      id,
      title: pt.title,
      rawInput: flow.text,
      deadline: resolvePreviewDeadline(pt.deadline, pt.recurrence),
      time: pt.time || null,
      priority: pt.priority,
      status: 'todo',
      steps: pt.steps.map((s, i) => ({
        id: crypto.randomUUID(),
        title: s.title,
        estimatedMinutes: s.estimatedMinutes,
        done: false,
        doneAt: null,
        order: i,
        energy: s.energy ?? null,
      })),
      isBrainDump: false,
      recurrence: pt.recurrence ?? null,
      recurrenceRootId: null,
      createdAt: now,
      updatedAt: now,
    });

    if (updateTaskId) {
      const existing = tasks.find((x) => x.id === updateTaskId);
      if (existing) {
        const [first, ...rest] = previewTasks;
        if (first) {
          await updateTask({
            ...existing,
            ...buildTask(first, existing.id),
            createdAt: existing.createdAt,
          });
        }
        if (rest.length > 0) {
          await addTasks(rest.map((pt) => buildTask(pt, crypto.randomUUID())));
        }
        await reloadAfterSave();
        setFlow(null);
        return;
      }
    }

    await addTasks(previewTasks.map((pt) => buildTask(pt, crypto.randomUUID())));
    await reloadAfterSave();
    setFlow(null);
  };

  const decomposeBrainDump = (taskId: string) => {
    const t = brainDumpTasks.find((x) => x.id === taskId);
    if (!t) return;
    void runDecompose(t.rawInput, taskId);
  };

  const retry = () => {
    if (flow && 'text' in flow) void runDecompose(flow.text, flow.updateTaskId);
  };

  return {
    flow,
    closeFlow: () => setFlow(null),
    handleSend,
    saveDirect,
    confirmPreview,
    decomposeBrainDump,
    retry,
  };
}
