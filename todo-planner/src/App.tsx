import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Calendar, CalendarDays, Crosshair } from 'lucide-react';
import DateStrip from './components/DateStrip';
import DayView from './components/DayView';
import MonthView from './components/MonthView';
import DecomposePreview, { type PreviewTask } from './components/DecomposePreview';
import FocusView from './components/FocusView';
import InputBar from './components/InputBar';
import SettingsPage from './components/SettingsPage';
import TaskDetail from './components/TaskDetail';
import TaskList from './components/TaskList';
import { addTasks, getSettings, listTasks, updateTask } from './db';
import { callDecompose, type DecomposeErrorKind, type DecomposeTask } from './decompose';
import { syncRecurrenceInstances } from './recurrence';
import { resplitStep } from './refine';
import type { Task } from './types';
import {
  buildDateWindow,
  daysUntil,
  loadDotsForDate,
  postpone15Deadline,
  tasksForDate,
  todayISO,
  tomorrowISO,
  weekdayCN,
} from './utils';

type View =
  | { name: 'home' }
  | { name: 'detail'; taskId: string }
  | { name: 'settings' };

type DecomposeFlow =
  | { status: 'loading'; text: string; updateTaskId?: string }
  | { status: 'preview'; text: string; tasks: DecomposeTask[]; updateTaskId?: string }
  | { status: 'question'; text: string; question: string; updateTaskId?: string }
  | {
      status: 'error';
      text: string;
      errorKind: DecomposeErrorKind | 'no-password';
      message: string;
      updateTaskId?: string;
    };

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [view, setView] = useState<View>({ name: 'home' });
  const [flow, setFlow] = useState<DecomposeFlow | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [showBrainDump, setShowBrainDump] = useState(false);
  const [energyFilter, setEnergyFilter] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const [homeMode, setHomeMode] = useState<'focus' | 'date' | 'month'>('focus');
  const [selectedDate, setSelectedDate] = useState(() => todayISO());

  const refresh = useCallback(async () => {
    setTasks(await listTasks());
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loaded = await listTasks();
      if (cancelled) return;
      await syncRecurrenceInstances(loaded);
      if (!cancelled) setTasks(await listTasks());
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const normalTasks = tasks.filter((t) => !t.isBrainDump);
  const brainDumpTasks = tasks.filter((t) => t.isBrainDump);
  const lowEnergyTasks = normalTasks.filter((t) =>
    t.steps.some((s) => !s.done && s.energy === 'low'),
  );
  const visibleTasks = energyFilter ? lowEnergyTasks : normalTasks;
  const overdueTasks = normalTasks.filter(
    (t) => t.status !== 'done' && t.deadline && daysUntil(t.deadline) < 0,
  );
  const days = useMemo(() => buildDateWindow(), []);
  const dayTasks = tasksForDate(tasks, selectedDate);
  const isTodaySelected = selectedDate === todayISO();

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

  const postponeAll = async () => {
    setBatchLoading(true);
    try {
      await Promise.all(overdueTasks.map((t) => updateTask({ ...t, deadline: tomorrowISO() })));
      await refresh();
    } finally {
      setBatchLoading(false);
    }
  };

  const runDecompose = async (text: string, updateTaskId?: string) => {
    if (flow?.status === 'loading') return;
    setFlow({ status: 'loading', text, updateTaskId });

    const settings = await getSettings();
    if (!settings.appPassword) {
      setFlow({
        status: 'error',
        text,
        errorKind: 'no-password',
        message: '还没有设置 App 密码，请先到设置页填写',
        updateTaskId,
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
        updateTaskId,
      });
      return;
    }

    if (outcome.result.kind === 'question') {
      setFlow({ status: 'question', text, question: outcome.result.question, updateTaskId });
    } else {
      setFlow({ status: 'preview', text, tasks: outcome.result.tasks, updateTaskId });
    }
  };

  const handleSend = (text: string) => runDecompose(text);

  const handleBrainDump = async (text: string) => {
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
        isBrainDump: true,
        recurrence: null,
        recurrenceRootId: null,
        createdAt: now,
        updatedAt: now,
      },
    ]);
    await refresh();
  };

  const saveDirect = async (text: string, updateTaskId?: string) => {
    if (updateTaskId) {
      const existing = tasks.find((x) => x.id === updateTaskId);
      if (existing) {
        await updateTask({
          ...existing,
          title: text,
          rawInput: text,
          deadline: null,
          time: null,
          priority: 'medium',
          steps: [],
          isBrainDump: false,
        });
        await refresh();
        setFlow(null);
        return;
      }
    }

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
        isBrainDump: false,
        recurrence: null,
        recurrenceRootId: null,
        createdAt: now,
        updatedAt: now,
      },
    ]);
    await refresh();
    setFlow(null);
  };

  const confirmPreview = async (previewTasks: PreviewTask[], updateTaskId?: string) => {
    if (!flow || flow.status !== 'preview') return;
    const now = new Date().toISOString();

    const buildTask = (pt: PreviewTask, id: string): Task => ({
      id,
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
        energy: s.energy ?? null,
      })),
      isBrainDump: false,
      recurrence: null,
      recurrenceRootId: null,
      createdAt: now,
      updatedAt: now,
    });

    if (updateTaskId) {
      const existing = tasks.find((x) => x.id === updateTaskId);
      if (existing) {
        const [first, ...rest] = previewTasks;
        if (first) {
          await updateTask({
            ...existing,
            ...buildTask(first, existing.id),
            createdAt: existing.createdAt,
          });
        }
        if (rest.length > 0) {
          await addTasks(rest.map((pt) => buildTask(pt, crypto.randomUUID())));
        }
        await refresh();
        setFlow(null);
        return;
      }
    }

    await addTasks(previewTasks.map((pt) => buildTask(pt, crypto.randomUUID())));
    await refresh();
    setFlow(null);
  };

  const decomposeBrainDump = (taskId: string) => {
    const t = brainDumpTasks.find((x) => x.id === taskId);
    if (!t) return;
    void runDecompose(t.rawInput, taskId);
  };

  const goSettings = () => {
    setFlow(null);
    setView({ name: 'settings' });
  };

  const retry = () => {
    if (flow && 'text' in flow) void runDecompose(flow.text, flow.updateTaskId);
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
        <header className="mb-4">
          <div className="flex items-center justify-between">
            <h1 className="text-[22px] font-semibold">时间规划</h1>
            <div className="flex items-center gap-2">
              {homeMode === 'focus' && (
                <button
                  type="button"
                  onClick={() => setEnergyFilter((v) => !v)}
                  className={`soft-shadow flex h-11 items-center rounded-2xl px-3 text-sm ${
                    energyFilter ? 'bg-amber-100 text-amber-700' : 'bg-white text-gray-600'
                  }`}
                >
                  {energyFilter ? '☕ 低精力' : '⚡ 全部'}
                </button>
              )}
              <button
                type="button"
                onClick={() => setView({ name: 'settings' })}
                className="soft-shadow flex h-11 items-center rounded-2xl bg-white px-3 text-sm text-gray-600"
              >
                ⚙️
              </button>
            </div>
          </div>

          <div className="mt-3 flex rounded-2xl bg-black/5 p-1">
            <button
              type="button"
              onClick={() => setHomeMode('focus')}
              className={`flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl text-sm font-medium ${
                homeMode === 'focus' ? 'soft-shadow bg-white text-gray-900' : 'text-gray-500'
              }`}
            >
              <Crosshair size={16} />
              聚焦
            </button>
            <button
              type="button"
              onClick={() => setHomeMode('date')}
              className={`flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl text-sm font-medium ${
                homeMode === 'date' ? 'soft-shadow bg-white text-gray-900' : 'text-gray-500'
              }`}
            >
              <Calendar size={16} />
              日期
            </button>
            <button
              type="button"
              onClick={() => setHomeMode('month')}
              className={`flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl text-sm font-medium ${
                homeMode === 'month' ? 'soft-shadow bg-white text-gray-900' : 'text-gray-500'
              }`}
            >
              <CalendarDays size={16} />
              月历
            </button>
          </div>
        </header>

        <main className="flex-1 space-y-4">
          {overdueTasks.length > 0 && (
            <div className="soft-shadow rounded-2xl bg-amber-50 p-4">
              <p className="text-sm text-amber-700">
                你有 {overdueTasks.length} 个任务已经过期了，要不要都往后推一推？
              </p>
              <button
                type="button"
                onClick={postponeAll}
                disabled={batchLoading}
                className="mt-2 min-h-[44px] rounded-full bg-amber-600 px-4 py-2 text-[13px] font-medium text-white disabled:opacity-60"
              >
                {batchLoading ? '处理中…' : '全部移到明天'}
              </button>
            </div>
          )}

          {homeMode === 'focus' ? (
            <>
              <FocusView
                tasks={normalTasks}
                preferLowEnergy={energyFilter}
                onOpenTask={openTask}
              />

              {visibleTasks.length > 0 && (
                <section>
                  <button
                    type="button"
                    onClick={() => setShowAll((v) => !v)}
                    className="soft-shadow flex w-full items-center justify-between rounded-2xl bg-white px-4 py-3 text-sm text-gray-600"
                  >
                    <span>全部任务（{visibleTasks.length}）</span>
                    <span className="text-xs text-gray-400">
                      {showAll ? '收起 ▲' : '展开 ▼'}
                    </span>
                  </button>
                  {showAll && (
                    <div className="mt-3">
                      <TaskList
                        tasks={visibleTasks}
                        onOpenTask={openTask}
                        onPostpone15={postpone15}
                        onTomorrow={postponeTomorrow}
                        onResplit={resplit}
                      />
                    </div>
                  )}
                </section>
              )}
            </>
          ) : homeMode === 'date' ? (
            <>
              <DateStrip
                days={days}
                selected={selectedDate}
                isTodaySelected={isTodaySelected}
                loadFor={(date) => loadDotsForDate(tasks, date)}
                onSelect={setSelectedDate}
                onBackToToday={() => setSelectedDate(todayISO())}
              />
              <DayView
                tasks={dayTasks}
                onOpenTask={openTask}
                onPostpone15={postpone15}
                onTomorrow={postponeTomorrow}
                onResplit={resplit}
              />
            </>
          ) : (
            <>
              <MonthView
                selected={selectedDate}
                onSelect={setSelectedDate}
                loadFor={(date) => loadDotsForDate(tasks, date)}
              />
              <DayView
                tasks={dayTasks}
                onOpenTask={openTask}
                onPostpone15={postpone15}
                onTomorrow={postponeTomorrow}
                onResplit={resplit}
              />
            </>
          )}

          {brainDumpTasks.length > 0 && (
            <section>
              <button
                type="button"
                onClick={() => setShowBrainDump((v) => !v)}
                className="soft-shadow flex w-full items-center justify-between rounded-2xl bg-white px-4 py-3 text-sm text-gray-600"
              >
                <span>🧠 杂物箱（{brainDumpTasks.length}）</span>
                <span className="text-xs text-gray-400">
                  {showBrainDump ? '收起 ▲' : '展开 ▼'}
                </span>
              </button>
              {showBrainDump && (
                <div className="mt-3 space-y-2">
                  {brainDumpTasks.map((t) => (
                    <div
                      key={t.id}
                      className="soft-shadow flex items-center justify-between gap-2 rounded-2xl bg-white px-4 py-3"
                    >
                      <span className="min-w-0 flex-1 text-sm text-gray-800">{t.title}</span>
                      <button
                        type="button"
                        onClick={() => decomposeBrainDump(t.id)}
                        className="min-h-[44px] shrink-0 rounded-full bg-blue-50 px-3 text-[13px] font-medium text-blue-600"
                      >
                        AI 帮我拆解
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </main>

        <InputBar onSend={handleSend} onBrainDump={handleBrainDump} disabled={flow !== null} />
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
          onConfirm={(previewTasks) => confirmPreview(previewTasks, flow.updateTaskId)}
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
                onClick={() => saveDirect(flow.text, flow.updateTaskId)}
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
                onClick={() => saveDirect(flow.text, flow.updateTaskId)}
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
