'use client';

/**
 * Dead Drop — M3 W4 (single route per sandbox contract).
 *
 * Screen flow (06-uiux): SetupScreen (the Bureau: role + archetype/seed +
 * ladder + tutorial + history + skill profile) → case screen — EITHER the
 * investigator layout (MapCanvas + ActionBar + Sidebar, W1) or the fugitive
 * layout (MapCanvas in fugitive mode + FugitivePanel + FugitiveLog, W3) —
 * then VerdictCard (§8.6 disclosure) with the ReplayViewer overlay.
 *
 * W4 art pass adds the presentation layer around it: a once-per-device
 * cold-open intro, a case-briefing dossier when a new file opens, and
 * "DAY N" transition slams. All rules authority lives in @dead-drop/engine
 * (CaseSession); this page only composes role-scoped views + flavor.
 */
import { useEffect, useState } from 'react';
import { useDD } from '@/lib/dd/store';
import SetupScreen from '@/components/dd/SetupScreen';
import LadderScreen from '@/components/dd/LadderScreen';
import MapCanvas from '@/components/dd/MapCanvas';
import ActionBar from '@/components/dd/ActionBar';
import CaseHeader from '@/components/dd/CaseHeader';
import CaseBriefPanel from '@/components/dd/CaseBriefPanel';
import Sidebar from '@/components/dd/Sidebar';
import FugitivePanel from '@/components/dd/FugitivePanel';
import FugitiveLog from '@/components/dd/FugitiveLog';
import VerdictCard from '@/components/dd/VerdictCard';
import TutorialOverlay from '@/components/dd/TutorialOverlay';
import IntroCinematic from '@/components/dd/IntroCinematic';
import CaseBriefing from '@/components/dd/CaseBriefing';
import DayTransition from '@/components/dd/DayTransition';
import { VM } from '@/lib/dd/vm';

// The app is a stateful, offline-first CLIENT (engine-on-client, IndexedDB,
// localStorage — 07-architecture Option B): no prerender, no SEO surface.
// Static prerender would also evaluate the map module during build.
export const dynamic = 'force-dynamic';

const BRIEF_FLAG = 'dd.m3w4.brief';

export default function Home() {
  const screen = useDD((s) => s.screen);
  const role = useDD((s) => s.role);
  const view = useDD((s) => s.view);
  const fview = useDD((s) => s.fview);
  const config = useDD((s) => s.config);
  const record = useDD((s) => s.record);
  const tutorial = useDD((s) => s.tutorial);
  const hydrate = useDD((s) => s.hydrate);

  // Briefing dossier: fires when a NEW case opens (no moves yet this file)
  // and this exact (seed, role, startedAt) hasn't been briefed this session.
  // setState is deferred (never synchronous in the effect body).
  const [briefKey, setBriefKey] = useState<string | null>(null);
  useEffect(() => {
    const t = setTimeout(() => {
      if (!config || !record) {
        setBriefKey(null);
        return;
      }
      const key = `${config.seed}-${role}-${record.startedAt}`;
      const fresh = record.investigator.length === 0 && record.fugitive.length === 0;
      let seen = false;
      try {
        seen = window.sessionStorage.getItem(`${BRIEF_FLAG}.${key}`) === '1';
      } catch {
        seen = false;
      }
      setBriefKey(fresh && !seen ? key : null);
    }, 0);
    return () => clearTimeout(t);
  }, [config?.seed, record?.startedAt, role, config, record]);

  const closeBriefing = () => {
    if (briefKey) {
      try {
        window.sessionStorage.setItem(`${BRIEF_FLAG}.${briefKey}`, '1');
      } catch {
        /* ignore */
      }
    }
    setBriefKey(null);
  };

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const showBriefing = screen === 'case' && briefKey !== null && !tutorial && !disclosureUp(useDD.getState().disclosure);

  if (screen === 'ladder') {
    return (
      <div className="desk fx-grain min-h-screen">
        <LadderScreen />
      </div>
    );
  }

  if (screen === 'setup' || !config) {
    return (
      <div className="desk fx-grain min-h-screen">
        <IntroCinematic />
        <SetupScreen />
      </div>
    );
  }

  if (role === 'fugitive') {
    if (!fview) return <SetupScreen />;
    return (
      <div className="desk fx-grain flex h-screen flex-col">
        <main className="flex min-h-0 flex-1 flex-col gap-3 p-3 lg:flex-row">
          <CaseBriefPanel role="fugitive" vm={VM} view={fview} config={config} />
          <div className="h-[54vh] min-h-0 shrink-0 lg:h-auto lg:min-w-0 lg:flex-1">
            <MapCanvas vm={VM} view={fview} config={config} fugitiveRole />
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-3 lg:w-[350px] lg:flex-none">
            <FugitivePanel vm={VM} fview={fview} config={config} />
            <FugitiveLog fview={fview} />
          </div>
        </main>
        <DayTransition />
        <VerdictCard />
        {showBriefing && config && role && (
          <CaseBriefing key={briefKey} config={config} role={role} openKey={briefKey!} onClose={closeBriefing} />
        )}
      </div>
    );
  }

  if (!view) return <SetupScreen />;

  return (
    <div className="desk fx-grain flex h-screen flex-col">
      <main className="flex min-h-0 flex-1 flex-col gap-3 p-3 lg:flex-row">
        <CaseBriefPanel role="investigator" vm={VM} view={view} config={config} />
        <div className="h-[54vh] min-h-0 shrink-0 lg:h-auto lg:min-w-0 lg:flex-1">
          <MapCanvas vm={VM} view={view} config={config} />
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-3 lg:w-[350px] lg:flex-none">
          <CaseHeader />
          <ActionBar />
          <div className="min-h-0 flex-1">
            <Sidebar />
          </div>
        </div>
      </main>
      <DayTransition />
      <VerdictCard />
      {tutorial && <TutorialOverlay />}
      {showBriefing && config && role && (
        <CaseBriefing key={briefKey} config={config} role={role} openKey={briefKey!} onClose={closeBriefing} />
      )}
    </div>
  );
}

/** Never brief over a closed case — the verdict owns the screen. */
function disclosureUp(d: unknown): boolean {
  return d !== null && d !== undefined;
}
