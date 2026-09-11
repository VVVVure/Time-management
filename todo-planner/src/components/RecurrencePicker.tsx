import type { RecurrenceRule } from '../types';
import { todayISO } from '../utils';

interface Props {
  value: RecurrenceRule | null;
  onChange: (rule: RecurrenceRule | null) => void;
}

function RecurrencePicker({ value, onChange }: Props) {
  const enabled = value !== null;
  const freq = value?.freq ?? 'weekly';
  const interval = value?.interval ?? 1;
  const endDate = value?.endDate ?? '';

  const commitFreqInterval = (f: RecurrenceRule['freq'], n: number) => {
    onChange({ freq: f, interval: n, endDate: endDate || null });
  };

  const customActive =
    enabled &&
    !(
      (freq === 'daily' && interval === 1) ||
      (freq === 'weekly' && interval === 1) ||
      (freq === 'weekly' && interval === 2) ||
      (freq === 'monthly' && interval === 1)
    );

  const presetClass = (active: boolean) =>
    `min-h-[44px] rounded-full px-3 py-2 text-[13px] font-medium ${
      active ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
    }`;

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => onChange(null)} className={presetClass(!enabled)}>
          不重复
        </button>
        <button
          type="button"
          onClick={() => commitFreqInterval('daily', 1)}
          className={presetClass(enabled && freq === 'daily' && interval === 1)}
        >
          每天
        </button>
        <button
          type="button"
          onClick={() => commitFreqInterval('weekly', 1)}
          className={presetClass(enabled && freq === 'weekly' && interval === 1)}
        >
          每周
        </button>
        <button
          type="button"
          onClick={() => commitFreqInterval('weekly', 2)}
          className={presetClass(enabled && freq === 'weekly' && interval === 2)}
        >
          每两周
        </button>
        <button
          type="button"
          onClick={() => commitFreqInterval('monthly', 1)}
          className={presetClass(enabled && freq === 'monthly' && interval === 1)}
        >
          每月
        </button>
        <button
          type="button"
          onClick={() => onChange({ freq, interval, endDate: endDate || null })}
          className={presetClass(customActive)}
        >
          自定义
        </button>
      </div>

      {enabled && (
        <div className="mt-3 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">每</span>
            <input
              type="number"
              min={1}
              value={interval}
              onChange={(e) =>
                onChange({
                  freq,
                  interval: Math.max(1, Math.round(Number(e.target.value)) || 1),
                  endDate: endDate || null,
                })
              }
              className="w-16 rounded-xl bg-gray-100 px-2 py-2 text-sm outline-none"
            />
            <select
              value={freq}
              onChange={(e) =>
                onChange({
                  freq: e.target.value as RecurrenceRule['freq'],
                  interval,
                  endDate: endDate || null,
                })
              }
              className="rounded-xl bg-gray-100 px-2 py-2 text-sm outline-none"
            >
              <option value="daily">天</option>
              <option value="weekly">周</option>
              <option value="monthly">月</option>
            </select>
          </div>

          <div>
            <span className="text-sm text-gray-500">结束</span>
            <div className="mt-1 flex gap-2">
              <button
                type="button"
                onClick={() => onChange({ freq, interval, endDate: null })}
                className={`rounded-full px-3 py-1.5 text-[13px] ${
                  !endDate ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                一直重复
              </button>
              <button
                type="button"
                onClick={() => onChange({ freq, interval, endDate: todayISO() })}
                className={`rounded-full px-3 py-1.5 text-[13px] ${
                  endDate ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                到某天
              </button>
            </div>
            {endDate && (
              <input
                type="date"
                value={endDate}
                onChange={(e) => onChange({ freq, interval, endDate: e.target.value || null })}
                className="mt-2 rounded-xl bg-gray-100 px-2 py-1.5 text-sm outline-none"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default RecurrencePicker;
