import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "../App";
import { UnitsProvider } from "../context/UnitsContext";
import { api } from "../lib/api";
import { makeComparison, makeSession } from "../test/fixtures";

jest.mock("recharts", () => ({
  ...jest.requireActual("recharts"),
  ResponsiveContainer: jest.requireActual("../test/rechartsMock").ResponsiveContainer,
}));
jest.mock("../lib/api", () => ({ api: { compare: jest.fn(), upload: jest.fn(), loadDemo: jest.fn() } }));

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
});

it("starts empty", () => {
  renderApp();
  expect(screen.getByText("Where are you losing time?")).toBeInTheDocument();
});

it("loads the demo from the empty state and shows the analysis", async () => {
  renderApp();
  fireEvent.click(screen.getByText("Try the demo session"));
  expect(await screen.findByText("Biggest loss")).toBeInTheDocument();
  expect(mocked.compare).toHaveBeenCalled();
  expect(screen.getByRole("img", { name: /track map/ })).toBeInTheDocument();
  expect(screen.queryByText("Where are you losing time?")).toBeNull();
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
  fireEvent.click(screen.getByText("Try the demo session"));
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
