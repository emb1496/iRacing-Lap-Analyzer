import { useState } from "react";
import { ConditionsPanel } from "./components/conditions/ConditionsPanel";
import { CornerTable } from "./components/corners/CornerTable";
import { TelemetryCharts } from "./components/charts/TelemetryCharts";
import { ErrorBanner } from "./components/layout/ErrorBanner";
import { SummaryStats } from "./components/layout/SummaryStats";
import { Topbar } from "./components/layout/Topbar";
import { FilePicker } from "./components/sessions/FilePicker";
import { SessionPanel } from "./components/sessions/SessionPanel";
import { TrackMap } from "./components/trackmap/TrackMap";
import { useComparison } from "./hooks/useComparison";
import { useLibrary } from "./hooks/useLibrary";
import { useSessions } from "./hooks/useSessions";
import { useThrottledHover } from "./hooks/useThrottledHover";
import { api } from "./lib/api";
import { cornerRange, type Range } from "./lib/range";

export default function App() {
  const {
    sessions,
    selection,
    sameFile,
    busy,
    error,
    setError,
    addSession,
    chooseFile,
    setSameFile,
    pick,
  } = useSessions();
  const { library, loading: libraryLoading, refresh: rescan } = useLibrary();
  const [picking, setPicking] = useState(false);
  const { hoverIndex, setHoverIndex, clearHover } = useThrottledHover();
  const [zoom, setZoom] = useState<Range | null>(null);
  const comparison = useComparison(selection, {
    onLoaded: () => {
      setPicking(false);
      clearHover();
      setZoom(null);
    },
    onError: setError,
  });

  const sessionOf = (role: "ref" | "cmp") =>
    sessions.find((s) => s.id === selection[role]?.sessionId) ?? null;
  const refSession = sessionOf("ref");
  const chosen = { ref: refSession?.filename ?? null, cmp: sessionOf("cmp")?.filename ?? null };

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
        onChangeFiles={() => setPicking(true)}
      />

      <main>
        {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

        {!comparison || picking ? (
          <FilePicker
            library={library}
            loading={libraryLoading}
            busy={busy}
            chosen={chosen}
            reference={refSession}
            sameFile={sameFile}
            onSameFile={setSameFile}
            onChoose={(role, file) =>
              chooseFile(role, file.name, () => api.loadFromLibrary(file.name))
            }
            onRescan={rescan}
            onDemo={() => addSession(api.loadDemo)}
          />
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
