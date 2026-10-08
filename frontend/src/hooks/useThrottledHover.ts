import { useCallback, useRef, useState } from "react";

/**
 * The grid index under the cursor, shared between the map, corner table and charts.
 * Updates are coalesced to one per frame so dragging the mouse doesn't queue renders.
 */
export function useThrottledHover() {
  const [hoverIndex, setHoverState] = useState<number | null>(null);
  const pendingHover = useRef<number | null>(null);
  const hoverFrame = useRef(0);
  const setHoverIndex = useCallback((i: number | null) => {
    pendingHover.current = i;
    if (hoverFrame.current) return;
    hoverFrame.current = requestAnimationFrame(() => {
      hoverFrame.current = 0;
      setHoverState(pendingHover.current);
    });
  }, []);
  /** Clear immediately, bypassing the throttle (used when the data underneath changes). */
  const clearHover = useCallback(() => setHoverState(null), []);
  return { hoverIndex, setHoverIndex, clearHover };
}
