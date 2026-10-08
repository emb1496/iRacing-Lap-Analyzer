import { render, screen } from "@testing-library/react";
import { imperial, metric } from "../../../test/units";
import { TyreCard } from "../TyreCard";

const ref = { inner: 80, middle: 85, outer: 90, pressure: 170 };
const cmp = { inner: 82, middle: 87, outer: 92, pressure: 180 };

it("renders metric with pressure", () => {
  const { container } = render(<TyreCard corner="LF" refTyre={ref} cmpTyre={cmp} scale={[80, 92]} />, { wrapper: metric });
  expect(container.querySelector("small")).toHaveTextContent("outer · middle · inner");
  expect(screen.getByTitle("Reference outer: 90.0°C")).toHaveTextContent("90");
  expect(container.querySelector("p")).toHaveTextContent("+2.0°C avg · 170 → 180 kPa");
});

it("renders imperial right-hand tyres without pressure", () => {
  const { container } = render(
    <TyreCard corner="RR" refTyre={{ ...ref, pressure: null }} cmpTyre={cmp} scale={[80, 92]} />,
    { wrapper: imperial },
  );
  expect(container.querySelector("small")).toHaveTextContent("inner · middle · outer");
  expect(container.querySelector("p")).not.toHaveTextContent("psi");
  expect(screen.getByTitle(/Compared inner: 179\.6°F/)).toBeInTheDocument();
});

it("formats imperial pressure", () => {
  const { container } = render(<TyreCard corner="LR" refTyre={ref} cmpTyre={cmp} scale={[80, 92]} />, { wrapper: imperial });
  expect(container.querySelector("p")).toHaveTextContent("24.7 → 26.1 psi");
});

it("shows a dash for one missing pressure", () => {
  const { container } = render(
    <TyreCard corner="LF" refTyre={ref} cmpTyre={{ ...cmp, pressure: null }} scale={[80, 92]} />,
    { wrapper: metric },
  );
  expect(container.querySelector("p")).not.toHaveTextContent("kPa");
});
