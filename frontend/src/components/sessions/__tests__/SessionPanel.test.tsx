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
