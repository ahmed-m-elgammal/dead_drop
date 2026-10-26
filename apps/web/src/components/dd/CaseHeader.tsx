'use client';

/**
 * Dead Drop — case file header (extracted from the W4 Sidebar).
 *
 * The single status anchor for the investigator seat: case number, day,
 * intel budget, action spend (probes today / armed stakeout), the public
 * config badges (glyph-matched to the map legend), the belief-halo toggle,
 * and the abandon control. Everything else in the right column (ActionBar,
 * markers, evidence) stays free of duplicated status.
 *
 * Presentation only — reads the same store projection the W4 sidebar read.
 */
import { Badge } from '@/components/ui/badge';
import { useDD } from '@/lib/dd/store';

/** Map-legend glyph icons so the badges cross-reference the map shapes. */
function GateGlyph() {
  return (
    <svg viewBox="0 0 10 10" className="h-2.5 w-2.5 shrink-0" aria-hidden>
      <polygon points="5,0.5 9.5,5 5,9.5 0.5,5" fill="#a62f2f" stroke="#e8ddc7" strokeWidth="1" />
    </svg>
  );
}
function DropGlyph() {
  return (
    <svg viewBox="0 0 10 10" className="h-2.5 w-2.5 shrink-0" aria-hidden>
      <rect x="1" y="1" width="8" height="8" fill="#e8ddc7" stroke="#0b101b" strokeWidth="1.4" />
    </svg>
  );
}
function SafehouseGlyph() {
  return (
    <svg viewBox="0 0 10 9" className="h-2.5 w-2.5 shrink-0" aria-hidden>
      <polygon points="5,0.5 9.5,8.5 0.5,8.5" fill="#3d7068" stroke="#e8ddc7" strokeWidth="0.9" />
    </svg>
  );
}

export default function CaseHeader() {
  const view = useDD((s) => s.view);
  const config = useDD((s) => s.config);
  const beliefHalo = useDD((s) => s.beliefHalo);
  const toggleHalo = useDD((s) => s.toggleHalo);
  const abandonCase = useDD((s) => s.abandonCase);
  const tutorial = useDD((s) => s.tutorial);

  if (!view || !config) return null;
  const totalDays = useDD.getState().session?.p.P1_days_per_case ?? 8;
  const armed = view.investigator.stakeout_armed;

  return (
    <div className="pixel-frame relative p-3">
      {/* file tab */}
      <div className="absolute -top-[10px] left-3 bg-amber px-2 py-0.5 font-pixel text-[7px] text-[#141005]">
        DEAD DROP · CASE №{String(config.seed % 100000).padStart(5, '0')}
      </div>

      {/* day + seed/IP */}
      <div className="mt-1 flex items-end justify-between">
        <div className="font-pixel text-sm text-paper">
          DAY {Math.min(view.day, totalDays)}
          <span className="text-fog-2">/{totalDays}</span>
          <span className="ml-2 font-type text-[10px] font-normal tracking-wide text-fog">
            {view.phase === 'FUGITIVE_MOVE' ? '· courier moving' : view.phase === 'INVESTIGATOR_ACTIONS' ? '· your phase' : ''}
          </span>
        </div>
        <div className="text-right font-term text-base leading-none text-fog">
          <div>
            seed <b className="text-amber-2">{config.seed}</b>
          </div>
          <div className="mt-0.5">
            IP <b className="text-amber-2">{view.investigator.intel}</b>
          </div>
        </div>
      </div>

      {/* action budget — the ONLY place this status lives */}
      <div className="mt-1.5 font-term text-sm text-fog">
        probes today{' '}
        <b className="text-paper">{view.investigator.probes_today}/2</b> ·{' '}
        {armed ? (
          <span className="font-bold text-blood-2">stakeout armed @ {armed}</span>
        ) : (
          'no stakeout armed'
        )}
      </div>

      {/* public config — glyph-matched to the map legend */}
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Badge variant="outline" className="gap-1.5 border-line-2 bg-ink-2 font-term text-sm text-fog">
          <SafehouseGlyph /> SH {config.safehouse}
        </Badge>
        <Badge variant="outline" className="gap-1.5 border-line-2 bg-ink-2 font-term text-sm text-fog">
          <DropGlyph /> DROP1 {config.drops[0]}
        </Badge>
        <Badge variant="outline" className="gap-1.5 border-line-2 bg-ink-2 font-term text-sm text-fog">
          <DropGlyph /> DROP2 {config.drops[1]}
        </Badge>
        <Badge variant="outline" className="gap-1.5 border-blood/60 bg-ink-2 font-term text-sm text-blood-2">
          <GateGlyph /> GATE {config.gate}
        </Badge>
      </div>

      {/* belief halo — compact one-line toggle */}
      <div className="mt-2.5 flex items-center gap-2">
        <button
          onClick={toggleHalo}
          data-on={beliefHalo}
          className="chip-pixel flex shrink-0 items-center gap-1.5 whitespace-nowrap px-2 py-0.5 text-sm"
        >
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${beliefHalo ? 'bg-teal' : 'bg-line-2'}`}
            aria-hidden
          />
          belief halo {beliefHalo ? 'ON' : 'OFF'}
        </button>
        <span className="truncate font-type text-[10px] text-fog-2">
          where they could be — public evidence only
        </span>
      </div>

      {!tutorial && (
        <button
          onClick={abandonCase}
          className="mt-2 font-type text-[10px] text-fog-2 underline hover:text-fog"
        >
          abandon case (clears the local record)
        </button>
      )}
    </div>
  );
}
