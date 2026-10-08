interface Props {
  busy: boolean;
  onDemo: () => void;
}

export function EmptyState({ busy, onDemo }: Props) {
  return (
    <div className="empty-state">
      <h2>Where are you losing time?</h2>
      <p>
        Load a session and pick two laps. Lap Analyzer lines them up by distance and shows you,
        corner by corner, where the time goes and why.
      </p>
      <button className="primary" disabled={busy} onClick={onDemo}>
        Try the demo session
      </button>
    </div>
  );
}
