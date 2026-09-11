export type TaskStatus = 'todo' | 'doing' | 'done';
export type Priority = 'high' | 'medium' | 'low';

/** 一件要做的事 */
export interface Task {
  id: string;                 // uuid
  title: string;              // AI 整理后的简洁标题，如"完成 UX 课调研报告"
  rawInput: string;           // 我当时说的或写的原话，保留备查
  deadline: string | null;    // 截止日期 "YYYY-MM-DD"；没提到就是 null
  time: string | null;        // 具体时间点 "HH:MM"（24 小时制），如 11:15 接人；没提到就是 null
  priority: Priority;
  status: TaskStatus;         // 有步骤被勾选 → doing；全部完成 → done
  steps: Step[];
  createdAt: string;          // ISO 时间
  updatedAt: string;
}

/** 任务下的一个小步骤 */
export interface Step {
  id: string;
  title: string;              // 动词开头的具体动作
  estimatedMinutes: number;   // 预估用时（分钟）
  done: boolean;
  doneAt: string | null;
  order: number;              // 排序，从 0 开始
}

/** 设置（存在本地） */
export interface Settings {
  maxMinutesPerStep: number;  // 每个步骤最长分钟数，默认 25，可选 15 / 25 / 45 / 60
  appPassword: string;        // 访问 Worker 的密码
}
