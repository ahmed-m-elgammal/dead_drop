'use client';

/**
 * Dead Drop — §8.6 replay overlay (M3 W2, 06-uiux S6).
 *
 * "Watch how you read them": the true route advances day by day on a static
 * map while probe pins, stakeout rings, reveals and drop completions land in
 * sequence. The story shown IS the engine's disclosure() — never a
 * re-derivation. Scrubber = per-day; play steps one day at a time (no
 * reaction-time mechanics, 06-uiux §6).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play, X } from 'lucide-react';
import {
  VERDICT_WINNER,
  type CaseConfig,
  type CaseEndDisclosure,
  type FugitiveRouteEntry,
  type NodeId,
  type PublicEvent,
} from '@dead-drop/engine';
import type { ArchetypeId } from '@/lib/dd/archetypes';
import { ARCHETYPES } from '@/lib/dd/archetypes';
import { VM } from '@/lib/dd/vm';
import { buildLayout, EDGE_STYLE, sortedEdges } from '@/lib/dd/geometry';
import type { CaseSource } from '@/lib/dd/history';

export interface ReplayMeta {
  seed: number;
  archetype: ArchetypeId;
  /** Which role the human played — fugitive-role replays came through the
   *  I-GreedyProbe investigator (W3), not an archetype fugitive. */
  role?: 'investigator' | 'fugitive';
  stars: 0 | 1 | 2 | 3 | null;
  source: CaseSource;
}

interface Props {
  config: CaseConfig;
  disclosure: CaseEndDisclosure;
  meta: ReplayMeta;
  onClose: () => void;
}

const CLASS_COLOR: Record<string, string> = { F: '#c9d3e4', T: '#e8a33d', M: '#4f8f85' };

