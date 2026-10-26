'use client';

/**
 * Dead Drop — case brief panel (M3 W4.7 visual refinement pass).
 *
 * The LEFT information column the reference board calls for: game identity,
 * the role's primary objective, the real daily loop (engine §1.3 Phase enum
 * mapped to its three observable steps), and the map legend grouped into
 * nodes / routes / markers — all as compact dark panels beside the map.
 *
 * Presentation only. Every value rendered is real: case number from the
 * seed (same formula as CaseHeader), objective text per role from the
 * ruleset, legend glyphs mirroring MapCanvas shapes/EDGE_STYLE, map stats
 * counted from the validated map. No state, no duplication of CaseHeader
 * status (day/IP/probes stay single-sourced there).
 */
import type { CaseConfig, FugitiveView, InvestigatorView, ValidatedMap } from '@dead-drop/engine';
import { useDD } from '@/lib/dd/store';

/* map-legend glyph language — mirrors MapCanvas node shapes (paper-styled
 * strokes so they read on the dark panel, same convention as CaseHeader) */
function NodeGlyph() {
  return (
    <svg viewBox="0 0 14 14" className="h-3 w-3 shrink-0" aria-hidden>
      <circle cx="7" cy="7" r="5" fill="#d9cbb0" stroke="#e8ddc7" strokeWidth="1.4" />
    </svg>
  );
}
function DropGlyph() {
  return (
    <svg viewBox="0 0 14 14" className="h-3 w-3 shrink-0" aria-hidden>
      <rect x="2.5" y="2.5" width="9" height="9" fill="#efe6d2" stroke="#e8ddc7" strokeWidth="1.3" />
    </svg>
  );
}
function GateGlyph() {
  return (
    <svg viewBox="0 0 14 14" className="h-3 w-3 shrink-0" aria-hidden>
      <polygon points="7,1 13,7 7,13 1,7" fill="#a62f2f" stroke="#e8ddc7" strokeWidth="1.2" />
    </svg>
  );
}
function SafehouseGlyph() {
  return (
    <svg viewBox="0 0 14 13" className="h-3 w-3 shrink-0" aria-hidden>
      <polygon points="7,1 13,11.5 1,11.5" fill="#3d7068" stroke="#e8ddc7" strokeWidth="1" />
    </svg>
  );
}
function HitGlyph() {
  return (
    <svg viewBox="0 0 14 14" className="h-3 w-3 shrink-0" aria-hidden>
      <circle cx="7" cy="7" r="5" fill="none" stroke="#b0722c" strokeWidth="2" />
    </svg>
  );
}
function ArmedGlyph() {
  return (
    <svg viewBox="0 0 14 14" className="h-3 w-3 shrink-0" aria-hidden>
      <circle cx="7" cy="7" r="5" fill="none" stroke="#c85050" strokeWidth="1.6" strokeDasharray="3,2" />
    </svg>
  );
}
function YouGlyph() {
  return (
    <svg viewBox="0 0 14 14" className="h-3 w-3 shrink-0" aria-hidden>
      <circle cx="7" cy="7" r="4.5" fill="rgba(46,125,79,0.25)" stroke="#58b98a" strokeWidth="1.6" />
    </svg>
  );
}

function RouteSwatch({ kind }: { kind: 'F' | 'T' | 'M' }) {
  // exact EDGE_STYLE values from geometry.ts
  const s =
    kind === 'M'
      ? { stroke: '#2f6a5f', w: 3.6 }
      : kind === 'T'
        ? { stroke: '#b0722c', w: 2.2, dash: '4,3' }
        : { stroke: '#5c6478', w: 1.6 };
  return (
    <svg viewBox="0 0 18 8" className="h-2 w-4 shrink-0" aria-hidden>
      <line x1="0" y1="4" x2="18" y2="4" stroke={s.stroke} strokeWidth={s.w} strokeDasharray={s.dash} strokeLinecap="round" />
    </svg>
  );
}

