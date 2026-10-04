import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { UnitsProvider } from "./units";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <UnitsProvider>
      <App />
    </UnitsProvider>
  </StrictMode>,
);
