import { useUnits } from "../../context/UnitsContext";

export function UnitToggle() {
  const { units, setUnits } = useUnits();
  return (
    <div className="unit-toggle" role="group" aria-label="Units">
      {(["metric", "imperial"] as const).map((u) => (
        <button key={u} aria-pressed={units === u} onClick={() => setUnits(u)}>
          {u === "metric" ? "km · m" : "mi · ft"}
        </button>
      ))}
    </div>
  );
}
