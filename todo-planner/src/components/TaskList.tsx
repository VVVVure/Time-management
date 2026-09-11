import { useState } from 'react';
import type { Task } from '../types';
import { sortTasks } from '../utils';
import TaskCard from './TaskCard';

interface Props {
  tasks: Task[];
  onOpenTask: (taskId: string) => void;
}

function TaskList({ tasks, onOpenTask }: Props) {
  const [showDone, setShowDone] = useState(false);

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-8 py-16 text-center">
        <div className="text-4xl">🗒️</div>
        <p className="mt-3 text-base font-medium text-gray-700">还没有任务</p>
        <p className="mt-1 text-sm text-gray-400">
          在下方输入要做的事，AI 会帮你拆成小步骤
        </p>
      </div>
    );
  }

  const active = sortTasks(tasks.filter((t) => t.status !== 'done'));
  const done = sortTasks(tasks.filter((t) => t.status === 'done'));

  return (
    <div className="space-y-6">
      {active.length > 0 && (
        <section>
          <h2 className="mb-2 px-1 text-sm font-medium text-gray-500">进行中</h2>
          <div className="space-y-2">
            {active.map((t) => (
              <TaskCard key={t.id} task={t} onClick={onOpenTask} />
            ))}
          </div>
        </section>
      )}

      {done.length > 0 && (
        <section>
          <button
            type="button"
            onClick={() => setShowDone((v) => !v)}
            className="mb-2 flex w-full items-center justify-between px-1 text-sm font-medium text-gray-500"
          >
            <span>已完成（{done.length}）</span>
            <span className="text-xs text-gray-400">{showDone ? '收起 ▲' : '展开 ▼'}</span>
          </button>
          {showDone && (
            <div className="space-y-2">
              {done.map((t) => (
                <TaskCard key={t.id} task={t} onClick={onOpenTask} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export default TaskList;
