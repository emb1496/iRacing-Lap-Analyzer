import { useEffect, useRef, useState } from "react";
import type { MouseHandlerDataParam } from "recharts";
import type { Row } from "../components/charts/chartRows";
import { PLOT_LEFT, PLOT_RIGHT } from "../components/charts/chartDefaults";
import { MIN_ZOOM_SPAN, type Range } from "../lib/range";

interface Options {
  rows: Row[];
  /** Visible distance window, used to map metres to pixels when painting. */
  domain: Range;
  onHover: (index: number | null) => void;
  onZoom: (range: Range | null) => void;
}

const indexOf = (state: MouseHandlerDataParam): number | null => {
  const i = state.activeTooltipIndex;
  return typeof i === "number" ? i : i != null ? Number(i) : null;
};

/**
 * Drag-to-zoom on the charts, plus the hover sync they share.
 *
 * The selection in progress is the distances (m) where the drag began and currently is. It is
 * kept in a ref and painted straight onto an overlay, so dragging never re-renders the charts.
 */
export function useBrush({ rows, domain, onHover, onZoom }: Options) {
  const dragRef = useRef<Range | null>(null);
  const [dragging, setDragging] = useState(false);
  const chartsEl = useRef<HTMLDivElement>(null);
  const barEl = useRef<HTMLDivElement>(null);
  const brushEl = useRef<HTMLDivElement>(null);
  const domainRef = useRef<Range>([0, 1]);
  domainRef.current = domain;

  const paintBrush = () => {
    const el = brushEl.current;
    const root = chartsEl.current;
    const d = dragRef.current;
    if (!el || !root) return;
    if (!d || d[0] === d[1]) {
      el.style.display = "none";
      return;
    }
    // The plot area spans from the y-axis (width 48) to the chart's right margin (16).
    const [d0, d1] = domainRef.current;
    const plotW = root.clientWidth - PLOT_LEFT - PLOT_RIGHT;
    const x = (m: number) => PLOT_LEFT + ((m - d0) / (d1 - d0)) * plotW;
    const top = barEl.current?.offsetHeight ?? 0;
    el.style.display = "block";
    el.style.left = `${x(Math.min(...d))}px`;
    el.style.width = `${Math.abs(x(d[1]) - x(d[0]))}px`;
    el.style.top = `${top}px`;
    el.style.height = `${root.clientHeight - top}px`;
  };

  const setDrag = (r: Range | null) => {
    const was = dragRef.current != null;
    dragRef.current = r;
    if ((r != null) !== was) setDragging(r != null);
    paintBrush();
  };

  const commitDrag = () => {
    const d = dragRef.current;
    if (d) {
      const lo = Math.min(...d);
      const hi = Math.max(...d);
      if (hi - lo >= MIN_ZOOM_SPAN) onZoom([lo, hi]);
    }
    setDrag(null);
  };

  // A drag released outside the chart still ends the brush.
  useEffect(() => {
    if (!dragging) return;
    window.addEventListener("mouseup", commitDrag);
    return () => window.removeEventListener("mouseup", commitDrag);
  });

  const handlers = {
    onMouseDown: (state: MouseHandlerDataParam) => {
      const i = indexOf(state);
      if (i != null) setDrag([rows[i].d, rows[i].d]);
    },
    onMouseMove: (state: MouseHandlerDataParam) => {
      const i = indexOf(state);
      onHover(i);
      if (dragRef.current && i != null) setDrag([dragRef.current[0], rows[i].d]);
    },
    onMouseLeave: () => onHover(null),
  };

  return { chartsEl, barEl, brushEl, dragging, commitDrag, handlers };
}
