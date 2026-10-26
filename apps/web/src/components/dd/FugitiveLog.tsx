'use client';

/**
 * Dead Drop — fugitive-side public evidence digest (M3 W3 logic, W4 skin).
 *
 * The PUBLIC log from the fugitive's seat, styled as surveillance reports
 * sliding under the door: what the rules published about THEM (reveals,
 * drops, stranding) plus day markers. Investigator-private events do not
 * exist here — §1.3/§5.2 (stakeouts are silent).
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
    <div className="cork pixel-frame flex min-h-0 flex-1 flex-col">
      <div className="border-b border-line/70 px-3 py-2 font-term text-base uppercase tracking-[0.14em] text-blood-2">
        what the paper published about you
      </div>
      <div ref={logRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {entries.length === 0 && (
          <p className="py-6 text-center font-type text-xs text-fog-2">
            The case opens. Plan your first move.
          </p>
        )}
        <ul className="space-y-2">
          {entries.map((e, i) => (
            <li key={i} className="pin-pop" style={{ animationDelay: `${Math.min(i * 20, 200)}ms` }}>
              <div className={`px-2.5 py-1.5 ${e.leak ? 'border border-blood-2/60 bg-blood/15' : 'border border-line bg-ink-2'}`}>
                <div className="flex items-start gap-2">
                  <span className={`mt-0.5 shrink-0 px-1 text-center font-term text-sm leading-4 ${e.leak ? 'text-blood-2' : 'text-fog-2'}`}>
                    D{e.day}
                  </span>
                  {e.photo && (
                    <span className="ml-auto shrink-0 rotate-1 border-[3px] border-[#f4efe4] bg-[#f4efe4] shadow-[1px_2px_0_rgba(4,8,16,.35)]">
                      <img
                        src={e.photo}
                        alt=""
                        className="art block h-9 w-14 object-cover"
                        loading="lazy"
                        onError={(ev) => {
                          (ev.currentTarget.parentElement as HTMLElement).style.display = 'none';
                        }}
                      />
                    </span>
                  )}
                  <span className={`min-w-0 flex-1 font-type text-[11.5px] leading-snug ${e.leak ? 'text-blood-2' : 'text-fog'}`}>
                    {e.text}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function eventText(ev: PublicEvent): { day: number; text: string; leak?: boolean; photo?: string } {
  switch (ev.kind) {
    case 'DISTRICT_REVEAL':
      return {
        day: ev.day,
        text: `District reveal — the Investigator learned you ended the day in ${DISTRICT_NAMES[ev.district] ?? ev.district}.`,
        leak: true,
        photo: `/art/district-${ev.district}.png`,
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
