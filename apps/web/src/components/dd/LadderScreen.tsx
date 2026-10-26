'use client';

/**
 * Dead Drop — solo ladder (M3 W2, 06-uiux S7).
 *
 * 24 engine-built cases (C6 diversity constraints, one fixed seed for every
 * install) with a tier ramp: 1–8 Random (teaching) · 9–16 Cautious (sharp) ·
 * 17–24 Deceptive (boss). Stars are local (see ladder.ts); no accounts, no
 * server. Tapping a slot opens the case with that slot's archetype.
 */
import { useMemo, useState } from 'react';
import { ArrowLeft, Lock, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDD } from '@/lib/dd/store';
import { ARCHETYPES } from '@/lib/dd/archetypes';
import { LADDER_SIZE, ladderSlots, loadLadderProgress, type LadderSlot } from '@/lib/dd/ladder';

const TIER_STYLES: Record<string, string> = {
  Teaching: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Sharp: 'bg-amber-100 text-amber-800 border-amber-200',
  Boss: 'bg-red-100 text-red-800 border-red-200',
};

function Stars({ n }: { n: number }) {
  return (
    <span className="flex gap-0.5" aria-label={`${n} of 3 stars`}>
      {[1, 2, 3].map((i) => (
        <Star
          key={i}
          className={`h-3 w-3 ${i <= n ? 'fill-amber-400 text-amber-500' : 'text-neutral-300'}`}
        />
      ))}
    </span>
  );
}

export default function LadderScreen() {
  const goSetup = useDD((s) => s.goSetup);
  const startLadderCase = useDD((s) => s.startLadderCase);
  const slots = useMemo<LadderSlot[]>(() => ladderSlots(), []);
  const [progressVersion, setProgressVersion] = useState(0);

  const progress = useMemo(() => {
    void progressVersion;
    return loadLadderProgress();
  }, [progressVersion]);

  const done = Object.keys(progress.results).length;
  const stars = Object.values(progress.results).reduce((a, r) => a + (r?.stars ?? 0), 0);
  const nextIndex = slots.findIndex((s) => !progress.results[s.index]);

  return (
    <div className="min-h-screen bg-[#f6f5f1] px-4 py-8">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-5 flex items-center justify-between">
          <Button variant="ghost" className="gap-1.5" onClick={goSetup}>
            <ArrowLeft className="h-4 w-4" /> Home
          </Button>
          <div className="text-right">
            <div className="text-[10px] font-bold uppercase tracking-[3px] text-neutral-400">Solo ladder</div>
            <div className="text-lg font-black leading-tight">
              {done}<span className="text-neutral-400">/{LADDER_SIZE} closed</span>{' '}
              <span className="text-sm font-bold text-amber-600">· {stars}★</span>
            </div>
          </div>
        </div>

        <p className="mb-4 text-xs leading-relaxed text-neutral-500">
          One fixed set of 24 cases for every install — built by the engine’s diversity-constrained
          generator. Difficulty ramps: <b className="text-emerald-700">Random</b> teaches the map’s
          texture, <b className="text-amber-700">Cautious</b> plays disciplined,{' '}
          <b className="text-red-700">Deceptive</b> doubles back and baits your stakeouts.
        </p>

        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {slots.map((s) => {
            const r = progress.results[s.index];
            const isNext = s.index === nextIndex;
            const meta = ARCHETYPES[s.archetype];
            return (
              <button
                key={s.index}
                onClick={() => {
                  startLadderCase(s.index);
                  setProgressVersion((v) => v + 1);
                }}
                className={`rounded-xl border bg-white p-3 text-left shadow-sm transition-colors hover:border-neutral-900 ${
                  isNext ? 'ring-2 ring-neutral-900' : ''
                }`}
                aria-label={`Case ${s.index + 1}, ${meta.label} fugitive${r ? `, closed ${r.verdict}, ${r.stars} stars` : ''}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-neutral-400">#{s.index + 1}</span>
                  {r ? <Stars n={r.stars} /> : <Lock className="h-3 w-3 text-neutral-200" />}
                </div>
                <div className="mt-1.5 text-sm font-black leading-tight">{meta.label}</div>
                <div
                  className={`mt-1 inline-block rounded border px-1 text-[9px] font-bold uppercase tracking-wide ${TIER_STYLES[s.tier] ?? 'border-neutral-200 bg-neutral-50 text-neutral-500'}`}
                >
                  {s.tier}
                </div>
                <div className="mt-1.5 font-mono text-[9px] text-neutral-400">seed {s.seed}</div>
                {r && <div className="mt-1 text-[9px] font-bold uppercase text-neutral-500">{r.verdict}</div>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
