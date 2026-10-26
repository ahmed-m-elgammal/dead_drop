'use client';

/**
 * Dead Drop — solo ladder (M3 W2 logic, W4 skin): the CASE WALL.
 * 24 engine-built cases (C6 diversity constraints, one fixed seed for every
 * install) pinned to the precinct corkboard with a tier ramp: 1–8 Random
 * (teaching) · 9–16 Cautious (sharp) · 17–24 Deceptive (boss). Stars are
 * local (see ladder.ts); no accounts, no server. Tapping a card opens the
 * case with that slot's archetype.
 */
import { useMemo, useState } from 'react';
import { ArrowLeft, Lock, Star } from 'lucide-react';
import { useDD } from '@/lib/dd/store';
import { ARCHETYPES } from '@/lib/dd/archetypes';
import { LADDER_SIZE, ladderSlots, loadLadderProgress, type LadderSlot } from '@/lib/dd/ladder';

const TIER_INK: Record<string, string> = {
  Teaching: 'border-[#3e6b4f] text-[#3e6b4f]',
  Sharp: 'border-[#8a5f1c] text-[#8a5f1c]',
  Boss: 'border-[#7a2d2d] text-[#7a2d2d]',
};

function Stars({ n }: { n: number }) {
  return (
    <span className="flex gap-0.5" aria-label={`${n} of 3 stars`}>
      {[1, 2, 3].map((i) => (
        <Star
          key={i}
          className={`h-3 w-3 ${i <= n ? 'fill-[#c9962e] text-[#c9962e]' : 'text-[#b3a37f]'}`}
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
    <div className="cork min-h-screen px-4 py-8">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-5 flex items-center justify-between">
          <button onClick={goSetup} className="btn-pixel-ghost flex items-center gap-1.5 px-3 py-2 uppercase">
            <ArrowLeft className="h-4 w-4" /> desk
          </button>
          <div className="text-right">
            <div className="font-pixel text-[9px] tracking-[0.2em] text-amber">THE CASE WALL</div>
            <div className="font-term text-xl leading-tight text-paper">
              {done}<span className="text-fog-2">/{LADDER_SIZE} closed</span>{' '}
              <span className="text-[#f4c86a]">· {stars}★</span>
            </div>
          </div>
        </div>

        <div className="paper-card tilt-l pin-note relative mb-5 p-3.5">
          <p className="font-type text-[11.5px] leading-relaxed text-[#33291a]">
            One fixed set of 24 files for every precinct — built by the engine&apos;s
            diversity-constrained generator. The ramp: <b className="text-[#3e6b4f]">Random</b> couriers
            teach the map&apos;s texture, <b className="text-[#8a5f1c]">Cautious</b> ones play
            disciplined, <b className="text-[#7a2d2d]">Deceptive</b> ones double back and bait your
            stakeouts. Close them in order, detective.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {slots.map((s, i) => {
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
                className={`paper-card pin-note pin-pop relative p-2.5 text-left transition-transform hover:-translate-y-1 hover:rotate-0 ${
                  i % 3 === 1 ? 'tilt-r' : i % 3 === 2 ? 'tilt-l' : ''
                } ${r ? 'opacity-80' : ''}`}
                aria-label={`Case ${s.index + 1}, ${meta.label} fugitive${r ? `, closed ${r.verdict}, ${r.stars} stars` : ''}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-[#8a7a58]">№{s.index + 1}</span>
                  {r ? <Stars n={r.stars} /> : <Lock className="h-3 w-3 text-[#b3a37f]" />}
                </div>
                <div className="mt-1.5 font-pixel text-[8.5px] leading-relaxed text-[#241d10]">
                  {meta.label.toUpperCase()}
                </div>
                <div className={`mt-1.5 inline-block border-2 px-1 font-term text-[11px] uppercase tracking-wide ${TIER_INK[s.tier] ?? 'border-[#b3a37f] text-[#8a7a58]'}`}>
                  {s.tier}
                </div>
                <div className="mt-1.5 font-mono text-[9px] text-[#8a7a58]">seed {s.seed}</div>
                {r && (
                  <div className="stamp mt-1 border-[#3e6b4f] text-[#3e6b4f]" style={{ fontSize: '0.5rem', padding: '0.05em 0.3em' }}>
                    {r.verdict}
                  </div>
                )}
                {isNext && <div className="absolute -right-1 -top-1 h-3 w-3 rotate-45 bg-amber shadow-[0_0_8px_rgba(232,163,61,.8)]" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
