import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp, Trash2, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { categoryFor } from '../categories';
import {
  addStep,
  deleteStep,
  deleteTask,
  listTasks,
  moveStep,
  toggleStep,
  updateStep,
  updateTask,
} from '../db';
import { applyRecurrence, deleteSeries } from '../recurrence';
import { resplitStep } from '../refine';
import type { Priority, RecurrenceRule, Step, Task } from '../types';
import {
  doneStepCount,
  formatMinutes,
  formatSchedule,
  postpone15Deadline,
  remainingMinutes,
  tomorrowISO,
  vibrate,
} from '../utils';
import RecurrencePicker from './RecurrencePicker';

interface Props {
  task: Task;
  onBack: () => void;
  onChanged: () => Promise<void>;
  onChangedWithSync?: () => Promise<void>;
}

const PRIORITY_LABELS: Record<Priority, string> = {
  high: '高',
  medium: '中',
  low: '低',
};

const PRIORITY_CLASSES: Record<Priority, string> = {
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-blue-100 text-blue-700',
  low: 'bg-gray-100 text-gray-600',
};

function recurrenceLabel(rule: RecurrenceRule | null): string {
  if (!rule) return '不重复';
  if (rule.freq === 'weekly' && rule.interval === 2) return '每两周';
  if (rule.interval === 1) {
    return { daily: '每天', weekly: '每周', monthly: '每月' }[rule.freq];
  }
  const unit = { daily: '天', weekly: '周', monthly: '月' }[rule.freq];
  return `每 ${rule.interval} ${unit}`;
}

