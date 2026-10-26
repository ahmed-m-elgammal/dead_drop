'use client';

/**
 * Dead Drop — case briefing dossier (M3 W4 art pass).
 * Opens like a manila folder the first time a case (seed + role + start
 * time) appears this session; resume never re-triggers it. Every fact on
 * the folder is PUBLIC config (drops / gate / safehouse / reveal calendar)
 * — no information-wall breach (§1.3). Purely presentational.
 */
import { useCallback, useEffect, useState } from 'react';
import Typed from '@/components/dd/Typed';
import type { CaseConfig } from '@dead-drop/engine';
import type { PlayerRole } from '@/lib/dd/history';

interface Props {
  config: CaseConfig;
  role: PlayerRole;
  /** unique per case-open — the trigger key */
  openKey: string;
  onClose: () => void;
}

const DISTRICT_NAMES: Record<string, string> = {
  D1: 'Harbor',
  D2: 'Old Town',
  D3: 'Market',
  D4: 'Rail Yard',
};

function caseNo(seed: number): string {
  return String(seed % 100000).padStart(5, '0');
}

export default function CaseBriefing({ config, role, openKey, onClose }: Props) {
  const [phase, setPhase] = useState<'typing' | 'ready'>('typing');

  const close = useCallback(() => {
    if (phase !== 'ready') {
      setPhase('ready'); // first click completes the typing, second closes
      return;
    }
    onClose();
  }, [phase, onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  const district = DISTRICT_NAMES[(config.safehouse || 'D1').slice(0, 2)] ?? 'the old quarter';
  const isF = role === 'fugitive';

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-ink/85 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal
      aria-label="Case briefing"
    >
      <div className="fade-up relative w-full max-w-xl">
        {/* folder tab */}
        <div className="ml-6 inline-block -mb-[1px] rounded-t-sm bg-paper-2 px-4 py-1.5 font-type text-xs tracking-[0.18em] text-[#241d10] shadow-[0_0_0_1px_rgba(20,16,5,.35)]">
          CASE FILE №{caseNo(config.seed)}
        </div>

        <div className="paper-card relative px-5 py-6 sm:px-8" onClick={close}>
          {/* stamps */}
          <div className="pointer-events-none absolute right-4 top-4 select-none">
            <span className="stamp stamp-in border-blood text-blood" style={{ fontSize: '0.72rem' }}>
              confidential
            </span>
          </div>
          <div className="font-type text-[10px] uppercase tracking-[0.28em] text-[#6b5b3e]">
            Bureau of Public Safety — Night Division
          </div>
          <div className="mt-1 font-pixel text-sm leading-relaxed text-[#241d10] sm:text-base">
            {isF ? 'YOU ARE THE COURIER' : 'THE COURIER IS MOVING'}
          </div>

          {/* photo strip */}
          <div className="mt-4 flex items-center gap-4">
            <div className="relative shrink-0 border-[6px] border-[#f4efe4] bg-[#f4efe4] shadow-md tilt-l">
              <img
                src={isF ? '/art/portrait-courier.png' : '/art/lineup.png'}
                alt={isF ? 'Your dossier photo — a hooded courier' : 'Suspect lineup — the Courier pool'}
                className="art block h-20 w-20 object-cover sm:h-24 sm:w-32"
              />
              <div className="mt-1 text-center font-type text-[9px] uppercase tracking-widest text-[#6b5b3e]">
                {isF ? 'subject: you' : 'known associates'}
              </div>
            </div>
            <p className="min-h-[8.5rem] font-type text-[13px] leading-relaxed text-[#33291a] sm:text-sm">
              {phase === 'typing' ? (
                <Typed
                  speed={11}
                  text={
                    isF
                      ? `Your route begins at the safehouse in ${district} — node ${config.safehouse}. Collect drop one at ${config.drops[0]}, then drop two at ${config.drops[1]}, in that order, and walk out of the gate — ${config.gate} — before Day 8 ends. Twelve sparks of stamina. Foot is cheap, Metro is fast, and a Hold can catch its breath and collect.`
                      : `The route begins at a safehouse in ${district} — node ${config.safehouse}. Two dead drops will be served in order: ${config.drops[0]}, then ${config.drops[1]}. The exit is the gate at ${config.gate}. You have 10 IP over 8 days — probes cost 1, stakeouts cost 3 and stay silent. The paper publishes their district after Days 3 and 6, their transit class after Day 4. Read it. All of it.`
                  }
                  onDone={() => setPhase('ready')}
                />
              ) : (
                <span className="opacity-95">
                  {isF
                    ? `Your route begins at the safehouse in ${district} — node ${config.safehouse}. Collect drop one at ${config.drops[0]}, then drop two at ${config.drops[1]}, in that order, and walk out of the gate — ${config.gate} — before Day 8 ends. Twelve sparks of stamina. Foot is cheap, Metro is fast, and a Hold can catch its breath and collect.`
                    : `The route begins at a safehouse in ${district} — node ${config.safehouse}. Two dead drops will be served in order: ${config.drops[0]}, then ${config.drops[1]}. The exit is the gate at ${config.gate}. You have 10 IP over 8 days — probes cost 1, stakeouts cost 3 and stay silent. The paper publishes their district after Days 3 and 6, their transit class after Day 4. Read it. All of it.`}
                </span>
              )}
            </p>
          </div>

          <div className="mt-3 border-t border-dashed border-[#b3a37f] pt-3 font-type text-[11px] italic text-[#6b5b3e]">
            {isF
              ? 'Stakeouts you will never see are possible (§5.2). Stay off the paper. — a friend'
              : 'Trust the paper. Nothing else. — Capt. R. Vaszary, 3rd Precinct'}
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              close();
            }}
            className="btn-pixel mt-5 w-full py-3 uppercase"
          >
            {isF ? 'Pocket the map' : 'Open the file'}
          </button>
        </div>
      </div>
    </div>
  );
}
