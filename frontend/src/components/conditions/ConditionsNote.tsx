interface Props {
  notes: string[];
}

export function ConditionsNote({ notes }: Props) {
  return (
    <p className={`hint cond-note${notes.length ? " differs" : ""}`}>
      {notes.length
        ? `${notes.join(". ")}. Part of the gap may be conditions rather than driving.`
        : "Conditions were about the same for both laps."}
    </p>
  );
}
