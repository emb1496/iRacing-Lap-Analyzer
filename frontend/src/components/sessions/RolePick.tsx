import type { Role } from "../../lib/types";

interface Props {
  role: Role;
  lap: number;
  selected: boolean;
  /** Why this lap can't be used on this side (e.g. a different car); disables the button. */
  blockedReason?: string;
  onPick: () => void;
}

export function RolePick({ role, lap, selected, blockedReason, onPick }: Props) {
  return (
    <td className="pick">
      <button
        className={`pick-btn ${role} ${selected ? "on" : ""}`}
        aria-label={`Use lap ${lap} as ${role === "ref" ? "reference" : "comparison"}`}
        disabled={blockedReason != null}
        title={blockedReason}
        onClick={onPick}
      />
    </td>
  );
}
