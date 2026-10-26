'use client';

/**
 * Dead Drop — THE BUREAU (home / case setup, M3 W4 art pass).
 * Same store contract as W3 (role + archetype/seed + ladder + tutorial +
 * history + skill profile) — the skin is now a detective's desk at night:
 * badge cards, mugshot dossiers, a case-number terminal, and paper notes.
 */
import { useState } from 'react';
import { Archive, Dices, GraduationCap, RotateCcw, Trophy } from 'lucide-react';
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
    <div className="flex min-h-screen flex-col items-center px-4 pb-14 pt-8">
      <div className="w-full max-w-lg">
        {/* ===== title — the neon sign over the desk ===== */}
        <div className="pixel-frame relative mb-6 overflow-hidden">
          <img
            src="/art/title-city.png"
            alt="The city at night — rain, clock tower, amber windows"
            className="art h-36 w-full object-cover sm:h-44"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-4 text-center">
            <div className="font-pixel neon text-xl text-amber sm:text-3xl">DEAD DROP</div>
            <div className="mt-2 font-type text-[11px] tracking-[0.3em] text-paper/80 sm:text-xs">
              A NOIR MANHUNT IN EIGHT DAYS
            </div>
          </div>
        </div>

        {/* ===== role — pick your badge ===== */}
        <div className="pixel-frame mb-4 p-4">
          <div className="mb-3 font-term text-lg uppercase tracking-[0.18em] text-fog">
            {'// pick your side'}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setRole('investigator')}
              aria-pressed={role === 'investigator'}
              className={`pixel-frame group relative overflow-hidden p-0 text-left transition-transform hover:-translate-y-0.5 ${
                role === 'investigator' ? 'pixel-frame-amber' : ''
              }`}
            >
              <img
                src="/art/portrait-detective.png"
                alt="The Investigator — trench coat, fedora, tired eyes"
                className="art h-24 w-full object-cover object-top opacity-90 sm:h-28"
              />
              <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-t from-panel via-transparent to-transparent sm:h-28" />
              <div className="relative p-2.5">
                <div className="flex items-center justify-between gap-1">
                  <div className={`font-pixel text-[10px] ${role === 'investigator' ? 'text-amber' : 'text-paper'}`}>
                    INVESTIGATOR
                  </div>
                  {role === 'investigator' && (
                    <span className="stamp shrink-0 border-mint text-mint" style={{ fontSize: '0.55rem', padding: '0.05em 0.4em' }}>
                      on duty
                    </span>
                  )}
                </div>
                <div className="mt-1 font-type text-[11px] leading-snug text-fog">
                  Read the trail. Probe the dark. Stake out the gate.
                </div>
              </div>
            </button>

            <button
              onClick={() => setRole('fugitive')}
              aria-pressed={role === 'fugitive'}
              className={`pixel-frame group relative overflow-hidden p-0 text-left transition-transform hover:-translate-y-0.5 ${
                role === 'fugitive' ? 'pixel-frame-amber' : ''
              }`}
            >
              <img
                src="/art/portrait-courier.png"
                alt="The Courier — hood up, face in shadow"
                className="art h-24 w-full object-cover object-top opacity-90 sm:h-28"
              />
              <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-t from-panel via-transparent to-transparent sm:h-28" />
              <div className="relative p-2.5">
                <div className="flex items-center justify-between gap-1">
                  <div className={`font-pixel text-[10px] ${role === 'fugitive' ? 'text-amber' : 'text-paper'}`}>
                    FUGITIVE
                  </div>
                  {role === 'fugitive' && (
                    <span className="stamp shrink-0 border-blood-2 text-blood-2" style={{ fontSize: '0.55rem', padding: '0.05em 0.4em' }}>
                      wanted
                    </span>
                  )}
                </div>
                <div className="mt-1 font-type text-[11px] leading-snug text-fog">
                  Move in secret. Dodge the net. Vanish by Day 8.
                </div>
              </div>
            </button>
          </div>

          {role === 'investigator' ? (
            <>
              <div className="mb-2 mt-4 flex items-baseline justify-between">
                <span className="font-term text-lg uppercase tracking-[0.18em] text-fog">
                  {'// known associates'}
                </span>
                <span className="font-type text-[10px] text-fog-2">same seed — same courier</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {ORDER.map((id) => {
                  const a = ARCHETYPES[id];
                  const on = archetype === id;
                  return (
                    <button
                      key={id}
                      onClick={() => setArchetype(id)}
                      aria-pressed={on}
                      className={`paper-card p-2.5 text-left transition-transform hover:-translate-y-0.5 ${on ? 'tilt-r' : 'opacity-85'}`}
                    >
                      <div className="flex items-start gap-2">
                        {/* mugshot — same dossier table the precinct keeps */}
                        <img
                          src={`/art/mugshot-${id}.png`}
                          alt={`${a.label} mugshot`}
                          className={`art h-12 w-12 shrink-0 border-2 border-[#241d10]/70 object-cover ${on ? '' : 'grayscale-[35%]'}`}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-1">
                            <span className="font-pixel text-[9px] text-[#241d10]">{a.label.toUpperCase()}</span>
                            <span className="stamp shrink-0 border-[#7a2d2d] text-[#7a2d2d]" style={{ fontSize: '0.5rem', padding: '0.05em 0.35em' }}>
                              {a.tier}
                            </span>
                          </div>
                          <p className="mt-1 font-type text-[10.5px] leading-snug text-[#4a3d27]">{a.tagline}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="pin-note paper-card tilt-l mt-4 p-3.5">
              <div className="font-pixel text-[9px] text-[#241d10]">YOUR OPPONENT — I-GREEDYPROBE</div>
              <p className="mt-2 font-type text-[11px] leading-relaxed text-[#4a3d27]">
                The Bureau&apos;s best hound. It keeps an exact map of where you might be — built
                only from what the rules publish — probes its best guess, and stakes out where
                you&apos;ll BE, not where you are. It plays behind the same wall you do. It never
                sees your route.
              </p>
            </div>
          )}
        </div>

        {/* ===== case number terminal ===== */}
        <div className="pixel-frame mb-4 p-4">
          <label
            htmlFor="seed"
            className="mb-2 block font-term text-lg uppercase tracking-[0.18em] text-fog"
          >
            {'// case number'}
          </label>
          <div className="flex gap-2">
            <div className="flex-1 border border-line-2 bg-ink-2 px-3 py-2 shadow-[inset_0_2px_6px_rgba(0,0,0,.6)]">
              <Input
                id="seed"
                value={seedText}
                onChange={(e) => setSeedText(e.target.value.replace(/[^0-9]/g, ''))}
                inputMode="numeric"
                aria-label="Case seed"
                className="h-7 border-0 bg-transparent p-0 font-term text-2xl tracking-[0.12em] text-amber-2 shadow-none focus-visible:ring-0"
                placeholder="000000"
              />
            </div>
            <button
              onClick={() => setSeedText(String(randomSeed()))}
              aria-label="Random seed"
              className="btn-pixel-ghost flex h-auto w-12 items-center justify-center"
            >
              <Dices className="h-5 w-5" />
            </button>
          </div>

          <button
            className="btn-pixel mt-4 h-12 w-full text-xl uppercase"
            disabled={!valid}
            onClick={() =>
              startCase(seed, role === 'investigator' ? { archetype, source: 'solo' } : { role, source: 'solo' })
            }
          >
            {role === 'investigator' ? '▸ open the case' : '▸ vanish into the city'}
          </button>

          {resumableForRole && (
            <button className="btn-pixel-ghost mt-2.5 flex w-full items-center justify-center gap-2 py-2.5 uppercase" onClick={resumeCase}>
              <RotateCcw className="h-4 w-4" />
              resume {resumableForRole.source === 'tutorial' ? 'tutorial' : 'case'} — №{String(resumableForRole.seed % 100000).padStart(5, '0')} ·{' '}
              {resumableForRole.investigator.length + resumableForRole.fugitive.length} moves in
            </button>
          )}
        </div>

        {/* ===== the drawers ===== */}
        <div className="mb-4 grid grid-cols-3 gap-2.5">
          <button onClick={goLadder} className="btn-pixel-ghost flex h-14 flex-col items-center justify-center gap-0.5 uppercase">
            <Trophy className="h-4 w-4 text-amber" />
            <span className="text-sm">case wall</span>
          </button>
          <button
            onClick={startTutorial}
            disabled={role === 'fugitive'}
            className="btn-pixel-ghost flex h-14 flex-col items-center justify-center gap-0.5 uppercase disabled:opacity-50"
          >
            <GraduationCap className="h-4 w-4 text-amber" />
            <span className="text-sm">{tutorialDone ? 'refresher' : 'the 60s brief'}</span>
          </button>
          <button onClick={() => setHistoryOpen(true)} className="btn-pixel-ghost flex h-14 flex-col items-center justify-center gap-0.5 uppercase">
            <Archive className="h-4 w-4 text-amber" />
            <span className="text-sm">the archive</span>
          </button>
        </div>

        <button onClick={() => setSkillOpen(true)} className="btn-pixel-ghost flex h-12 w-full items-center justify-center gap-2 uppercase">
          <span className="font-type text-xs normal-case tracking-normal">Skill profile — rolling last 10 cases per role</span>
        </button>

        {/* ===== the 60-second rules — a pinned note ===== */}
        <div className="pin-note paper-card tilt-l mt-6 p-4">
          <div className="font-pixel text-[9px] text-[#241d10]">
            THE 60-SECOND RULES — {role === 'investigator' ? 'HUNTING' : 'RUNNING'}
          </div>
          <p className="mt-2 font-type text-[11.5px] leading-relaxed text-[#33291a]">
            {role === 'investigator' ? (
              <>
                8 days. They move in secret (Foot 1 SP · Tram 2 · Metro 3, one edge per day). Your phase: up to 2{' '}
                <b>probes</b> (1 IP — &quot;were you here today?&quot;) and 1 <b>stakeout</b> (3 IP — catches them
                tomorrow if they end that day on your node, silently misses otherwise). Public evidence: their{' '}
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
            )}
          </p>
          <div className="mt-2 text-right font-mono text-[9px] text-[#8a7a58]">ruleset 1.0.0-alpha.1</div>
        </div>

        <p className="mt-5 text-center font-type text-[10.5px] leading-relaxed text-fog-2">
          The AI plays behind the same information wall you do — public evidence only, never your private log.
        </p>

        {resumableForRole?.verdict && (
          <p className="mt-2 text-center font-term text-base text-fog">
            last file closed: {resumableForRole.verdict} · {VERDICT_WINNER[resumableForRole.verdict]}
          </p>
        )}
      </div>

      {historyOpen && <HistoryDialog onClose={() => setHistoryOpen(false)} />}
      {skillOpen && <SkillDialog onClose={() => setSkillOpen(false)} />}
    </div>
  );
}
