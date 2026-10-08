import { useState } from "react";
import { ConditionsPanel } from "./components/conditions/ConditionsPanel";
import { CornerTable } from "./components/corners/CornerTable";
import { TelemetryCharts } from "./components/charts/TelemetryCharts";
import { EmptyState } from "./components/layout/EmptyState";
import { ErrorBanner } from "./components/layout/ErrorBanner";
import { SummaryStats } from "./components/layout/SummaryStats";
import { Topbar } from "./components/layout/Topbar";
import { SessionPanel } from "./components/sessions/SessionPanel";
import { TrackMap } from "./components/trackmap/TrackMap";
import { useComparison } from "./hooks/useComparison";
import { useSessions } from "./hooks/useSessions";
import { useThrottledHover } from "./hooks/useThrottledHover";
import { api } from "./lib/api";
import { cornerRange, type Range } from "./lib/range";

export default function App() {
  const { sessions, selection, busy, error, setError, addSession, pick } = useSessions();
  const { hoverIndex, setHoverIndex, clearHover } = useThrottledHover();
  const [zoom, setZoom] = useState<Range | null>(null);
  const comparison = useComparison(selection, {
    onLoaded: () => {
      clearHover();
      setZoom(null);
    },
    onError: setError,
  });

  return (
    <div className="app">
      <Topbar track={comparison?.track} />

      <SessionPanel
        sessions={sessions}
        selection={selection}
        busy={busy}
        onPick={pick}
        onUpload={(file) => addSession(() => api.upload(file))}
        onDemo={() => addSession(api.loadDemo)}
      />

      <main>
        {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

        {!comparison ? (
          <EmptyState busy={busy} onDemo={() => addSession(api.loadDemo)} />
        ) : (
          <>
            <SummaryStats comparison={comparison} />

            <section className="overview">
              <TrackMap comparison={comparison} hoverIndex={hoverIndex} zoom={zoom} />
              <CornerTable
                comparison={comparison}
                onHover={setHoverIndex}
                onSelect={(k) => setZoom(cornerRange(k, comparison.track_length))}
              />
            </section>

            <ConditionsPanel comparison={comparison} />

            <section className="panel">
              <TelemetryCharts comparison={comparison} onHover={setHoverIndex} zoom={zoom} onZoom={setZoom} />
            </section>
          </>
        )}
      </main>
    </div>
  );
}
