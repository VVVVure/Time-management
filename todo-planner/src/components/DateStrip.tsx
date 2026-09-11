import { useEffect, useRef } from 'react';
import type { DayInfo } from '../utils';

interface Props {
  days: DayInfo[];
  selected: string;
  isTodaySelected: boolean;
  loadFor: (date: string) => number;
  onSelect: (date: string) => void;
  onBackToToday: () => void;
}

function DateStrip({ days, selected, isTodaySelected, loadFor, onSelect, onBackToToday }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const todayRef = useRef<HTMLButtonElement>(null);

  const scrollToToday = () => {
    const scroller = scrollRef.current;
    const today = todayRef.current;
    if (!scroller || !today) return;
    scroller.scrollTo({
      left: today.offsetLeft - scroller.clientWidth / 2 + today.clientWidth / 2,
      behavior: 'smooth',
    });
  };

  useEffect(() => {
    const t = window.setTimeout(scrollToToday, 0);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className="flex gap-1.5 overflow-x-auto pb-1 pr-20"
        style={{ scrollbarWidth: 'none' }}
      >
        {days.map((d) => {
          const dots = loadFor(d.date);
          const active = d.date === selected;
          return (
            <button
              key={d.date}
              ref={d.isToday ? todayRef : undefined}
              type="button"
              onClick={() => onSelect(d.date)}
              className={`flex min-w-[52px] shrink-0 flex-col items-center rounded-2xl px-2 py-2 text-sm ${
                active ? 'soft-shadow bg-white text-gray-900' : 'bg-white/40 text-gray-500'
              }`}
            >
              <span className="text-[12px]">{d.isToday ? '今天' : d.weekdayShort}</span>
              <span className="text-[16px] font-semibold leading-tight">{d.dayNumber}</span>
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

      {!isTodaySelected && (
        <button
          type="button"
          onClick={() => {
            onBackToToday();
            window.setTimeout(scrollToToday, 0);
          }}
          className="soft-shadow absolute right-0 top-1/2 -translate-y-1/2 rounded-full bg-white px-3 py-2 text-[13px] font-medium text-blue-600"
        >
          回到今天
        </button>
      )}
    </div>
  );
}

export default DateStrip;
