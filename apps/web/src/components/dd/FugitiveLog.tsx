'use client';

/**
 * Dead Drop — fugitive-side public evidence digest (M3 W3).
 *
 * The PUBLIC log from the fugitive's seat: what the rules published about
 * THEM (reveals, drops, stranding) plus day markers. Investigator-private
 * events do not exist here — §1.3/§5.2 (stakeouts are silent).
 */
import { useEffect, useMemo, useRef } from 'react';
import type { FugitiveView, PublicEvent } from '@dead-drop/engine';

const DISTRICT_NAMES: Record<string, string> = {
  D1: 'Harbor',
  D2: 'Old Town',
  D3: 'Market',
  D4: 'Rail Yard',
};

export default function FugitiveLog({ fview }: { fview: FugitiveView }) {
  const logRef = useRef<HTMLDivElement>(null);
  const entries = useMemo(() => fview.log.map(eventText), [fview.log]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [entries.length]);

  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-xl border bg-white shadow-sm">
      <div className="border-b px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
        What the rules published about you
      </div>
      <div ref={logRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
        {entries.length === 0 && (
          <p className="py-6 text-center text-xs text-neutral-400">The case opens. Plan your first move.</p>
        )}
        <ul className="space-y-1.5 text-xs">
          {entries.map((e, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-0.5 w-7 shrink-0 rounded bg-neutral-100 text-center font-mono text-[10px] leading-4 text-neutral-500">
                D{e.day}
              </span>
              <span className={e.leak ? 'text-red-800' : 'text-neutral-800'}>{e.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function eventText(ev: PublicEvent): { day: number; text: string; leak?: boolean } {
  switch (ev.kind) {
    case 'DISTRICT_REVEAL':
      return {
        day: ev.day,
        text: `District reveal — the Investigator learned you ended the day in ${DISTRICT_NAMES[ev.district] ?? ev.district}.`,
        leak: true,
      };
    case 'TRANSIT_REVEAL':
      return {
        day: ev.day,
        text:
          ev.move_class === 'NO_MOVEMENT'
            ? 'Transit reveal — the Investigator learned you did not move.'
            : `Transit reveal — the Investigator learned your move was ${ev.move_class === 'F' ? 'Foot' : ev.move_class === 'T' ? 'Tram' : 'Metro'}.`,
        leak: true,
      };
    case 'DROP_COMPLETED':
      return { day: ev.day, text: `Drop ${ev.slot} collected at ${ev.site} — it's public.` };
    case 'STRANDED':
      return { day: ev.day, text: 'You were stranded — the day resolved as a forced Hold (§9.13), publicly.' };
    case 'DAY_MARKER':
      return { day: ev.day, text: `Day ${ev.day}.` };
    case 'VERDICT':
      return { day: ev.day, text: `VERDICT: ${ev.verdict}.` };
  }
}
