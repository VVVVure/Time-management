import { useState } from 'react';
import type { DecomposeTask } from '../decompose';
import type { Priority } from '../types';

export interface PreviewStep {
  key: string;
  title: string;
  estimatedMinutes: number;
  energy: 'high' | 'low' | null;
}

export interface PreviewTask {
  key: string;
  title: string;
  deadline: string;
  time: string;
  priority: Priority;
  steps: PreviewStep[];
}

interface Props {
  rawInput: string;
  tasks: DecomposeTask[];
  onConfirm: (tasks: PreviewTask[]) => void;
  onCancel: () => void;
}

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' },
];

function toPreview(tasks: DecomposeTask[]): PreviewTask[] {
  return tasks.map((t) => ({
    key: crypto.randomUUID(),
    title: t.title,
    deadline: t.deadline ?? '',
    time: t.time ?? '',
    priority: t.priority,
    steps: t.steps.map((s) => ({
      key: crypto.randomUUID(),
      title: s.title,
      estimatedMinutes: s.estimatedMinutes,
      energy: s.energy ?? null,
    })),
  }));
}

function DecomposePreview({ rawInput, tasks, onConfirm, onCancel }: Props) {
  const [preview, setPreview] = useState<PreviewTask[]>(() => toPreview(tasks));

  const patchTask = (key: string, patch: Partial<Omit<PreviewTask, 'key' | 'steps'>>) => {
    setPreview((prev) => prev.map((t) => (t.key === key ? { ...t, ...patch } : t)));
  };

  const deleteTask = (key: string) => {
    setPreview((prev) => prev.filter((t) => t.key !== key));
  };

  const patchStep = (taskKey: string, stepKey: string, patch: Partial<PreviewStep>) => {
    setPreview((prev) =>
      prev.map((t) =>
        t.key !== taskKey
          ? t
          : { ...t, steps: t.steps.map((s) => (s.key === stepKey ? { ...s, ...patch } : s)) },
      ),
    );
  };

  const deleteStep = (taskKey: string, stepKey: string) => {
    setPreview((prev) =>
      prev.map((t) =>
        t.key !== taskKey ? t : { ...t, steps: t.steps.filter((s) => s.key !== stepKey) },
      ),
    );
  };

  const addStep = (taskKey: string) => {
    setPreview((prev) =>
      prev.map((t) =>
        t.key !== taskKey
          ? t
          : {
              ...t,
              steps: [
                ...t.steps,
                { key: crypto.randomUUID(), title: '', estimatedMinutes: 25, energy: null },
              ],
            },
      ),
    );
  };

  const validTasks = preview.filter((t) => t.title.trim());
  const validCount = validTasks.length;

  const handleConfirm = () => {
    const cleaned = preview
      .filter((t) => t.title.trim())
      .map((t) => ({
        ...t,
        title: t.title.trim(),
        steps: t.steps
          .filter((s) => s.title.trim())
          .map((s) => ({
            ...s,
            title: s.title.trim(),
            estimatedMinutes: Math.max(1, Math.round(s.estimatedMinutes) || 1),
          })),
      }));
    if (cleaned.length === 0) return;
    onConfirm(cleaned);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-50">
      <div
        className="mx-auto flex w-full max-w-md flex-1 flex-col overflow-hidden"
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
          <button type="button" onClick={onCancel} className="text-base text-gray-500">
            取消
          </button>
          <h1 className="text-lg font-semibold">确认任务</h1>
          <span className="text-base text-gray-400">{validCount} 项</span>
        </header>

        <p className="mx-4 mt-3 truncate rounded-xl bg-blue-50 px-3 py-2 text-xs text-blue-600">
          原话：{rawInput}
        </p>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
          {preview.length === 0 && (
            <p className="py-10 text-center text-sm text-gray-400">没有任务了</p>
          )}

          {preview.map((task) => (
            <div key={task.key} className="rounded-2xl bg-white p-3 shadow-sm">
              <div className="flex items-center gap-2">
                <input
                  value={task.title}
                  onChange={(e) => patchTask(task.key, { title: e.target.value })}
                  placeholder="任务标题"
                  className="min-w-0 flex-1 rounded-lg bg-gray-100 px-2.5 py-2 text-base font-medium outline-none"
                  style={{ fontSize: 16 }}
                />
                <button
                  type="button"
                  onClick={() => deleteTask(task.key)}
                  className="shrink-0 text-sm text-red-400"
                >
                  删除
                </button>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  value={task.deadline}
                  onChange={(e) => patchTask(task.key, { deadline: e.target.value })}
                  className="rounded-lg bg-gray-100 px-2 py-1.5 text-sm outline-none"
                />
                <input
                  type="time"
                  value={task.time}
                  onChange={(e) => patchTask(task.key, { time: e.target.value })}
                  className="rounded-lg bg-gray-100 px-2 py-1.5 text-sm outline-none"
                />
                <div className="flex gap-1">
                  {PRIORITIES.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => patchTask(task.key, { priority: p.value })}
                      className={`rounded-lg px-2 py-1.5 text-sm ${
                        task.priority === p.value
                          ? p.value === 'high'
                            ? 'bg-red-100 text-red-700'
                            : p.value === 'medium'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-200 text-gray-700'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-2 space-y-1.5">
                {task.steps.map((step) => (
                  <div key={step.key} className="flex items-center gap-2">
                    <input
                      value={step.title}
                      onChange={(e) => patchStep(task.key, step.key, { title: e.target.value })}
                      placeholder="步骤标题"
                      className="min-w-0 flex-1 rounded-lg bg-gray-50 px-2.5 py-1.5 text-sm outline-none"
                      style={{ fontSize: 16 }}
                    />
                    <input
                      type="number"
                      min={1}
                      value={step.estimatedMinutes}
                      onChange={(e) =>
                        patchStep(task.key, step.key, {
                          estimatedMinutes: Number(e.target.value),
                        })
                      }
                      className="w-16 shrink-0 rounded-lg bg-gray-50 px-2 py-1.5 text-sm outline-none"
                    />
                    <span className="shrink-0 text-xs text-gray-400">分</span>
                    <button
                      type="button"
                      onClick={() => deleteStep(task.key, step.key)}
                      className="shrink-0 text-sm text-red-300"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addStep(task.key)}
                  className="text-sm text-blue-600"
                >
                  ＋ 添加步骤
                </button>
              </div>
            </div>
          ))}
        </div>

        <footer className="border-t border-gray-200 bg-white px-4 py-3">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={validCount === 0}
            className="w-full rounded-xl bg-blue-600 py-3 text-base font-medium text-white disabled:opacity-40"
          >
            保存（{validCount} 项）
          </button>
        </footer>
      </div>
    </div>
  );
}

export default DecomposePreview;
