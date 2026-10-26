'use client';

/**
 * Dead Drop — case side panel (M3 W1): case header (day/phase/IP/seed),
 * selected-node marker tools (local-only belief markers, 06-uiux §2), and
 * the evidence log (public events + private probe/stakeout results, clearly
 * flagged — the §1.3 information boundary made visible).
 */
import { useEffect, useMemo, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
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
      className="h-7 px-2.5 text-xs"
      onClick={() => setMarker(selected!, markers[selected!] === kind ? undefined : kind)}
      disabled={!selected}
      aria-label={`Mark ${label}`}
    >
      {label}
    </Button>
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="rounded-xl border bg-white p-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[2px] text-neutral-400">Dead Drop · Solo</div>
            <div className="text-lg font-black leading-tight">
              Day {view.day}<span className="text-neutral-400">/8</span>{' '}
              <span className="text-sm font-semibold text-neutral-500">
                {view.phase === 'FUGITIVE_MOVE' ? '· fugitive moving' : view.phase === 'INVESTIGATOR_ACTIONS' ? '· your phase' : ''}
              </span>
            </div>
          </div>
          <div className="text-right text-xs text-neutral-500">
            <div>seed <b className="font-mono text-neutral-800">{config.seed}</b></div>
            <div>IP <b className="text-neutral-900">{view.investigator.intel}</b></div>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
          <Badge variant="outline" className="font-mono">SH {config.safehouse}</Badge>
          <Badge variant="outline" className="font-mono">D1⬦ {config.drops[0]}</Badge>
          <Badge variant="outline" className="font-mono">D2⬦ {config.drops[1]}</Badge>
          <Badge variant="outline" className="font-mono">GATE {config.gate}</Badge>
        </div>
        <div className="mt-2 flex items-center gap-2 text-[11px] text-neutral-500">
          <button
            onClick={toggleHalo}
            className={`rounded-full border px-2 py-0.5 font-semibold transition-colors ${
              beliefHalo ? 'border-blue-900 bg-blue-950 text-white' : 'border-neutral-300 hover:border-neutral-500'
            }`}
          >
            belief halo {beliefHalo ? 'ON' : 'OFF'}
          </button>
          <span>where they could be, from public evidence only</span>
        </div>
        {!tutorial && (
          <button
            onClick={abandonCase}
            className="mt-2 text-[10px] text-neutral-400 underline hover:text-neutral-600"
          >
            abandon case (clears the local record)
          </button>
        )}
      </div>

      <div className="rounded-xl border bg-white p-3 shadow-sm">
        <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold text-neutral-500">
          <span>MARKERS — your private thinking</span>
          <span className="font-normal">{selected ?? 'select a node'}</span>
        </div>
        <div className="flex gap-1.5">
          {markerBtn('possible', '? maybe')}
          {markerBtn('pinned', '! pinned')}
          {markerBtn('cleared', '✕ cleared')}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs text-neutral-500"
            disabled={!selected || !markers[selected!]}
            onClick={() => setMarker(selected!, undefined)}
          >
            clear
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col rounded-xl border bg-white shadow-sm">
        <div className="border-b px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
          Evidence log
        </div>
        <div ref={logRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
          {entries.length === 0 && (
            <p className="py-6 text-center text-xs text-neutral-400">The case opens. They are moving.</p>
          )}
          <ul className="space-y-1.5 text-xs">
            {entries.map((e, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-0.5 w-7 shrink-0 rounded bg-neutral-100 text-center font-mono text-[10px] leading-4 text-neutral-500">
                  D{e.day}
                </span>
                <span className={e.private ? 'text-neutral-500' : 'text-neutral-800'}>
                  {e.private && <span className="mr-1 rounded bg-neutral-100 px-1 text-[9px] font-bold uppercase text-neutral-400">private</span>}
                  {e.text}
                </span>
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
