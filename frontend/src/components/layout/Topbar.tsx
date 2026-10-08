import { UnitToggle } from "./UnitToggle";

interface Props {
  /** Shown once a comparison is loaded. */
  track?: string;
}

export function Topbar({ track }: Props) {
  return (
    <header className="topbar">
      <h1>
        Lap<span>Analyzer</span>
      </h1>
      {track && <span className="track">{track}</span>}
      <UnitToggle />
    </header>
  );
}
