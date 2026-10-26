'use client';

/**
 * Dead Drop — case history (M3 W2 logic, W4 skin): THE ARCHIVE drawer.
 * Closed cases archived in IndexedDB; the §8.6 replay is REBUILT from
 * (seed + archetype + journal) through the real engine, so every listed
 * case replays exactly as it happened.
 */
import { useEffect, useState } from 'react';
import { Play, Trash2, X } from 'lucide-react';
import { ARCHETYPES } from '@/lib/dd/archetypes';
import {
  deleteCaseRecord,
  listCaseRecords,
  replayCase,
  type HistoryRecord,
} from '@/lib/dd/history';
import ReplayViewer, { type ReplayMeta } from '@/components/dd/ReplayViewer';

interface Props {
  onClose: () => void;
}

export default function HistoryDialog({ onClose }: Props) {
  const [records, setRecords] = useState<HistoryRecord[] | null>(null);
  const [replaying, setReplaying] = useState<{
    config: ReturnType<typeof replayCase>['config'];
    disclosure: ReturnType<typeof replayCase>['disclosure'];
    meta: ReplayMeta;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = () => {
    void listCaseRecords().then(setRecords);
  };

  useEffect(refresh, []);

  const open = (rec: HistoryRecord) => {
    try {
      const { config, disclosure } = replayCase(rec);
      setReplaying({
        config,
        disclosure,
        meta: {
          seed: rec.seed,
          archetype: rec.archetype,
          role: rec.role ?? 'investigator',
          stars: rec.stars,
          source: rec.source,
        },
      });
    } catch (err) {
      setError(`Replay failed for seed ${rec.seed}: ${String(err)}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/88 p-4" role="dialog" aria-modal aria-label="Case history">
      <div className="pixel-frame max-h-[86vh] w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <div className="font-pixel text-[9px] tracking-[0.2em] text-amber">THE ARCHIVE</div>
            <div className="mt-1.5 font-type text-sm text-paper">How you’ve read them</div>
          </div>
          <button onClick={onClose} className="btn-pixel-ghost p-1.5" aria-label="Close history">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[64vh] overflow-y-auto px-4 py-3">
          {records === null && (
            <p className="py-8 text-center font-type text-xs text-fog-2">Opening the archive…</p>
          )}
          {records !== null && records.length === 0 && (
            <p className="py-8 text-center font-type text-xs leading-relaxed text-fog-2">
              No closed cases yet. Every case you finish lands here — replay it day by day and see how the read went.
            </p>
          )}
          {records !== null && records.length > 0 && (
            <ul className="space-y-2.5">
              {records.map((rec) => (
                <li
                  key={rec.id}
                  className={`paper-card pin-note pin-pop flex items-center gap-3 px-3 py-2.5 ${rec.id.length % 2 ? 'tilt-l' : 'tilt-r'}`}
                >
                  <span
                    className={`stamp ${rec.verdict === 'CAPTURE' || rec.verdict === 'EXPIRY' ? 'border-[#3e6b4f] text-[#3e6b4f]' : 'border-[#7a2d2d] text-[#7a2d2d]'}`}
                    style={{ fontSize: '0.55rem', padding: '0.1em 0.4em' }}
                  >
                    {rec.verdict}
                  </span>
                  <span className="flex-1 font-type text-[11px] leading-snug text-[#33291a]">
                    {(rec.role ?? 'investigator') === 'fugitive' && (
                      <b className="mr-1 bg-[#241d10] px-1 py-0.5 font-term text-[10px] uppercase text-paper">as courier</b>
                    )}
                    {(rec.role ?? 'investigator') === 'investigator' && (
                      <b className="text-[#241d10]">{ARCHETYPES[rec.archetype].label}</b>
                    )}{' '}
                    · №{String(rec.seed % 100000).padStart(5, '0')} ·{' '}
                    {(rec.role ?? 'investigator') === 'fugitive'
                      ? (rec.fugitiveJournal?.filter((a) => a.action.kind !== 'HOLD').length ?? 0)
                      : rec.journal.filter((a) => a.action.kind !== 'WAIT').length}{' '}
                    actions · {new Date(rec.closedAt).toLocaleDateString()}
                    {rec.source === 'ladder' ? ' · wall' : rec.source === 'tutorial' ? ' · brief' : ''}
                  </span>
                  {rec.stars !== null && <span className="font-term text-base text-[#c9962e]">{rec.stars}★</span>}
                  <button
                    onClick={() => open(rec)}
                    className="btn-pixel-ghost flex h-7 items-center gap-1 px-2 text-sm"
                    aria-label={`Replay case ${rec.id}`}
                  >
                    <Play className="h-3 w-3" /> replay
                  </button>
                  <button
                    onClick={() => {
                      void deleteCaseRecord(rec.id).then(refresh);
                    }}
                    className="rounded p-1 text-[#b3a37f] hover:text-[#7a2d2d]"
                    aria-label={`Delete case seed ${rec.seed}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {error && (
            <p className="mt-3 border border-blood-2/60 bg-blood/15 px-3 py-2 font-type text-xs text-blood-2">{error}</p>
          )}
        </div>
      </div>

      {replaying && (
        <ReplayViewer
          config={replaying.config}
          disclosure={replaying.disclosure}
          meta={replaying.meta}
          onClose={() => setReplaying(null)}
        />
      )}
    </div>
  );
}
