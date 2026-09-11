import { useCallback, useEffect, useState } from 'react';
import { listTasks } from './db';
import { syncRecurrenceInstances } from './recurrence';
import type { Task } from './types';

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);

  const refresh = useCallback(async () => {
    setTasks(await listTasks());
  }, []);

  const refreshWithSync = useCallback(async () => {
    const loaded = await listTasks();
    try {
      await syncRecurrenceInstances(loaded);
    } catch {
      // 同步失败不阻塞刷新
    }
    setTasks(await listTasks());
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loaded = await listTasks();
      if (cancelled) return;
      try {
        await syncRecurrenceInstances(loaded);
      } catch {
        // 同步失败不阻塞任务加载
      }
      if (!cancelled) setTasks(await listTasks());
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { tasks, refresh, refreshWithSync };
}
