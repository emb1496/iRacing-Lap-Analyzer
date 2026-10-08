import type { TyreCorner } from "../../lib/types";

interface Props {
  corners: TyreCorner[];
  selected: TyreCorner | undefined;
  onSelect: (corner: TyreCorner) => void;
}

export function TyreSelector({ corners, selected, onSelect }: Props) {
  return (
    <span className="chips" role="group" aria-label="Tyre">
      {corners.map((k) => (
        <button key={k} className="chip" aria-pressed={k === selected} onClick={() => onSelect(k)}>
          {k}
        </button>
      ))}
    </span>
  );
}
