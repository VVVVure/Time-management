import { useState } from 'react';
import { todayISO } from '../utils';

interface Props {
  selected: string;
  onSelect: (date: string) => void;
  loadFor: (date: string) => number;
}

function dateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 生成一个 6 行 7 列的月历网格，前后用相邻月份补齐 */
function monthGrid(year: number, month: number): { date: string; inMonth: boolean; day: number }[] {
  const first = new Date(year, month - 1, 1);
  const start = new Date(year, month - 1, 1 - first.getDay());
  const cells: { date: string; inMonth: boolean; day: number }[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push({ date: dateStr(d), inMonth: d.getMonth() === month - 1, day: d.getDate() });
  }
  return cells;
}

function MonthView({ selected, onSelect, loadFor }: Props) {
  const today = todayISO();
  const now = new Date();
  const [year, setYear] = useState(() => Number(selected.slice(0, 4)));
  const [month, setMonth] = useState(() => Number(selected.slice(5, 7)));

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
  const cells = monthGrid(year, month);

  const prevMonth = () => {
    if (month === 1) {
      setYear((y) => y - 1);
      setMonth(12);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (month === 12) {
      setYear((y) => y + 1);
      setMonth(1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const backToThisMonth = () => {
    setYear(now.getFullYear());
    setMonth(now.getMonth() + 1);
    onSelect(today);
  };

  const handleSelect = (date: string) => {
    onSelect(date);
    const y = Number(date.slice(0, 4));
    const m = Number(date.slice(5, 7));
    if (y !== year || m !== month) {
      setYear(y);
      setMonth(m);
    }
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={prevMonth}
            aria-label="上个月"
            className="soft-shadow flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-lg text-gray-600"
          >
            ‹
          </button>
          <span className="px-2 text-base font-semibold">
            {year}年{month}月
          </span>
          <button
            type="button"
            onClick={nextMonth}
            aria-label="下个月"
            className="soft-shadow flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-lg text-gray-600"
          >
            ›
          </button>
        </div>
        {!isCurrentMonth && (
          <button
            type="button"
            onClick={backToThisMonth}
            className="soft-shadow rounded-full bg-white px-3 py-2 text-[13px] font-medium text-blue-600"
          >
            回到本月
          </button>
        )}
      </div>

      <div className="soft-shadow rounded-2xl bg-white p-2">
        <div className="grid grid-cols-7 text-center text-xs text-gray-400">
          {['日', '一', '二', '三', '四', '五', '六'].map((w) => (
            <div key={w} className="py-1">
              {w}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((c) => {
            const active = c.date === selected;
            const isToday = c.date === today;
            const dots = loadFor(c.date);
            return (
              <button
                key={c.date}
                type="button"
                onClick={() => handleSelect(c.date)}
                className={`flex min-h-[52px] flex-col items-center justify-center rounded-xl text-sm ${
                  active
                    ? 'soft-shadow bg-blue-50 text-blue-700'
                    : c.inMonth
                      ? 'text-gray-800'
                      : 'text-gray-300'
                }`}
              >
                <span
                  className={`relative text-[14px] font-medium ${isToday ? 'text-blue-600' : ''}`}
                >
                  {c.day}
                  {isToday && (
                    <span className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-blue-500" />
                  )}
                </span>
                <span className="mt-1 flex h-1.5 items-center gap-0.5">
                  {Array.from({ length: dots }).map((_, i) => (
                    <span
                      key={i}
                      className={`h-1 w-1 rounded-full ${
                        dots >= 3 ? 'bg-amber-400' : 'bg-gray-400'
                      }`}
                    />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default MonthView;
