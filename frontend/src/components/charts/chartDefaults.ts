// Plot-area insets shared by every chart: y-axis width and right margin.
export const PLOT_LEFT = 48;
export const PLOT_RIGHT = 16;

export const REF = "var(--ref)";
export const CMP = "var(--cmp)";

export const CHART_MARGIN = { top: 8, right: PLOT_RIGHT, bottom: 0, left: 0 };

export const Y_AXIS_DEFAULTS = { width: PLOT_LEFT, stroke: "var(--muted)" } as const;

export const TOOLTIP_STYLE = { background: "var(--panel)", border: "1px solid var(--border)" };
