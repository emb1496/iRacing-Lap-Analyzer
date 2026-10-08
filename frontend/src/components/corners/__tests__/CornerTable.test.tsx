import { render, screen } from "@testing-library/react";
import { makeComparison, makeCorner } from "../../../test/fixtures";
import { metric } from "../../../test/units";
import { CornerTable } from "../CornerTable";

const table = (c = makeComparison()) => <CornerTable comparison={c} onHover={jest.fn()} onSelect={jest.fn()} />;

it("renders a row per corner and highlights only the worst", () => {
  const { container } = render(table(), { wrapper: metric });
  expect(container.querySelectorAll("tbody tr")).toHaveLength(2);
  expect(container.querySelectorAll("tr.worst")).toHaveLength(1);
  expect(screen.getByText("Apex km/h")).toBeInTheDocument();
});

it("highlights nothing without a meaningful loss", () => {
  const { container } = render(table(makeComparison({ corners: [makeCorner({ time_delta: 0.01 })] })), { wrapper: metric });
  expect(container.querySelectorAll("tr.worst")).toHaveLength(0);
});

it("handles no corners", () => {
  const { container } = render(table(makeComparison({ corners: [] })), { wrapper: metric });
  expect(container.querySelectorAll("tbody tr")).toHaveLength(0);
});