function TaskDetail({ task, onBack, onChanged, onChangedWithSync }: Props) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(task.title);
  const [editingDeadline, setEditingDeadline] = useState(false);
  const [deadlineDraft, setDeadlineDraft] = useState(task.deadline ?? '');
  const [addingStep, setAddingStep] = useState(false);
  const [newStepTitle, setNewStepTitle] = useState('');
  const [newStepMinutes, setNewStepMinutes] = useState(25);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [forgiveMsg, setForgiveMsg] = useState<string | null>(null);
  const [editingRecurrence, setEditingRecurrence] = useState(false);
  const [repDraft, setRepDraft] = useState<RecurrenceRule | null>(task.recurrence);

  const isRoot = task.recurrence !== null;
  const isInstance = task.recurrenceRootId !== null;


  const total = task.steps.reduce((sum, s) => sum + s.estimatedMinutes, 0);
  const remaining = remainingMinutes(task.steps);
  const done = doneStepCount(task.steps);
  const schedule = formatSchedule(task.deadline, task.time);
  const overdue = schedule?.overdue ?? false;
  const category = categoryFor(task.title);
  const Icon = category.icon;

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
    if (isRoot) {
      await deleteSeries(task.id, await listTasks());
    } else {
      await deleteTask(task.id);
    }
    await onChanged();
    onBack();
  };

  const handleStopRecurrence = async () => {
    await applyRecurrence(task, null);
    await onChanged();
  };

  const openRecurrence = () => {
    setRepDraft(task.recurrence);
    setEditingRecurrence(true);
  };

  const saveRecurrence = async () => {
    await applyRecurrence(task, repDraft);
    setEditingRecurrence(false);
    if (onChangedWithSync) {
      await onChangedWithSync();
    } else {
      await onChanged();
    }
  };

  const handlePostpone15 = async () => {
    await updateTask({ ...task, deadline: postpone15Deadline() });
    await onChanged();
  };

  const handleTomorrow = async () => {
    await updateTask({ ...task, deadline: tomorrowISO() });
    await onChanged();
  };

  const handleResplit = async () => {
    setForgiveMsg(null);
    try {
      await resplitStep(task);
      await onChanged();
    } catch (err) {
      setForgiveMsg(err instanceof Error ? err.message : '重新切碎失败，请稍后再试');
    }
  };

  return (
    <div className="safe-top safe-bottom mx-auto flex min-h-full max-w-md flex-col px-4 pb-8 pt-4">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex h-11 items-center text-base text-blue-600"
        >
          ‹ 返回
        </button>
        <div className="flex items-center gap-3">
          {isRoot && (
            <button
              type="button"
              onClick={handleStopRecurrence}
              className="flex h-11 items-center text-sm text-amber-600"
            >
              停止重复
            </button>
          )}
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="flex h-11 items-center text-base text-rose-400"
          >
            删除任务
          </button>
        </div>
      </div>

      {/* 标题 */}
      {editingTitle ? (
        <input
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          onBlur={saveTitle}
          autoFocus
          className="w-full rounded-2xl bg-white px-3 py-2 text-xl font-semibold outline-none ring-2 ring-blue-400"
          style={{ fontSize: 20 }}
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditingTitle(true)}
          className="flex items-center gap-2 text-left text-[22px] font-semibold leading-snug text-gray-900"
        >
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
            style={{ background: category.tone.bg }}
          >
            <Icon size={18} style={{ color: category.tone.fg }} />
          </span>
          <span className="min-w-0">{task.title}</span>
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
              className="rounded-xl bg-white px-2 py-1.5 text-sm outline-none ring-2 ring-blue-400"
            />
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={async () => {
                setDeadlineDraft('');
                await saveDeadline();
              }}
              className="h-11 text-xs text-gray-400"
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
            className={`flex h-11 items-center rounded-xl px-3 text-sm ${
              overdue ? 'bg-amber-50 text-amber-700' : 'bg-white text-gray-700'
            }`}
          >
            {schedule ? `📅 ${schedule.text}` : '📅 添加截止日期'}
          </button>
        )}

        <div className="flex gap-1.5">
          {(Object.keys(PRIORITY_LABELS) as Priority[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => changePriority(p)}
              className={`h-11 rounded-xl px-2.5 text-sm font-medium ${
                task.priority === p ? PRIORITY_CLASSES[p] : 'bg-white text-gray-400'
              }`}
            >
              {PRIORITY_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* 重复 */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {isInstance ? (
          <p className="text-[13px] text-gray-400">🔁 这是重复系列中的一次，去根任务修改规则</p>
        ) : !task.deadline ? (
          <p className="text-[13px] text-gray-400">🔁 请先设置截止日期，才能设置重复</p>
        ) : (
          <button
            type="button"
            onClick={openRecurrence}
            className={`soft-shadow flex h-11 items-center rounded-xl px-3 text-sm ${
              isRoot ? 'bg-blue-50 text-blue-700' : 'bg-white text-gray-700'
            }`}
          >
            🔁 {recurrenceLabel(task.recurrence)}
          </button>
        )}
      </div>

      {/* 宽容型设计：过期任务给单键快捷操作 */}
      {overdue && (
        <div className="soft-shadow mt-3 rounded-2xl bg-amber-50 p-3">
          <p className="text-sm text-amber-700">这个任务已经过期了，没关系，可以这样调整：</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={handlePostpone15}
              className="min-h-[44px] rounded-full bg-white px-3 py-2 text-[13px] font-medium text-amber-700"
            >
              延后 15 分钟
            </button>
            <button
              type="button"
              onClick={handleTomorrow}
              className="min-h-[44px] rounded-full bg-white px-3 py-2 text-[13px] font-medium text-amber-700"
            >
              明天再做
            </button>
            <button
              type="button"
              onClick={handleResplit}
              className="min-h-[44px] rounded-full bg-white px-3 py-2 text-[13px] font-medium text-amber-700"
            >
              重新切碎这一步
            </button>
          </div>
          {forgiveMsg && <p className="mt-2 text-xs text-amber-700">{forgiveMsg}</p>}
        </div>
      )}

      {/* 时间统计 */}
      <div className="soft-shadow mt-3 rounded-2xl bg-white px-3 py-2.5 text-sm text-gray-600">
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
            icon={Icon}
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
        <div className="soft-shadow mt-4 rounded-2xl bg-white p-3">
          <input
            value={newStepTitle}
            onChange={(e) => setNewStepTitle(e.target.value)}
            placeholder="步骤标题，动词开头"
            className="w-full rounded-xl bg-gray-100 px-3 py-2 text-base outline-none"
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
              className="w-20 rounded-xl bg-gray-100 px-2 py-1.5 text-base outline-none"
            />
            <div className="flex-1" />
            <button
              type="button"
              onClick={() => setAddingStep(false)}
              className="h-11 rounded-xl px-3 text-sm text-gray-500"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleAddStep}
              disabled={!newStepTitle.trim()}
              className="h-11 rounded-xl bg-blue-600 px-4 text-sm font-medium text-white disabled:opacity-40"
            >
              添加
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAddingStep(true)}
          className="mt-4 min-h-[44px] w-full rounded-2xl border border-dashed border-gray-300 py-3 text-sm text-gray-500"
        >
          ＋ 添加步骤
        </button>
      )}

      {/* 重复规则编辑 */}
      {editingRecurrence && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center">
          <div className="w-full max-w-md rounded-t-3xl bg-white p-5 sm:rounded-3xl">
            <h3 className="text-lg font-semibold">重复</h3>

            <div className="mt-3">
              <RecurrencePicker value={repDraft} onChange={setRepDraft} />
            </div>

            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setEditingRecurrence(false)}
                className="min-h-[44px] flex-1 rounded-xl bg-gray-100 py-2.5 text-gray-700"
              >
                取消
              </button>
              <button
                type="button"
                onClick={saveRecurrence}
                className="min-h-[44px] flex-1 rounded-xl bg-blue-600 py-2.5 font-medium text-white"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认 */}
      {confirmDelete && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 px-8">
          <div className="w-full rounded-2xl bg-white p-5">
            <h3 className="text-lg font-semibold">
              {isRoot ? '删除整个重复系列？' : '删除这个任务？'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {isRoot
                ? '这会删除这个重复系列以及它生成的所有记录（包括过去和未来），无法恢复。'
                : '任务和它的所有步骤都会被删除，无法恢复。'}
            </p>
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="min-h-[44px] flex-1 rounded-xl bg-gray-100 py-2.5 text-gray-700"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleDeleteTask}
                className="min-h-[44px] flex-1 rounded-xl bg-rose-500 py-2.5 font-medium text-white"
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
  icon: LucideIcon;
  first: boolean;
  last: boolean;
  onToggle: () => void;
  onSave: (changes: Partial<Pick<Step, 'title' | 'estimatedMinutes'>>) => Promise<void>;
  onDelete: () => Promise<void>;
  onMove: (direction: 'up' | 'down') => Promise<void>;
}

