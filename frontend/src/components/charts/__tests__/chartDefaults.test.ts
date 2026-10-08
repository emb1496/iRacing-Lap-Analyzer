import { CHART_MARGIN, PLOT_LEFT, PLOT_RIGHT, Y_AXIS_DEFAULTS } from "../chartDefaults";

it("derives the margins and axis width from the plot insets", () => {
  expect(CHART_MARGIN.right).toBe(PLOT_RIGHT);
  expect(Y_AXIS_DEFAULTS.width).toBe(PLOT_LEFT);
});
