import { act, render, screen } from "@testing-library/react";
import { UnitsProvider, useUnits } from "../UnitsContext";

function Probe() {
  const { units, setUnits } = useUnits();
  return <button onClick={() => setUnits("imperial")}>{units}</button>;
}

const setLang = (l: string) =>
  Object.defineProperty(navigator, "language", { value: l, configurable: true });

const mount = () =>
  render(
    <UnitsProvider>
      <Probe />
    </UnitsProvider>,
  );

afterEach(() => {
  jest.restoreAllMocks();
  setLang("de-DE");
});

it("has a metric default outside a provider", () => {
  render(<Probe />);
  expect(screen.getByRole("button")).toHaveTextContent("metric");
  act(() => screen.getByRole("button").click());
});

it("uses stored units", () => {
  localStorage.setItem("lap-analyzer.units", "imperial");
  mount();
  expect(screen.getByRole("button")).toHaveTextContent("imperial");
});

it("falls back to the locale", () => {
  setLang("en-GB");
  const a = mount();
  expect(screen.getByRole("button")).toHaveTextContent("imperial");
  a.unmount();
  localStorage.clear();
  setLang("de-DE");
  mount();
  expect(screen.getByRole("button")).toHaveTextContent("metric");
});

it("handles a locale without a region", () => {
  setLang("en");
  mount();
  expect(screen.getByRole("button")).toHaveTextContent("metric");
});

it("persists changes", () => {
  mount();
  act(() => screen.getByRole("button").click());
  expect(localStorage.getItem("lap-analyzer.units")).toBe("imperial");
});

it("survives unavailable storage", () => {
  setLang("en-US");
  jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("denied");
  });
  jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("denied");
  });
  mount();
  expect(screen.getByRole("button")).toHaveTextContent("imperial");
});