export default function ReplayViewer({ config, disclosure, meta, onClose }: Props) {
  const layout = useMemo(() => buildLayout(VM), []);
  const edges = useMemo(() => sortedEdges(VM.map.edges), []);
  const route = disclosure.fugitive_route;
  const maxDay = route.length > 0 ? route[route.length - 1]!.day : disclosure.day;

  const [day, setDay] = useState(maxDay);
  const [playing, setPlaying] = useState(false);
  const playTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!playing) {
      if (playTimer.current) {
        clearInterval(playTimer.current);
        playTimer.current = null;
      }
      return;
    }
    playTimer.current = setInterval(() => {
      setDay((d) => {
        if (d >= maxDay) {
          setPlaying(false);
          return d;
        }
        return d + 1;
      });
    }, 950);
    return () => {
      if (playTimer.current) {
        clearInterval(playTimer.current);
        playTimer.current = null;
      }
    };
  }, [playing, maxDay]);

  const shownRoute = useMemo(() => route.filter((r) => r.day <= day), [route, day]);
  const shownLog = useMemo(
    () => disclosure.log.filter((e): e is PublicEvent => e.day <= day && e.kind !== 'DAY_MARKER'),
    [disclosure.log, day],
  );
  const shownPrivate = useMemo(
    () => disclosure.private_log_investigator.filter((e) => e.day <= day),
    [disclosure.private_log_investigator, day],
  );

  const revealed = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of shownLog) if (e.kind === 'DISTRICT_REVEAL') m.set(e.district, e.day);
    return m;
  }, [shownLog]);

  const dropsDone = useMemo(() => {
    const m = new Map<NodeId, number>();
    for (const e of shownLog) if (e.kind === 'DROP_COMPLETED') m.set(e.site, e.slot);
    return m;
  }, [shownLog]);

  const probePins = shownPrivate
    .filter((e) => e.kind === 'PROBE_RESULT')
    .map((e) => ({ day: e.day, target: e.target, hit: e.kind === 'PROBE_RESULT' && e.result === 'HIT' }));
  const stakeoutPins = useMemo(() => {
    const placed = shownPrivate
      .filter((e) => e.kind === 'STAKEOUT_PLACED')
      .map((e) => ({ day: e.day, target: e.target, missDay: null as number | null }));
    for (const e of shownPrivate) {
      if (e.kind === 'STAKEOUT_MISS') {
        const p = placed.find((x) => x.target === e.target && x.missDay === null);
        if (p) p.missDay = e.day;
      }
    }
    return placed;
  }, [shownPrivate]);

  const lastPos: NodeId | null = useMemo(() => {
    if (shownRoute.length === 0) return config.safehouse;
    const r = shownRoute[shownRoute.length - 1]!;
    return r.to;
  }, [shownRoute, config.safehouse]);

  // Nodes worth a label: config sites, route endpoints, action targets.
  const labeled = useMemo(() => {
    const s = new Set<NodeId>([config.safehouse, ...config.drops, config.gate]);
    for (const r of shownRoute) {
      s.add(r.from);
      s.add(r.to);
    }
    for (const p of probePins) s.add(p.target);
    for (const p of stakeoutPins) s.add(p.target);
    return s;
  }, [config, shownRoute, probePins, stakeoutPins]);

  const dayEvents = useMemo(
    () => ({
      route: route.find((r) => r.day === day) ?? null,
      pub: disclosure.log.filter((e) => e.day === day && e.kind !== 'DAY_MARKER'),
      priv: disclosure.private_log_investigator.filter((e) => e.day === day),
    }),
    [route, disclosure, day],
  );

  const winner =
    disclosure.verdict !== null ? VERDICT_WINNER[disclosure.verdict] : null;
  const won = winner === 'INVESTIGATOR';

  return (
    <div className="fixed inset-0 z-[60] flex items-stretch justify-center bg-ink/92 p-3 sm:items-center" role="dialog" aria-modal aria-label="Case replay">
      <div className="pixel-frame flex h-full max-h-[95vh] w-full max-w-3xl flex-col overflow-hidden bg-panel sm:h-auto">
        {/* header */}
        <div className={`flex items-center justify-between border-b border-line px-4 py-3 ${won ? 'bg-[#14251f]' : 'bg-[#241114]'}`}>
          <div>
            <div className="font-term text-base uppercase tracking-[0.14em] text-fog">
              Replay · {meta.role === 'fugitive' ? 'you as the Courier vs I-GreedyProbe' : `${ARCHETYPES[meta.archetype].label} courier`} · №{String(meta.seed % 100000).padStart(5, '0')}
              {meta.stars !== null ? ` · ${meta.stars}★` : ''}
            </div>
            <div className={`font-pixel text-lg ${won ? 'text-mint' : 'text-blood-2'}`}>{disclosure.verdict}</div>
          </div>
          <button onClick={onClose} className="btn-pixel-ghost p-1.5" aria-label="Close replay">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* map */}
        <div className="min-h-0 flex-1 overflow-hidden bg-[#0e1524]">
          <svg viewBox="0 0 760 1000" className="h-full w-full" role="img" aria-label="Replay map — true route by day">
            {layout.districts.map((d) => {
              const rev = revealed.get(d.id);
              return (
                <g key={d.id}>
                  <circle
                    cx={d.x}
                    cy={d.y}
                    r={d.plateR}
                    fill={rev !== undefined ? '#15273a' : '#121b2d'}
                    stroke={rev !== undefined ? '#e8a33d' : '#2a3850'}
                    strokeWidth={rev !== undefined ? 2 : 1.2}
                  />
                  <text
                    x={d.labelX}
                    y={d.labelY}
                    textAnchor="middle"
                    fontSize={15}
                    fontWeight={700}
                    fill={rev !== undefined ? '#f4c86a' : '#5d6d88'}
                    className="uppercase"
                    style={{ letterSpacing: 1.5 }}
                  >
                    {d.name}
                    {rev !== undefined ? ` · D${rev}` : ''}
                  </text>
                </g>
              );
            })}

            {edges.map((e, i) => {
              const a = layout.nodes.get(e.a);
              const b = layout.nodes.get(e.b);
              if (!a || !b) return null;
              const st = EDGE_STYLE[e.type];
              return (
                <line
                  key={i}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={st.stroke}
                  strokeWidth={st.width}
                  strokeDasharray={st.dash || undefined}
                  strokeLinecap="round"
                  opacity={0.55}
                />
              );
            })}

            {/* true route ≤ scrubber day */}
            {shownRoute.map((r, i) => {
              const a = layout.nodes.get(r.from);
              const b = layout.nodes.get(r.to);
              if (!a || !b) return null;
              if (r.from !== r.to) {
                return (
                  <line
                    key={`r-${i}`}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke={CLASS_COLOR[r.edge_class ?? 'F'] ?? '#c9d3e4'}
                    strokeWidth={4}
                    strokeLinecap="round"
                    opacity={r.day === day ? 0.95 : 0.55}
                  />
                );
              }
              return (
                <circle
                  key={`h-${i}`}
                  cx={a.x}
                  cy={a.y}
                  r={8}
                  fill="none"
                  stroke={CLASS_COLOR.F}
                  strokeWidth={2}
                  opacity={r.day === day ? 0.95 : 0.5}
                />
              );
            })}

            {/* stakeout rings */}
            {stakeoutPins.map((p, i) => {
              const pos = layout.nodes.get(p.target);
              if (!pos) return null;
              return (
                <circle
                  key={`st-${i}`}
                  cx={pos.x}
                  cy={pos.y}
                  r={24}
                  fill="none"
                  stroke={p.missDay !== null ? '#5d6d88' : '#e05252'}
                  strokeWidth={2.6}
                  strokeDasharray="6,4"
                />
              );
            })}

            {/* probe pins */}
            {probePins.map((p, i) => {
              const pos = layout.nodes.get(p.target);
              if (!pos) return null;
              return (
                <g key={`p-${i}`} pointerEvents="none">
                  <circle cx={pos.x} cy={pos.y} r={10} fill={p.hit ? '#58b98a' : '#5d6d88'} />
                  <text x={pos.x} y={pos.y + 4} textAnchor="middle" fontSize={12} fontWeight={900} fill="#0b101b">
                    {p.hit ? '✓' : '✕'}
                  </text>
                </g>
              );
            })}

            {/* config sites: safehouse / drops (with slot badge) / gate */}
            {(() => {
              const sh = layout.nodes.get(config.safehouse);
              const g = layout.nodes.get(config.gate);
              const parts: React.ReactNode[] = [];
              if (sh)
                parts.push(
                  <polygon
                    key="sh"
                    points={`${sh.x},${sh.y - 13} ${sh.x - 12},${sh.y + 9} ${sh.x + 12},${sh.y + 9}`}
                    fill="#3d7068"
                    stroke="#e8ddc7"
                    strokeWidth={1.6}
                  />,
                );
              if (g)
                parts.push(
                  <polygon
                    key="g"
                    points={`${g.x},${g.y - 14} ${g.x + 14},${g.y} ${g.x},${g.y + 14} ${g.x - 14},${g.y}`}
                    fill="#a62f2f"
                    stroke="#e8ddc7"
                    strokeWidth={1.6}
                  />,
                );
              for (const d of config.drops) {
                const pos = layout.nodes.get(d);
                if (!pos) continue;
                parts.push(
                  <rect
                    key={`d-${d}`}
                    x={pos.x - 10}
                    y={pos.y - 10}
                    width={20}
                    height={20}
                    rx={3}
                    fill={dropsDone.has(d) ? '#a62f2f' : '#e8ddc7'}
                    stroke="#0b101b"
                    strokeWidth={1.6}
                  />,
                );
                const slot = dropsDone.get(d);
                if (slot !== undefined)
                  parts.push(
                    <text key={`dt-${d}`} x={pos.x} y={pos.y + 4} textAnchor="middle" fontSize={11} fontWeight={900} fill="#0b101b">
                      {slot}
                    </text>,
                  );
              }
              return parts;
            })()}

            {/* fugitive position at scrubber day */}
            {(() => {
              const pos = layout.nodes.get(lastPos);
              if (!pos) return null;
              return (
                <g pointerEvents="none">
                  <circle cx={pos.x} cy={pos.y} r={9} fill="#e05252" stroke="#0b101b" strokeWidth={2.2} />
                  <text x={pos.x} y={pos.y + 3.5} textAnchor="middle" fontSize={10} fontWeight={900} fill="#0b101b">
                    F
                  </text>
                </g>
              );
            })()}

            {/* labels for involved nodes only */}
            {[...labeled].map((n) => {
              const p = layout.nodes.get(n);
              if (!p) return null;
              return (
                <text
                  key={`l-${n}`}
                  x={p.x + p.ux * 26}
                  y={p.y + p.uy * 26 + 3}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight={700}
                  fill="#8b9bb4"
                  pointerEvents="none"
                >
                  {n}
                </text>
              );
            })}
          </svg>
        </div>

        {/* scrubber + day detail */}
        <div className="border-t border-line bg-panel px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (day >= maxDay) setDay(1);
                setPlaying((p) => !p);
              }}
              className="btn-pixel flex h-9 w-9 shrink-0 items-center justify-center"
              aria-label={playing ? 'Pause replay' : 'Play replay'}
            >
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <input
              type="range"
              min={1}
              max={maxDay}
              value={day}
              onChange={(e) => {
                setPlaying(false);
                setDay(Number(e.target.value));
              }}
              className="w-full accent-[#e8a33d]"
              aria-label="Replay day"
            />
            <span className="w-12 shrink-0 text-right font-term text-lg text-amber-2">
              D{day}/{maxDay}
            </span>
          </div>

          <div className="mt-2 border border-line bg-ink-2 px-3 py-2 font-type text-[11px] leading-relaxed text-fog">
            <b className="text-paper">Day {day}:</b>{' '}
            <DayRouteLine r={dayEvents.route} />{' '}
            {dayEvents.pub.length === 0 && dayEvents.priv.length === 0 ? (
              <span className="text-fog-2">— quiet night.</span>
            ) : (
              <ul className="mt-1 space-y-0.5">
                {dayEvents.pub.map((e, i) => (
                  <li key={`pub-${i}`}>· {publicLine(e)}</li>
                ))}
                {dayEvents.priv.map((e, i) => (
                  <li key={`priv-${i}`} className="text-fog-2">
                    · private: {privateLine(e)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DayRouteLine({ r }: { r: FugitiveRouteEntry | null }) {
  if (!r) return <span className="text-fog-2">no route entry.</span>;
  if (r.action.kind === 'FORCED_HOLD') return <span>Stranded at {r.from} (§9.13, 0 SP).</span>;
  if (r.action.kind === 'HOLD') return <span>Held at {r.from} ({r.sp_cost} SP).</span>;
  return (
    <span>
      {r.from} → {r.to} ({r.edge_class ?? '—'}, {r.sp_cost} SP)
    </span>
  );
}

function publicLine(e: PublicEvent): string {
  switch (e.kind) {
    case 'DISTRICT_REVEAL':
      return `district reveal — they were in ${e.district}.`;
    case 'TRANSIT_REVEAL':
      return e.move_class === 'NO_MOVEMENT' ? 'transit reveal — "no movement".' : `transit reveal — ${e.move_class} that day.`;
    case 'DROP_COMPLETED':
      return `drop ${e.slot} completed at ${e.site}.`;
    case 'STRANDED':
      return 'stranded (§9.13).';
    case 'VERDICT':
      return `verdict: ${e.verdict}.`;
    case 'DAY_MARKER':
      return `day ${e.day}.`;
  }
}

function privateLine(e: CaseEndDisclosure['private_log_investigator'][number]): string {
  switch (e.kind) {
    case 'PROBE_RESULT':
      return `probe @ ${e.target} → ${e.result}`;
    case 'STAKEOUT_PLACED':
      return `stakeout armed @ ${e.target}`;
    case 'STAKEOUT_MISS':
      return `stakeout @ ${e.target} missed silently`;
  }
}
