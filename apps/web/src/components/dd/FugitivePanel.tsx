'use client';

/**
 * Dead Drop — Fugitive case panel (M3 W3, 06-uiux S2).
 *
 * The fugitive-side single panel: role chip + phase strip, stamina bar,
 * drop/gate progress, route ribbon (the player's OWN submissions — their
 * private knowledge), the leak calendar (what the rules publish about them,
 * past and scheduled), and the commit area: tap a connected node → commit
 * sheet (edge class, SP cost, reveal-day warning) → COMMIT (irreversible —
 * §2 step 1). HOLD and the §9.13 stranded resolve live here too.
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
import { Button } from '@/components/ui/button';

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
    <div className="rounded-xl border bg-white p-3 shadow-sm">
      {/* phase strip */}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
        <span className="whitespace-nowrap font-semibold">
          {aiThinking || fview.phase === 'INVESTIGATOR_ACTIONS' ? (
            <span className="flex items-center gap-1.5 text-amber-700">
              <span className="inline-block h-2 w-2 animate-ping rounded-full bg-amber-500" />
              The Investigator is acting…
            </span>
          ) : myPhase ? (
            <span className="flex items-center gap-1.5 text-emerald-700">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
              Your move — Day {Math.min(fview.day, totalDays)}
            </span>
          ) : (
            <span className="text-neutral-400">Case over</span>
          )}
        </span>
        <span className="text-neutral-500">
          Day <b className="text-neutral-900">{Math.min(fview.day, totalDays)}</b>/{totalDays}
        </span>
      </div>

      {/* stamina bar */}
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="flex items-center gap-1 font-semibold text-neutral-700">
          <Zap className="h-3.5 w-3.5" /> Stamina
        </span>
        <span className="font-mono">
          {sp}<span className="text-neutral-400">/{spBudget} SP</span>
        </span>
      </div>
      <div className="mb-3 flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-neutral-100" role="img" aria-label={`Stamina ${sp} of ${spBudget}`}>
        {Array.from({ length: spBudget }, (_, i) => (
          <span
            key={i}
            className={`flex-1 ${i < sp ? (sp <= 3 ? 'bg-red-600' : sp <= 6 ? 'bg-amber-500' : 'bg-emerald-600') : 'bg-neutral-200'}`}
          />
        ))}
      </div>

      {/* drop + gate progress (public config) */}
      <div className="mb-3 grid grid-cols-3 gap-1.5 text-center text-[10px]">
        {[0, 1].map((i) => {
          const done = me.drops_collected > i;
          return (
            <div
              key={i}
              className={`rounded-lg border px-1 py-1.5 ${done ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-neutral-200 text-neutral-500'}`}
            >
              <div className="font-bold uppercase tracking-wide">Drop {i + 1}</div>
              <div className="font-mono">{done ? <Check className="mx-auto h-3.5 w-3.5" /> : config.drops[i]}</div>
            </div>
          );
        })}
        <div className={`rounded-lg border px-1 py-1.5 ${me.drops_collected === 2 ? 'border-amber-500 bg-amber-50 text-amber-800' : 'border-neutral-200 text-neutral-500'}`}>
          <div className="font-bold uppercase tracking-wide">Gate</div>
          <div className="font-mono">{config.gate}</div>
        </div>
      </div>

      {/* leak calendar */}
      <div className="mb-3">
        <div className="mb-1 flex items-center gap-1 text-xs font-semibold text-neutral-700">
          <Eye className="h-3.5 w-3.5" /> Leak calendar — what the rules publish about you
        </div>
        <div className="flex gap-1">
          {Array.from({ length: totalDays }, (_, i) => i + 1).map((d) => {
            const leak = leaks.get(d);
            const isToday = d === Math.min(fview.day, totalDays);
            const past = d < fview.day;
            return (
              <div
                key={d}
                className={`flex-1 rounded-md border px-0.5 py-1 text-center text-[9px] leading-tight ${
                  leak?.actual
                    ? 'border-red-300 bg-red-50 text-red-800'
                    : leak
                      ? 'border-amber-200 bg-amber-50 text-amber-700'
                      : 'border-neutral-200 text-neutral-400'
                } ${isToday ? 'ring-2 ring-neutral-900' : ''}`}
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
                <div className="font-bold">D{d}</div>
                <div>{leak?.actual ?? (leak?.kind === 'district' ? 'district' : leak?.kind === 'transit' ? 'transit' : d === totalDays ? 'end' : '—')}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* route ribbon */}
      <div className="mb-3">
        <div className="mb-1 flex items-center gap-1 text-xs font-semibold text-neutral-700">
          <MoveRight className="h-3.5 w-3.5" /> Your route so far
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <div className="flex shrink-0 items-center rounded-md bg-neutral-900 px-2 py-1 text-[10px] font-bold text-white">
            {config.safehouse}
          </div>
          {ribbonRows.map((r, i) => (
            <div key={i} className="flex shrink-0 items-center gap-1">
              <span className="text-[9px] text-neutral-400">D{r.day}</span>
              <div className="rounded-md border bg-white px-2 py-1 text-[10px] font-semibold text-neutral-700">
                {r.text}
              </div>
            </div>
          ))}
          {ribbonRows.length === 0 && (
            <span className="text-[10px] text-neutral-400">No moves yet — you start at the safehouse.</span>
          )}
        </div>
      </div>

      {/* commit area / bottom sheet */}
      {stranded ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-red-800">
            <AlertTriangle className="h-4 w-4" /> You are stranded (§9.13)
          </div>
          <p className="mt-1 text-[11px] leading-snug text-red-700">
            No affordable move and no affordable Hold. The day resolves as a forced Hold at no
            cost — holds_used unchanged.
          </p>
          <Button
            className="mt-2 w-full bg-red-800 hover:bg-red-900"
            disabled={!myPhase}
            onClick={() => commit(null)}
          >
            Resolve stranded day
          </Button>
        </div>
      ) : myPhase ? (
        <div className="rounded-lg bg-neutral-50 px-3 py-2 text-xs">
          {selected && targetLegal && edge ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1 font-mono text-sm font-bold">
                {CLASS_ICON[edge.cls === 'F' ? 'F' : edge.cls === 'T' ? 'T' : 'M']}
                {selected}
              </span>
              <span className="text-neutral-600">
                {CLASS_LABEL[edge.cls]} · {edge.cost} SP · leaves{' '}
                <b className={sp - edge.cost <= 3 ? 'text-red-700' : 'text-neutral-900'}>{sp - edge.cost}</b> SP
              </span>
              {leaks.get(Math.min(fview.day, totalDays))?.kind === 'transit' && !leaks.get(Math.min(fview.day, totalDays))?.actual && (
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                  transit class publishes tonight
                </span>
              )}
              <Button
                size="sm"
                className="ml-auto h-8 gap-1.5 bg-emerald-800 hover:bg-emerald-900"
                onClick={() => commit(selected)}
              >
                <Check className="h-3.5 w-3.5" /> Commit move
              </Button>
            </div>
          ) : selected && edge ? (
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold">{selected}</span>
              <span className="text-neutral-500">
                {CLASS_LABEL[edge.cls]} · {edge.cost} SP — not affordable now
              </span>
            </div>
          ) : (
            <span className="text-neutral-500">
              Tap a connected node to plan today&apos;s move.
            </span>
          )}
          {leg.hold && (
            <div className="mt-2 flex items-center gap-2 border-t pt-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5"
                onClick={() => commit(null)}
                title="Hold: spend 1 SP, stay put, can collect a pending drop (§3.3)"
              >
                <MinusCircle className="h-3.5 w-3.5" /> Hold here (1 SP)
              </Button>
              <span className="text-[10px] text-neutral-500">
                {me.holds_used}/{useDD.getState().session?.p.P6_hold_max ?? 2} holds used — a Hold can collect the pending drop.
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-500">
          {fview.verdict === null
            ? 'Read-only while the Investigator acts. Stakeouts you cannot see are possible (§5.2).'
            : 'Case closed — see the verdict.'}
        </div>
      )}

      {/* edge class costs footer */}
      <div className="mt-2 flex items-center gap-3 text-[10px] text-neutral-400">
        {(['F', 'T', 'M'] as const).map((c) => (
          <span key={c} className="flex items-center gap-1">
            {CLASS_ICON[c]} {CLASS_LABEL[c]} {CLASS_COST[c]} SP
          </span>
        ))}
      </div>
    </div>
  );
}
