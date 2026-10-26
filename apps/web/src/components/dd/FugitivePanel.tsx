'use client';

/**
 * Dead Drop — Fugitive case panel (M3 W3 logic, W4 noir skin).
 *
 * The fugitive-side single panel, now the Courier's operating card: role
 * strip, stamina as a film-strip of SP cells, drop/gate progress, the
 * player's own route ribbon, the leak calendar (what the rules publish
 * about them, past and scheduled), and the commit sheet.
 *
 * Information wall: everything rendered comes from `fugitiveView()` — own
 * position/stamina/drops/holds, the public log, the public config. The
 * Investigator's probes and stakeouts are NEVER rendered (§5.2: silent).
 */
import { useMemo } from 'react';
import {
  AlertTriangle,
  Check,
  Eye,
  Footprints,
  MinusCircle,
  MoveRight,
  TrainFront,
  TramFront,
  Zap,
} from 'lucide-react';
import {
  cheapestEdgeTo,
  fugitiveLegality,
  type CaseConfig,
  type FugitiveView,
  type ValidatedMap,
} from '@dead-drop/engine';
import { useDD } from '@/lib/dd/store';

const CLASS_LABEL: Record<string, string> = { F: 'Foot', T: 'Tram', M: 'Metro' };
const CLASS_COST: Record<string, number> = { F: 1, T: 2, M: 3 };
const CLASS_ICON: Record<string, React.ReactNode> = {
  F: <Footprints className="h-3.5 w-3.5" />,
  T: <TramFront className="h-3.5 w-3.5" />,
  M: <TrainFront className="h-3.5 w-3.5" />,
};

