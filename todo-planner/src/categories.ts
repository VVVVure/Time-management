import {
  BookOpen,
  CircleDashed,
  PenLine,
  Phone,
  Search,
  ShoppingCart,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';

export interface CategoryStyle {
  icon: LucideIcon;
  tone: { bg: string; fg: string };
}

// 低感官刺激配色：工作类薄雾灰蓝，生活类淡奶油杏
const WORK_TONE = { bg: '#eef2f4', fg: '#5b6b7a' };
const LIFE_TONE = { bg: '#f7efe8', fg: '#8a6f5f' };
const DEFAULT_TONE = { bg: '#ffffff', fg: '#6b7280' };

function has(title: string, words: string[]): boolean {
  const t = title.toLowerCase();
  return words.some((w) => t.includes(w.toLowerCase()));
}

/** 根据标题关键词做简单分类，用于图标 + 柔和色调，兜底给默认图标 */
export function categoryFor(title: string): CategoryStyle {
  if (has(title, ['阅读', '读', '书', '看', '学习', '笔记', 'read', 'study', 'book'])) {
    return { icon: BookOpen, tone: WORK_TONE };
  }
  if (has(title, ['调研', '搜索', '查', '找', '研究', 'research', 'search'])) {
    return { icon: Search, tone: WORK_TONE };
  }
  if (has(title, ['打扫', '清洁', '收拾', '整理', '拖地', '扫地', '洗衣', 'clean'])) {
    return { icon: Sparkles, tone: LIFE_TONE };
  }
  if (has(title, ['购物', '买', '采购', '超市', '买菜', 'shopping', 'buy'])) {
    return { icon: ShoppingCart, tone: LIFE_TONE };
  }
  if (has(title, ['电话', '打给', '联系', '通话', 'call', 'phone'])) {
    return { icon: Phone, tone: LIFE_TONE };
  }
  if (has(title, ['写', '报告', '文档', '初稿', '简历', 'okr', '总结', 'write'])) {
    return { icon: PenLine, tone: WORK_TONE };
  }
  return { icon: CircleDashed, tone: DEFAULT_TONE };
}
