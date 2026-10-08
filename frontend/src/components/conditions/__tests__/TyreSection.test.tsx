import { render, screen } from "@testing-library/react";
import { makeConditions } from "../../../test/fixtures";
import { metric } from "../../../test/units";
import { TyreSection } from "../TyreSection";

it("renders cards for logged corners and blanks for the rest", () => {
  const a = makeConditions();
  const b = makeConditions({ tyres: { LF: a.tyres.LF, RF: a.tyres.RF } });
  const { container } = render(<TyreSection refConditions={a} cmpConditions={b} />, { wrapper: metric });
  expect(container.querySelectorAll(".tyre")).toHaveLength(2);
  expect(container.querySelectorAll(".tyre-grid > div")).toHaveLength(4);
  expect(screen.getByText(/Tyre temperatures/)).toBeInTheDocument();
});
