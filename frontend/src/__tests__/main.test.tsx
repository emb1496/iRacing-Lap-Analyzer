const mockRender = jest.fn();
jest.mock("react-dom/client", () => ({ createRoot: jest.fn(() => ({ render: mockRender })) }));
jest.mock("../App", () => ({ __esModule: true, default: () => null }));

it("mounts the app into #root", () => {
  document.body.innerHTML = '<div id="root"></div>';
  require("../main");
  const { createRoot } = require("react-dom/client");
  expect(createRoot).toHaveBeenCalledWith(document.getElementById("root"));
  expect(mockRender).toHaveBeenCalled();
});
