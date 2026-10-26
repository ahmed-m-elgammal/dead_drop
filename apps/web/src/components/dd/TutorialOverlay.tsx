'use client';

/**
 * Dead Drop — tutorial coach marks (M3 W2, 06-uiux §3 beats 1–3).
 *
 * Modal on welcome/replay beats; a top coach-bar on the interactive beats,
 * with the target node auto-selected (the map's selection ring IS the
 * spotlight — no cross-component SVG plumbing). The scripted outcomes are
 * fixed by lib/dd/tutorial.ts; the player cannot derail the script.
 */
import { useEffect, useState } from 'react';
import { GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDD } from '@/lib/dd/store';
import { TUTORIAL_STEPS, type TutorialBeat } from '@/lib/dd/tutorial';
import ReplayViewer, { type ReplayMeta } from '@/components/dd/ReplayViewer';

const COACH_BEATS: Set<TutorialBeat> = new Set(['tap-drop', 'probe-sh', 'stakeout-drop', 'end-phase']);

export default function TutorialOverlay() {
  const tutorial = useDD((s) => s.tutorial);
  const config = useDD((s) => s.config);
  const disclosure = useDD((s) => s.disclosure);
  const record = useDD((s) => s.record);
  const view = useDD((s) => s.view);
  const advanceTutorial = useDD((s) => s.advanceTutorial);
  const finishTutorial = useDD((s) => s.finishTutorial);
  const select = useDD((s) => s.select);
  const setMode = useDD((s) => s.setMode);
  const [replayOpen, setReplayOpen] = useState(false);

  const beat = tutorial?.beat ?? null;

  // Spotlight = auto-select the beat's target node + force the taught mode.
  useEffect(() => {
    if (!beat || !config) return;
    if (beat === 'probe-sh') {
      setMode('probe');
      select(config.safehouse);
    } else if (beat === 'stakeout-drop') {
      setMode('stakeout');
      select(config.drops[0]!);
    } else if (beat === 'tap-drop') {
      setMode('inspect');
    }
  }, [beat, config?.safehouse]);

  if (!beat || !config) return null;
  const step = TUTORIAL_STEPS[beat];

  if (beat === 'welcome') {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal>
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[3px] text-neutral-400">
            <GraduationCap className="h-3.5 w-3.5" /> Tutorial · 3 beats
          </div>
          <h2 className="mt-2 text-2xl font-black text-neutral-900">{step.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-neutral-600">{step.body}</p>
          <Button className="mt-4 h-11 w-full" onClick={advanceTutorial}>
            Begin the hunt
          </Button>
          <p className="mt-2 text-center text-[10px] text-neutral-400">
            Fixed script — you cannot lose this one. Deadlines: none here.
          </p>
        </div>
      </div>
    );
  }

  if (beat === 'replay') {
    const replayMeta: ReplayMeta | null =
      disclosure && record
        ? { seed: record.seed, archetype: record.archetype, stars: null, source: record.source }
        : null;
    return (
      <>
        {/* The beat modal yields while its replay overlay is open — a nested
            fixed layer can never out-rank this z-70 backdrop otherwise. */}
        {!replayOpen && (
          <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 p-4 sm:items-center" role="dialog" aria-modal>
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
              <div className="text-[10px] font-bold uppercase tracking-[3px] text-emerald-700">Beat 3 complete</div>
              <h2 className="mt-2 text-2xl font-black text-neutral-900">{step.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-neutral-600">{step.body}</p>
              <div className="mt-4 flex gap-2">
                {replayMeta && (
                  <Button className="h-11 flex-1" onClick={() => setReplayOpen(true)}>
                    Watch the replay
                  </Button>
                )}
                <Button className="h-11" variant="outline" onClick={finishTutorial}>
                  Finish
                </Button>
              </div>
            </div>
          </div>
        )}
        {replayOpen && replayMeta && disclosure && (
          <ReplayViewer
            config={config}
            disclosure={disclosure}
            meta={replayMeta}
            onClose={() => setReplayOpen(false)}
          />
        )}
      </>
    );
  }

  if (!COACH_BEATS.has(beat)) return null;
  const target =
    beat === 'probe-sh'
      ? `the safehouse (${config.safehouse})`
      : beat === 'stakeout-drop'
        ? `the first drop site (${config.drops[0]})`
        : beat === 'tap-drop'
          ? 'any drop site (squares)'
          : 'the End phase button';

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center p-3">
      <div className="pointer-events-auto w-full max-w-md rounded-xl border border-blue-900/20 bg-blue-950/95 px-4 py-3 text-white shadow-xl">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[2px] text-blue-200">
          <span>Tutorial · {beat === 'tap-drop' ? 'beat 1 of 3' : beat === 'probe-sh' ? 'beat 2 of 3' : beat === 'stakeout-drop' ? 'beat 3 of 3' : 'final step'}</span>
          <span>{view ? `Day ${view.day}` : ''} · IP {view?.investigator.intel ?? '—'}</span>
        </div>
        <div className="mt-1 text-sm font-black">{step.title}</div>
        <p className="mt-1 text-xs leading-relaxed text-blue-100">{step.body}</p>
        <p className="mt-1.5 text-[10px] font-bold uppercase tracking-wide text-blue-300">
          Target: {target}
        </p>
      </div>
    </div>
  );
}
