import { useRef, useEffect, useCallback } from 'react';

const ITEM_H = 44;
const VISIBLE = 5;

const MONTHS = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

function getDaysInMonth(month: number, year: number) {
  return new Date(year, month, 0).getDate();
}

function range(from: number, to: number) {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}

interface ColumnProps {
  items: (string | number)[];
  selected: number | string;
  onChange: (val: string | number) => void;
}

function Column({ items, selected, onChange }: ColumnProps) {
  const ref = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idx = items.indexOf(selected);

  // Scroll to selected index
  const scrollTo = useCallback((i: number, behavior: ScrollBehavior = 'auto') => {
    if (ref.current) {
      ref.current.scrollTo({ top: i * ITEM_H, behavior });
    }
  }, []);

  useEffect(() => {
    scrollTo(idx < 0 ? 0 : idx);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollTo(idx < 0 ? 0 : idx, 'smooth');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const handleScroll = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (!ref.current) return;
      const i = Math.round(ref.current.scrollTop / ITEM_H);
      const clamped = Math.max(0, Math.min(items.length - 1, i));
      if (items[clamped] !== selected) {
        onChange(items[clamped]);
      }
      // Snap exactly
      ref.current.scrollTo({ top: clamped * ITEM_H, behavior: 'smooth' });
    }, 80);
  };

  return (
    <div className="relative flex-1 overflow-hidden" style={{ height: ITEM_H * VISIBLE }}>
      {/* Selection highlight */}
      <div
        className="absolute left-0 right-0 pointer-events-none z-10 rounded-xl
                   bg-[rgba(120,120,128,0.12)] dark:bg-[rgba(120,120,128,0.2)]"
        style={{ top: ITEM_H * 2, height: ITEM_H }}
      />
      {/* Top / bottom fade */}
      <div
        className="absolute left-0 right-0 top-0 z-20 pointer-events-none"
        style={{
          height: ITEM_H * 2,
          background: 'linear-gradient(to bottom, var(--picker-mask-start, rgba(255,255,255,0.95)), transparent)',
        }}
      />
      <div
        className="absolute left-0 right-0 bottom-0 z-20 pointer-events-none"
        style={{
          height: ITEM_H * 2,
          background: 'linear-gradient(to top, var(--picker-mask-start, rgba(255,255,255,0.95)), transparent)',
        }}
      />
      <div
        ref={ref}
        onScroll={handleScroll}
        className="h-full overflow-y-scroll"
        style={{
          scrollSnapType: 'y mandatory',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          paddingTop: ITEM_H * 2,
          paddingBottom: ITEM_H * 2,
        }}
      >
        {items.map((item) => (
          <div
            key={item}
            style={{
              height: ITEM_H,
              scrollSnapAlign: 'start',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span
              className="ios-text-callout select-none"
              style={{
                fontWeight: item === selected ? 600 : 400,
                color: item === selected ? 'inherit' : 'rgba(60,60,67,0.5)',
                transition: 'all 0.15s',
              }}
            >
              {item}
            </span>
          </div>
        ))}
      </div>
      <style>{`div::-webkit-scrollbar { display: none; }`}</style>
    </div>
  );
}

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (val: string) => void;
  minYear?: number;
  maxYear?: number;
}

export default function DatePicker({
  value,
  onChange,
  minYear = 1920,
  maxYear = new Date().getFullYear(),
}: DatePickerProps) {
  const parts = value ? value.split('-') : ['', '', ''];
  const year = parseInt(parts[0]) || maxYear - 20;
  const month = parseInt(parts[1]) || 1;
  const day = parseInt(parts[2]) || 1;

  const daysInMonth = getDaysInMonth(month, year);
  const days = range(1, daysInMonth);
  const months = range(1, 12);
  const years = range(minYear, maxYear).reverse();

  const update = (d: number, m: number, y: number) => {
    const dClamped = Math.min(d, getDaysInMonth(m, y));
    onChange(
      `${y}-${String(m).padStart(2, '0')}-${String(dClamped).padStart(2, '0')}`
    );
  };

  return (
    <div
      className="flex gap-1 rounded-2xl overflow-hidden"
      style={{
        // Pass CSS variables to Column fade gradients
        ['--picker-mask-start' as string]:
          'var(--tw-bg-opacity, rgba(255,255,255,0.95))',
      }}
    >
      {/* Day */}
      <Column
        items={days}
        selected={Math.min(day, daysInMonth)}
        onChange={(v) => update(Number(v), month, year)}
      />
      {/* Month */}
      <div className="flex-[2] relative overflow-hidden" style={{ height: ITEM_H * VISIBLE }}>
        <div
          className="absolute left-0 right-0 pointer-events-none z-10 rounded-xl
                     bg-[rgba(120,120,128,0.12)] dark:bg-[rgba(120,120,128,0.2)]"
          style={{ top: ITEM_H * 2, height: ITEM_H }}
        />
        <div
          className="absolute left-0 right-0 top-0 z-20 pointer-events-none"
          style={{
            height: ITEM_H * 2,
            background: 'linear-gradient(to bottom, rgba(255,255,255,0.95), transparent)',
          }}
        />
        <div
          className="absolute left-0 right-0 bottom-0 z-20 pointer-events-none"
          style={{
            height: ITEM_H * 2,
            background: 'linear-gradient(to top, rgba(255,255,255,0.95), transparent)',
          }}
        />
        <MonthColumn
          selected={month}
          onChange={(m) => update(day, m, year)}
        />
      </div>
      {/* Year */}
      <Column
        items={years}
        selected={year}
        onChange={(v) => update(day, month, Number(v))}
      />
    </div>
  );
}

function MonthColumn({ selected, onChange }: { selected: number; onChange: (m: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idx = selected - 1;

  useEffect(() => {
    if (ref.current) ref.current.scrollTo({ top: idx * ITEM_H });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (ref.current) ref.current.scrollTo({ top: idx * ITEM_H, behavior: 'smooth' });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const handleScroll = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (!ref.current) return;
      const i = Math.round(ref.current.scrollTop / ITEM_H);
      const clamped = Math.max(0, Math.min(11, i));
      if (clamped + 1 !== selected) onChange(clamped + 1);
      ref.current.scrollTo({ top: clamped * ITEM_H, behavior: 'smooth' });
    }, 80);
  };

  return (
    <div
      ref={ref}
      onScroll={handleScroll}
      className="h-full overflow-y-scroll"
      style={{
        scrollSnapType: 'y mandatory',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
        paddingTop: ITEM_H * 2,
        paddingBottom: ITEM_H * 2,
      }}
    >
      {MONTHS.map((name, i) => (
        <div
          key={name}
          style={{
            height: ITEM_H,
            scrollSnapAlign: 'start',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            className="ios-text-callout select-none"
            style={{
              fontWeight: i + 1 === selected ? 600 : 400,
              color: i + 1 === selected ? 'inherit' : 'rgba(60,60,67,0.5)',
              transition: 'all 0.15s',
            }}
          >
            {name}
          </span>
        </div>
      ))}
    </div>
  );
}
