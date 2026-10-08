import { render } from "@testing-library/react";
import { HoverDots } from "../HoverDots";

it("draws one dot in delta view and one per lap in line view", () => {
  const { container, rerender } = render(<svg><HoverDots lineMode={false} hover={[1, 2]} cmpHover={null} /></svg>);
  expect(container.querySelectorAll("circle")).toHaveLength(1);
  rerender(<svg><HoverDots lineMode hover={[1, 2]} cmpHover={[3, 4]} /></svg>);
  expect(container.querySelectorAll("circle")).toHaveLength(2);
  rerender(<svg><HoverDots lineMode hover={[1, 2]} cmpHover={null} /></svg>);
  expect(container.querySelectorAll("circle")).toHaveLength(1);
});
