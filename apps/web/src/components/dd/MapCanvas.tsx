'use client';

/**
 * Dead Drop — interactive city map (M3 W1, 06-uiux §2; case-wall pass W4.5).
 *
 * Vector map, fixed layout (roadmap M3 risk note: no renderer scope creep):
 * the city is a PAPER STREET MAP pinned to the cork case wall (the W4.5
 * reference board): paper plate pans/zooms with the city, districts are
 * ink-stamped regions (red-pen loop on reveal), edges knock out with cream
 * casing, and selecting a node threads RED STRINGS to everything it
 * connects to — the detective-board signature, presentation-only. Core
 * interactivity unchanged: tap-select (hit target grows with zoom), button
 * zoom + drag pan, belief halo (off by default), drop badges, armed-
 * stakeout ring, today's HIT pins. Belief markers (?/!/✕) are LOCAL-only —
 * never part of engine state.
 */
import { useMemo, useRef, useState } from 'react';
import type { CaseConfig, FugitiveView, InvestigatorView, NodeId, ValidatedMap } from '@dead-drop/engine';
import { candidateSet } from '@/lib/dd/belief';
import { buildLayout, EDGE_STYLE, sortedEdges, type NodeLayout } from '@/lib/dd/geometry';
import { useDD, type MarkerKind } from '@/lib/dd/store';

const MARKER_GLYPH: Record<MarkerKind, string> = { possible: '?', pinned: '!', cleared: '✕' };
/* case-wall palette — ink on cream paper (tokens mirrored from globals.css) */
const INK = '#33291a';
const INK_SOFT = '#5a4d38';
const PAPER_HALO = '#ece2cc';
const RED = '#a62f2f';
const MARKER_FILL: Record<MarkerKind, string> = {
  possible: '#b0722c',
  pinned: RED,
  cleared: '#6b7280',
};
/** Paper plate bounds — inset from the 760×1000 viewBox so cork shows
 *  around the map (the board is bigger than the map pinned to it). */
const PAPER_RECT = { x: 16, y: 16, w: 728, h: 968 };
/** Canvas center — the string fan bows AWAY from this point. */
const CCX = 380;
const CCY = 500;

interface Props {
  vm: ValidatedMap;
  /** Investigator view (investigator role) or Fugitive view (fugitive role,
   *  W3) — the map renders role-scoped projections only. */
  view: InvestigatorView | FugitiveView;
  config: CaseConfig;
  /** Fugitive role: pin the player's OWN position (they always know where
   *  they are); suppress every investigator-private layer (probe pins,
   *  armed-stakeout ring, belief halo — §1.3 wall). */
  fugitiveRole?: boolean;
}

