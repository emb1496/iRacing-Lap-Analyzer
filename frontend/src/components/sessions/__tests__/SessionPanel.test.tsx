import { fireEvent, render, screen } from "@testing-library/react";
import { makeSession } from "../../../test/fixtures";
import { SessionPanel } from "../SessionPanel";

const none = { ref: null, cmp: null };
const panel = (sessions = [] as ReturnType<typeof makeSession>[], onUpload = jest.fn()) => (
  <SessionPanel sessions={sessions} selection={none} busy={false} onPick={jest.fn()} onUpload={onUpload} onDemo={jest.fn()} />
);

it("shows the hint when empty and handles drops", () => {
  const onUpload = jest.fn();
  const { container } = render(panel([], onUpload));
  expect(screen.getByText(/Drop an iRacing telemetry file/)).toBeInTheDocument();
  const aside = container.querySelector("aside") as HTMLElement;
  fireEvent.dragOver(aside);
  expect(aside).toHaveClass("dragging");
  const file = new File(["x"], "a.ibt");
  fireEvent.drop(aside, { dataTransfer: { files: [file] } });
  expect(onUpload).toHaveBeenCalledWith(file);
});

it("lists sessions", () => {
  render(panel([makeSession()]));
  expect(screen.queryByText(/Drop an iRacing/)).toBeNull();
  expect(screen.getByText("a.ibt")).toBeInTheDocument();
});

it("offers to go back to the file picker once something is loaded", () => {
  const onChangeFiles = jest.fn();
  const { rerender } = render(
    <SessionPanel sessions={[]} selection={none} busy={false} onPick={jest.fn()} onUpload={jest.fn()} onDemo={jest.fn()} onChangeFiles={onChangeFiles} />,
  );
  expect(screen.queryByText("Change files…")).toBeNull();
  rerender(
    <SessionPanel sessions={[makeSession()]} selection={none} busy={false} onPick={jest.fn()} onUpload={jest.fn()} onDemo={jest.fn()} onChangeFiles={onChangeFiles} />,
  );
  fireEvent.click(screen.getByText("Change files…"));
  expect(onChangeFiles).toHaveBeenCalled();
});

it("blocks laps from a different car or track on the other side", () => {
  const ref = makeSession({ id: "s1", filename: "a.ibt" });
  const other = makeSession({ id: "s2", filename: "b.ibt", car: "Other car" });
  render(
    <SessionPanel
      sessions={[ref, other]}
      selection={{ ref: { sessionId: "s1", lap: 1 }, cmp: null }}
      busy={false}
      onPick={jest.fn()}
      onUpload={jest.fn()}
      onDemo={jest.fn()}
    />,
  );
  const cmpButtons = screen.getAllByLabelText("Use lap 1 as comparison");
  expect(cmpButtons[0]).toBeEnabled();
  expect(cmpButtons[1]).toBeDisabled();
  expect(cmpButtons[1]).toHaveAttribute("title", "Different track or car than the reference lap");
});
