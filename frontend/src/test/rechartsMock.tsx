import { cloneElement, type ReactElement } from "react";

// jsdom has no layout, so give the charts a fixed size instead of measuring.
export function ResponsiveContainer({ children }: { children: ReactElement<{ width: number; height: number }> }) {
  return cloneElement(children, { width: 800, height: 300 });
}