export default function MapCanvas({ vm, view, config, fugitiveRole = false }: Props) {
  const { markers, selected, mode, beliefHalo, onNodeClick } = useMapInteractions();
  const layout = useMemo(() => buildLayout(vm), [vm]);
  const edges = useMemo(() => sortedEdges(vm.map.edges), [vm]);

  const [k, setK] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const drag = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);

  const zoomBy = (ratio: number) => {
    setK((prevK) => {
      const nextK = Math.min(3.2, Math.max(1, prevK * ratio));
      const cx = 380; // viewBox center — zoom around the middle
      const cy = 500;
      const r = nextK / prevK;
      setTx((prevTx) => cx - (cx - prevTx) * r);
      setTy((prevTy) => cy - (cy - prevTy) * r);
      if (nextK === 1) {
        setTx(0);
        setTy(0);
      }
      return nextK;
    });
  };

  const revealedDistricts = useMemo(() => {
    const s = new Map<string, number>();
    for (const ev of view.log) {
      if (ev.kind === 'DISTRICT_REVEAL') s.set(ev.district, ev.day);
    }
    return s;
  }, [view.log]);

  const dropDone = useMemo(() => {
    const m = new Map<string, number>();
    for (const ev of view.log) {
      if (ev.kind === 'DROP_COMPLETED') m.set(ev.site, ev.slot);
    }
    return m;
  }, [view.log]);

  const belief = useMemo(
    () => (beliefHalo && !fugitiveRole ? candidateSet(vm, config, view.log) : null),
    [beliefHalo, fugitiveRole, vm, config, view.log],
  );

  const hitPins = useMemo(() => {
    const s = new Set<NodeId>();
    if (fugitiveRole || !('private_log_investigator' in view)) return s;
    for (const ev of view.private_log_investigator) {
      if (ev.kind === 'PROBE_RESULT' && ev.result === 'HIT' && ev.day === view.day) s.add(ev.target);
    }
    return s;
  }, [view, fugitiveRole]);

  // Armed-stakeout ring is an INVESTIGATOR-private layer: never rendered in
  // fugitive role (§5.2 — the fugitive is not notified). The role flag (not
  // structural narrowing) is the authority — both views carry an
  // `investigator` key, but only the InvestigatorView's is populated.
  const armed = !fugitiveRole
    ? (view as InvestigatorView).investigator.stakeout_armed
    : null;

  // Fugitive role: the player's own position (public to THEMSELVES only).
  const mePosition: NodeId | null = fugitiveRole
    ? (view as FugitiveView).fugitive.position
    : null;

  // Case-wall signature: the selected pin threaded to its neighbors.
  // Pure presentation — sag curves bow AWAY from the canvas center so the
  // fan never collapses toward the metro spine; route data is untouched.
  const { stringPaths, stringNeighbors } = useMemo(() => {
    if (!selected) return { stringPaths: [] as Array<{ d: string }>, stringNeighbors: [] as NodeId[] };
    const paths: Array<{ d: string }> = [];
    const neighbors = new Set<NodeId>();
    for (const e of edges) {
      if (e.a !== selected && e.b !== selected) continue;
      const a = layout.nodes.get(e.a);
      const b = layout.nodes.get(e.b);
      if (!a || !b) continue;
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      let nx = -(b.y - a.y);
      let ny = b.x - a.x;
      const nl = Math.hypot(nx, ny) || 1;
      nx /= nl;
      ny /= nl;
      if (nx * (CCX - mx) + ny * (CCY - my) > 0) {
        nx = -nx;
        ny = -ny;
      }
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      const sag = Math.min(16, Math.max(7, len * 0.09));
      paths.push({ d: `M ${a.x} ${a.y} Q ${mx + nx * sag} ${my + ny * sag} ${b.x} ${b.y}` });
      for (const n of [a, b]) if (n.id !== selected) neighbors.add(n.id);
    }
    return { stringPaths: paths, stringNeighbors: [...neighbors] };
  }, [selected, edges, layout]);

  const cursor =
    mode === 'inspect' ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer';

  return (
    <div className="cork-board relative h-full w-full overflow-hidden">
      <svg
        viewBox={`0 0 760 1000`}
        className={`h-full w-full touch-none select-none ${cursor}`}
        role="img"
        aria-label="Dead Drop city map — four districts, 48 nodes"
        onPointerDown={(e) => {
          drag.current = { x: e.clientX, y: e.clientY, tx, ty };
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const scaleX = 760 / rect.width;
          setTx(drag.current.tx + (e.clientX - drag.current.x) * scaleX);
          setTy(drag.current.ty + (e.clientY - drag.current.y) * scaleX);
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerLeave={() => {
          drag.current = null;
        }}
      >
        <defs>
          <pattern id="dd-map-paper" width="256" height="256" patternUnits="userSpaceOnUse">
            <rect width="256" height="256" fill="#e9dec8" />
            <image href="/art/map-paper.png" width="256" height="256" />
          </pattern>
        </defs>
        <g transform={`translate(${tx} ${ty}) scale(${k})`}>
          {/* the paper street map — pinned to the cork: crisp offset shadow
              (the house pixel-shadow language), taped top corners, one
              pushpin at the lower-right corner */}
          <rect
            x={PAPER_RECT.x + 5}
            y={PAPER_RECT.y + 7}
            width={PAPER_RECT.w}
            height={PAPER_RECT.h}
            fill="rgba(24,14,4,0.42)"
          />
          <rect
            x={PAPER_RECT.x}
            y={PAPER_RECT.y}
            width={PAPER_RECT.w}
            height={PAPER_RECT.h}
            fill="url(#dd-map-paper)"
            stroke="rgba(58,44,24,0.5)"
            strokeWidth={1.5}
          />
          <g pointerEvents="none">
            <rect
              x={PAPER_RECT.x - 4}
              y={PAPER_RECT.y - 9}
              width={76}
              height={20}
              fill="rgba(238,231,214,0.55)"
              stroke="rgba(58,44,24,0.14)"
              transform={`rotate(-38 ${PAPER_RECT.x + 34} ${PAPER_RECT.y + 1})`}
            />
            <rect
              x={PAPER_RECT.x + PAPER_RECT.w - 72}
              y={PAPER_RECT.y - 9}
              width={76}
              height={20}
              fill="rgba(238,231,214,0.55)"
              stroke="rgba(58,44,24,0.14)"
              transform={`rotate(38 ${PAPER_RECT.x + PAPER_RECT.w - 34} ${PAPER_RECT.y + 1})`}
            />
            <CornerPin x={PAPER_RECT.x + PAPER_RECT.w - 34} y={PAPER_RECT.y + PAPER_RECT.h - 32} />
          </g>

          {/* district plates + names — soft ink regions on paper; a revealed
              district gets the red-pen double loop + day stamp */}
          {layout.districts.map((d) => {
            const revealedDay = revealedDistricts.get(d.id);
            return (
              <g key={d.id}>
                <circle
                  cx={d.x}
                  cy={d.y}
                  r={d.plateR}
                  fill={revealedDay !== undefined ? 'rgba(232,163,61,0.13)' : 'rgba(120,96,60,0.06)'}
                  stroke="#8a7a5c"
                  strokeWidth={revealedDay !== undefined ? 1.4 : 1}
                  strokeDasharray={revealedDay !== undefined ? undefined : '5,4'}
                />
                {revealedDay !== undefined && (
                  <g pointerEvents="none">
                    <ellipse
                      cx={d.x}
                      cy={d.y}
                      rx={d.plateR + 4}
                      ry={d.plateR - 5}
                      fill="none"
                      stroke={RED}
                      strokeWidth={2.2}
                      opacity={0.85}
                      transform={`rotate(7 ${d.x} ${d.y})`}
                    />
                    <ellipse
                      cx={d.x}
                      cy={d.y}
                      rx={d.plateR - 1}
                      ry={d.plateR + 2}
                      fill="none"
                      stroke={RED}
                      strokeWidth={1.4}
                      opacity={0.55}
                      transform={`rotate(-4 ${d.x} ${d.y})`}
                    />
                  </g>
                )}
                <text
                  x={d.labelX}
                  y={d.labelY}
                  textAnchor="middle"
                  fontSize={15}
                  fontWeight={700}
                  fill={revealedDay !== undefined ? '#8a2424' : '#4a4030'}
                  stroke={PAPER_HALO}
                  strokeWidth={3}
                  paintOrder="stroke"
                  strokeLinejoin="round"
                  className="uppercase"
                  style={{ letterSpacing: 2, fontFamily: 'var(--font-type)' }}
                >
                  {d.name}
                </text>
                {revealedDay !== undefined && (
                  <text
                    x={d.labelX}
                    y={d.labelY + 16}
                    textAnchor="middle"
                    fontSize={11}
                    fill={RED}
                    stroke={PAPER_HALO}
                    strokeWidth={2.5}
                    paintOrder="stroke"
                    strokeLinejoin="round"
                    style={{ letterSpacing: 1.5, fontFamily: 'var(--font-type)' }}
                  >
                    revealed · day {revealedDay}
                  </text>
                )}
              </g>
            );
          })}

          {/* edges — cream KNOCK-OUT casing pass first (paper shows between
              crossings — the transit-map readability trick), then the three
              color passes (M under T under F) */}
          {edges.map((e, i) => {
            const a = layout.nodes.get(e.a);
            const b = layout.nodes.get(e.b);
            if (!a || !b) return null;
            const st = EDGE_STYLE[e.type];
            return (
              <line
                key={`casing-${i}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={PAPER_HALO}
                strokeWidth={st.width + 3}
                strokeDasharray={st.dash || undefined}
                strokeLinecap="round"
                opacity={0.85}
              />
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
                opacity={0.92}
              />
            );
          })}

          {/* red string fan — selected pin threaded to its neighbors */}
          {stringPaths.map((s, i) => (
            <g key={`str-${i}`} pointerEvents="none">
              <path d={s.d} fill="none" stroke="#6d1d1d" strokeWidth={4.6} strokeLinecap="round" opacity={0.9} />
              <path d={s.d} fill="none" stroke="#b23434" strokeWidth={2.6} strokeLinecap="round" />
            </g>
          ))}
          {stringNeighbors.map((n) => {
            const p = layout.nodes.get(n);
            if (!p) return null;
            return (
              <circle
                key={`nb-${n}`}
                cx={p.x}
                cy={p.y}
                r={13.5}
                fill="none"
                stroke={RED}
                strokeWidth={2}
                opacity={0.85}
                pointerEvents="none"
              />
            );
          })}

          {/* belief halo (optional, investigator role only) */}
          {belief &&
            [...belief].map((n) => {
              const p = layout.nodes.get(n);
              if (!p) return null;
              return (
                <circle
                  key={`halo-${n}`}
                  cx={p.x}
                  cy={p.y}
                  r={20}
                  fill="rgba(61,112,104,0.18)"
                  stroke="rgba(47,106,95,0.75)"
                  strokeWidth={1.2}
                  pointerEvents="none"
                />
              );
            })}

          {/* armed stakeout ring (investigator role only — silent to the fugitive) */}
          {armed &&
            (() => {
              const p = layout.nodes.get(armed);
              if (!p) return null;
              return (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={24}
                  fill="none"
                  stroke={RED}
                  strokeWidth={2.4}
                  strokeDasharray="6,4"
                  className="ring-pulse"
                  pointerEvents="none"
                />
              );
            })()}

          {/* nodes (shapes only — labels live in a non-interactive layer so
              each node's clickable bbox is exactly its glyph) */}
          {[...layout.nodes.values()].map((p) => (
            <NodeGlyph
              key={p.id}
              p={p}
              isGate={vm.map.gates.includes(p.id)}
              isSafehouse={vm.map.safehouses.includes(p.id)}
              isDropSite={vm.map.drop_candidates.includes(p.id)}
              dropSlot={dropDone.get(p.id)}
              isSelected={selected === p.id}
              marker={markers[p.id]}
              hitPin={hitPins.has(p.id)}
              meHere={mePosition === p.id}
              onClick={() => onNodeClick(p.id)}
            />
          ))}

          {/* labels — non-interactive layer (pointer-events none); positions
              come from the geometry label resolver (no seam collisions), and
              a paper halo (paint-order stroke) keeps ink text readable over
              printed streets and route lines */}
          {[...layout.nodes.values()].map((p) => (
            <text
              key={`label-${p.id}`}
              x={p.lx}
              y={p.ly}
              textAnchor={p.anchor}
              fontSize={10.5}
              fontWeight={
                vm.map.gates.includes(p.id) || vm.map.safehouses.includes(p.id) || vm.map.drop_candidates.includes(p.id)
                  ? 700
                  : 400
              }
              fill={
                vm.map.gates.includes(p.id) || vm.map.safehouses.includes(p.id) || vm.map.drop_candidates.includes(p.id)
                  ? INK
                  : INK_SOFT
              }
              stroke={PAPER_HALO}
              strokeWidth={2.6}
              paintOrder="stroke"
              strokeLinejoin="round"
              pointerEvents="none"
            >
              {p.id}
            </text>
          ))}
        </g>
      </svg>

      {/* zoom controls — desk brass */}
      <div className="absolute right-3 top-3 z-20 flex flex-col gap-1.5">
        <button
          onClick={() => zoomBy(1.35)}
          className="btn-pixel-ghost h-9 w-9 text-lg font-bold"
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          onClick={() => zoomBy(1 / 1.35)}
          className="btn-pixel-ghost h-9 w-9 text-lg font-bold"
          aria-label="Zoom out"
        >
          −
        </button>
        <button
          onClick={() => {
            setK(1);
            setTx(0);
            setTy(0);
          }}
          className="btn-pixel-ghost h-9 w-9 text-[10px] font-bold"
          aria-label="Reset view"
        >
          FIT
        </button>
      </div>

      {/* legend — a pinned paper strip over the board */}
      <div className="paper-card absolute bottom-2.5 left-3 z-20 flex flex-wrap items-center gap-x-3 gap-y-1 px-2.5 py-1.5 text-[10px] font-semibold text-[#33291a] tilt-l">
        <span className="flex items-center gap-1">
          <svg width="14" height="8"><line x1="0" y1="4" x2="14" y2="4" stroke="#5c6478" strokeWidth="1.6" /></svg>
          Foot 1 SP
        </span>
        <span className="flex items-center gap-1">
          <svg width="14" height="8"><line x1="0" y1="4" x2="14" y2="4" stroke="#b0722c" strokeWidth="2.2" strokeDasharray="5,4" /></svg>
          Tram 2
        </span>
        <span className="flex items-center gap-1">
          <svg width="14" height="8"><line x1="0" y1="4" x2="14" y2="4" stroke="#2f6a5f" strokeWidth="4" /></svg>
          Metro 3
        </span>
        <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 border-[1.5px] border-[#33291a] bg-[#efe6d2]" /> drop site</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rotate-45 border-[1.5px] border-[#33291a] bg-[#a62f2f]" /> gate</span>
        <span className="flex items-center gap-1"><span className="inline-block h-0 w-0 border-x-[5px] border-b-[9px] border-x-transparent border-b-[#2f6a5f]" /> safehouse</span>
      </div>
    </div>
  );
}

/** Brass-cornered pushpin holding the paper map to the cork (decorative). */
function CornerPin({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <ellipse cx={x + 2} cy={y + 3} rx={7.5} ry={5} fill="rgba(30,14,4,0.4)" />
      <circle cx={x} cy={y} r={6.5} fill="#a62f2f" stroke="#6d1d1d" strokeWidth={1.2} />
      <circle cx={x - 2} cy={y - 2} r={2.2} fill="#e8907a" opacity={0.9} />
    </g>
  );
}

function NodeGlyph(props: {
  p: NodeLayout;
  isGate: boolean;
  isSafehouse: boolean;
  isDropSite: boolean;
  dropSlot?: number;
  isSelected: boolean;
  marker?: MarkerKind;
  hitPin: boolean;
  /** Fugitive role: the player's current position — "YOU" pin. */
  meHere?: boolean;
  onClick: () => void;
}) {
  const { p, isGate, isSafehouse, isDropSite, dropSlot, isSelected, marker, hitPin, meHere, onClick } = props;

  return (
    <g
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="cursor-pointer"
      role="button"
      aria-label={`node ${p.id}`}
    >
      {/* invisible hit area — makes the whole glyph a stable target. The
          radius is clamped to half the nearest-neighbor distance so seam
          twins never overlap (06-uiux §2: targets grow with zoom, which
          this preserves — r scales with k). */}
      <circle cx={p.x} cy={p.y} r={p.hitR} fill="transparent" stroke="none" />
      {isSelected && (
        <g pointerEvents="none">
          <circle cx={p.x} cy={p.y} r={19} fill="none" stroke={RED} strokeWidth={2.2} />
          {/* red pushpin dropped onto the selected glyph */}
          <ellipse cx={p.x + 2.5} cy={p.y + 4} rx={9} ry={5.5} fill="rgba(30,14,4,0.35)" />
          <circle cx={p.x} cy={p.y - 1} r={8.5} fill="#b23434" stroke="#6d1d1d" strokeWidth={1.4} />
          <circle cx={p.x - 2.8} cy={p.y - 3.8} r={2.8} fill="#f0a68c" opacity={0.92} />
        </g>
      )}
      {hitPin && <circle cx={p.x} cy={p.y} r={19} fill="none" stroke="#b0722c" strokeWidth={2.2} />}
      {meHere && (
        <g pointerEvents="none">
          <circle cx={p.x} cy={p.y} r={15} fill="rgba(46,125,79,0.16)" />
          <circle cx={p.x} cy={p.y} r={15} fill="none" stroke="#2e7d4f" strokeWidth={2.2} />
          <text
            x={p.x}
            y={p.y - 20}
            textAnchor="middle"
            fontSize={9.5}
            fontWeight={800}
            fill="#2e7d4f"
            stroke={PAPER_HALO}
            strokeWidth={3}
            paintOrder="stroke"
            strokeLinejoin="round"
          >
            YOU
          </text>
        </g>
      )}
      {isGate ? (
        <polygon
          points={`${p.x},${p.y - 11} ${p.x + 11},${p.y} ${p.x},${p.y + 11} ${p.x - 11},${p.y}`}
          fill={RED}
          stroke={INK}
          strokeWidth={1.6}
        />
      ) : isSafehouse ? (
        <polygon
          points={`${p.x},${p.y - 11} ${p.x + 10},${p.y + 7} ${p.x - 10},${p.y + 7}`}
          fill="#2f6a5f"
          stroke={INK}
          strokeWidth={1.4}
        />
      ) : isDropSite ? (
        <rect
          x={p.x - 8.5}
          y={p.y - 8.5}
          width={17}
          height={17}
          fill="#efe6d2"
          stroke={INK}
          strokeWidth={1.8}
        />
      ) : (
        <circle cx={p.x} cy={p.y} r={10} fill="#d9cbb0" stroke={INK} strokeWidth={1.7} />
      )}
      {dropSlot !== undefined && (
        <>
          <circle cx={p.x} cy={p.y} r={5.5} fill={INK} />
          <text x={p.x} y={p.y + 2.5} textAnchor="middle" fontSize={7.5} fill="#f4c86a" fontWeight={700}>
            {dropSlot}
          </text>
        </>
      )}
      {marker && (
        <text
          x={p.x + 12}
          y={p.y - 10}
          fontSize={15}
          fontWeight={800}
          fill={MARKER_FILL[marker]}
          stroke={PAPER_HALO}
          strokeWidth={3}
          paintOrder="stroke"
          strokeLinejoin="round"
          pointerEvents="none"
        >
          {MARKER_GLYPH[marker]}
        </text>
      )}
    </g>
  );
}

function useMapInteractions() {
  const selected = useDD((s) => s.selected);
  const markers = useDD((s) => s.markers);
  const mode = useDD((s) => s.mode);
  const beliefHalo = useDD((s) => s.beliefHalo);
  const select = useDD((s) => s.select);
  return {
    selected,
    markers,
    mode,
    beliefHalo,
    onNodeClick: (n: NodeId) => select(n),
  };
}
