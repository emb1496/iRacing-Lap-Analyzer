import { render } from "@testing-library/react";
import { Dumbbell } from "../Dumbbell";

it("positions the dots and bar on the scale", () => {
  const { container } = render(<Dumbbell range={[0, 10]} refValue={6} cmpValue={2} />);
  expect(container.querySelector(".bar")).toHaveStyle({ left: "20%", width: "40%" });
  expect(container.querySelector(".dot.ref")).toHaveStyle({ left: "60%" });
  expect(container.querySelector(".dot.cmp")).toHaveStyle({ left: "20%" });
});
