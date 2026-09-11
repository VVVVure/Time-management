import { useState } from 'react';
import {
  addStep,
  deleteStep,
  deleteTask,
  moveStep,
  toggleStep,
  updateStep,
  updateTask,
} from '../db';
import type { Priority, Step, Task } from '../types';
import { doneStepCount, formatMinutes, remainingMinutes } from '../utils';

interface Props {
  task: Task;
  onBack: () => void;
  onChanged: () => Promise<void>;
}

const PRIORITY_LABELS: Record<Priority, string> = {
  high: '高',
  medium: '中',
  low: '低',
};

const PRIORITY_CLASSES: Record<Priority, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-blue-100 text-blue-700',
  low: 'bg-gray-100 text-gray-600',
};

function TaskDetail({ task, onBack, onChanged }: Props) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(task.title);
  const [editingDeadline, setEditingDeadline] = useState(false);
  const [deadlineDraft, setDeadlineDraft] = useState(task.deadline ?? '');
  const [addingStep, setAddingStep] = useState(false);
  const [newStepTitle, setNewStepTitle] = useState('');
  const [newStepMinutes, setNewStepMinutes] = useState(25);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const total = task.steps.reduce((sum, s) => sum + s.estimatedMinutes, 0);
  const remaining = remainingMinutes(task.steps);
  const done = doneStepCount(task.steps);

  const saveTitle = async () => {
    const title = titleDraft.trim();
    if (!title) {
      setTitleDraft(task.title);
      setEditingTitle(false);
      return;
    }
    await updateTask({ ...task, title });
    setEditingTitle(false);
    await onChanged();
  };

  const saveDeadline = async () => {
    await updateTask({ ...task, deadline: deadlineDraft || null });
    setEditingDeadline(false);
    await onChanged();
  };

  const changePriority = async (priority: Priority) => {
    await updateTask({ ...task, priority });
    await onChanged();
  };

  const handleToggle = async (stepId: string) => {
    await toggleStep(task.id, stepId);
    await onChanged();
  };

  const handleAddStep = async () => {
    const title = newStepTitle.trim();
    if (!title) return;
    await addStep(task.id, { title, estimatedMinutes: Math.max(1, newStepMinutes) });
    setNewStepTitle('');
    setNewStepMinutes(25);
    setAddingStep(false);
    await onChanged();
  };

  const handleDeleteTask = async () => {
    await deleteTask(task.id);
    await onChanged();
    onBack();
  };

  return (
    <div className="safe-top safe-bottom mx-auto flex min-h-full max-w-md flex-col px-4 pb-8 pt-4">
      <div className="mb-4 flex items-center justify-between">
        <button type="button" onClick={onBack} className="text-base text-blue-600">
          ‹ 返回
        </button>
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="text-base text-red-500"
        >
          删除任务
        </button>
      </div>

      {/* 标题 */}
      {editingTitle ? (
        <input
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          onBlur={saveTitle}
          autoFocus
          className="w-full rounded-xl bg-white px-3 py-2 text-xl font-semibold outline-none ring-2 ring-blue-500"
          style={{ fontSize: 20 }}
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditingTitle(true)}
          className="text-left text-xl font-bold leading-snug text-gray-900"
        >
          {task.title}
        </button>
      )}

      {/* 截止日期 + 优先级 */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {editingDeadline ? (
          <span className="flex items-center gap-2">
            <input
              type="date"
              value={deadlineDraft}
              onChange={(e) => setDeadlineDraft(e.target.value)}
              onBlur={saveDeadline}
              autoFocus
              className="rounded-lg bg-white px-2 py-1.5 text-sm outline-none ring-2 ring-blue-500"
            />
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={async () => {
                setDeadlineDraft('');
                await saveDeadline();
              }}
              className="text-xs text-gray-400"
            >
              清除
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => {
              setDeadlineDraft(task.deadline ?? '');
              setEditingDeadline(true);
            }}
            className="rounded-lg bg-white px-3 py-1.5 text-sm text-gray-700"
          >
            {task.deadline ? `📅 ${task.deadline}` : '📅 添加截止日期'}
          </button>
        )}

        <div className="flex gap-1.5">
          {(Object.keys(PRIORITY_LABELS) as Priority[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => changePriority(p)}
              className={`rounded-lg px-2.5 py-1.5 text-sm font-medium ${
                task.priority === p
                  ? PRIORITY_CLASSES[p]
                  : 'bg-white text-gray-400'
              }`}
            >
              {PRIORITY_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* 时间统计 */}
      <div className="mt-3 rounded-xl bg-white px-3 py-2.5 text-sm text-gray-600">
        <span>
          已完成 {done}/{task.steps.length} 步 · 总预估 {formatMinutes(total)} · 剩余{' '}
          {formatMinutes(remaining)}
        </span>
      </div>

      {/* 步骤列表 */}
      <div className="mt-4 flex-1 space-y-2">
        {task.steps.length === 0 && (
          <p className="py-8 text-center text-sm text-gray-400">还没有步骤，点下面添加</p>
        )}
        {task.steps.map((step) => (
          <StepItem
            key={step.id}
            step={step}
            first={step.order === 0}
            last={step.order === task.steps.length - 1}
            onToggle={() => handleToggle(step.id)}
            onSave={async (changes) => {
              await updateStep(task.id, step.id, changes);
              await onChanged();
            }}
            onDelete={async () => {
              await deleteStep(task.id, step.id);
              await onChanged();
            }}
            onMove={async (direction) => {
              await moveStep(task.id, step.id, direction);
              await onChanged();
            }}
          />
        ))}
      </div>

      {/* 添加步骤 */}
      {addingStep ? (
        <div className="mt-4 rounded-xl bg-white p-3">
          <input
            value={newStepTitle}
            onChange={(e) => setNewStepTitle(e.target.value)}
            placeholder="步骤标题，动词开头"
            className="w-full rounded-lg bg-gray-100 px-3 py-2 text-base outline-none"
            style={{ fontSize: 16 }}
            autoFocus
          />
          <div className="mt-2 flex items-center gap-2">
            <label className="text-sm text-gray-500">预估分钟</label>
            <input
              type="number"
              min={1}
              value={newStepMinutes}
              onChange={(e) => setNewStepMinutes(Number(e.target.value))}
              className="w-20 rounded-lg bg-gray-100 px-2 py-1.5 text-base outline-none"
            />
            <div className="flex-1" />
            <button
              type="button"
              onClick={() => setAddingStep(false)}
              className="rounded-lg px-3 py-2 text-sm text-gray-500"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleAddStep}
              disabled={!newStepTitle.trim()}
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              添加
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAddingStep(true)}
          className="mt-4 w-full rounded-xl border border-dashed border-gray-300 py-3 text-sm text-gray-500"
        >
          ＋ 添加步骤
        </button>
      )}

      {/* 删除确认 */}
      {confirmDelete && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 px-8">
          <div className="w-full rounded-2xl bg-white p-5">
            <h3 className="text-lg font-semibold">删除这个任务？</h3>
            <p className="mt-1 text-sm text-gray-500">任务和它的所有步骤都会被删除，无法恢复。</p>
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="flex-1 rounded-xl bg-gray-100 py-2.5 text-gray-700"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleDeleteTask}
                className="flex-1 rounded-xl bg-red-600 py-2.5 font-medium text-white"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface StepItemProps {
  step: Step;
  first: boolean;
  last: boolean;
  onToggle: () => void;
  onSave: (changes: Partial<Pick<Step, 'title' | 'estimatedMinutes'>>) => Promise<void>;
  onDelete: () => Promise<void>;
  onMove: (direction: 'up' | 'down') => Promise<void>;
}

