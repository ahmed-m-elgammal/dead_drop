'use client';

/**
 * Dead Drop — M3 W1 playable prototype (single route per sandbox contract).
 *
 * Screen flow (06-uiux): SetupScreen (case seed + briefing) → case screen
 * (MapCanvas + ActionBar + Sidebar) → VerdictCard (§8.6 disclosure replay).
 * All rules authority lives in @/engine (CaseSession); this page only
 * composes role-scoped views.
 */
import { useEffect } from 'react';
import { VM, useDD } from '@/lib/dd/store';
import SetupScreen from '@/components/dd/SetupScreen';
import MapCanvas from '@/components/dd/MapCanvas';
import ActionBar from '@/components/dd/ActionBar';
import Sidebar from '@/components/dd/Sidebar';
import VerdictCard from '@/components/dd/VerdictCard';

export default function Home() {
  const screen = useDD((s) => s.screen);
  const view = useDD((s) => s.view);
  const config = useDD((s) => s.config);
  const hydrate = useDD((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (screen === 'setup' || !view || !config) {
    return <SetupScreen />;
  }

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
    </div>
  );
}
