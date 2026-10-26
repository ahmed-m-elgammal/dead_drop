'use client';

/**
 * Dead Drop — home / case setup (M3 W2). Seed-reproducible solo case vs a
 * Fugitive archetype (05-ai-spec §3), the solo ladder, the tutorial, and the
 * case history — no account, no server: everything runs on-device.
 */
import { useState } from 'react';
import { BookOpen, Dices, GraduationCap, History, Map as MapIcon, Play, RotateCcw, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDD, type ArchetypeId } from '@/lib/dd/store';
import { ARCHETYPES } from '@/lib/dd/archetypes';
import { VERDICT_WINNER } from '@dead-drop/engine';
import HistoryDialog from '@/components/dd/HistoryDialog';

const ORDER: ArchetypeId[] = ['baseline', 'random', 'cautious', 'deceptive'];

function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}

export default function SetupScreen() {
  const startCase = useDD((s) => s.startCase);
  const resumeCase = useDD((s) => s.resumeCase);
  const resumable = useDD((s) => s.resumable);
  const goLadder = useDD((s) => s.goLadder);
  const startTutorial = useDD((s) => s.startTutorial);
  const tutorialDone = useDD((s) => s.tutorialDone);
  const [seedText, setSeedText] = useState(() => String(randomSeed()));
  const [archetype, setArchetype] = useState<ArchetypeId>('random');
  const [historyOpen, setHistoryOpen] = useState(false);

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
            Fugitive archetype — same seed, same case, same fugitive
          </label>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {ORDER.map((id) => {
              const a = ARCHETYPES[id];
              const on = archetype === id;
              return (
                <button
                  key={id}
                  onClick={() => setArchetype(id)}
                  aria-pressed={on}
                  className={`rounded-xl border p-2.5 text-left transition-colors ${
                    on ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 bg-white hover:border-neutral-400'
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-1">
                    <span className="text-sm font-black">{a.label}</span>
                    <span
                      className={`rounded px-1 text-[9px] font-bold uppercase tracking-wide ${
                        on ? 'bg-white/20 text-white/80' : 'bg-neutral-100 text-neutral-500'
                      }`}
                    >
                      {a.tier}
                    </span>
                  </div>
                  <p className={`mt-1 text-[10px] leading-snug ${on ? 'text-white/70' : 'text-neutral-500'}`}>
                    {a.tagline}
                  </p>
                </button>
              );
            })}
          </div>

          <label className="mt-4 block text-xs font-bold uppercase tracking-wider text-neutral-500" htmlFor="seed">
            Case seed
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

          <Button
            className="mt-4 h-11 w-full gap-2 text-base"
            disabled={!valid}
            onClick={() => startCase(seed, { archetype, source: 'solo' })}
          >
            <Play className="h-4 w-4" /> Open the case
          </Button>

          {resumable && (
            <Button className="mt-2 h-10 w-full gap-2" variant="outline" onClick={resumeCase}>
              <RotateCcw className="h-4 w-4" />
              {resumable.source === 'tutorial' ? 'Resume tutorial' : 'Resume case'} (seed {resumable.seed}
              {resumable.investigator.length > 0 ? `, ${resumable.investigator.length} actions in` : ''})
            </Button>
          )}
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <Button variant="outline" className="h-11 flex-col gap-0.5 text-xs" onClick={goLadder}>
            <Trophy className="h-4 w-4" /> Solo ladder
          </Button>
          <Button variant="outline" className="h-11 flex-col gap-0.5 text-xs" onClick={startTutorial}>
            <GraduationCap className="h-4 w-4" />
            {tutorialDone ? 'Tutorial again' : 'Learn (60s)'}
          </Button>
          <Button variant="outline" className="h-11 flex-col gap-0.5 text-xs" onClick={() => setHistoryOpen(true)}>
            <History className="h-4 w-4" /> History
          </Button>
        </div>

        <div className="mt-3 rounded-2xl border bg-white p-4 text-xs leading-relaxed text-neutral-600 shadow-sm">
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

        <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[10px] text-neutral-400">
          <BookOpen className="h-3 w-3" />
          The AI plays by the same information wall you do — it reads the public evidence, never your private log.
        </p>

        {resumable?.verdict && (
          <p className="mt-2 text-center text-xs text-neutral-400">
            Last case closed: {resumable.verdict} ({VERDICT_WINNER[resumable.verdict]}).
          </p>
        )}
      </div>

      {historyOpen && <HistoryDialog onClose={() => setHistoryOpen(false)} />}
    </div>
  );
}
