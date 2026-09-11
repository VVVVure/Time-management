import type { Task } from '../types';
import { doneStepCount, formatDeadline, formatMinutes, remainingMinutes } from '../utils';

interface Props {
  task: Task;
  onClick: (taskId: string) => void;
}

function TaskCard({ task, onClick }: Props) {
  const total = task.steps.length;
  const done = doneStepCount(task.steps);
  const progress = total === 0 ? 0 : Math.round((done / total) * 100);
  const remaining = remainingMinutes(task.steps);
  const deadline = task.deadline ? formatDeadline(task.deadline) : null;

  return (
    <button
      type="button"
      onClick={() => onClick(task.id)}
      className="w-full rounded-2xl bg-white p-4 text-left shadow-sm transition active:scale-[0.99] active:opacity-90"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="min-w-0 flex-1 text-base font-semibold leading-snug text-gray-900">
          {task.title}
        </h2>
        {deadline && (
          <span
            className={`shrink-0 text-xs ${
              deadline.overdue ? 'font-medium text-red-600' : 'text-gray-500'
            }`}
          >
            {deadline.text}
          </span>
        )}
      </div>

      {total > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              {done}/{total} 步
            </span>
            <span>{remaining > 0 ? `还需 ${formatMinutes(remaining)}` : '已完成'}</span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-blue-600 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {total === 0 && (
        <p className="mt-1 text-xs text-gray-400">还没有拆解步骤</p>
      )}
    </button>
  );
}

export default TaskCard;
