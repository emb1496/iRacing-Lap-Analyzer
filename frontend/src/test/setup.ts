import "@testing-library/jest-dom";

// jsdom reports en-US, which would default every test to imperial.
beforeEach(() => {
  Object.defineProperty(navigator, "language", { value: "de-DE", configurable: true });
});

afterEach(() => localStorage.clear());
