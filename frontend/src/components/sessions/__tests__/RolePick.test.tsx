import { fireEvent, render, screen } from "@testing-library/react";
import { RolePick } from "../RolePick";

it("labels and fires", () => {
  const onPick = jest.fn();
  render(
    <table>
      <tbody>
        <tr>
          <RolePick role="ref" lap={3} selected onPick={onPick} />
          <RolePick role="cmp" lap={3} selected={false} onPick={onPick} />
        </tr>
      </tbody>
    </table>,
  );
  fireEvent.click(screen.getByLabelText("Use lap 3 as reference"));
  expect(onPick).toHaveBeenCalledTimes(1);
  expect(screen.getByLabelText("Use lap 3 as reference")).toHaveClass("on");
  expect(screen.getByLabelText("Use lap 3 as comparison")).not.toHaveClass("on");
});
