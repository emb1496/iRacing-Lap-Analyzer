import { along } from "./metrics";

interface Props {
  range: [number, number];
  refValue: number;
  cmpValue: number;
}

/** Both laps' values as dots on a fixed scale, joined by a bar, so the gap reads at a glance. */
export function Dumbbell({ range, refValue, cmpValue }: Props) {
  const a = along(refValue, range) * 100;
  const b = along(cmpValue, range) * 100;
  return (
    <div className="dumbbell" aria-hidden>
      <span className="bar" style={{ left: `${Math.min(a, b)}%`, width: `${Math.abs(a - b)}%` }} />
      <span className="dot ref" style={{ left: `${a}%` }} />
      <span className="dot cmp" style={{ left: `${b}%` }} />
    </div>
  );
}
