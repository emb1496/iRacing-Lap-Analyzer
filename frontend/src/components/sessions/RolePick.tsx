import type { Role } from "../../lib/types";

interface Props {
  role: Role;
  lap: number;
  selected: boolean;
  onPick: () => void;
}

export function RolePick({ role, lap, selected, onPick }: Props) {
  return (
    <td className="pick">
      <button
        className={`pick-btn ${role} ${selected ? "on" : ""}`}
        aria-label={`Use lap ${lap} as ${role === "ref" ? "reference" : "comparison"}`}
        onClick={onPick}
      />
    </td>
  );
}
