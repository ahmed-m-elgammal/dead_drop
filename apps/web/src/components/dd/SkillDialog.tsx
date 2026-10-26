'use client';

/**
 * Dead Drop — skill profile dialog (M3 W3, 05-ai-spec §4).
 *
 * Both roles' rolling last-10 windows, on-device only. Per role: the scalar
 * tier (Novice / Analyst / Detective / Ghost-hunter), the composite behind
 * it, and the four spec axes with their raw window values. Axis formulas and
 * weights are the registered MVP operationalization (ADR-007 D3).
 */
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { loadSkillProfiles, type RoleSkill } from '@/lib/dd/skill';

interface Props {
  onClose: () => void;
}

const TIER_BLURB: Record<string, string> = {
  Novice: 'Finding your feet — read the window hints below and play a few more cases.',
  Analyst: 'Solid fundamentals — you are extracting real information per case.',
  Detective: 'Sharp read. The AI has to work for its escapes now.',
  'Ghost-hunter': 'Top tier — the measured baseline is your floor, not your ceiling.',
};

function AxisBar({ value }: { value: number | null }) {
  if (value === null) {
    return <div className="h-1.5 w-full rounded-full bg-neutral-100" aria-label="not measurable this window" />;
  }
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
      <div
        className="h-full rounded-full bg-neutral-900"
        style={{ width: `${Math.max(3, Math.round(value * 100))}%` }}
      />
    </div>
  );
}

function RoleCard({ skill, title, blurbIntro }: { skill: RoleSkill; title: string; blurbIntro: string }) {
  return (
    <div className="rounded-xl border p-4">
      <div className="flex items-baseline justify-between">
        <div className="text-sm font-black text-neutral-900">{title}</div>
        <div className="text-right">
          <div className="text-base font-black text-neutral-900">{skill.tier}</div>
          {skill.composite !== null && (
            <div className="text-[10px] text-neutral-400">{skill.composite}/100 composite</div>
          )}
        </div>
      </div>
      <p className="mt-0.5 text-[11px] text-neutral-500">
        {blurbIntro} · last {skill.cases} case{skill.cases === 1 ? '' : 's'}
        {skill.cases === 0 ? ' — play to fill the window' : ''}
      </p>
      {skill.cases > 0 && <p className="mt-1 text-[11px] italic text-neutral-500">{TIER_BLURB[skill.tier]}</p>}
      <ul className="mt-3 space-y-2.5">
        {skill.axes.map((a) => (
          <li key={a.id}>
            <div className="flex items-baseline justify-between gap-2 text-[11px]">
              <span className="font-semibold text-neutral-700">{a.label}</span>
              <span className="font-mono text-neutral-500">{a.raw}</span>
            </div>
            <div className="mt-1">
              <AxisBar value={a.value} />
            </div>
            <p className="mt-0.5 text-[10px] leading-snug text-neutral-400">{a.hint}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function SkillDialog({ onClose }: Props) {
  const [profiles, setProfiles] = useState<Awaited<ReturnType<typeof loadSkillProfiles>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadSkillProfiles()
      .then(setProfiles)
      .catch((err) => setError(String(err)));
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal aria-label="Skill profile">
      <div className="max-h-[86vh] w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[2px] text-neutral-400">Skill profile</div>
            <div className="text-lg font-black">Rolling last-10 windows, on-device</div>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-neutral-100" aria-label="Close skill profile">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[64vh] space-y-3 overflow-y-auto px-4 py-3">
          {profiles === null && !error && (
            <p className="py-8 text-center text-xs text-neutral-400">Reading the archive…</p>
          )}
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">{error}</p>}
          {profiles && (
            <>
              <RoleCard
                skill={profiles.investigator}
                title="Investigator"
                blurbIntro="Efficiency · calibration · budget · stakeout conversion"
              />
              <RoleCard
                skill={profiles.fugitive}
                title="Fugitive"
                blurbIntro="Escape rate · deception · reveal exposure · stamina"
              />
              <p className="rounded-lg bg-neutral-50 p-3 text-[10px] leading-relaxed text-neutral-500">
                Windows are computed locally from your closed cases (05-ai-spec §4) — nothing leaves
                the device. Tiers feed solo gating and the (post-M4) adaptive director; there is no
                cross-player comparison anywhere in this build.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
