import { render, screen } from "@testing-library/react";
import { makeSession } from "../../../test/fixtures";
import { SessionCard } from "../SessionCard";

const none = { ref: null, cmp: null };

it("renders the session and a row per lap", () => {
  render(<SessionCard session={makeSession()} selection={none} onPick={jest.fn()} />);
  expect(screen.getByText("Test Track")).toBeInTheDocument();
  expect(screen.getAllByRole("row")).toHaveLength(4);
});

it("tolerates a missing best lap", () => {
  render(<SessionCard session={makeSession({ best_lap: null })} selection={none} onPick={jest.fn()} />);
  expect(screen.getAllByRole("row")).toHaveLength(4);
});

it("shows when the session was recorded", () => {
  render(<SessionCard session={makeSession()} selection={none} onPick={jest.fn()} />);
  expect(screen.getByText(/2025.*· Race/)).toBeInTheDocument();
});

it("omits the date line when the file has none", () => {
  render(<SessionCard session={makeSession({ recorded_at: null })} selection={none} onPick={jest.fn()} />);
  expect(screen.queryByText(/· Race/)).toBeNull();
});

it("shows the date without a session type", () => {
  render(<SessionCard session={makeSession({ session_type: null })} selection={none} onPick={jest.fn()} />);
  expect(screen.getByText(/2025/)).toBeInTheDocument();
  expect(screen.queryByText(/· Race/)).toBeNull();
});
