// Presentation layer (browser): React 진입점.
// 도메인/애플리케이션 로직은 그대로 두고 여기서 조립만 한다.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("#root element not found");
}
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
