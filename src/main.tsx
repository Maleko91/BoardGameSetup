import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const storedTheme = window.localStorage.getItem("theme");
const initialTheme = storedTheme === "dark" ? "dark" : "light";
document.documentElement.dataset.theme = initialTheme;

const container = document.getElementById("root");

if (!container) {
  throw new Error("Root container missing");
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
);
