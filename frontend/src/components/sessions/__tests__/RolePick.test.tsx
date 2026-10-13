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

it("is disabled with a reason when blocked", () => {
  const onPick = jest.fn();
  render(
    <table>
      <tbody>
        <tr>
          <RolePick role="cmp" lap={1} selected={false} blockedReason="Different car" onPick={onPick} />
        </tr>
      </tbody>
    </table>,
  );
  const button = screen.getByLabelText("Use lap 1 as comparison");
  expect(button).toBeDisabled();
  expect(button).toHaveAttribute("title", "Different car");
});
