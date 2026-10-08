import { cornerRange, type Range } from "../../lib/range";
import type { Corner } from "../../lib/types";

interface Props {
  corner: Corner;
  trackLength: number;
  zoom: Range | null;
  onZoom: (range: Range | null) => void;
}

/** Toggles the zoom window onto one corner. */
export function CornerChip({ corner, trackLength, zoom, onZoom }: Props) {
  const [lo, hi] = cornerRange(corner, trackLength);
  const active = zoom != null && zoom[0] === lo && zoom[1] === hi;
  return (
    <button className="chip" aria-pressed={active} onClick={() => onZoom(active ? null : [lo, hi])}>
      T{corner.number}
    </button>
  );
}
