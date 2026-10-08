import { fireEvent, render, screen } from "@testing-library/react";
import { ErrorBanner } from "../ErrorBanner";

it("shows and dismisses", () => {
  const onDismiss = jest.fn();
  render(<ErrorBanner message="oops" onDismiss={onDismiss} />);
  expect(screen.getByRole("alert")).toHaveTextContent("oops");
  fireEvent.click(screen.getByLabelText("Dismiss"));
  expect(onDismiss).toHaveBeenCalled();
});
