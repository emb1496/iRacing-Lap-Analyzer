import { render, screen } from "@testing-library/react";
import { ConditionsNote } from "../ConditionsNote";

it("says conditions matched, or lists the differences", () => {
  const { rerender } = render(<ConditionsNote notes={[]} />);
  expect(screen.getByText(/about the same/)).toBeInTheDocument();
  rerender(<ConditionsNote notes={["A", "B"]} />);
  expect(screen.getByText(/A\. B\. Part of the gap/)).toHaveClass("differs");
});
