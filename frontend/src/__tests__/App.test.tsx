import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "../App";
import { UnitsProvider } from "../context/UnitsContext";
import { api } from "../lib/api";
import { makeComparison, makeLibraryFile, makeSession } from "../test/fixtures";

jest.mock("recharts", () => ({
  ...jest.requireActual("recharts"),
  ResponsiveContainer: jest.requireActual("../test/rechartsMock").ResponsiveContainer,
}));
jest.mock("../lib/api", () => ({
  api: {
    compare: jest.fn(),
    upload: jest.fn(),
    loadDemo: jest.fn(),
    library: jest.fn(),
    loadFromLibrary: jest.fn(),
  },
}));

const mocked = api as jest.Mocked<typeof api>;
const renderApp = () =>
  render(
    <UnitsProvider>
      <App />
    </UnitsProvider>,
  );

beforeEach(() => {
  jest.resetAllMocks();
  mocked.loadDemo.mockResolvedValue(makeSession());
  mocked.upload.mockResolvedValue(makeSession());
  mocked.compare.mockResolvedValue(makeComparison());
  mocked.library.mockResolvedValue({ directory: null, files: [] });
});

it("starts on the file picker", async () => {
  renderApp();
  expect(screen.getByText("Pick your laps")).toBeInTheDocument();
  expect(await screen.findByText(/Couldn't find your iRacing telemetry folder/)).toBeInTheDocument();
});

it("loads a telemetry file from the folder for both sides and shows the analysis", async () => {
  mocked.library.mockResolvedValue({
    directory: "/t",
    files: [makeLibraryFile({ name: "a.ibt" })],
  });
  mocked.loadFromLibrary.mockResolvedValue(makeSession());
  renderApp();
  fireEvent.click(await screen.findByLabelText("Use a.ibt as reference"));
  expect(await screen.findByText("Biggest loss")).toBeInTheDocument();
  expect(mocked.loadFromLibrary).toHaveBeenCalledWith("a.ibt");
  expect(mocked.loadFromLibrary).toHaveBeenCalledTimes(1);
  expect(screen.queryByText("Pick your laps")).toBeNull();

  // "Change files…" goes back to the picker; the loaded file is not fetched again.
  fireEvent.click(screen.getByText("Change files…"));
  expect(screen.getByText("Pick your laps")).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText("Use a.ibt as reference"));
  await waitFor(() => expect(screen.queryByText("Pick your laps")).toBeNull());
  expect(mocked.loadFromLibrary).toHaveBeenCalledTimes(1);
});

it("loads the demo from the picker and shows the analysis", async () => {
  renderApp();
  fireEvent.click(screen.getByText("try the demo session"));
  expect(await screen.findByText("Biggest loss")).toBeInTheDocument();
  expect(mocked.compare).toHaveBeenCalled();
  expect(screen.getByRole("img", { name: /track map/ })).toBeInTheDocument();
  expect(screen.queryByText("Pick your laps")).toBeNull();
});

it("zooms to a corner when a corner row is clicked, and hovers", async () => {
  renderApp();
  fireEvent.click(screen.getByText("Load demo"));
  const row = (await screen.findAllByTitle(/Click to zoom/))[0];
  jest.spyOn(window, "requestAnimationFrame").mockImplementation((f) => {
    f(0);
    return 1;
  });
  fireEvent.mouseEnter(row);
  fireEvent.mouseLeave(row);
  fireEvent.click(row);
  expect(await screen.findByText(/Showing 50 m – 250 m/)).toBeInTheDocument();
});

it("uploads a file", async () => {
  renderApp();
  const file = new File(["x"], "a.ibt");
  fireEvent.drop(document.querySelector("aside") as HTMLElement, { dataTransfer: { files: [file] } });
  await waitFor(() => expect(mocked.upload).toHaveBeenCalledWith(file));
});

it("shows and dismisses errors", async () => {
  mocked.loadDemo.mockRejectedValue(new Error("server down"));
  renderApp();
  fireEvent.click(screen.getByText("try the demo session"));
  expect(await screen.findByRole("alert")).toHaveTextContent("server down");
  fireEvent.click(screen.getByLabelText("Dismiss"));
  expect(screen.queryByRole("alert")).toBeNull();
});

it("surfaces comparison errors", async () => {
  mocked.compare.mockRejectedValue(new Error("compare failed"));
  renderApp();
  fireEvent.click(screen.getByText("Load demo"));
  expect(await screen.findByRole("alert")).toHaveTextContent("compare failed");
});
