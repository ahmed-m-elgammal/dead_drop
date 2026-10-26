'use client';

/**
 * Dead Drop — Investigator action bar (M3 W1 logic, W4 noir skin).
 *
 * One decision at a time, bottom-docked, one-handed reach: mode chips →
 * target comes from the selected map node → Probe commits instantly (1 IP),
 * Stakeout requires hold-to-confirm (irreversible 3 IP, with the §5.2 line),
 * End phase advances the clock (the AI Fugitive then moves).
 */
import { useRef, useState } from 'react';
import { Crosshair, EyeOff, Hand, MoveRight, Radar, ShieldAlert } from 'lucide-react';
import { investigatorLegality } from '@dead-drop/engine';
import { useDD } from '@/lib/dd/store';

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
      data-on={mode === m}
      className={`chip-pixel flex items-center gap-1.5 px-3 py-1.5 ${
        mode === m ? '' : ''
      }`}
      aria-pressed={mode === m}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="pixel-frame relative p-3">
      {/* turn indicator — status (day/IP/probes/armed) lives in CaseHeader,
          so this strip stays a pure whose-turn signal */}
      <div className="mb-2 flex items-center">
        {aiThinking || view.phase === 'FUGITIVE_MOVE' ? (
          <span className="flex items-center gap-1.5 font-term text-lg leading-none text-amber-2">
            <span className="inline-block h-2 w-2 animate-ping rounded-full bg-amber-2" />
            THE FUGITIVE IS MOVING…
          </span>
        ) : (
          <span className="flex items-center gap-1.5 font-term text-lg leading-none text-mint">
            <span className="inline-block h-2 w-2 rounded-full bg-mint" />
            YOUR PHASE
          </span>
        )}
      </div>
      {aiThinking && <div className="thinking-strip absolute inset-x-0 top-0 h-1" aria-hidden />}

      {/* mode chips */}
      <div className="mb-2 flex flex-wrap gap-1.5">
        {chip('inspect', 'Inspect', <Hand className="h-3.5 w-3.5" />)}
        {chip('probe', 'Probe · 1 IP', <Radar className="h-3.5 w-3.5" />)}
        {chip('stakeout', 'Stakeout · 3 IP', <ShieldAlert className="h-3.5 w-3.5" />)}
      </div>

      {/* selected-node panel */}
      <div className="flex flex-wrap items-center gap-2 border border-line bg-ink-2 px-3 py-2">
        <span className="font-term text-xl tracking-wide text-amber-2">{selected ?? '—'}</span>
        {selected ? (
          mode === 'probe' ? (
            <button
              className="btn-pixel h-8 px-4 text-base"
              disabled={!myPhase || !leg.probe}
              onClick={() => probe(selected)}
              title={leg.probe ? 'Ask: is their end position today this node?' : 'Probe cap reached or out of IP'}
            >
              <span className="flex items-center gap-1.5">
                <Radar className="h-3.5 w-3.5" /> Probe {selected}
              </span>
            </button>
          ) : mode === 'stakeout' ? (
            <button
              onPointerDown={startHold}
              onPointerUp={cancelHold}
              onPointerLeave={cancelHold}
              disabled={!myPhase || !leg.stakeout}
              className="relative h-8 overflow-hidden px-4 font-term text-base uppercase tracking-wide text-paper disabled:opacity-40"
              style={{
                background: '#5e1f1f',
                boxShadow: 'inset 0 0 0 1px #e05252, 0 3px 0 0 #200a0a, 0 3px 0 2px #0b101b',
              }}
              aria-label="Hold to confirm stakeout"
            >
              <span
                className="absolute inset-y-0 left-0 bg-blood-2"
                style={{ width: `${holdPct}%` }}
                aria-hidden
              />
              <span className="relative flex items-center gap-1.5">
                <Crosshair className="h-3.5 w-3.5" />
                {leg.stakeout ? 'Hold to arm stakeout' : day >= totalDays ? 'Forbidden on Day 8 (§9.3)' : 'Slot occupied / no IP'}
              </span>
            </button>
          ) : (
            <span className="font-type text-xs text-fog">Switch to Probe / Stakeout to act on this node.</span>
          )
        ) : (
          <span className="font-type text-xs text-fog">Tap a node on the map to target it.</span>
        )}
        <span className="ml-auto flex items-center gap-1 font-type text-[11px] text-fog-2">
          <EyeOff className="h-3.5 w-3.5" /> {mode === 'stakeout' ? 'The Fugitive will not be notified.' : 'Placements stay private.'}
        </span>
      </div>

      <button
        className="btn-pixel-ghost mt-2 flex w-full items-center justify-between gap-2 px-3 py-2.5 uppercase"
        disabled={!myPhase}
        onClick={endPhase}
      >
        <span className="text-[15px] leading-none">End phase — advance to Day {Math.min(day + 1, totalDays)}</span>
        <MoveRight className="h-4 w-4 shrink-0" aria-hidden />
      </button>
    </div>
  );
}
