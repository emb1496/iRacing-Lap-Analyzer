import { PX } from "./constants";
import type { Point } from "./geometry";

interface Props {
  lineMode: boolean;
  /** Reference position at the hovered grid point. */
  hover: Point;
  /** Compared position at the hovered grid point (line view only). */
  cmpHover: Point | null;
}

/** Cursor markers: one dot in delta view, one per lap in line view. */
export function HoverDots({ lineMode, hover, cmpHover }: Props) {
  if (!lineMode) return <circle cx={hover[0]} cy={hover[1]} r={7} className="hover-dot" />;
  return (
    <>
      {cmpHover && (
        <circle cx={cmpHover[0]} cy={cmpHover[1]} r={4} fill="var(--cmp)" stroke="var(--bg)" strokeWidth={1.5} {...PX} />
      )}
      <circle cx={hover[0]} cy={hover[1]} r={4} fill="var(--ref)" stroke="var(--bg)" strokeWidth={1.5} {...PX} />
    </>
  );
}
