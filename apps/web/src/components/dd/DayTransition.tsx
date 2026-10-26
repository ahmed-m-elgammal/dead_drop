'use client';

/**
 * Dead Drop — day transition slam (M3 W4 art pass).
 * Watches the role-scoped day counter; when it advances live, a "DAY N"
 * title slams over the screen for ~1.7s (non-blocking, pointer-events
 * none). Day 1 is covered by the briefing folder; resume never slams
 * (slams fire only on observed increments). Purely presentational.
 */
import { useEffect, useRef, useState } from 'react';
import { useDD } from '@/lib/dd/store';

const FLAVOR: Record<number, string> = {
  2: 'The fog thickens. The Courier keeps moving.',
  3: 'A district leaks tonight. Somebody\u2019s night just got shorter.',
  4: 'Transit class leaks tonight — Foot, Tram, or Metro.',
  5: 'Halfway gone. The city starts recognizing faces.',
  6: 'A second district hits the paper. The board shrinks.',
  7: 'The clock owns the room now.',
  8: 'Last light. The law says let them run (§9.3).',
};

export default function DayTransition() {
  const view = useDD((s) => s.view);
  const fview = useDD((s) => s.fview);
  const role = useDD((s) => s.role);
  const seed = useDD((s) => s.record?.seed ?? null);

  const [slam, setSlam] = useState<number | null>(null);
  const prev = useRef<{ seed: number | null; day: number | null }>({ seed: null, day: null });

  const day = role === 'fugitive' ? (fview?.day ?? null) : (view?.day ?? null);

  useEffect(() => {
    const p = prev.current;
    if (seed === null || day === null) return;
    const seedChanged = p.seed !== seed;
    if (seedChanged) {
      prev.current = { seed, day };
      return;
    }
    if (p.day !== null && day > p.day) {
      // Deferred a beat so the new day renders first, then the slam lands.
      const t = setTimeout(() => setSlam(day), 120);
      const clear = setTimeout(() => setSlam(null), 1820);
      prev.current = { seed, day };
      return () => {
        clearTimeout(t);
        clearTimeout(clear);
      };
    }
    prev.current = { seed, day };
  }, [seed, day]);

  if (slam === null) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[85] flex items-center justify-center"
      aria-hidden
    >
      <div className="absolute inset-0 bg-ink/72" />
      <div className="rain absolute inset-0 opacity-30" />
      <div className="slam relative text-center">
        <div className="font-pixel text-3xl text-amber [text-shadow:0_0_18px_rgba(232,163,61,.55),4px_4px_0_rgba(0,0,0,.9)] sm:text-5xl">
          DAY {slam}
        </div>
        <div className="mx-auto mt-4 max-w-md px-6 font-type text-sm text-paper/90 sm:text-base">
          {FLAVOR[slam] ?? 'The city watches.'}
        </div>
      </div>
    </div>
  );
}
