'use client';

/**
 * Dead Drop — verdict + §8.6 case-end disclosure (M3 W2 logic, W4 skin).
 *
 * At case end the full logs reveal (03-rules §8.6): the true route day by
 * day, how every probe and stakeout landed, and the "what you missed" beat.
 * The replay is not a re-render — it IS the engine's disclosure(), so the
 * story shown is the same object a server would have persisted.
 * W4: the file SLAMS shut — a case-folder card, a verdict stamp, and the
 * verdict vignette art.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { VERDICT_WINNER, type CaseEndDisclosure, type FugitiveRouteEntry, type Verdict } from '@dead-drop/engine';
import { useDD } from '@/lib/dd/store';
import { starsFor } from '@/lib/dd/ladder';
import ReplayViewer, { type ReplayMeta } from '@/components/dd/ReplayViewer';

const VERDICT_ART: Partial<Record<Verdict, string>> = {
  CAPTURE: '/art/verdict-capture.png',
  ESCAPE: '/art/verdict-escape.png',
  EXPIRY: '/art/verdict-expiry.png',
};

export default function VerdictCard() {
  const disclosure = useDD((s) => s.disclosure);
  const config = useDD((s) => s.config);
  const record = useDD((s) => s.record);
  const view = useDD((s) => s.view);
  const role = useDD((s) => s.role);
  const tutorial = useDD((s) => s.tutorial);
  const startCase = useDD((s) => s.startCase);
  const abandonCase = useDD((s) => s.abandonCase);
  const [tab, setTab] = useState<'route' | 'evidence'>('route');
  const [replayOpen, setReplayOpen] = useState(false);

  if (!disclosure || !config || !record || disclosure.verdict === null) return null;
  if (role === 'investigator' && !view) return null;
  const verdict: Verdict = disclosure.verdict;
  const winner = VERDICT_WINNER[verdict];
  // Role-scoped win framing: the same verdict reads differently per seat.
  const won = role === 'fugitive' ? winner === 'FUGITIVE' : winner === 'INVESTIGATOR';
  const isTutorial = record.source === 'tutorial';
  const stars = role === 'investigator' && view ? starsFor(verdict, view.investigator.intel) : null;
  const replayMeta: ReplayMeta = {
    seed: record.seed,
    archetype: record.archetype,
    role,
    stars: record.source === 'ladder' && stars !== null ? stars : null,
    source: record.source,
  };
  const art = VERDICT_ART[verdict];

  const misses = disclosure.private_log_investigator.filter((e) => e.kind === 'STAKEOUT_MISS').length;
  const probeHits = disclosure.private_log_investigator.filter(
    (e) => e.kind === 'PROBE_RESULT' && e.result === 'HIT',
  ).length;
  const stranded = disclosure.log.filter((e) => e.kind === 'STRANDED').length;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/88 p-4" role="dialog" aria-modal>
        <div className="paper-card relative max-h-[92vh] w-full max-w-lg overflow-hidden">
          {/* folder header — the stamp slams */}
          <div className="relative">
            {art && (
              <>
                <img src={art} alt="" className="art h-36 w-full object-cover object-top sm:h-44" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#241d10] via-[#241d10]/30 to-transparent" />
              </>
            )}
            <div className={`absolute inset-x-0 ${art ? 'bottom-2' : 'top-4'} px-5`}>
              <div className="flex items-center justify-between">
                <div className="font-type text-[10px] uppercase tracking-[0.2em] text-paper/75">
                  Case closed{record.source === 'ladder' ? ' · case wall' : ''} · you were the{' '}
                  {role === 'fugitive' ? 'Courier' : 'Investigator'}
                </div>
                {record.source === 'ladder' && stars !== null && (
                  <div className="font-pixel text-xs text-amber-2" aria-label={`${stars} of 3 stars`}>
                    {'★'.repeat(stars)}
                    <span className="opacity-40">{'★'.repeat(3 - stars)}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="pointer-events-none absolute right-4 top-3 select-none">
              <span
                className={`stamp stamp-in ${won ? 'border-mint text-mint' : 'border-blood-2 text-blood-2'}`}
                style={{ fontSize: '1rem' }}
              >
                {verdict}
              </span>
            </div>
          </div>

          <div className="border-t-4 border-[#241d10]/70 bg-[#efe6d2] px-5 pb-1 pt-3">
            <div className="font-pixel text-sm text-[#241d10]">
              {won
                ? role === 'fugitive'
                  ? 'THE ROUTE HELD'
                  : 'THE NET HELD'
                : role === 'fugitive'
                  ? 'THE NET CLOSED'
                  : 'THE TRAIL WENT COLD'}
            </div>
            <p className="mt-1.5 pb-2 font-type text-[12px] leading-relaxed text-[#4a3d27]">
              {won
                ? role === 'fugitive'
                  ? 'You win — the city keeps its secrets and you keep your shadow.'
                  : 'You win — the city keeps its secrets and the Courier keeps its cell.'
                : role === 'fugitive'
                  ? 'The Investigator wins — the net closed where you stood.'
                  : 'The Courier wins — the route held, the trail went cold.'}
            </p>
          </div>

          <div className="flex gap-2 border-y border-[#b3a37f] bg-[#e6dbc2] px-4 py-2">
            {(['route', 'evidence'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1 font-term text-base uppercase tracking-wide ${
                  tab === t ? 'bg-[#241d10] text-paper' : 'bg-[#d9cbae] text-[#6b5b3e] hover:bg-[#cdbd9a]'
                }`}
              >
                {t === 'route' ? 'true route' : 'your evidence'}
              </button>
            ))}
          </div>

          <div className="max-h-[42vh] overflow-y-auto bg-[#efe6d2] px-4 py-3">
            {tab === 'route' ? (
              <table className="w-full font-type text-xs text-[#33291a]">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wide text-[#8a7a58]">
                    <th className="py-1">Day</th>
                    <th>Action</th>
                    <th>Class</th>
                    <th className="text-right">SP</th>
                  </tr>
                </thead>
                <tbody>
                  {disclosure.fugitive_route.map((r: FugitiveRouteEntry, i) => (
                    <tr key={i} className="border-t border-[#d3c5a2]">
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
              <div className="space-y-2 font-type text-xs text-[#33291a]">
                <p className="font-bold">What the public record showed</p>
                <ul className="space-y-1">
                  {disclosure.log
                    .filter((e) => e.kind !== 'DAY_MARKER')
                    .map((e, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="w-6 font-mono text-[#8a7a58]">D{e.day}</span>
                        <span>{publicLine(e)}</span>
                      </li>
                    ))}
                </ul>
                <p className="pt-2 font-bold">
                  {role === 'fugitive' ? 'Their private results (revealed at close, §8.6)' : 'Your private results'}
                </p>
                <ul className="space-y-1">
                  {disclosure.private_log_investigator.map((e, i) => (
                    <li key={i} className="flex gap-2 text-[#4a3d27]">
                      <span className="w-6 font-mono text-[#8a7a58]">D{e.day}</span>
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
                <p className="border border-dashed border-[#b3a37f] bg-[#e6dbc2] p-2.5 text-[#4a3d27]">
                  <b>{role === 'fugitive' ? 'The read against you:' : 'What you missed:'}</b> {misses} silent stakeout{misses === 1 ? '' : 's'} burned {misses * 3} IP ·{' '}
                  {probeHits} probe hit{probeHits === 1 ? '' : 's'} · the Courier stranded{' '}
                  {stranded} day{stranded === 1 ? '' : 's'} (§9.13) · total route cost{' '}
                  {disclosure.fugitive_route.reduce((a, r) => a + r.sp_cost, 0)} of 12 SP.
                </p>
              </div>
            )}
          </div>

          {!isTutorial && (
            <div className="flex gap-2 border-t border-[#b3a37f] bg-[#efe6d2] p-3">
              <Button
                className="btn-pixel-ghost flex-1 border-line-2 font-term"
                variant="outline"
                onClick={() => setReplayOpen(true)}
              >
                Watch the replay
              </Button>
              <Button
                className="btn-pixel flex-1 font-term uppercase"
                onClick={() =>
                  startCase(record.seed, {
                    role,
                    archetype: record.archetype,
                    source: record.source,
                    ladderIndex: record.ladderIndex ?? null,
                  })
                }
              >
                Rematch
              </Button>
              <Button variant="ghost" className="font-term text-fog hover:text-paper" onClick={abandonCase}>
                Home
              </Button>
            </div>
          )}
        </div>
      </div>

      {replayOpen && (
        <ReplayViewer config={config} disclosure={disclosure} meta={replayMeta} onClose={() => setReplayOpen(false)} />
      )}
    </>
  );
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
