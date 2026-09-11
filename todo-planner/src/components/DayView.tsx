import type { Task } from '../types';
import { groupByTimeOfDay } from '../utils';
import TaskCard from './TaskCard';

interface Props {
  tasks: Task[];
  onOpenTask: (taskId: string) => void;
  onPostpone15?: (taskId: string) => void;
  onTomorrow?: (taskId: string) => void;
  onResplit?: (taskId: string) => void;
}

function DayView({ tasks, onOpenTask, onPostpone15, onTomorrow, onResplit }: Props) {
  const blocks = groupByTimeOfDay(tasks);

  if (blocks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-8 py-14 text-center">
        <div className="text-4xl">🍃</div>
        <p className="mt-3 text-base text-gray-500">这天还没有安排</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {blocks.map((block) => (
        <section key={block.key}>
          <h2 className="mb-2 px-1 text-sm font-medium text-gray-500">{block.label}</h2>
          <div className="space-y-2">
            {block.tasks.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                onClick={onOpenTask}
                onPostpone15={onPostpone15}
                onTomorrow={onTomorrow}
                onResplit={onResplit}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export default DayView;
