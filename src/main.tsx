import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Navigate, RouterProvider, createBrowserRouter } from "react-router-dom";
import AdminApp from "./AdminApp";
import App from "./App";
import GameSetupPage from "./pages/GameSetupPage";
import HomePage from "./pages/HomePage";
import ProfilePage from "./pages/ProfilePage";
import RequestPage from "./pages/RequestPage";
import "./index.css";

const storedTheme = window.localStorage.getItem("theme");
const initialTheme = storedTheme === "dark" ? "dark" : "light";
document.documentElement.dataset.theme = initialTheme;

const hashPath = window.location.hash.replace("#", "");
if (hashPath.startsWith("/")) {
  const [pathPart, queryPart] = hashPath.split("?");
  const normalized = pathPart === "" ? "/" : pathPart;
  const isKnownRoute =
    normalized === "/" ||
    normalized.startsWith("/admin") ||
    normalized.startsWith("/profile") ||
    normalized.startsWith("/request") ||
    normalized.startsWith("/game/");
  if (isKnownRoute) {
    const nextUrl = queryPart ? `${normalized}?${queryPart}` : normalized;
    window.history.replaceState(null, "", nextUrl);
  }
}

const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <App />,
      children: [
        { index: true, element: <HomePage /> },
        { path: "game/:gameId", element: <GameSetupPage /> },
        { path: "profile", element: <ProfilePage /> },
        { path: "request", element: <RequestPage /> }
      ]
    },
    { path: "/admin/*", element: <AdminApp /> },
    { path: "*", element: <Navigate to="/" replace /> }
  ],
  { basename: import.meta.env.BASE_URL }
);

const container = document.getElementById("root");

if (!container) {
  throw new Error("Root container missing");
}

createRoot(container).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
