import { useCallback, useEffect, useState } from 'react';
import { addTasks, listTasks } from './db';
import type { Task } from './types';

/**
 * T1.2 临时验收页面：点击按钮写入一条测试任务，刷新页面后数据仍在。
 * 该页面会在 T2.1 被真正的任务列表替换。
 */
function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setTasks(await listTasks());
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const handleAddTest = async () => {
    const now = new Date().toISOString();
    await addTasks([
      {
        id: crypto.randomUUID(),
        title: `测试任务 ${new Date().toLocaleTimeString()}`,
        rawInput: '临时测试数据',
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

  return (
    <div className="safe-top safe-bottom mx-auto flex min-h-full max-w-md flex-col gap-4 px-4 py-6">
      <h1 className="text-2xl font-semibold">时间规划（数据层验收）</h1>
      <button
        type="button"
        onClick={handleAddTest}
        className="rounded-xl bg-blue-600 px-4 py-3 text-white active:opacity-80"
      >
        写入测试数据
      </button>
      {loading ? (
        <p className="text-gray-500">加载中…</p>
      ) : tasks.length === 0 ? (
        <p className="text-gray-500">还没有任务，点击上面的按钮写入一条。</p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((t) => (
            <li key={t.id} className="rounded-xl bg-white p-3 shadow-sm">
              <p className="font-medium">{t.title}</p>
              <p className="text-sm text-gray-500">{t.createdAt}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default App;
