'use client';

/**
 * Dead Drop — Investigator action bar (M3 W1, 06-uiux §2 S3).
 *
 * One decision at a time, bottom-docked, one-handed reach: mode chips →
 * target comes from the selected map node → Probe commits instantly (1 IP),
 * Stakeout requires hold-to-confirm (irreversible 3 IP, with the §5.2 line),
 * End phase advances the clock (the AI Fugitive then moves).
 */
import { useRef, useState } from 'react';
import { Crosshair, EyeOff, Hand, Radar, ShieldAlert } from 'lucide-react';
import { investigatorLegality } from '@dead-drop/engine';
import { useDD } from '@/lib/dd/store';
import { Button } from '@/components/ui/button';

const HOLD_MS = 700;

export default function ActionBar() {
  const view = useDD((s) => s.view);
  const selected = useDD((s) => s.selected);
  const mode = useDD((s) => s.mode);
  const setMode = useDD((s) => s.setMode);
  const probe = useDD((s) => s.probe);
  const stakeout = useDD((s) => s.stakeout);
  const endPhase = useDD((s) => s.endPhase);
  const aiThinking = useDD((s) => s.aiThinking);

  const [holdPct, setHoldPct] = useState(0);
  const holdTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  if (!view) return null;
  const leg = investigatorLegality(view, useDD.getState().session?.p);
  const myPhase = view.phase === 'INVESTIGATOR_ACTIONS';
  const intel = view.investigator.intel;
  const day = view.day;
  const totalDays = useDD.getState().session?.p.P1_days_per_case ?? 8;

  const startHold = () => {
    if (!leg.stakeout || !selected || !myPhase) return;
    if (holdTimer.current) return;
    const t0 = Date.now();
    holdTimer.current = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - t0) / HOLD_MS) * 100);
      setHoldPct(pct);
      if (pct >= 100) {
        cancelHold();
        stakeout(selected);
      }
    }, 33);
  };
  const cancelHold = () => {
    if (holdTimer.current) {
      clearInterval(holdTimer.current);
      holdTimer.current = null;
    }
    setHoldPct(0);
  };

  const chip = (m: typeof mode, label: string, icon: React.ReactNode) => (
    <button
      onClick={() => setMode(m)}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
        mode === m ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-300 bg-white text-neutral-700 hover:border-neutral-500'
      }`}
      aria-pressed={mode === m}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="rounded-xl border bg-white p-3 shadow-sm">
      {/* phase strip */}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
        <span className="whitespace-nowrap font-semibold">
          {aiThinking || view.phase === 'FUGITIVE_MOVE' ? (
            <span className="flex items-center gap-1.5 text-amber-700">
              <span className="inline-block h-2 w-2 animate-ping rounded-full bg-amber-500" />
              The Fugitive is moving…
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-emerald-700">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
              Your phase — Day {Math.min(day, totalDays)} step 6
            </span>
          )}
        </span>
        <span className="text-neutral-500">
          IP <b className="text-neutral-900">{intel}</b> · probes today {view.investigator.probes_today}/2 ·{' '}
          {view.investigator.stakeout_armed ? (
            <span className="font-semibold text-red-800">armed @ {view.investigator.stakeout_armed}</span>
          ) : (
            'no stakeout armed'
          )}
        </span>
      </div>

      {/* mode chips */}
      <div className="mb-2 flex flex-wrap gap-1.5">
        {chip('inspect', 'Inspect', <Hand className="h-3.5 w-3.5" />)}
        {chip('probe', 'Probe · 1 IP', <Radar className="h-3.5 w-3.5" />)}
        {chip('stakeout', 'Stakeout · 3 IP', <ShieldAlert className="h-3.5 w-3.5" />)}
      </div>

      {/* selected-node panel */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg bg-neutral-50 px-3 py-2 text-xs">
        <span className="font-mono text-sm font-bold">{selected ?? '—'}</span>
        {selected ? (
          mode === 'probe' ? (
            <Button
              size="sm"
              className="h-8 gap-1.5"
              disabled={!myPhase || !leg.probe}
              onClick={() => probe(selected)}
              title={leg.probe ? 'Ask: is their end position today this node?' : 'Probe cap reached or out of IP'}
            >
              <Radar className="h-3.5 w-3.5" /> Probe {selected}
            </Button>
          ) : mode === 'stakeout' ? (
            <button
              onPointerDown={startHold}
              onPointerUp={cancelHold}
              onPointerLeave={cancelHold}
              disabled={!myPhase || !leg.stakeout}
              className="relative h-8 overflow-hidden rounded-md bg-red-800 px-4 text-xs font-bold text-white disabled:opacity-40"
              aria-label="Hold to confirm stakeout"
            >
              <span
                className="absolute inset-y-0 left-0 bg-red-600"
                style={{ width: `${holdPct}%` }}
                aria-hidden
              />
              <span className="relative flex items-center gap-1.5">
                <Crosshair className="h-3.5 w-3.5" />
                {leg.stakeout ? 'Hold to arm stakeout' : day >= totalDays ? 'Forbidden on Day 8 (§9.3)' : 'Slot occupied / no IP'}
              </span>
            </button>
          ) : (
            <span className="text-neutral-500">Switch to Probe / Stakeout to act on this node.</span>
          )
        ) : (
          <span className="text-neutral-500">Tap a node on the map to target it.</span>
        )}
        <span className="ml-auto flex items-center gap-1 text-neutral-500">
          <EyeOff className="h-3.5 w-3.5" /> {mode === 'stakeout' ? 'The Fugitive will not be notified.' : 'Placements stay private.'}
        </span>
      </div>

      <Button
        className="mt-2 w-full"
        variant="outline"
        disabled={!myPhase}
        onClick={endPhase}
      >
        End phase — advance to Day {Math.min(day + 1, totalDays)}
      </Button>
    </div>
  );
}
