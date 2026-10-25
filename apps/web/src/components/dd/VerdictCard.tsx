'use client';

/**
 * Dead Drop — verdict + §8.6 case-end disclosure (M3 W1, 06-uiux S6 lite).
 *
 * At case end the full logs reveal (03-rules §8.6): the true route day by
 * day, how every probe and stakeout landed, and the "what you missed" beat.
 * The replay is not a re-render — it IS the engine's disclosure(), so the
 * story shown is the same object a server would have persisted.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { VERDICT_WINNER, type CaseEndDisclosure, type FugitiveRouteEntry } from '@dead-drop/engine';
import { useDD } from '@/lib/dd/store';

export default function VerdictCard() {
  const disclosure = useDD((s) => s.disclosure);
  const startCase = useDD((s) => s.startCase);
  const abandonCase = useDD((s) => s.abandonCase);
  const [tab, setTab] = useState<'route' | 'evidence'>('route');

  if (!disclosure) return null;
  const winner = VERDICT_WINNER[disclosure.verdict];
  const won = winner === 'INVESTIGATOR';

  const misses = disclosure.private_log_investigator.filter((e) => e.kind === 'STAKEOUT_MISS').length;
  const probeHits = disclosure.private_log_investigator.filter(
    (e) => e.kind === 'PROBE_RESULT' && e.result === 'HIT',
  ).length;
  const stranded = disclosure.log.filter((e) => e.kind === 'STRANDED').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal>
      <div className="max-h-[92vh] w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className={`px-6 py-5 text-white ${won ? 'bg-emerald-800' : 'bg-red-900'}`}>
          <div className="text-[11px] font-bold uppercase tracking-[2px] opacity-70">Case closed</div>
          <div className="text-3xl font-black">{disclosure.verdict}</div>
          <div className="mt-1 text-sm opacity-90">
            {won
              ? winner === 'INVESTIGATOR'
                ? 'You win — the city keeps its secrets and the fugitive keeps its cell.'
                : ''
              : 'The Fugitive wins — the route held, the trail went cold.'}
          </div>
        </div>

        <div className="flex gap-2 px-4 pt-3">
          {(['route', 'evidence'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                tab === t ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
              }`}
            >
              {t === 'route' ? 'True route' : 'Your evidence'}
            </button>
          ))}
        </div>

        <div className="max-h-[46vh] overflow-y-auto px-4 py-3">
          {tab === 'route' ? (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wide text-neutral-400">
                  <th className="py-1">Day</th>
                  <th>Action</th>
                  <th>Class</th>
                  <th className="text-right">SP</th>
                </tr>
              </thead>
              <tbody>
                {disclosure.fugitive_route.map((r: FugitiveRouteEntry, i) => (
                  <tr key={i} className="border-t">
                    <td className="py-1.5 font-mono">{r.day}</td>
                    <td>
                      {r.action.kind === 'MOVE'
                        ? `${r.from} → ${r.to}`
                        : r.action.kind === 'FORCED_HOLD'
                          ? 'Stranded (forced Hold, §9.13)'
                          : `Hold at ${r.from}`}
                    </td>
                    <td>{r.edge_class ?? '—'}</td>
                    <td className="text-right font-mono">{r.sp_cost}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="space-y-2 text-xs">
              <p className="font-semibold text-neutral-700">What the public record showed</p>
              <ul className="space-y-1">
                {disclosure.log
                  .filter((e) => e.kind !== 'DAY_MARKER')
                  .map((e, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="w-6 font-mono text-neutral-400">D{e.day}</span>
                      <span>{publicLine(e)}</span>
                    </li>
                  ))}
              </ul>
              <p className="pt-2 font-semibold text-neutral-700">Your private results</p>
              <ul className="space-y-1">
                {disclosure.private_log_investigator.map((e, i) => (
                  <li key={i} className="flex gap-2 text-neutral-600">
                    <span className="w-6 font-mono text-neutral-400">D{e.day}</span>
                    <span>
                      {e.kind === 'PROBE_RESULT'
                        ? `Probe @ ${e.target} → ${e.result}`
                        : e.kind === 'STAKEOUT_PLACED'
                          ? `Stakeout armed @ ${e.target}`
                          : `Stakeout @ ${e.target} missed silently`}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="rounded-lg bg-neutral-50 p-2.5 text-neutral-600">
                <b>What you missed:</b> {misses} silent stakeout{misses === 1 ? '' : 's'} burned {misses * 3} IP ·{' '}
                {probeHits} probe hit{probeHits === 1 ? '' : 's'} · the Fugitive stranded{' '}
                {stranded} day{stranded === 1 ? '' : 's'} (§9.13) · total route cost{' '}
                {disclosure.fugitive_route.reduce((a, r) => a + r.sp_cost, 0)} of 12 SP.
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-2 border-t p-4">
          <Button className="flex-1" onClick={() => startCase(disclosureSeed())}>
            Rematch — same seed
          </Button>
          <Button className="flex-1" variant="outline" onClick={() => startCase(randomSeed())}>
            New case — fresh seed
          </Button>
          <Button variant="ghost" onClick={abandonCase}>
            Home
          </Button>
        </div>
      </div>
    </div>
  );
}

function disclosureSeed(): number {
  const s = useDD.getState().config?.seed;
  return typeof s === 'number' ? s : randomSeed();
}

function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}

function publicLine(e: CaseEndDisclosure['log'][number]): string {
  switch (e.kind) {
    case 'DISTRICT_REVEAL':
      return `District reveal — they were in ${e.district}.`;
    case 'TRANSIT_REVEAL':
      return e.move_class === 'NO_MOVEMENT' ? 'Transit reveal — "no movement".' : `Transit reveal — ${e.move_class} that day.`;
    case 'DROP_COMPLETED':
      return `Drop ${e.slot} completed at ${e.site}.`;
    case 'STRANDED':
      return 'Stranded (§9.13).';
    case 'VERDICT':
      return `Verdict: ${e.verdict}.`;
    case 'DAY_MARKER':
      return `Day ${e.day}.`;
  }
}
