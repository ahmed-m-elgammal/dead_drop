'use client';

/**
 * Dead Drop — home / case setup (M3 W3). Seed-reproducible solo case, both
 * roles (W3): Investigator vs a Fugitive archetype (05-ai-spec §3), or
 * Fugitive vs the I-GreedyProbe baseline (05-ai-spec §2). Plus the solo
 * ladder, the tutorial (investigator role), the case history, and the
 * Stage-3 skill profile (§4) — no account, no server: everything on-device.
 */
import { useState } from 'react';
import { BookOpen, Dices, GraduationCap, History, Map as MapIcon, Play, RotateCcw, Trophy, User, VenetianMask } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDD, type ArchetypeId } from '@/lib/dd/store';
import { ARCHETYPES } from '@/lib/dd/archetypes';
import { VERDICT_WINNER } from '@dead-drop/engine';
import HistoryDialog from '@/components/dd/HistoryDialog';
import SkillDialog from '@/components/dd/SkillDialog';
import type { PlayerRole } from '@/lib/dd/history';

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
  const [role, setRole] = useState<PlayerRole>('investigator');
  const [seedText, setSeedText] = useState(() => String(randomSeed()));
  const [archetype, setArchetype] = useState<ArchetypeId>('random');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [skillOpen, setSkillOpen] = useState(false);

  const seed = Number.parseInt(seedText, 10);
  const valid = Number.isInteger(seed) && seed >= 0;

  // The resume offer is role-tagged: it renders only for the role it was
  // opened with (switching roles hides it — a case identity includes the role).
  const resumableForRole = resumable && resumable.role === role ? resumable : null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f6f5f1] px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="text-[11px] font-bold uppercase tracking-[4px] text-neutral-400">A hidden-movement duel</div>
          <h1 className="mt-1 text-4xl font-black tracking-tight text-neutral-900">DEAD DROP</h1>
          <p className="mt-3 text-sm leading-relaxed text-neutral-600">
            48 locations, two drops in order, one exit gate. One of you moves in secret; the other
            reads the evidence the rules publish. {role === 'investigator' ? 'You hunt.' : 'You vanish.'}
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          {/* role picker */}
          <label className="text-xs font-bold uppercase tracking-wider text-neutral-500">Your role this case</label>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <button
              onClick={() => setRole('investigator')}
              aria-pressed={role === 'investigator'}
              className={`flex items-center gap-2 rounded-xl border p-2.5 text-left transition-colors ${
                role === 'investigator' ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 bg-white hover:border-neutral-400'
              }`}
            >
              <User className="h-4 w-4 shrink-0" />
              <span>
                <span className="block text-sm font-black">Investigator</span>
                <span className={`block text-[10px] ${role === 'investigator' ? 'text-white/70' : 'text-neutral-500'}`}>
                  Read the trail. Probe. Stake out.
                </span>
              </span>
            </button>
            <button
              onClick={() => setRole('fugitive')}
              aria-pressed={role === 'fugitive'}
              className={`flex items-center gap-2 rounded-xl border p-2.5 text-left transition-colors ${
                role === 'fugitive' ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 bg-white hover:border-neutral-400'
              }`}
            >
              <VenetianMask className="h-4 w-4 shrink-0" />
              <span>
                <span className="block text-sm font-black">Fugitive</span>
                <span className={`block text-[10px] ${role === 'fugitive' ? 'text-white/70' : 'text-neutral-500'}`}>
                  Move in secret. Dodge the net.
                </span>
              </span>
            </button>
          </div>

          {role === 'investigator' ? (
            <>
              <label className="mt-4 block text-xs font-bold uppercase tracking-wider text-neutral-500" htmlFor="archetype">
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
            </>
          ) : (
            <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 p-3">
              <div className="text-xs font-bold uppercase tracking-wider text-neutral-500">Your opponent — I-GreedyProbe</div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-neutral-600">
                The Stage-1 Investigator baseline (05-ai-spec §2): tracks an exact belief map from the
                public evidence, probes its most likely node, and stakes out only when convinced —
                aiming where you&apos;ll BE, not where you are. It plays behind the same information
                wall you do; it never sees your route.
              </p>
            </div>
          )}

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
            onClick={() => startCase(seed, role === 'investigator' ? { archetype, source: 'solo' } : { role, source: 'solo' })}
          >
            <Play className="h-4 w-4" /> Open the case
          </Button>

          {resumableForRole && (
            <Button className="mt-2 h-10 w-full gap-2" variant="outline" onClick={resumeCase}>
              <RotateCcw className="h-4 w-4" />
              {resumableForRole.source === 'tutorial' ? 'Resume tutorial' : 'Resume case'} (seed {resumableForRole.seed}
              , {resumableForRole.investigator.length + resumableForRole.fugitive.length} moves in)
            </Button>
          )}
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <Button variant="outline" className="h-11 flex-col gap-0.5 text-xs" onClick={goLadder}>
            <Trophy className="h-4 w-4" /> Solo ladder
          </Button>
          <Button variant="outline" className="h-11 flex-col gap-0.5 text-xs" onClick={startTutorial} disabled={role === 'fugitive'}>
            <GraduationCap className="h-4 w-4" />
            {tutorialDone ? 'Tutorial again' : 'Learn (60s)'}
          </Button>
          <Button variant="outline" className="h-11 flex-col gap-0.5 text-xs" onClick={() => setHistoryOpen(true)}>
            <History className="h-4 w-4" /> History
          </Button>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2">
          <Button variant="outline" className="h-11 flex-col gap-0.5 text-xs" onClick={() => setSkillOpen(true)}>
            <BookOpen className="h-4 w-4" /> Skill profile — rolling last 10 cases per role
          </Button>
        </div>

        <div className="mt-3 rounded-2xl border bg-white p-4 text-xs leading-relaxed text-neutral-600 shadow-sm">
          <div className="mb-1.5 flex items-center gap-1.5 font-bold text-neutral-800">
            <MapIcon className="h-3.5 w-3.5" /> The 60-second rules — {role === 'investigator' ? 'hunting' : 'running'}
          </div>
          {role === 'investigator' ? (
            <>
              8 days. They move in secret (Foot 1 SP · Tram 2 · Metro 3, one edge per day). Your phase: up to 2{' '}
              <b>probes</b> (1 IP — &quot;were you here today?&quot;) and 1 <b>stakeout</b> (3 IP — catches them
              tomorrow if they end that day on your node, silently miss otherwise). Public evidence: their{' '}
              <b>district</b> at the end of Days 3 &amp; 6, their <b>transit class</b> on Day 4, drop completions.
              They win by reaching the gate with both drops; you win by capture or by Day 8 expiry.
            </>
          ) : (
            <>
              8 days. You move in secret (Foot 1 SP · Tram 2 · Metro 3, one edge per day — or Hold 1 SP, ≤2
              per case, collects a pending drop). The Investigator probes and stakes out; <b>stakeouts are
              silent</b> — you learn you were caught only when you are. The rules publish <b>your district</b>{' '}
              after Days 3 &amp; 6 and your <b>transit class</b> after Day 4 — plan around the leak calendar.
              Reach the gate with both drops before Day 8 ends.
            </>
          )}{' '}
          Full rules: <span className="font-mono text-[10px]">ruleset 1.0.0-alpha.1</span>.
        </div>

        <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[10px] text-neutral-400">
          <BookOpen className="h-3 w-3" />
          The AI plays by the same information wall you do — public evidence only, never your private log.
        </p>

        {resumableForRole?.verdict && (
          <p className="mt-2 text-center text-xs text-neutral-400">
            Last case closed: {resumableForRole.verdict} ({VERDICT_WINNER[resumableForRole.verdict]}).
          </p>
        )}
      </div>

      {historyOpen && <HistoryDialog onClose={() => setHistoryOpen(false)} />}
      {skillOpen && <SkillDialog onClose={() => setSkillOpen(false)} />}
    </div>
  );
}
