'use client';

/**
 * Dead Drop — interactive city map (M3 W1, 06-uiux §2).
 *
 * Vector map, fixed layout (roadmap M3 risk note: no renderer scope creep):
 * paper-map geometry, three edge passes (M under T under F), glyph-coded
 * pools, radial id labels. Interactivity W1: tap-select (hit target grows
 * with zoom), button zoom + drag pan, belief halo (rules-mechanical, off by
 * default), reveal tint, drop badges, armed-stakeout ring, today's HIT pins.
 * Belief markers (?/!/✕) are LOCAL-only — never part of engine state.
 */
import { useMemo, useRef, useState } from 'react';
import type { CaseConfig, FugitiveView, InvestigatorView, NodeId, ValidatedMap } from '@dead-drop/engine';
import { candidateSet } from '@/lib/dd/belief';
import { buildLayout, EDGE_STYLE, sortedEdges, type NodeLayout } from '@/lib/dd/geometry';
import { useDD, type MarkerKind } from '@/lib/dd/store';

const MARKER_GLYPH: Record<MarkerKind, string> = { possible: '?', pinned: '!', cleared: '✕' };
const MARKER_FILL: Record<MarkerKind, string> = {
  possible: '#274e8f',
  pinned: '#8a1c1c',
  cleared: '#555555',
};

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

  const cursor =
    mode === 'inspect' ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer';

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl border bg-[#faf9f6]">
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
        <g transform={`translate(${tx} ${ty}) scale(${k})`}>
          {/* district plates + names */}
          {layout.districts.map((d) => {
            const revealedDay = revealedDistricts.get(d.id);
            return (
              <g key={d.id}>
                <circle
                  cx={d.x}
                  cy={d.y}
                  r={d.plateR}
                  fill={revealedDay !== undefined ? '#e8edf6' : '#f4f4f2'}
                  stroke={revealedDay !== undefined ? '#274e8f' : '#c9c9c4'}
                  strokeWidth={revealedDay !== undefined ? 2 : 1.2}
                />
                <text
                  x={d.labelX}
                  y={d.labelY}
                  textAnchor="middle"
                  fontSize={15}
                  fontWeight={700}
                  fill={revealedDay !== undefined ? '#274e8f' : '#8a8a84'}
                  className="uppercase"
                  style={{ letterSpacing: 1.5 }}
                >
                  {d.name}
                </text>
                {revealedDay !== undefined && (
                  <text x={d.labelX} y={d.labelY + 15} textAnchor="middle" fontSize={10} fill="#274e8f">
                    revealed day {revealedDay}
                  </text>
                )}
              </g>
            );
          })}

          {/* edges — three passes so Foot reads on top of Tram on top of Metro */}
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
                  fill="rgba(39,78,143,0.14)"
                  stroke="rgba(39,78,143,0.45)"
                  strokeWidth={1}
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
                  stroke="#8a1c1c"
                  strokeWidth={2.4}
                  strokeDasharray="6,4"
                  className="animate-pulse"
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

          {/* labels — non-interactive layer (pointer-events none) */}
          {[...layout.nodes.values()].map((p) => (
            <text
              key={`label-${p.id}`}
              x={p.x + p.ux * 24}
              y={p.y + p.uy * 24 + 3.5}
              textAnchor={p.ux > 0.35 ? 'start' : p.ux < -0.35 ? 'end' : 'middle'}
              fontSize={10.5}
              fontWeight={
                vm.map.gates.includes(p.id) || vm.map.safehouses.includes(p.id) || vm.map.drop_candidates.includes(p.id)
                  ? 700
                  : 400
              }
              fill="#333"
              pointerEvents="none"
            >
              {p.id}
            </text>
          ))}
        </g>
      </svg>

      {/* zoom controls */}
      <div className="absolute right-3 top-3 flex flex-col gap-1.5">
        <button
          onClick={() => zoomBy(1.35)}
          className="h-9 w-9 rounded-md border bg-white text-lg font-bold shadow-sm hover:bg-neutral-50"
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          onClick={() => zoomBy(1 / 1.35)}
          className="h-9 w-9 rounded-md border bg-white text-lg font-bold shadow-sm hover:bg-neutral-50"
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
          className="h-9 w-9 rounded-md border bg-white text-[10px] font-bold shadow-sm hover:bg-neutral-50"
          aria-label="Reset view"
        >
          FIT
        </button>
      </div>

      {/* legend */}
      <div className="absolute bottom-2.5 left-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border bg-white/95 px-2.5 py-1.5 text-[10px] text-neutral-700 shadow-sm">
        <span className="flex items-center gap-1">
          <svg width="14" height="8"><line x1="0" y1="4" x2="14" y2="4" stroke="#1a1a1a" strokeWidth="1.6" /></svg>
          Foot 1 SP
        </span>
        <span className="flex items-center gap-1">
          <svg width="14" height="8"><line x1="0" y1="4" x2="14" y2="4" stroke="#b0722c" strokeWidth="2.2" strokeDasharray="5,4" /></svg>
          Tram 2
        </span>
        <span className="flex items-center gap-1">
          <svg width="14" height="8"><line x1="0" y1="4" x2="14" y2="4" stroke="#274e8f" strokeWidth="4" /></svg>
          Metro 3
        </span>
        <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 border-[1.5px] border-neutral-800 bg-white" /> drop site</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rotate-45 border-[1.5px] border-neutral-900 bg-neutral-900" /> gate</span>
        <span className="flex items-center gap-1"><span className="inline-block h-0 w-0 border-x-[5px] border-b-[9px] border-x-transparent border-b-neutral-900" /> safehouse</span>
      </div>
    </div>
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
      {/* invisible hit area — makes the whole glyph a stable target (06-uiux §2:
          node hit targets grow toward 44px with zoom; also shields clicks from
          the district plate circle underneath) */}
      <circle cx={p.x} cy={p.y} r={16} fill="transparent" stroke="none" />
      {isSelected && <circle cx={p.x} cy={p.y} r={19} fill="none" stroke="#111" strokeWidth={2} />}
      {hitPin && <circle cx={p.x} cy={p.y} r={19} fill="none" stroke="#b8860b" strokeWidth={2} />}
      {meHere && (
        <g pointerEvents="none">
          <circle cx={p.x} cy={p.y} r={15} fill="#1a7a3a" opacity={0.25} />
          <circle cx={p.x} cy={p.y} r={15} fill="none" stroke="#1a7a3a" strokeWidth={2.2} />
          <text x={p.x} y={p.y - 20} textAnchor="middle" fontSize={9.5} fontWeight={800} fill="#1a7a3a">
            YOU
          </text>
        </g>
      )}
      {isGate ? (
        <polygon
          points={`${p.x},${p.y - 11} ${p.x + 11},${p.y} ${p.x},${p.y + 11} ${p.x - 11},${p.y}`}
          fill="#111"
          stroke="#111"
          strokeWidth={2}
        />
      ) : isSafehouse ? (
        <polygon
          points={`${p.x},${p.y - 11} ${p.x + 10},${p.y + 7} ${p.x - 10},${p.y + 7}`}
          fill="#111"
        />
      ) : isDropSite ? (
        <rect
          x={p.x - 8.5}
          y={p.y - 8.5}
          width={17}
          height={17}
          fill="#fff"
          stroke="#111"
          strokeWidth={1.8}
        />
      ) : (
        <circle cx={p.x} cy={p.y} r={10} fill="#fff" stroke="#111" strokeWidth={1.6} />
      )}
      {dropSlot !== undefined && (
        <>
          <circle cx={p.x} cy={p.y} r={5.5} fill="#111" />
          <text x={p.x} y={p.y + 2.5} textAnchor="middle" fontSize={7.5} fill="#fff" fontWeight={700}>
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