export default function FugitivePanel({ vm, fview, config }: {
  vm: ValidatedMap;
  fview: FugitiveView;
  config: CaseConfig;
}) {
  const selected = useDD((s) => s.selected);
  const select = useDD((s) => s.select);
  const commit = useDD((s) => s.fugitiveCommit);
  const aiThinking = useDD((s) => s.aiThinking);
  const record = useDD((s) => s.record);
  const totalDays = useDD.getState().session?.p.P1_days_per_case ?? 8;

  const me = fview.fugitive;
  // Computed fresh every render — fview.fugitive is the engine's live nested
  // object (stable identity), so a useMemo keyed on it would go stale.
  const leg = fugitiveLegality(vm, { fugitive: me }, useDD.getState().session?.p);
  const stranded = leg.moves.length === 0 && !leg.hold;
  const myPhase = fview.phase === 'FUGITIVE_MOVE' && fview.verdict === null;

  // Selected target's edge (cheapest parallel, T15) — for the commit sheet.
  const edge = selected ? cheapestEdgeTo(vm, me.position, selected) : null;
  const targetLegal = selected !== null && leg.moves.includes(selected);

  // Route ribbon — the player's own journal plus §9.13 forced holds (which
  // are engine-produced and appear as public STRANDED events).
  const ribbonRows: Array<{ day: number; text: string; cls: string | null }> = (() => {
    const rows: Array<{ day: number; text: string; cls: string | null }> = [];
    let j = 0;
    for (const ev of fview.log) {
      if (ev.kind === 'STRANDED') {
        rows.push({ day: ev.day, text: 'Stranded — forced Hold (§9.13)', cls: null });
        continue;
      }
      // Interleave journal submissions by submission order; day markers in
      // the log give the day headers implicitly.
      while (record && j < record.fugitive.length) {
        const env = record.fugitive[j]!;
        const day = Number.parseInt(env.idempotency_key.split('-')[1] ?? '0', 10);
        if (day > ev.day) break;
        rows.push({
          day,
          text: env.action.kind === 'HOLD' ? 'Hold' : `Move → ${env.action.to}`,
          cls: null,
        });
        j++;
      }
    }
    while (record && j < record.fugitive.length) {
      const env = record.fugitive[j]!;
      const day = Number.parseInt(env.idempotency_key.split('-')[1] ?? '0', 10);
      rows.push({
        day,
        text: env.action.kind === 'HOLD' ? 'Hold' : `Move → ${env.action.to}`,
        cls: null,
      });
      j++;
    }
    void config;
    return rows;
  })();

  // Leak calendar — scheduled reveals (public config) + what actually leaked.
  const leaks = useMemo(() => {
    const out = new Map<number, { kind: string; actual: string | null }>();
    for (const d of config.reveal_schedule.district_days) {
      out.set(d, { kind: 'district', actual: null });
    }
    for (const d of config.reveal_schedule.transit_days) {
      out.set(d, { kind: 'transit', actual: null });
    }
    for (const ev of fview.log) {
      const slot = out.get(ev.day);
      if (ev.kind === 'DISTRICT_REVEAL' && slot?.kind === 'district') {
        slot.actual = `they saw ${ev.district}`;
      } else if (ev.kind === 'TRANSIT_REVEAL' && slot?.kind === 'transit') {
        slot.actual = ev.move_class === 'NO_MOVEMENT' ? 'they saw "no movement"' : `they saw ${CLASS_LABEL[ev.move_class] ?? ev.move_class}`;
      }
    }
    return out;
  }, [config, fview.log]);

  const sp = me.stamina;
  const spBudget = config.stamina_budget;

  return (
    <div className="pixel-frame relative p-3">
      {aiThinking && <div className="thinking-strip absolute inset-x-0 top-0 h-1" aria-hidden />}

      {/* phase strip */}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <span className="whitespace-nowrap font-term text-lg leading-none">
          {aiThinking || fview.phase === 'INVESTIGATOR_ACTIONS' ? (
            <span className="flex items-center gap-1.5 text-amber-2">
              <span className="inline-block h-2 w-2 animate-ping rounded-full bg-amber-2" />
              THE INVESTIGATOR IS ACTING…
            </span>
          ) : myPhase ? (
            <span className="flex items-center gap-1.5 text-mint">
              <span className="inline-block h-2 w-2 rounded-full bg-mint" />
              YOUR MOVE — DAY {Math.min(fview.day, totalDays)}
            </span>
          ) : (
            <span className="text-fog-2">CASE OVER</span>
          )}
        </span>
        <span className="font-term text-base text-fog">
          DAY <b className="text-amber-2">{Math.min(fview.day, totalDays)}</b>/{totalDays}
        </span>
      </div>

      {/* stamina — the film strip */}
      <div className="mb-1 flex items-center justify-between">
        <span className="flex items-center gap-1 font-term text-base uppercase tracking-wider text-fog">
          <Zap className="h-3.5 w-3.5 text-amber" /> stamina
        </span>
        <span className="font-term text-lg text-paper">
          {sp}<span className="text-fog-2">/{spBudget} SP</span>
        </span>
      </div>
      <div className="mb-3 flex h-3 gap-[3px]" role="img" aria-label={`Stamina ${sp} of ${spBudget}`}>
        {Array.from({ length: spBudget }, (_, i) => (
          <span
            key={i}
            className={`flex-1 transition-colors ${
              i < sp
                ? sp <= 3
                  ? 'bg-blood-2 shadow-[inset_0_0_0_1px_rgba(232,221,199,.35)]'
                  : sp <= 6
                    ? 'bg-amber shadow-[inset_0_0_0_1px_rgba(20,16,5,.4)]'
                    : 'bg-mint shadow-[inset_0_0_0_1px_rgba(20,16,5,.4)]'
                : 'bg-ink-2 shadow-[inset_0_0_0_1px_rgba(42,56,80,.8)]'
            }`}
          />
        ))}
      </div>

      {/* drop + gate progress */}
      <div className="mb-3 grid grid-cols-3 gap-1.5 text-center">
        {[0, 1].map((i) => {
          const done = me.drops_collected > i;
          return (
            <div
              key={i}
              className={`border px-1 py-1.5 ${
                done
                  ? 'border-mint/70 bg-mint/10'
                  : 'border-line bg-ink-2'
              }`}
            >
              <div className="font-term text-sm uppercase tracking-widest text-fog">Drop {i + 1}</div>
              <div className={`font-term text-xl ${done ? 'text-mint' : 'text-amber-2'}`}>
                {done ? <Check className="mx-auto h-4 w-4" /> : config.drops[i]}
              </div>
            </div>
          );
        })}
        <div className={`border px-1 py-1.5 ${me.drops_collected === 2 ? 'border-amber bg-amber/10' : 'border-line bg-ink-2'}`}>
          <div className="font-term text-sm uppercase tracking-widest text-fog">Gate</div>
          <div className={`font-term text-xl ${me.drops_collected === 2 ? 'text-amber-2' : 'text-fog'}`}>{config.gate}</div>
        </div>
      </div>

      {/* leak calendar — the surveillance strip */}
      <div className="mb-3">
        <div className="mb-1 flex items-center gap-1 font-term text-base uppercase tracking-wider text-fog">
          <Eye className="h-3.5 w-3.5 text-blood-2" /> leak calendar — what the paper publishes
        </div>
        <div className="flex gap-1">
          {Array.from({ length: totalDays }, (_, i) => i + 1).map((d) => {
            const leak = leaks.get(d);
            const isToday = d === Math.min(fview.day, totalDays);
            return (
              <div
                key={d}
                className={`flex-1 border px-0.5 py-1 text-center ${
                  leak?.actual
                    ? 'border-blood-2/80 bg-blood/20'
                    : leak
                      ? 'border-amber/60 bg-amber/10'
                      : 'border-line bg-ink-2'
                } ${isToday ? 'shadow-[0_0_0_2px_#e8a33d]' : ''}`}
                title={
                  leak?.kind === 'district'
                    ? `District reveal${leak.actual ? ` — ${leak.actual}` : ' scheduled'}`
                    : leak?.kind === 'transit'
                      ? `Transit class reveal${leak.actual ? ` — ${leak.actual}` : ' scheduled'}`
                      : d === totalDays
                        ? 'Last day — stakeouts forbidden (§9.3); expiry closes the case'
                        : 'No scheduled reveal'
                }
              >
                <div className="font-term text-sm leading-none text-fog">D{d}</div>
                <div className={`font-type text-[8.5px] leading-tight ${leak?.actual ? 'text-blood-2' : 'text-fog-2'}`}>
                  {leak?.actual ?? (leak?.kind === 'district' ? 'district' : leak?.kind === 'transit' ? 'transit' : d === totalDays ? 'end' : '—')}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* route ribbon — your shadow's path */}
      <div className="mb-3">
        <div className="mb-1 flex items-center gap-1 font-term text-base uppercase tracking-wider text-fog">
          <MoveRight className="h-3.5 w-3.5 text-amber" /> your route so far
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <div className="shrink-0 border border-teal bg-teal/25 px-2 py-1 font-term text-base text-paper">
            {config.safehouse}
          </div>
          {ribbonRows.map((r, i) => (
            <div key={i} className="flex shrink-0 items-center gap-1">
              <span className="font-term text-sm text-fog-2">D{r.day}</span>
              <div className="border border-line-2 bg-panel-2 px-2 py-1 font-term text-sm text-paper">
                {r.text}
              </div>
            </div>
          ))}
          {ribbonRows.length === 0 && (
            <span className="font-type text-[10px] text-fog-2">No moves yet — you start at the safehouse.</span>
          )}
        </div>
      </div>

      {/* commit area / bottom sheet */}
      {stranded ? (
        <div className="border border-blood-2/70 bg-blood/15 p-3">
          <div className="flex items-center gap-1.5 font-term text-lg uppercase text-blood-2">
            <AlertTriangle className="h-4 w-4" /> you are stranded (§9.13)
          </div>
          <p className="mt-1 font-type text-[11px] leading-snug text-fog">
            No affordable move and no affordable Hold. The day resolves as a forced Hold at no
            cost — holds_used unchanged.
          </p>
          <button
            className="btn-pixel mt-2 w-full py-2 uppercase"
            disabled={!myPhase}
            onClick={() => commit(null)}
          >
            resolve stranded day
          </button>
        </div>
      ) : myPhase ? (
        <div className="border border-line bg-ink-2 px-3 py-2">
          {selected && targetLegal && edge ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1 font-term text-xl text-amber-2">
                {CLASS_ICON[edge.cls === 'F' ? 'F' : edge.cls === 'T' ? 'T' : 'M']}
                {selected}
              </span>
              <span className="font-type text-xs text-fog">
                {CLASS_LABEL[edge.cls]} · {edge.cost} SP · leaves{' '}
                <b className={sp - edge.cost <= 3 ? 'text-blood-2' : 'text-paper'}>{sp - edge.cost}</b> SP
              </span>
              {leaks.get(Math.min(fview.day, totalDays))?.kind === 'transit' && !leaks.get(Math.min(fview.day, totalDays))?.actual && (
                <span className="bg-amber/20 px-1.5 py-0.5 font-type text-[10px] text-amber-2">
                  transit class publishes tonight
                </span>
              )}
              <button
                className="btn-pixel ml-auto h-8 px-4 text-base"
                onClick={() => commit(selected)}
              >
                <span className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5" /> commit
                </span>
              </button>
            </div>
          ) : selected && edge ? (
            <div className="flex items-center gap-2">
              <span className="font-term text-xl text-amber-2">{selected}</span>
              <span className="font-type text-xs text-fog">
                {CLASS_LABEL[edge.cls]} · {edge.cost} SP — not affordable now
              </span>
            </div>
          ) : (
            <span className="font-type text-xs text-fog">
              Tap a connected node to plan today&apos;s move.
            </span>
          )}
          {leg.hold && (
            <div className="mt-2 flex items-center gap-2 border-t border-line pt-2">
              <button
                className="btn-pixel-ghost h-8 shrink-0 whitespace-nowrap px-3 text-base"
                onClick={() => commit(null)}
                title="Hold: spend 1 SP, stay put, can collect a pending drop (§3.3)"
              >
                <span className="flex items-center gap-1.5">
                  <MinusCircle className="h-3.5 w-3.5" /> Hold here (1 SP)
                </span>
              </button>
              <span className="font-type text-[10px] text-fog-2">
                {me.holds_used}/{useDD.getState().session?.p.P6_hold_max ?? 2} holds used — a Hold can collect the pending drop.
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="border border-line bg-ink-2 px-3 py-2 font-type text-xs text-fog">
          {fview.verdict === null
            ? 'Read-only while the Investigator acts. Stakeouts you cannot see are possible (§5.2).'
            : 'Case closed — see the verdict.'}
        </div>
      )}

      {/* edge class costs footer */}
      <div className="mt-2 flex items-center gap-3 font-term text-sm text-fog-2">
        {(['F', 'T', 'M'] as const).map((c) => (
          <span key={c} className="flex items-center gap-1">
            {CLASS_ICON[c]} {CLASS_LABEL[c]} {CLASS_COST[c]} SP
          </span>
        ))}
      </div>
    </div>
  );
}
