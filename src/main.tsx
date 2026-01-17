import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import AdminApp from "./AdminApp";
import "./index.css";

const storedTheme = window.localStorage.getItem("theme");
const initialTheme = storedTheme === "dark" ? "dark" : "light";
document.documentElement.dataset.theme = initialTheme;

const getRoute = () => {
  const hashRoute = window.location.hash.replace("#", "");
  if (hashRoute.startsWith("/admin")) {
    return "admin";
  }
  if (window.location.pathname.endsWith("/admin")) {
    return "admin";
  }
  return "app";
};

const Root = () => {
  const [route, setRoute] = useState(() => getRoute());

  useEffect(() => {
    const handleChange = () => setRoute(getRoute());
    window.addEventListener("hashchange", handleChange);
    return () => {
      window.removeEventListener("hashchange", handleChange);
    };
  }, []);

  return route === "admin" ? <AdminApp /> : <App />;
};

const container = document.getElementById("root");

if (!container) {
  throw new Error("Root container missing");
}

createRoot(container).render(
  <StrictMode>
    <Root />
  </StrictMode>
);
