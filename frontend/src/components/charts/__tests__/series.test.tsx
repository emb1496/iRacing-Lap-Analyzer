import { render } from "@testing-library/react";
import { LineChart, ComposedChart } from "recharts";
import { makeCorner } from "../../../test/fixtures";
import { area, chartTooltip, cornerLines, line, unitTooltip } from "../series";

it("builds line and area elements", () => {
  const l = line("refSpeed", "red", "Ref", true, true);
  expect(l.props).toMatchObject({ dataKey: "refSpeed", type: "stepAfter", strokeDasharray: "4 3" });
  expect(line("refSpeed", "red", "Ref").props).toMatchObject({ type: "linear", strokeDasharray: undefined });
  expect(area("refBrake", "blue", "Ref").props).toMatchObject({ dataKey: "refBrake", fill: "blue" });
});

it("renders them inside charts", () => {
  const data = [{ d: 0, refSpeed: 1, refBrake: 2 }, { d: 1, refSpeed: 2, refBrake: 3 }];
  const { container } = render(
    <>
      <LineChart width={200} height={100} data={data}>
        {cornerLines([makeCorner()])}
        {line("refSpeed", "red", "Ref")}
      </LineChart>
      <ComposedChart width={200} height={100} data={data}>
        {area("refBrake", "blue", "Ref")}
      </ComposedChart>
    </>,
  );
  expect(container.querySelector(".recharts-line")).toBeInTheDocument();
  expect(container.querySelector(".recharts-area")).toBeInTheDocument();
});

it("makes one reference line per corner", () => {
  expect(cornerLines([makeCorner({ number: 1 }), makeCorner({ number: 2 })])).toHaveLength(2);
});

it("formats tooltip labels and values", () => {
  const { props } = unitTooltip("metric", "km/h", 1);
  expect(props.labelFormatter(120)).toBe("120 m");
  expect(props.formatter("100")).toBe("100.0 km/h");
  expect(chartTooltip("imperial", (v) => `${v}!`).props.formatter("3")).toBe("3!");
});
