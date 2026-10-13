import { fireEvent, render, screen } from "@testing-library/react";
import { makeLibraryFile } from "../../../test/fixtures";
import type { Library } from "../../../lib/types";
import { FilePicker } from "../FilePicker";

const files = [
  makeLibraryFile({ name: "gt3.ibt", car: "GT3", track: "Spa", session_type: "Race" }),
  makeLibraryFile({ name: "mx5.ibt", car: "MX-5", track: "Spa", session_type: null, lap_count: null }),
  makeLibraryFile({ name: "mx5-monza.ibt", car: "MX-5", track: "Monza" }),
];

function setup(over: Partial<Parameters<typeof FilePicker>[0]> = {}) {
  const props = {
    library: { directory: "/t", files } as Library | null,
    loading: false,
    busy: false,
    chosen: { ref: null, cmp: null },
    reference: null,
    sameFile: false,
    onSameFile: jest.fn(),
    onChoose: jest.fn(),
    onRescan: jest.fn(),
    onDemo: jest.fn(),
    ...over,
  };
  render(<FilePicker {...props} />);
  return props;
}

it("lists each file with its track, car, date and session type", () => {
  setup();
  expect(screen.getAllByRole("row")).toHaveLength(4);
  expect(screen.getByText("GT3")).toBeInTheDocument();
  expect(screen.getAllByText("Race")).toHaveLength(2);
  expect(screen.getAllByText(/2025/).length).toBeGreaterThan(0);
});

it("chooses a file for either side", () => {
  const { onChoose } = setup();
  fireEvent.click(screen.getByLabelText("Use gt3.ibt as reference"));
  expect(onChoose).toHaveBeenCalledWith("ref", files[0]);
  fireEvent.click(screen.getByLabelText("Use mx5.ibt as comparison"));
  expect(onChoose).toHaveBeenLastCalledWith("cmp", files[1]);
});

it("marks the chosen files", () => {
  setup({ chosen: { ref: "gt3.ibt", cmp: "mx5.ibt" } });
  expect(screen.getByLabelText("Use gt3.ibt as reference")).toHaveClass("on");
  expect(screen.getByLabelText("Use mx5.ibt as comparison")).toHaveClass("on");
  expect(screen.getByLabelText("Use gt3.ibt as comparison")).not.toHaveClass("on");
});

it("filters by any word across track, car and type", () => {
  setup();
  fireEvent.change(screen.getByLabelText("Filter files"), { target: { value: "mx-5 monza" } });
  expect(screen.getAllByRole("row")).toHaveLength(2);
  fireEvent.change(screen.getByLabelText("Filter files"), { target: { value: "nothing" } });
  expect(screen.getByText(/No files match/)).toBeInTheDocument();
});

it("disables comparison picks for another track or car than the reference", () => {
  setup({ reference: { track: "Spa", car: "MX-5" } });
  expect(screen.getByLabelText("Use mx5.ibt as comparison")).toBeEnabled();
  const blocked = screen.getByLabelText("Use gt3.ibt as comparison");
  expect(blocked).toBeDisabled();
  expect(blocked).toHaveAttribute("title", "Different track or car than the reference");
  expect(screen.getByLabelText("Use mx5-monza.ibt as comparison")).toBeDisabled();
  // the reference itself is never restricted
  expect(screen.getByLabelText("Use gt3.ibt as reference")).toBeEnabled();
});

it("disables the comparison column while using the same file for both", () => {
  const { onSameFile } = setup({ sameFile: true });
  const cmp = screen.getByLabelText("Use gt3.ibt as comparison");
  expect(cmp).toBeDisabled();
  expect(cmp).toHaveAttribute("title", expect.stringContaining("Untick"));
  expect(screen.getByLabelText("Use gt3.ibt as reference")).toBeEnabled();
  fireEvent.click(screen.getByLabelText("Use the same file for both"));
  expect(onSameFile).toHaveBeenCalledWith(false);
});

it("disables picks while busy", () => {
  setup({ busy: true });
  expect(screen.getByLabelText("Use gt3.ibt as reference")).toBeDisabled();
});

it("rescans and offers the demo", () => {
  const { onRescan, onDemo } = setup();
  fireEvent.click(screen.getByText("Rescan"));
  expect(onRescan).toHaveBeenCalled();
  fireEvent.click(screen.getByText("try the demo session"));
  expect(onDemo).toHaveBeenCalled();
});

it("says so while looking, when there is no folder, and when it is empty", () => {
  const { rerender } = render(
    <FilePicker {...({ library: null, loading: true, busy: false, chosen: { ref: null, cmp: null }, reference: null, sameFile: false, onSameFile: jest.fn(), onChoose: jest.fn(), onRescan: jest.fn(), onDemo: jest.fn() } as Parameters<typeof FilePicker>[0])} />,
  );
  expect(screen.getByText(/Looking for your telemetry files/)).toBeInTheDocument();
  const base = { loading: false, busy: false, chosen: { ref: null, cmp: null }, reference: null, sameFile: false, onSameFile: jest.fn(), onChoose: jest.fn(), onRescan: jest.fn(), onDemo: jest.fn() };
  rerender(<FilePicker {...base} library={{ directory: null, files: [] }} />);
  expect(screen.getByText(/Couldn't find your iRacing telemetry folder/)).toBeInTheDocument();
  rerender(<FilePicker {...base} library={{ directory: "/t", files: [] }} />);
  expect(screen.getByText(/No .ibt files in/)).toBeInTheDocument();
  expect(screen.getByText("/t")).toBeInTheDocument();
});
