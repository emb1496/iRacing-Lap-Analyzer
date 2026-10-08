import { memo } from "react";
import { PX } from "./constants";
import { type Point, path } from "./geometry";

interface Props {
  points: Point[];
  cmpPoints: Point[];
}

/** Static line-view paths; memoised so hover updates only redraw the dots. */
export const LineLayer = memo(function LineLayer({ points, cmpPoints }: Props) {
  return (
    <>
      <path d={path(points) + "Z"} stroke="var(--track-base)" strokeWidth={12} fill="none" strokeLinejoin="round" {...PX} />
      <path d={path(points)} stroke="var(--ref)" strokeWidth={2.5} fill="none" strokeLinejoin="round" {...PX} />
      <path d={path(cmpPoints)} stroke="var(--cmp)" strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeDasharray="6 4" {...PX} />
    </>
  );
});
