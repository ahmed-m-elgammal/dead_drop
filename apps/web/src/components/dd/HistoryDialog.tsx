'use client';

/**
 * Dead Drop — case history (M3 W2). Closed cases archived in IndexedDB; the
 * §8.6 replay is REBUILT from (seed + archetype + journal) through the real
 * engine, so every listed case replays exactly as it happened.
 */
import { useEffect, useState } from 'react';
import { Play, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
        meta: { seed: rec.seed, archetype: rec.archetype, stars: rec.stars, source: rec.source },
      });
    } catch (err) {
      setError(`Replay failed for seed ${rec.seed}: ${String(err)}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal aria-label="Case history">
      <div className="max-h-[86vh] w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[2px] text-neutral-400">Case history</div>
            <div className="text-lg font-black">How you’ve read them</div>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-neutral-100" aria-label="Close history">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[64vh] overflow-y-auto px-4 py-3">
          {records === null && <p className="py-8 text-center text-xs text-neutral-400">Opening the archive…</p>}
          {records !== null && records.length === 0 && (
            <p className="py-8 text-center text-xs leading-relaxed text-neutral-400">
              No closed cases yet. Every case you finish lands here — replay it day by day and see how the read went.
            </p>
          )}
          {records !== null && records.length > 0 && (
            <ul className="space-y-2">
              {records.map((rec) => (
                <li key={rec.id} className="flex items-center gap-3 rounded-xl border bg-white px-3 py-2.5 shadow-sm">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-black ${
                      rec.verdict === 'CAPTURE' || rec.verdict === 'EXPIRY'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {rec.verdict}
                  </span>
                  <span className="flex-1 text-xs text-neutral-600">
                    <b className="text-neutral-900">{ARCHETYPES[rec.archetype].label}</b> · seed{' '}
                    <span className="font-mono">{rec.seed}</span> · {rec.journal.filter((a) => a.action.kind !== 'WAIT').length}{' '}
                    actions · {new Date(rec.closedAt).toLocaleDateString()}
                    {rec.source === 'ladder' ? ' · ladder' : rec.source === 'tutorial' ? ' · tutorial' : ''}
                  </span>
                  {rec.stars !== null && <span className="text-xs font-bold text-amber-600">{rec.stars}★</span>}
                  <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-xs" onClick={() => open(rec)}>
                    <Play className="h-3 w-3" /> Replay
                  </Button>
                  <button
                    onClick={() => {
                      void deleteCaseRecord(rec.id).then(refresh);
                    }}
                    className="rounded p-1 text-neutral-300 hover:text-red-700"
                    aria-label={`Delete case seed ${rec.seed}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">{error}</p>}
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
