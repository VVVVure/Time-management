import { useCallback, useEffect, useState } from 'react';
import InputBar from './components/InputBar';
import TaskList from './components/TaskList';
import { addTasks, listTasks } from './db';
import type { Task } from './types';

type View = { name: 'home' } | { name: 'detail'; taskId: string };

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [view, setView] = useState<View>({ name: 'home' });

  const refresh = useCallback(async () => {
    setTasks(await listTasks());
  }, []);

  useEffect(() => {
    let cancelled = false;
    listTasks().then((t) => {
      if (!cancelled) setTasks(t);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const openTask = (taskId: string) => setView({ name: 'detail', taskId });

  const handleSend = async (text: string) => {
    const now = new Date().toISOString();
    await addTasks([
      {
        id: crypto.randomUUID(),
        title: text,
        rawInput: text,
        deadline: null,
        priority: 'medium',
        status: 'todo',
        steps: [],
        createdAt: now,
        updatedAt: now,
      },
    ]);
    await refresh();
  };

  if (view.name === 'detail') {
    const task = tasks.find((t) => t.id === view.taskId);
    return (
      <div className="safe-top safe-bottom mx-auto flex min-h-full max-w-md flex-col px-4 py-4">
        <button
          type="button"
          onClick={() => setView({ name: 'home' })}
          className="self-start text-blue-600"
        >
          ‹ 返回
        </button>
        <h1 className="mt-4 text-xl font-semibold">{task?.title ?? '任务不存在'}</h1>
        {/* T2.3 会在这里实现完整的步骤管理 */}
      </div>
    );
  }

  return (
    <div className="safe-top mx-auto flex min-h-full max-w-md flex-col px-4 pb-40 pt-4">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">时间规划</h1>
        {/* T2.4 会在这里加入设置入口 */}
      </header>

      <main className="flex-1">
        <TaskList tasks={tasks} onOpenTask={openTask} />
      </main>

      <InputBar onSend={handleSend} />
    </div>
  );
}

export default App;
