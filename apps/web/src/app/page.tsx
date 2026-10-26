'use client';

/**
 * Dead Drop — M3 W3 (single route per sandbox contract).
 *
 * Screen flow (06-uiux): SetupScreen (home: role + archetype/seed + ladder +
 * tutorial + history + skill profile) → case screen — EITHER the
 * investigator layout (MapCanvas + ActionBar + Sidebar, W1) or the fugitive
 * layout (MapCanvas in fugitive mode + FugitivePanel + FugitiveLog, W3) —
 * then VerdictCard (§8.6 disclosure) with the ReplayViewer overlay.
 * All rules authority lives in @dead-drop/engine (CaseSession); this page only
 * composes role-scoped views.
 */
import { useEffect } from 'react';
import { useDD } from '@/lib/dd/store';
import SetupScreen from '@/components/dd/SetupScreen';
import LadderScreen from '@/components/dd/LadderScreen';
import MapCanvas from '@/components/dd/MapCanvas';
import ActionBar from '@/components/dd/ActionBar';
import Sidebar from '@/components/dd/Sidebar';
import FugitivePanel from '@/components/dd/FugitivePanel';
import FugitiveLog from '@/components/dd/FugitiveLog';
import VerdictCard from '@/components/dd/VerdictCard';
import TutorialOverlay from '@/components/dd/TutorialOverlay';
import { VM } from '@/lib/dd/vm';

// The app is a stateful, offline-first CLIENT (engine-on-client, IndexedDB,
// localStorage — 07-architecture Option B): no prerender, no SEO surface.
// Static prerender would also evaluate the map module during build.
export const dynamic = 'force-dynamic';

export default function Home() {
  const screen = useDD((s) => s.screen);
  const role = useDD((s) => s.role);
  const view = useDD((s) => s.view);
  const fview = useDD((s) => s.fview);
  const config = useDD((s) => s.config);
  const tutorial = useDD((s) => s.tutorial);
  const hydrate = useDD((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (screen === 'ladder') {
    return <LadderScreen />;
  }

  if (screen === 'setup' || !config) {
    return <SetupScreen />;
  }

  if (role === 'fugitive') {
    if (!fview) return <SetupScreen />;
    return (
      <div className="flex h-screen flex-col bg-[#f6f5f1]">
        <main className="flex min-h-0 flex-1 flex-col gap-3 p-3 lg:flex-row">
          <div className="h-[54vh] min-h-0 shrink-0 lg:h-auto lg:min-w-0 lg:flex-1">
            <MapCanvas vm={VM} view={fview} config={config} fugitiveRole />
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-3 lg:w-[350px] lg:flex-none">
            <FugitivePanel vm={VM} fview={fview} config={config} />
            <FugitiveLog fview={fview} />
          </div>
        </main>
        <VerdictCard />
      </div>
    );
  }

  if (!view) return <SetupScreen />;

  return (
    <div className="flex h-screen flex-col bg-[#f6f5f1]">
      <main className="flex min-h-0 flex-1 flex-col gap-3 p-3 lg:flex-row">
        <div className="h-[54vh] min-h-0 shrink-0 lg:h-auto lg:min-w-0 lg:flex-1">
          <MapCanvas vm={VM} view={view} config={config} />
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-3 lg:w-[350px] lg:flex-none">
          <ActionBar />
          <div className="min-h-0 flex-1">
            <Sidebar />
          </div>
        </div>
      </main>
      <VerdictCard />
      {tutorial && <TutorialOverlay />}
    </div>
  );
}
