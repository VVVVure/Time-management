export type TaskStatus = 'todo' | 'doing' | 'done';
export type Priority = 'high' | 'medium' | 'low';

/** 重复规则：只有系列根任务才有非 null 值 */
export interface RecurrenceRule {
  freq: 'daily' | 'weekly' | 'monthly';
  interval: number; // 间隔，比如 freq=weekly, interval=2 就是"每两周"
  endDate: string | null; // 重复到哪天为止（含当天），null 表示不设结束日期
}

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
  isBrainDump: boolean;       // 是否是杂物箱里的随手记（AI 拆解出来的任务都是 false）
  recurrence: RecurrenceRule | null; // 只有系列根任务有非 null 值
  recurrenceRootId: string | null;   // 如果是某次生成实例，指向根任务 id；根任务/普通任务为 null
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
  energy: 'high' | 'low' | null; // 精力消耗：high=深度思考/创造，low=机械/体力，null=未判断
}

/** 设置（存在本地） */
export interface Settings {
  maxMinutesPerStep: number;  // 每个步骤最长分钟数，默认 25，可选 15 / 25 / 45 / 60
  appPassword: string;        // 访问 Worker 的密码
}
