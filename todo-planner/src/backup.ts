import { db, getSettings, SETTINGS_ID } from './db';
import type { Priority, Settings, Step, Task, TaskStatus } from './types';

const BACKUP_VERSION = 1;

/** 备份文件的结构 */
export interface BackupData {
  version: number;
  exportedAt: string;
  tasks: Task[];
  settings: Settings;
}

const STATUSES: TaskStatus[] = ['todo', 'doing', 'done'];
const PRIORITIES: Priority[] = ['high', 'medium', 'low'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStep(value: unknown): value is Step {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.estimatedMinutes === 'number' &&
    typeof value.done === 'boolean' &&
    (value.doneAt === null || typeof value.doneAt === 'string') &&
    typeof value.order === 'number'
  );
}

function isTask(value: unknown): value is Task {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.rawInput === 'string' &&
    (value.deadline === null || typeof value.deadline === 'string') &&
    PRIORITIES.includes(value.priority as Priority) &&
    STATUSES.includes(value.status as TaskStatus) &&
    Array.isArray(value.steps) &&
    value.steps.every(isStep) &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string'
  );
}

function isSettings(value: unknown): value is Settings {
  if (!isRecord(value)) return false;
  return (
    typeof value.maxMinutesPerStep === 'number' &&
    typeof value.appPassword === 'string'
  );
}

function validateBackup(value: unknown): BackupData {
  if (!isRecord(value)) throw new Error('备份格式不对：顶层必须是对象');
  if (value.version !== BACKUP_VERSION) {
    throw new Error(`备份格式不对：不支持的版本 ${String(value.version)}`);
  }
  if (!Array.isArray(value.tasks) || !value.tasks.every(isTask)) {
    throw new Error('备份格式不对：tasks 字段不完整');
  }
  if (!isSettings(value.settings)) {
    throw new Error('备份格式不对：settings 字段不完整');
  }
  return value as unknown as BackupData;
}

function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 导出所有任务和设置为 JSON 字符串，文件名带当天日期 */
export async function exportData(): Promise<{ filename: string; content: string }> {
  const tasks = await db.tasks.toArray();
  const settings = await getSettings();
  const backup: BackupData = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    tasks,
    settings,
  };
  return {
    filename: `todo-planner-backup-${formatLocalDate(new Date())}.json`,
    content: JSON.stringify(backup, null, 2),
  };
}

/** 触发浏览器下载备份文件（T2.4 设置页会用到） */
export async function downloadBackup(): Promise<void> {
  const { filename, content } = await exportData();
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * 读取并校验备份文件，然后覆盖现有数据。
 * 格式错误时抛出带中文提示的 Error。
 */
export async function importData(file: File): Promise<void> {
  let text: string;
  try {
    text = await file.text();
  } catch {
    throw new Error('无法读取这个文件');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('文件不是有效的 JSON');
  }

  const backup = validateBackup(parsed);

  await db.transaction('rw', db.tasks, db.settings, async () => {
    await db.tasks.clear();
    await db.tasks.bulkPut(backup.tasks);
    await db.settings.clear();
    await db.settings.put({ ...backup.settings, id: SETTINGS_ID });
  });
}
