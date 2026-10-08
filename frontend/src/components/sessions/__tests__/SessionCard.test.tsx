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
