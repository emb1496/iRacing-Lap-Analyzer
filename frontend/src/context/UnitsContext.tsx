import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import type { Units } from "../lib/units";

const KEY = "lap-analyzer.units";

/** Countries that mostly use miles and feet on the track. */
const IMPERIAL_REGIONS = new Set(["US", "GB", "MM", "LR"]);

function initialUnits(): Units {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored === "metric" || stored === "imperial") return stored;
  } catch {
    // storage unavailable (private mode etc.) - fall through to locale
  }
  const region = navigator.language.split("-")[1]?.toUpperCase() ?? "";
  return IMPERIAL_REGIONS.has(region) ? "imperial" : "metric";
}

const UnitsContext = createContext<{ units: Units; setUnits: (u: Units) => void }>({
  units: "metric",
  setUnits: () => {},
});

export function UnitsProvider({ children }: { children: ReactNode }) {
  const [units, setUnits] = useState<Units>(initialUnits);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, units);
    } catch {
      // not persisted; the choice still applies for this page load
    }
  }, [units]);
  return <UnitsContext value={{ units, setUnits }}>{children}</UnitsContext>;
}

export function useUnits() {
  return useContext(UnitsContext);
}
