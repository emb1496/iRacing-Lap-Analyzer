import { fireEvent, render, screen } from "@testing-library/react";
import { EmptyState } from "../EmptyState";

it("triggers the demo and honours busy", () => {
  const onDemo = jest.fn();
  const { rerender } = render(<EmptyState busy={false} onDemo={onDemo} />);
  fireEvent.click(screen.getByText("Try the demo session"));
  expect(onDemo).toHaveBeenCalled();
  rerender(<EmptyState busy onDemo={onDemo} />);
  expect(screen.getByText("Try the demo session")).toBeDisabled();
});
