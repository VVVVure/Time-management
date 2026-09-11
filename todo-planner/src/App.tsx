import { useCallback, useEffect, useState, type ReactNode } from 'react';
import DecomposePreview, { type PreviewTask } from './components/DecomposePreview';
import FocusView from './components/FocusView';
import InputBar from './components/InputBar';
import SettingsPage from './components/SettingsPage';
import TaskDetail from './components/TaskDetail';
import TaskList from './components/TaskList';
import { addTasks, getSettings, listTasks, updateTask } from './db';
import { callDecompose, type DecomposeErrorKind, type DecomposeTask } from './decompose';
import { resplitStep } from './refine';
import type { Task } from './types';
import { postpone15Deadline, todayISO, tomorrowISO, weekdayCN } from './utils';

type View =
  | { name: 'home' }
  | { name: 'detail'; taskId: string }
  | { name: 'settings' };

type DecomposeFlow =
  | { status: 'loading'; text: string }
  | { status: 'preview'; text: string; tasks: DecomposeTask[] }
  | { status: 'question'; text: string; question: string }
  | {
      status: 'error';
      text: string;
      errorKind: DecomposeErrorKind | 'no-password';
      message: string;
    };

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [view, setView] = useState<View>({ name: 'home' });
  const [flow, setFlow] = useState<DecomposeFlow | null>(null);
  const [showAll, setShowAll] = useState(false);

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

  const postpone15 = async (taskId: string) => {
    const t = tasks.find((x) => x.id === taskId);
    if (!t) return;
    await updateTask({ ...t, deadline: postpone15Deadline() });
    await refresh();
  };

  const postponeTomorrow = async (taskId: string) => {
    const t = tasks.find((x) => x.id === taskId);
    if (!t) return;
    await updateTask({ ...t, deadline: tomorrowISO() });
    await refresh();
  };

  const resplit = async (taskId: string) => {
    const t = tasks.find((x) => x.id === taskId);
    if (!t) return;
    try {
      await resplitStep(t);
      await refresh();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : '重新切碎失败，请稍后再试');
    }
  };

  const handleSend = async (text: string) => {
    if (flow?.status === 'loading') return;
    setFlow({ status: 'loading', text });

    const settings = await getSettings();
    if (!settings.appPassword) {
      setFlow({
        status: 'error',
        text,
        errorKind: 'no-password',
        message: '还没有设置 App 密码，请先到设置页填写',
      });
      return;
    }

    const outcome = await callDecompose({
      input: text,
      password: settings.appPassword,
      maxMinutesPerStep: settings.maxMinutesPerStep,
      today: todayISO(),
      weekday: weekdayCN(),
    });

    if (outcome.kind === 'error') {
      setFlow({
        status: 'error',
        text,
        errorKind: outcome.errorKind,
        message: outcome.message,
      });
      return;
    }

    if (outcome.result.kind === 'question') {
      setFlow({ status: 'question', text, question: outcome.result.question });
    } else {
      setFlow({ status: 'preview', text, tasks: outcome.result.tasks });
    }
  };

  const saveDirect = async (text: string) => {
    const now = new Date().toISOString();
    await addTasks([
      {
        id: crypto.randomUUID(),
        title: text,
        rawInput: text,
        deadline: null,
        time: null,
        priority: 'medium',
        status: 'todo',
        steps: [],
        createdAt: now,
        updatedAt: now,
      },
    ]);
    await refresh();
    setFlow(null);
  };

  const confirmPreview = async (previewTasks: PreviewTask[]) => {
    if (!flow || flow.status !== 'preview') return;
    const now = new Date().toISOString();
    const next: Task[] = previewTasks.map((pt) => ({
      id: crypto.randomUUID(),
      title: pt.title,
      rawInput: flow.text,
      deadline: pt.deadline || null,
      time: pt.time || null,
      priority: pt.priority,
      status: 'todo',
      steps: pt.steps.map((s, i) => ({
        id: crypto.randomUUID(),
        title: s.title,
        estimatedMinutes: s.estimatedMinutes,
        done: false,
        doneAt: null,
        order: i,
      })),
      createdAt: now,
      updatedAt: now,
    }));
    await addTasks(next);
    await refresh();
    setFlow(null);
  };

  const goSettings = () => {
    setFlow(null);
    setView({ name: 'settings' });
  };

  const retry = () => {
    if (flow && 'text' in flow) void handleSend(flow.text);
  };

  let content: ReactNode;
  if (view.name === 'settings') {
    content = <SettingsPage onBack={() => setView({ name: 'home' })} />;
  } else if (view.name === 'detail') {
    const task = tasks.find((t) => t.id === view.taskId);
    if (!task) {
      content = (
        <div className="safe-top safe-bottom mx-auto flex min-h-full max-w-md flex-col px-4 py-4">
          <button
            type="button"
            onClick={() => setView({ name: 'home' })}
            className="self-start text-blue-600"
          >
            ‹ 返回
          </button>
          <p className="mt-8 text-center text-gray-500">任务不存在</p>
        </div>
      );
    } else {
      content = (
        <TaskDetail
          task={task}
          onBack={() => setView({ name: 'home' })}
          onChanged={refresh}
        />
      );
    }
  } else {
    content = (
      <div className="safe-top mx-auto flex min-h-full max-w-md flex-col px-4 pb-40 pt-4">
        <header className="mb-4 flex items-center justify-between">
          <h1 className="text-[22px] font-semibold">时间规划</h1>
          <button
            type="button"
            onClick={() => setView({ name: 'settings' })}
            className="soft-shadow flex h-11 items-center rounded-2xl bg-white px-3 text-sm text-gray-600"
          >
            ⚙️ 设置
          </button>
        </header>

        <main className="flex-1 space-y-4">
          <FocusView tasks={tasks} onOpenTask={openTask} />

          {tasks.length > 0 && (
            <section>
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="soft-shadow flex w-full items-center justify-between rounded-2xl bg-white px-4 py-3 text-sm text-gray-600"
              >
                <span>全部任务（{tasks.length}）</span>
                <span className="text-xs text-gray-400">{showAll ? '收起 ▲' : '展开 ▼'}</span>
              </button>
              {showAll && (
                <div className="mt-3">
                  <TaskList
                    tasks={tasks}
                    onOpenTask={openTask}
                    onPostpone15={postpone15}
                    onTomorrow={postponeTomorrow}
                    onResplit={resplit}
                  />
                </div>
              )}
            </section>
          )}
        </main>

        <InputBar onSend={handleSend} disabled={flow !== null} />
      </div>
    );
  }

  return (
    <>
      {content}

      {flow?.status === 'loading' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 px-8">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            <p className="mt-3 font-medium text-gray-800">正在让 AI 拆解…</p>
            <p className="mt-1 truncate text-sm text-gray-400">{flow.text}</p>
          </div>
        </div>
      )}

      {flow?.status === 'preview' && (
        <DecomposePreview
          rawInput={flow.text}
          tasks={flow.tasks}
          onConfirm={confirmPreview}
          onCancel={() => setFlow(null)}
        />
      )}

      {flow?.status === 'question' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-8">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5">
            <h2 className="text-lg font-semibold">AI 想先确认一下</h2>
            <p className="mt-2 text-sm text-gray-700">{flow.question}</p>
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setFlow(null)}
                className="flex-1 rounded-xl bg-gray-100 py-2.5 text-gray-700"
              >
                返回
              </button>
              <button
                type="button"
                onClick={() => saveDirect(flow.text)}
                className="flex-1 rounded-xl bg-blue-600 py-2.5 font-medium text-white"
              >
                直接保存为任务
              </button>
            </div>
          </div>
        </div>
      )}

      {flow?.status === 'error' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-8">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5">
            <h2 className="text-lg font-semibold">没有拆解成功</h2>
            <p className="mt-2 text-sm text-gray-700">{flow.message}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {flow.errorKind !== 'no-password' && (
                <button
                  type="button"
                  onClick={retry}
                  className="flex-1 rounded-xl bg-blue-600 px-3 py-2.5 font-medium text-white"
                >
                  重试
                </button>
              )}
              {(flow.errorKind === 'no-password' || flow.errorKind === 'unauthorized') && (
                <button
                  type="button"
                  onClick={goSettings}
                  className="flex-1 rounded-xl bg-gray-100 px-3 py-2.5 text-gray-700"
                >
                  去设置页
                </button>
              )}
              <button
                type="button"
                onClick={() => saveDirect(flow.text)}
                className="flex-1 rounded-xl bg-gray-100 px-3 py-2.5 text-gray-700"
              >
                直接保存为任务
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
