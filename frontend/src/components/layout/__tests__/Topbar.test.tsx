import { render, screen } from "@testing-library/react";
import { Topbar } from "../Topbar";

it("shows the track only when given", () => {
  const { rerender } = render(<Topbar />);
  expect(screen.getByRole("heading")).toHaveTextContent("LapAnalyzer");
  expect(screen.queryByText("Spa")).toBeNull();
  rerender(<Topbar track="Spa" />);
  expect(screen.getByText("Spa")).toBeInTheDocument();
  expect(screen.getByRole("group", { name: "Units" })).toBeInTheDocument();
});