function StepItem({ step, icon: Icon, first, last, onToggle, onSave, onDelete, onMove }: StepItemProps) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(step.title);
  const [minutes, setMinutes] = useState(step.estimatedMinutes);

  const save = async () => {
    const nextTitle = title.trim() || step.title;
    await onSave({ title: nextTitle, estimatedMinutes: Math.max(1, minutes) });
    setEditing(false);
  };

  const handleToggle = () => {
    vibrate(12);
    onToggle();
  };

  return (
    <div className="soft-shadow flex items-center gap-1 rounded-2xl bg-white p-2.5">
      <motion.button
        type="button"
        whileTap={{ scale: 0.85 }}
        onClick={handleToggle}
        aria-label={step.done ? '标记为未完成' : '标记为完成'}
        className="flex h-11 w-11 shrink-0 items-center justify-center"
      >
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors ${
            step.done ? 'border-[#7c8fa6] bg-[#7c8fa6]' : 'border-gray-300 bg-white'
          }`}
        >
          {step.done && (
            <motion.svg
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 15 }}
              viewBox="0 0 12 10"
              className="h-3 w-3 text-white"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M1 5.5 4 8.5 11 1.5" />
            </motion.svg>
          )}
        </span>
      </motion.button>

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
            <button type="button" onClick={save} className="h-11 text-sm font-medium text-blue-600">
              保存
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setTitle(step.title);
                setMinutes(step.estimatedMinutes);
              }}
              className="h-11 text-sm text-gray-500"
            >
              取消
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="min-w-0 flex-1 py-2 text-left"
        >
          <span
            className={`relative block text-base leading-snug ${
              step.done ? 'text-gray-400' : 'text-gray-900'
            }`}
          >
            <Icon size={14} className="mr-1 inline-block" style={{ opacity: 0.55 }} />
            {step.title}
            <motion.span
              className="absolute left-0 top-1/2 h-[2px] rounded bg-current"
              initial={false}
              animate={{ width: step.done ? '100%' : '0%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            />
          </span>
          <span className="mt-0.5 block text-xs text-gray-400">
            {formatMinutes(step.estimatedMinutes)}
            {step.energy === 'high' && <span className="ml-1">⚡</span>}
            {step.energy === 'low' && <span className="ml-1">☕</span>}
          </span>
        </button>
      )}

      {!editing && (
        <div className="flex shrink-0 items-center text-gray-400">
          <button
            type="button"
            onClick={() => onMove('up')}
            disabled={first}
            aria-label="上移"
            className="flex h-11 w-11 items-center justify-center disabled:opacity-30"
          >
            <ChevronUp size={18} />
          </button>
          <button
            type="button"
            onClick={() => onMove('down')}
            disabled={last}
            aria-label="下移"
            className="flex h-11 w-11 items-center justify-center disabled:opacity-30"
          >
            <ChevronDown size={18} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="删除步骤"
            className="flex h-11 w-11 items-center justify-center text-rose-400"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

export default TaskDetail;
