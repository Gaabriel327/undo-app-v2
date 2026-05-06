import { useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../App';

const ITEM_H = 44;
const VISIBLE = 5;

const MONTHS = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

function getDaysInMonth(month: number, year: number) {
  return new Date(year, month, 0).getDate();
}

function range(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}

interface ColumnProps {
  items: (string | number)[];
  selected: number | string;
  onChange: (val: string | number) => void;
  maskBg: string;
}

function Column({ items, selected, onChange, maskBg }: ColumnProps) {
  const ref = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idx = items.indexOf(selected);

  const scrollTo = useCallback((i: number, behavior: ScrollBehavior = 'auto') => {
    ref.current?.scrollTo({ top: i * ITEM_H, behavior });
  }, []);

  useEffect(() => { scrollTo(idx < 0 ? 0 : idx); }, []); // eslint-disable-line
  useEffect(() => { scrollTo(idx < 0 ? 0 : idx, 'smooth'); }, [selected]); // eslint-disable-line

  const handleScroll = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (!ref.current) return;
      const i = Math.round(ref.current.scrollTop / ITEM_H);
      const c = Math.max(0, Math.min(items.length - 1, i));
      if (items[c] !== selected) onChange(items[c]);
      ref.current.scrollTo({ top: c * ITEM_H, behavior: 'smooth' });
    }, 80);
  };

  return (
    <div className="relative flex-1 overflow-hidden" style={{ height: ITEM_H * VISIBLE }}>
      {/* Center highlight */}
      <div
        className="absolute inset-x-0 pointer-events-none z-10 rounded-xl bg-[rgba(120,120,128,0.12)] dark:bg-[rgba(120,120,128,0.2)]"
        style={{ top: ITEM_H * 2, height: ITEM_H }}
      />
      {/* Top gradient mask */}
      <div className="absolute inset-x-0 top-0 z-20 pointer-events-none" style={{
        height: ITEM_H * 2,
        background: `linear-gradient(to bottom, ${maskBg}, transparent)`,
      }} />
      {/* Bottom gradient mask */}
      <div className="absolute inset-x-0 bottom-0 z-20 pointer-events-none" style={{
        height: ITEM_H * 2,
        background: `linear-gradient(to top, ${maskBg}, transparent)`,
      }} />
      {/* Scrollable list */}
      <div
        ref={ref}
        onScroll={handleScroll}
        style={{
          height: '100%',
          overflowY: 'scroll',
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
            style={{ height: ITEM_H, scrollSnapAlign: 'start', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <span
              className="select-none transition-all duration-150"
              style={{
                fontSize: 16,
                fontWeight: item === selected ? 600 : 400,
                color: item === selected ? 'inherit' : 'rgba(60,60,67,0.45)',
              }}
            >
              {item}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MonthColumn({ selected, onChange, maskBg }: { selected: number; onChange: (m: number) => void; maskBg: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { ref.current?.scrollTo({ top: (selected - 1) * ITEM_H }); }, []); // eslint-disable-line
  useEffect(() => { ref.current?.scrollTo({ top: (selected - 1) * ITEM_H, behavior: 'smooth' }); }, [selected]);

  const handleScroll = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (!ref.current) return;
      const i = Math.round(ref.current.scrollTop / ITEM_H);
      const c = Math.max(0, Math.min(11, i));
      if (c + 1 !== selected) onChange(c + 1);
      ref.current.scrollTo({ top: c * ITEM_H, behavior: 'smooth' });
    }, 80);
  };

  return (
    <div className="relative flex-[2] overflow-hidden" style={{ height: ITEM_H * VISIBLE }}>
      <div
        className="absolute inset-x-0 pointer-events-none z-10 rounded-xl bg-[rgba(120,120,128,0.12)] dark:bg-[rgba(120,120,128,0.2)]"
        style={{ top: ITEM_H * 2, height: ITEM_H }}
      />
      <div className="absolute inset-x-0 top-0 z-20 pointer-events-none" style={{
        height: ITEM_H * 2,
        background: `linear-gradient(to bottom, ${maskBg}, transparent)`,
      }} />
      <div className="absolute inset-x-0 bottom-0 z-20 pointer-events-none" style={{
        height: ITEM_H * 2,
        background: `linear-gradient(to top, ${maskBg}, transparent)`,
      }} />
      <div
        ref={ref}
        onScroll={handleScroll}
        style={{
          height: '100%',
          overflowY: 'scroll',
          scrollSnapType: 'y mandatory',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          paddingTop: ITEM_H * 2,
          paddingBottom: ITEM_H * 2,
        }}
      >
        {MONTHS.map((name, i) => (
          <div key={name} style={{ height: ITEM_H, scrollSnapAlign: 'start', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span
              className="select-none transition-all duration-150"
              style={{
                fontSize: 16,
                fontWeight: i + 1 === selected ? 600 : 400,
                color: i + 1 === selected ? 'inherit' : 'rgba(60,60,67,0.45)',
              }}
            >
              {name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (val: string) => void;
  minYear?: number;
  maxYear?: number;
}

export default function DatePicker({ value, onChange, minYear = 1920, maxYear = new Date().getFullYear() }: DatePickerProps) {
  const { darkMode } = useAuth();
  const maskBg = darkMode ? 'rgba(28,28,30,0.97)' : 'rgba(255,255,255,0.97)';

  const parts = value ? value.split('-') : [];
  const year  = parseInt(parts[0]) || maxYear - 25;
  const month = parseInt(parts[1]) || 1;
  const day   = parseInt(parts[2]) || 1;

  const days  = range(1, getDaysInMonth(month, year));
  const years = range(minYear, maxYear).reverse();

  const update = (d: number, m: number, y: number) => {
    const dc = Math.min(d, getDaysInMonth(m, y));
    onChange(`${y}-${String(m).padStart(2, '0')}-${String(dc).padStart(2, '0')}`);
  };

  return (
    <div className="flex gap-2">
      <Column items={days}  selected={Math.min(day, getDaysInMonth(month, year))} onChange={(v) => update(Number(v), month, year)} maskBg={maskBg} />
      <MonthColumn selected={month} onChange={(m) => update(day, m, year)} maskBg={maskBg} />
      <Column items={years} selected={year}  onChange={(v) => update(day, month, Number(v))} maskBg={maskBg} />
    </div>
  );
}
