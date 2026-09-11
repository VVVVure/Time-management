import { categoryFor } from '../categories';
import type { Priority, Task } from '../types';
import { doneStepCount, formatMinutes, formatSchedule, remainingMinutes } from '../utils';
import ProgressRing from './ProgressRing';

interface Props {
  tasks: Task[];
  onOpenTask: (taskId: string) => void;
}

const PRIORITY_ORDER: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

function focusSort(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const p = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (p !== 0) return p;
    if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline);
    if (a.deadline) return -1;
    if (b.deadline) return 1;
    return a.createdAt.localeCompare(b.createdAt);
  });
}

function FocusView({ tasks, onOpenTask }: Props) {
  const active = tasks.filter((t) => t.status !== 'done');

  if (active.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-8 py-14 text-center">
        <div className="text-4xl">🌿</div>
        <p className="mt-3 text-lg font-medium text-gray-700">现在没有要做的事</p>
        <p className="mt-1 text-sm text-gray-400">
          在下方输入要做的事，AI 会帮你拆成小步骤
        </p>
      </div>
    );
  }

  const ordered = focusSort(active);
  const withStep = ordered.find((t) => t.steps.some((s) => !s.done));
  const focusTask = withStep ?? ordered[0];

  const currentStep = focusTask.steps.find((s) => !s.done);
  const nextStep = currentStep
    ? focusTask.steps.find((s) => !s.done && s.order > currentStep.order)
    : undefined;

  const total = focusTask.steps.length;
  const done = doneStepCount(focusTask.steps);
  const progress = total === 0 ? 0 : done / total;
  const remaining = remainingMinutes(focusTask.steps);

  const schedule = formatSchedule(focusTask.deadline, focusTask.time);
  const category = categoryFor(focusTask.title);
  const Icon = category.icon;

  return (
    <button
      type="button"
      onClick={() => onOpenTask(focusTask.id)}
      className="soft-shadow w-full rounded-3xl p-5 text-left"
      style={{ background: category.tone.bg }}
    >
      <div className="flex items-center gap-2 text-sm font-medium" style={{ color: category.tone.fg }}>
        <Icon size={16} />
        <span className="truncate">{focusTask.title}</span>
      </div>

      {schedule && (
        <p className={`mt-1 text-[13px] ${schedule.overdue ? 'text-amber-600' : 'text-gray-400'}`}>
          📅 {schedule.text}
        </p>
      )}

      <div className="mt-4 flex flex-col items-center text-center">
        <ProgressRing progress={progress} size={132} strokeWidth={9}>
          <span className="text-2xl font-semibold text-gray-900">
            {currentStep ? currentStep.estimatedMinutes : '—'}
          </span>
          <span className="text-xs text-gray-400">分钟</span>
        </ProgressRing>

        <p className="mt-4 text-[11px] font-medium uppercase tracking-widest text-gray-400">
          现在做
        </p>
        <p className="mt-1 max-w-full text-[22px] font-semibold leading-snug text-gray-900">
          {currentStep ? currentStep.title : '还没有步骤，点开添加'}
        </p>

        {currentStep && (
          <p className="mt-2 text-sm text-gray-500">
            {nextStep ? (
              <>
                接下来：<span className="text-gray-700">{nextStep.title}</span>
              </>
            ) : (
              '这是最后一步，做完就完成啦'
            )}
          </p>
        )}
      </div>

      <div className="mt-4 text-center text-xs text-gray-400">
        任务进度 {done}/{total} · 还剩 {formatMinutes(remaining)}
      </div>
    </button>
  );
}

export default FocusView;
