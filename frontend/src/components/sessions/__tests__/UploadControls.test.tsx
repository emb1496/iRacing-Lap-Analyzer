import { fireEvent, render, screen } from "@testing-library/react";
import { UploadControls } from "../UploadControls";

it("fires demo, opens the picker, and uploads the chosen file", () => {
  const onUpload = jest.fn();
  const onDemo = jest.fn();
  const { container } = render(<UploadControls busy={false} onUpload={onUpload} onDemo={onDemo} />);
  fireEvent.click(screen.getByText("Load demo"));
  expect(onDemo).toHaveBeenCalled();

  const input = container.querySelector("input[type=file]") as HTMLInputElement;
  const click = jest.spyOn(input, "click").mockImplementation(() => {});
  fireEvent.click(screen.getByText("Upload .ibt"));
  expect(click).toHaveBeenCalled();

  const file = new File(["x"], "a.ibt");
  fireEvent.change(input, { target: { files: [file] } });
  expect(onUpload).toHaveBeenCalledWith(file);
  fireEvent.change(input, { target: { files: [] } });
  expect(onUpload).toHaveBeenCalledTimes(1);
});

it("disables buttons while busy", () => {
  render(<UploadControls busy onUpload={jest.fn()} onDemo={jest.fn()} />);
  expect(screen.getByText("Upload .ibt")).toBeDisabled();
  expect(screen.getByText("Load demo")).toBeDisabled();
});
