import { categoryFor } from '../categories';
import type { Task } from '../types';
import { doneStepCount, formatMinutes, formatSchedule, remainingMinutes } from '../utils';

interface Props {
  task: Task;
  onClick: (taskId: string) => void;
  onPostpone15?: (taskId: string) => void;
  onTomorrow?: (taskId: string) => void;
  onResplit?: (taskId: string) => void;
}

function TaskCard({ task, onClick, onPostpone15, onTomorrow, onResplit }: Props) {
  const total = task.steps.length;
  const done = doneStepCount(task.steps);
  const progress = total === 0 ? 0 : Math.round((done / total) * 100);
  const remaining = remainingMinutes(task.steps);
  const schedule = formatSchedule(task.deadline, task.time);
  const category = categoryFor(task.title);
  const Icon = category.icon;
  const overdue = schedule?.overdue ?? false;

  const open = () => onClick(task.id);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open();
        }
      }}
      className="soft-shadow w-full cursor-pointer rounded-2xl p-4 text-left transition active:scale-[0.99] active:opacity-95"
      style={{ background: category.tone.bg }}
    >
      <div className="flex items-start gap-2.5">
        <span
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
          style={{ background: 'rgba(255,255,255,0.7)' }}
        >
          <Icon size={16} style={{ color: category.tone.fg }} />
        </span>
        <h2 className="min-w-0 flex-1 text-[17px] font-semibold leading-snug text-gray-900">
          {task.title}
        </h2>
        {schedule && (
          <span
            className={`shrink-0 text-[13px] ${
              overdue ? 'font-medium text-amber-600' : 'text-gray-400'
            }`}
          >
            {schedule.text}
          </span>
        )}
      </div>

      {total > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-[13px] text-gray-400">
            <span>
              {done}/{total} 步
            </span>
            <span>{remaining > 0 ? `还需 ${formatMinutes(remaining)}` : '已完成'}</span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-black/5">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${progress}%`, background: category.tone.fg }}
            />
          </div>
        </div>
      )}

      {total === 0 && <p className="mt-1 text-[13px] text-gray-400">还没有拆解步骤</p>}

      {overdue && onPostpone15 && onTomorrow && onResplit && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPostpone15(task.id);
            }}
            className="min-h-[44px] rounded-full bg-amber-100 px-3 py-2 text-[13px] font-medium text-amber-700"
          >
            延后 15 分钟
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onTomorrow(task.id);
            }}
            className="min-h-[44px] rounded-full bg-amber-100 px-3 py-2 text-[13px] font-medium text-amber-700"
          >
            明天再做
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onResplit(task.id);
            }}
            className="min-h-[44px] rounded-full bg-amber-100 px-3 py-2 text-[13px] font-medium text-amber-700"
          >
            重新切碎这一步
          </button>
        </div>
      )}
    </div>
  );
}

export default TaskCard;
