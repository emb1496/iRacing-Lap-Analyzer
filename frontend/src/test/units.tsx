import type { ReactNode } from "react";
import { UnitsProvider } from "../context/UnitsContext";

/** Wrapper that starts the app in the given unit system. */
export const withUnits =
  (u: "metric" | "imperial") =>
  ({ children }: { children: ReactNode }) => {
    localStorage.setItem("lap-analyzer.units", u);
    return <UnitsProvider>{children}</UnitsProvider>;
  };

export const metric = withUnits("metric");
export const imperial = withUnits("imperial");