function Compass() {
  return (
    <svg viewBox="0 0 40 40" className="h-9 w-9 shrink-0 opacity-80" aria-hidden>
      <circle cx="20" cy="20" r="17" fill="none" stroke="#3a4c6b" strokeWidth="1.4" />
      <circle cx="20" cy="20" r="2" fill="#e8a33d" />
      <polygon points="20,4 23,20 20,18 17,20" fill="#e8a33d" />
      <polygon points="20,36 23,20 20,22 17,20" fill="#5d6d88" />
      <polygon points="4,20 20,17 18,20 20,23" fill="#5d6d88" />
      <polygon points="36,20 20,17 22,20 20,23" fill="#5d6d88" />
      <text x="20" y="12.5" textAnchor="middle" fontSize="7" fontWeight="700" fill="#e8ddc7" fontFamily="var(--font-term)">
        N
      </text>
    </svg>
  );
}

/** Bureau seal — an all-seeing eye over a drop keyhole (inline vector). */
function SealMark() {
  return (
    <svg viewBox="0 0 34 34" className="h-8 w-8 shrink-0" aria-hidden>
      <circle cx="17" cy="17" r="15.5" fill="none" stroke="#e8a33d" strokeWidth="1.6" />
      <circle cx="17" cy="17" r="12.5" fill="none" stroke="#3a4c6b" strokeWidth="1" />
      <path d="M 6.5 17 Q 17 7.5 27.5 17 Q 17 26.5 6.5 17 Z" fill="#141d30" stroke="#e8a33d" strokeWidth="1.5" />
      <circle cx="17" cy="17" r="4" fill="#e8a33d" />
      <circle cx="17" cy="17" r="1.6" fill="#141005" />
      <line x1="17" y1="24" x2="17" y2="28.5" stroke="#e8a33d" strokeWidth="1.6" />
    </svg>
  );
}

const STEP_LABELS = [
  { n: '1', label: 'your actions', hint: 'probe · stakeout' },
  { n: '2', label: 'the courier moves', hint: 'end your phase' },
  { n: '3', label: 'reveals land', hint: 'evidence logged' },
] as const;