function StepItem({ step, first, last, onToggle, onSave, onDelete, onMove }: StepItemProps) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(step.title);
  const [minutes, setMinutes] = useState(step.estimatedMinutes);

  const save = async () => {
    const nextTitle = title.trim() || step.title;
    await onSave({ title: nextTitle, estimatedMinutes: Math.max(1, minutes) });
    setEditing(false);
  };

  return (
    <div className="flex items-center gap-2 rounded-xl bg-white p-3">
      <button
        type="button"
        onClick={onToggle}
        aria-label={step.done ? '标记为未完成' : '标记为完成'}
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-150 ${
          step.done ? 'border-blue-600 bg-blue-600' : 'border-gray-300 bg-white'
        }`}
      >
        {step.done && (
          <svg
            viewBox="0 0 12 10"
            className="h-3 w-3 text-white transition-transform duration-150"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M1 5.5 4 8.5 11 1.5" />
          </svg>
        )}
      </button>

      {editing ? (
        <div className="min-w-0 flex-1">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg bg-gray-100 px-2 py-1.5 text-base outline-none ring-1 ring-blue-400"
            style={{ fontSize: 16 }}
            autoFocus
          />
          <div className="mt-1.5 flex items-center gap-2">
            <label className="text-xs text-gray-500">分钟</label>
            <input
              type="number"
              min={1}
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
              className="w-16 rounded-lg bg-gray-100 px-2 py-1 text-base outline-none"
            />
            <div className="flex-1" />
            <button type="button" onClick={save} className="text-sm font-medium text-blue-600">
              保存
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setTitle(step.title);
                setMinutes(step.estimatedMinutes);
              }}
              className="text-sm text-gray-500"
            >
              取消
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="min-w-0 flex-1 text-left"
        >
          <span
            className={`block text-base leading-snug ${
              step.done ? 'text-gray-400 line-through' : 'text-gray-900'
            }`}
          >
            {step.title}
          </span>
          <span className="text-xs text-gray-400">{formatMinutes(step.estimatedMinutes)}</span>
        </button>
      )}

      {!editing && (
        <div className="flex shrink-0 items-center gap-0.5 text-gray-400">
          <button
            type="button"
            onClick={() => onMove('up')}
            disabled={first}
            className="px-1 text-lg disabled:opacity-30"
            aria-label="上移"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => onMove('down')}
            disabled={last}
            className="px-1 text-lg disabled:opacity-30"
            aria-label="下移"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="px-1 text-sm text-red-400"
            aria-label="删除步骤"
          >
            删除
          </button>
        </div>
      )}
    </div>
  );
}

export default TaskDetail;
