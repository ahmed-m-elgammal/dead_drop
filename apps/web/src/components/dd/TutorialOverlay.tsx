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
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/92 p-4" role="dialog" aria-modal>
        <div className="paper-card pin-note pin-pop w-full max-w-sm p-6">
          <div className="font-pixel text-[9px] tracking-[0.2em] text-[#8a7a58]">THE 60-SECOND BRIEF</div>
          <h2 className="mt-2 font-pixel text-sm leading-relaxed text-[#241d10]">{step.title}</h2>
          <p className="mt-3 font-type text-sm leading-relaxed text-[#33291a]">{step.body}</p>
          <button className="btn-pixel mt-5 h-11 w-full uppercase" onClick={advanceTutorial}>
            Begin the hunt
          </button>
          <p className="mt-2.5 text-center font-type text-[10px] text-[#8a7a58]">
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
          <div className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/92 p-4 sm:items-center" role="dialog" aria-modal>
            <div className="paper-card pin-note pin-pop w-full max-w-sm p-6">
              <div className="stamp border-[#3e6b4f] text-[#3e6b4f]" style={{ fontSize: '0.6rem' }}>beat 3 complete</div>
              <h2 className="mt-2.5 font-pixel text-sm leading-relaxed text-[#241d10]">{step.title}</h2>
              <p className="mt-3 font-type text-sm leading-relaxed text-[#33291a]">{step.body}</p>
              <div className="mt-4 flex gap-2">
                {replayMeta && (
                  <button className="btn-pixel h-11 flex-1 uppercase" onClick={() => setReplayOpen(true)}>
                    Watch the replay
                  </button>
                )}
                <button className="btn-pixel-ghost h-11 uppercase" onClick={finishTutorial}>
                  Finish
                </button>
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
      <div className="pointer-events-auto w-full max-w-md border border-amber/70 bg-[#1c1710]/97 px-4 py-3 shadow-[0_0_0_2px_#0b101b,4px_5px_0_rgba(4,8,16,.6)]">
        <div className="flex items-center justify-between font-term text-sm uppercase tracking-[0.14em] text-amber">
          <span>Brief · {beat === 'tap-drop' ? 'beat 1 of 3' : beat === 'probe-sh' ? 'beat 2 of 3' : beat === 'stakeout-drop' ? 'beat 3 of 3' : 'final step'}</span>
          <span>{view ? `Day ${view.day} · IP ${view.investigator.intel}` : ''}</span>
        </div>
        <div className="mt-1 font-pixel text-[10px] leading-relaxed text-paper">{step.title}</div>
        <p className="mt-1.5 font-type text-xs leading-relaxed text-[#d8cba8]">{step.body}</p>
        <p className="mt-1.5 font-term text-sm uppercase tracking-wide text-amber-2">
          ▸ target: {target}
        </p>
      </div>
    </div>
  );
}