export default function CaseBriefPanel({ role, vm, view, config }: {
  role: 'investigator' | 'fugitive';
  vm: ValidatedMap;
  view: InvestigatorView | FugitiveView;
  config: CaseConfig;
}) {
  const totalDays = useDD.getState().session?.p.P1_days_per_case ?? 8;
  const caseNo = String(config.seed % 100000).padStart(5, '0');
  const phase = view.phase;

  // engine §1.3 Phase → the three observable steps of a day
  const activeStep = phase === 'INVESTIGATOR_ACTIONS' ? 0 : phase === 'FUGITIVE_MOVE' ? 1 : phase === 'RESOLVING' ? 2 : -1;

  return (
    <aside className="hidden w-[212px] shrink-0 flex-col gap-3 lg:flex" aria-label="Case brief and map legend">
      {/* identity */}
      <div className="pixel-frame relative p-3">
        <div className="flex items-center gap-2.5">
          <SealMark />
          <div>
            <div className="font-pixel text-[11px] leading-relaxed text-amber">DEAD DROP</div>
            <div className="font-type text-[10px] tracking-[0.18em] text-fog-2">CASE №{caseNo}</div>
          </div>
        </div>
      </div>

      {/* primary objective — role-scoped, ruleset-true */}
      <div className="pixel-frame relative p-3">
        <div className="mb-1.5 font-term text-base uppercase tracking-[0.16em] text-fog">primary objective</div>
        {role === 'investigator' ? (
          <>
            <div className="font-term text-lg leading-tight text-amber-2">Corner the courier</div>
            <p className="mt-1 font-type text-[11px] leading-snug text-fog">
              Catch their end-of-day position before Day {totalDays}. The net is probes and stakeouts.
            </p>
          </>
        ) : (
          <>
            <div className="font-term text-lg leading-tight text-mint">Serve the drops</div>
            <p className="mt-1 font-type text-[11px] leading-snug text-fog">
              Hit both drops in order, then vanish past Day {totalDays}.
            </p>
          </>
        )}
      </div>

      {/* the daily loop — the real §1.3 phases, one glance */}
      <div className="pixel-frame p-3">
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="font-term text-base uppercase tracking-[0.16em] text-fog">daily loop</span>
          <span className="font-term text-sm text-fog-2">
            day {Math.min(view.day, totalDays)}/{totalDays}
          </span>
        </div>
        <ol className="space-y-1">
          {STEP_LABELS.map((s, i) => {
            const on = i === activeStep;
            return (
              <li
                key={s.n}
                data-on={on}
                className="flex items-center gap-2 border border-transparent px-1.5 py-1 data-[on=true]:border-line-2 data-[on=true]:bg-ink-2"
              >
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center border font-term text-sm leading-none ${
                    on ? 'border-amber bg-amber text-[#141005]' : 'border-line-2 text-fog-2'
                  }`}
                >
                  {s.n}
                </span>
                <span className="min-w-0">
                  <span className={`block font-term text-sm leading-none ${on ? 'text-paper' : 'text-fog-2'}`}>{s.label}</span>
                  <span className="block font-type text-[9.5px] leading-tight text-fog-2">{s.hint}</span>
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      {/* legend — grouped, mirroring the map's real shapes and edge styles */}
      <div className="pixel-frame min-h-0 flex-1 overflow-y-auto p-3">
        <div className="mb-1.5 font-term text-base uppercase tracking-[0.16em] text-fog">legend</div>

        <div className="font-type text-[9.5px] uppercase tracking-[0.2em] text-fog-2">nodes</div>
        <ul className="mb-2 mt-1 space-y-1">
          <LegendRow glyph={<NodeGlyph />} label="node (location)" />
          <LegendRow glyph={<DropGlyph />} label="drop site" />
          <LegendRow glyph={<GateGlyph />} label="gate — the exit" />
          <LegendRow glyph={<SafehouseGlyph />} label="safehouse" />
          {role === 'fugitive' ? (
            <LegendRow glyph={<YouGlyph />} label="you — courier" />
          ) : (
            <>
              <LegendRow glyph={<HitGlyph />} label="probe hit (today)" />
              <LegendRow glyph={<ArmedGlyph />} label="stakeout armed" />
            </>
          )}
        </ul>

        <div className="font-type text-[9.5px] uppercase tracking-[0.2em] text-fog-2">routes</div>
        <ul className="mb-2 mt-1 space-y-1">
          <LegendRow glyph={<RouteSwatch kind="M" />} label="metro — 3 SP" />
          <LegendRow glyph={<RouteSwatch kind="T" />} label="tram — 2 SP" />
          <LegendRow glyph={<RouteSwatch kind="F" />} label="foot — 1 SP" />
        </ul>

        <div className="font-type text-[9.5px] uppercase tracking-[0.2em] text-fog-2">string markers</div>
        <ul className="mt-1 space-y-1">
          <LegendRow glyph={<span className="w-3 text-center font-term text-sm leading-none text-amber-2">?</span>} label="maybe" />
          <LegendRow glyph={<span className="w-3 text-center font-term text-sm leading-none text-blood-2">!</span>} label="pinned" />
          <LegendRow glyph={<span className="w-3 text-center font-term text-sm leading-none text-fog-2">✕</span>} label="cleared" />
        </ul>
      </div>

      {/* footer — compass + real map stats (counted from the validated map) */}
      <div className="pixel-frame flex items-center gap-2.5 p-2.5">
        <Compass />
        <div className="font-type text-[10px] leading-snug text-fog-2">
          <div>
            <b className="text-fog">{vm.map.nodes.length}</b> nodes · <b className="text-fog">{vm.map.edges.length}</b> routes
          </div>
          <div>4 districts · schematic — not to scale</div>
        </div>
      </div>
    </aside>
  );
}

function LegendRow({ glyph, label }: { glyph: React.ReactNode; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <span className="flex w-4 shrink-0 justify-center">{glyph}</span>
      <span className="font-term text-sm leading-none text-fog">{label}</span>
    </li>
  );
}
