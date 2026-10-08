import { fireEvent, render, screen } from "@testing-library/react";
import type { LapSelection, Role } from "../../../lib/types";
import { makeSession } from "../../../test/fixtures";
import { LapRow } from "../LapRow";

type Selection = Record<Role, LapSelection | null>;
const none: Selection = { ref: null, cmp: null };

function renderRow(lapIdx: number, selection: Selection = none, best: number | null = 90.5) {
  const onPick = jest.fn();
  const s = makeSession();
  render(
    <table>
      <tbody>
        <LapRow session={s} lap={s.laps[lapIdx]} best={best} selection={selection} onPick={onPick} />
      </tbody>
    </table>,
  );
  return onPick;
}

it("marks the best lap with no gap", () => {
  renderRow(0);
  expect(screen.getByText("best")).toBeInTheDocument();
  expect(screen.queryByText("+0.750")).toBeNull();
});

it("shows the gap and picks roles", () => {
  const onPick = renderRow(1, { ref: { sessionId: "s1", lap: 2 }, cmp: null });
  expect(screen.getByText("+0.750")).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText("Use lap 2 as comparison"));
  expect(onPick).toHaveBeenCalledWith("cmp", { sessionId: "s1", lap: 2 });
  expect(screen.getByLabelText("Use lap 2 as reference")).toHaveClass("on");
});

it("marks invalid laps and handles missing times", () => {
  renderRow(2);
  expect(screen.getByText("pit")).toBeInTheDocument();
  expect(screen.getByText("--:--.---")).toBeInTheDocument();
});

it("shows no gap without a best time", () => {
  renderRow(1, none, null);
  expect(screen.queryByText("+0.750")).toBeNull();
});
