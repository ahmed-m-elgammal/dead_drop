'use client';

/**
 * Dead Drop — case side panel (M3 W1 logic, W4 noir skin): case header as
 * a file tab, marker tools, and the evidence log as pinned paper notes on
 * the corkboard — private results read as surveillance photos. The §1.3
 * information boundary stays visible (private entries are flagged).
 */
import { useEffect, useMemo, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { PublicEvent, PrivateInvestigatorEvent } from '@dead-drop/engine';
import { useDD, type MarkerKind } from '@/lib/dd/store';

const DISTRICT_NAMES: Record<string, string> = {
  D1: 'Harbor',
  D2: 'Old Town',
  D3: 'Market',
  D4: 'Rail Yard',
};

export default function Sidebar() {
  const view = useDD((s) => s.view);
  const config = useDD((s) => s.config);
  const selected = useDD((s) => s.selected);
  const markers = useDD((s) => s.markers);
  const setMarker = useDD((s) => s.setMarker);
  const beliefHalo = useDD((s) => s.beliefHalo);
  const toggleHalo = useDD((s) => s.toggleHalo);
  const abandonCase = useDD((s) => s.abandonCase);
  const tutorial = useDD((s) => s.tutorial);

  const logRef = useRef<HTMLDivElement>(null);
  const entries = useMemo(() => (view ? mergeLogs(view) : []), [view]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [entries.length]);

  if (!view || !config) return null;

  const markerBtn = (kind: MarkerKind, label: string) => (
    <Button
      key={kind}
      size="sm"
      variant="outline"
      className="h-7 border-line-2 bg-panel-2 px-2.5 font-term text-sm text-fog hover:border-amber hover:text-amber"
      onClick={() => setMarker(selected!, markers[selected!] === kind ? undefined : kind)}
      disabled={!selected}
      aria-label={`Mark ${label}`}
    >
      {label}
    </Button>
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {/* case tab — file header */}
      <div className="pixel-frame relative p-3">
        <div className="absolute -top-[10px] left-3 bg-amber px-2 py-0.5 font-pixel text-[7px] text-[#141005]">
          DEAD DROP · CASE №{String(config.seed % 100000).padStart(5, '0')}
        </div>
        <div className="mt-1 flex items-end justify-between">
          <div className="font-pixel text-sm text-paper">
            DAY {Math.min(view.day, 8)}
            <span className="text-fog-2">/8</span>
            <span className="ml-2 font-type text-[10px] font-normal tracking-wide text-fog">
              {view.phase === 'FUGITIVE_MOVE' ? '· courier moving' : view.phase === 'INVESTIGATOR_ACTIONS' ? '· your phase' : ''}
            </span>
          </div>
          <div className="text-right font-term text-base leading-none text-fog">
            <div>seed <b className="text-amber-2">{config.seed}</b></div>
            <div className="mt-0.5">IP <b className="text-amber-2">{view.investigator.intel}</b></div>
          </div>
        </div>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <Badge variant="outline" className="border-line-2 bg-ink-2 font-term text-sm text-fog">
            SH {config.safehouse}
          </Badge>
          <Badge variant="outline" className="border-line-2 bg-ink-2 font-term text-sm text-fog">
            DROP1 {config.drops[0]}
          </Badge>
          <Badge variant="outline" className="border-line-2 bg-ink-2 font-term text-sm text-fog">
            DROP2 {config.drops[1]}
          </Badge>
          <Badge variant="outline" className="border-blood/60 bg-ink-2 font-term text-sm text-blood-2">
            GATE {config.gate}
          </Badge>
        </div>
        <div className="mt-2.5 flex items-center gap-2">
          <button
            onClick={toggleHalo}
            data-on={beliefHalo}
            className="chip-pixel px-2 py-0.5 text-sm"
          >
            belief halo {beliefHalo ? 'ON' : 'OFF'}
          </button>
          <span className="font-type text-[10px] text-fog-2">where they could be — public evidence only</span>
        </div>
        {!tutorial && (
          <button
            onClick={abandonCase}
            className="mt-2 font-type text-[10px] text-fog-2 underline hover:text-fog"
          >
            abandon case (clears the local record)
          </button>
        )}
      </div>

      {/* markers — red-string thinking */}
      <div className="pixel-frame p-3">
        <div className="mb-1.5 flex items-center justify-between font-term text-base uppercase tracking-wider text-fog">
          <span>markers — your string board</span>
          <span className="text-amber-2">{selected ?? '·'}</span>
        </div>
        <div className="flex gap-1.5">
          {markerBtn('possible', '? maybe')}
          {markerBtn('pinned', '! pinned')}
          {markerBtn('cleared', '✕ cleared')}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 font-term text-sm text-fog-2 hover:text-fog"
            disabled={!selected || !markers[selected!]}
            onClick={() => setMarker(selected!, undefined)}
          >
            clear
          </Button>
        </div>
      </div>

      {/* evidence log — pinned notes */}
      <div className="cork flex min-h-0 flex-1 flex-col pixel-frame">
        <div className="border-b border-line/70 px-3 py-2 font-term text-base uppercase tracking-[0.14em] text-amber">
          evidence log
        </div>
        <div ref={logRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          {entries.length === 0 && (
            <p className="py-6 text-center font-type text-xs text-fog-2">
              The case opens. They are moving.
            </p>
          )}
          <ul className="space-y-2.5">
            {entries.map((e, i) => (
              <li
                key={i}
                className={`pin-pop ${e.private ? '' : 'pin-note'}`}
                style={{ animationDelay: `${Math.min(i * 20, 200)}ms` }}
              >
                <div
                  className={`px-2.5 py-1.5 ${
                    e.private
                      ? 'border border-line-2 bg-ink-2 shadow-[2px_3px_0_rgba(4,8,16,.5)]'
                      : `paper-card ${i % 3 === 1 ? 'tilt-r' : i % 3 === 2 ? 'tilt-l' : ''}`
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span
                      className={`mt-0.5 shrink-0 px-1 text-center font-term text-sm leading-4 ${
                        e.private ? 'text-fog-2' : 'text-[#8a7a58]'
                      }`}
                    >
                      D{e.day}
                    </span>
                    <span
                      className={`font-type text-[11.5px] leading-snug ${
                        e.private ? 'text-fog' : 'text-[#33291a]'
                      }`}
                    >
                      {e.private && (
                        <span className="mr-1 bg-blood px-1 py-px font-term text-[10px] uppercase tracking-wider text-paper">
                          private
                        </span>
                      )}
                      {e.text}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

interface Entry {
  day: number;
  text: string;
  private?: boolean;
}

function mergeLogs(view: NonNullable<ReturnType<typeof useDD.getState>['view']>): Entry[] {
  if (!view) return [];
  const pub: Entry[] = (view.log as PublicEvent[]).map(eventText);
  const priv: Entry[] = (view.private_log_investigator as PrivateInvestigatorEvent[]).map((e) => ({
    ...privateText(e),
    private: true,
  }));
  const all = [...pub, ...priv].sort((a, b) => a.day - b.day);
  return all;
}

function eventText(ev: PublicEvent): Entry {
  switch (ev.kind) {
    case 'DISTRICT_REVEAL':
      return { day: ev.day, text: `District reveal — they ended the day in ${DISTRICT_NAMES[ev.district] ?? ev.district}.` };
    case 'TRANSIT_REVEAL':
      return {
        day: ev.day,
        text:
          ev.move_class === 'NO_MOVEMENT'
            ? 'Transit reveal — "no movement" (they Held).'
            : `Transit reveal — that day's move was ${ev.move_class === 'F' ? 'Foot' : ev.move_class === 'T' ? 'Tram' : 'Metro'}.`,
      };
    case 'DROP_COMPLETED':
      return { day: ev.day, text: `Drop ${ev.slot} completed at ${ev.site}.` };
    case 'STRANDED':
      return { day: ev.day, text: 'The Fugitive is stranded — forced Hold at no SP cost (§9.13).' };
    case 'DAY_MARKER':
      return { day: ev.day, text: `Day ${ev.day} begins.` };
    case 'VERDICT':
      return { day: ev.day, text: `VERDICT: ${ev.verdict}.` };
  }
}

function privateText(e: PrivateInvestigatorEvent): Entry {
  switch (e.kind) {
    case 'PROBE_RESULT':
      return {
        day: e.day,
        text: `Probe @ ${e.target} → ${e.result}${e.result === 'HIT' ? ' — they were there today.' : ' — not there today.'}`,
      };
    case 'STAKEOUT_PLACED':
      return { day: e.day, text: `Stakeout armed @ ${e.target} — resolves tomorrow, step 2.` };
    case 'STAKEOUT_MISS':
      return { day: e.day, text: `Stakeout @ ${e.target} missed — consumed silently.` };
  }
}
