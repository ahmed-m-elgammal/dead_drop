'use client';

/**
 * Dead Drop — skill profile dialog (M3 W3 logic, W4 skin): the detective's
 * performance review, stamped and filed. Both roles' rolling last-10
 * windows, on-device only. Axis formulas and weights are the registered
 * MVP operationalization (ADR-007 D3).
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
    return <div className="h-2 w-full border border-line bg-ink-2" aria-label="not measurable this window" />;
  }
  return (
    <div className="h-2 w-full border border-line bg-ink-2">
      <div
        className="h-full bg-amber shadow-[inset_-2px_-2px_0_rgba(20,16,5,.3)]"
        style={{ width: `${Math.max(3, Math.round(value * 100))}%` }}
      />
    </div>
  );
}

function RoleCard({ skill, title, blurbIntro }: { skill: RoleSkill; title: string; blurbIntro: string }) {
  return (
    <div className="border border-line bg-ink-2 p-4">
      <div className="flex items-baseline justify-between">
        <div className="font-pixel text-[10px] text-paper">{title.toUpperCase()}</div>
        <div className="text-right">
          <div className="stamp border-amber text-amber" style={{ fontSize: '0.62rem', padding: '0.1em 0.5em' }}>
            {skill.tier}
          </div>
          {skill.composite !== null && (
            <div className="mt-1 font-term text-sm text-fog-2">{skill.composite}/100 composite</div>
          )}
        </div>
      </div>
      <p className="mt-1.5 font-type text-[11px] text-fog">
        {blurbIntro} · last {skill.cases} case{skill.cases === 1 ? '' : 's'}
        {skill.cases === 0 ? ' — play to fill the window' : ''}
      </p>
      {skill.cases > 0 && <p className="mt-1 font-type text-[11px] italic text-fog-2">{TIER_BLURB[skill.tier]}</p>}
      <ul className="mt-3 space-y-2.5">
        {skill.axes.map((a) => (
          <li key={a.id}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-term text-base uppercase tracking-wide text-paper">{a.label}</span>
              <span className="font-mono text-xs text-fog-2">{a.raw}</span>
            </div>
            <div className="mt-1">
              <AxisBar value={a.value} />
            </div>
            <p className="mt-0.5 font-type text-[10px] leading-snug text-fog-2">{a.hint}</p>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/88 p-4" role="dialog" aria-modal aria-label="Skill profile">
      <div className="pixel-frame max-h-[86vh] w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <div className="font-pixel text-[9px] tracking-[0.2em] text-amber">SERVICE RECORD</div>
            <div className="mt-1.5 font-type text-sm text-paper">Rolling last-10 windows, on-device</div>
          </div>
          <button onClick={onClose} className="btn-pixel-ghost p-1.5" aria-label="Close skill profile">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[64vh] space-y-3 overflow-y-auto px-4 py-3">
          {profiles === null && !error && (
            <p className="py-8 text-center font-type text-xs text-fog-2">Reading the archive…</p>
          )}
          {error && <p className="border border-blood-2/60 bg-blood/15 px-3 py-2 font-type text-xs text-blood-2">{error}</p>}
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
              <p className="border border-dashed border-line-2 bg-ink-2 p-3 font-type text-[10px] leading-relaxed text-fog-2">
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
