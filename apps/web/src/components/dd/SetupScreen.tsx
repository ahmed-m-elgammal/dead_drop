'use client';

/**
 * Dead Drop — case setup (M3 W1). Seed-reproducible solo case vs the Stage-1
 * baseline Fugitive AI (05-ai-spec §2). No account, no server: the engine
 * runs on-device and the case persists locally as (seed + journal).
 */
import { useState } from 'react';
import { Dices, Map as MapIcon, Play, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDD } from '@/lib/dd/store';
import { VERDICT_WINNER } from '@dead-drop/engine';

function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}

export default function SetupScreen() {
  const startCase = useDD((s) => s.startCase);
  const resumeCase = useDD((s) => s.resumeCase);
  const resumable = useDD((s) => s.resumable);
  const [seedText, setSeedText] = useState(() => String(randomSeed()));

  const seed = Number.parseInt(seedText, 10);
  const valid = Number.isInteger(seed) && seed >= 0;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f6f5f1] px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="text-[11px] font-bold uppercase tracking-[4px] text-neutral-400">A hidden-movement duel</div>
          <h1 className="mt-1 text-4xl font-black tracking-tight text-neutral-900">DEAD DROP</h1>
          <p className="mt-3 text-sm leading-relaxed text-neutral-600">
            You are the <b>Investigator</b>. A Fugitive is moving through 48 locations, collecting two drops
            in order, racing for the exit gate. You never see them — only the evidence the rules hand you.
            Be one step ahead of where they are.
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <label className="text-xs font-bold uppercase tracking-wider text-neutral-500" htmlFor="seed">
            Case seed — same seed, same case, same fugitive
          </label>
          <div className="mt-2 flex gap-2">
            <Input
              id="seed"
              value={seedText}
              onChange={(e) => setSeedText(e.target.value.replace(/[^0-9]/g, ''))}
              inputMode="numeric"
              className="font-mono"
              aria-label="Case seed"
            />
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 shrink-0"
              onClick={() => setSeedText(String(randomSeed()))}
              aria-label="Random seed"
            >
              <Dices className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-3 rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
            <b>Fugitive AI:</b> Stage-1 baseline (F-Planner) — deterministic, readable, plays by the same
            information wall you do. Archetypes (Cautious / Deceptive) arrive later in M3.
          </div>

          <Button className="mt-4 h-11 w-full gap-2 text-base" disabled={!valid} onClick={() => startCase(seed)}>
            <Play className="h-4 w-4" /> Open the case
          </Button>

          {resumable && (
            <Button className="mt-2 h-10 w-full gap-2" variant="outline" onClick={resumeCase}>
              <RotateCcw className="h-4 w-4" />
              Resume case (seed {resumable.seed}
              {resumable.investigator.length > 0 ? `, ${resumable.investigator.length} actions in` : ''})
            </Button>
          )}
        </div>

        <div className="mt-4 rounded-2xl border bg-white p-4 text-xs leading-relaxed text-neutral-600 shadow-sm">
          <div className="mb-1.5 flex items-center gap-1.5 font-bold text-neutral-800">
            <MapIcon className="h-3.5 w-3.5" /> The 60-second rules
          </div>
          8 days. They move in secret (Foot 1 SP · Tram 2 · Metro 3, one edge per day). Your phase: up to 2{' '}
          <b>probes</b> (1 IP — &quot;were you here today?&quot;) and 1 <b>stakeout</b> (3 IP — catches them
          tomorrow if they end that day on your node, silently miss otherwise). Public evidence: their{' '}
          <b>district</b> at the end of Days 3 &amp; 6, their <b>transit class</b> on Day 4, drop completions.
          They win by reaching the gate with both drops; you win by capture or by Day 8 expiry. Full rules:{' '}
          <span className="font-mono text-[10px]">ruleset 1.0.0-alpha.1</span>.
        </div>

        {resumable?.verdict && (
          <p className="mt-3 text-center text-xs text-neutral-400">
            Last case closed: {resumable.verdict} ({VERDICT_WINNER[resumable.verdict]}).
          </p>
        )}
      </div>
    </div>
  );
}
