import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { Navigate, RouterProvider, createBrowserRouter } from "react-router-dom";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import { SessionProvider } from "./context/SessionContext";
import { initializeTheme } from "./lib/theme";
import GameSetupPage from "./pages/GameSetupPage";
import HomePage from "./pages/HomePage";
import ProfilePage from "./pages/ProfilePage";
import RequestPage from "./pages/RequestPage";
import "./index.css";

initializeTheme();

const AdminApp = lazy(() => import("./AdminApp"));

const hashPath = window.location.hash.replace("#", "");
if (hashPath.startsWith("/")) {
  const queryIndex = hashPath.indexOf("?");
  const pathPart = queryIndex >= 0 ? hashPath.slice(0, queryIndex) : hashPath;
  const queryPart = queryIndex >= 0 ? hashPath.slice(queryIndex + 1) : "";
  const normalized = pathPart === "" ? "/" : pathPart;
  const isKnownRoute =
    normalized === "/" ||
    normalized.startsWith("/admin") ||
    normalized.startsWith("/profile") ||
    normalized.startsWith("/request") ||
    normalized.startsWith("/game/");
  if (isKnownRoute) {
    const baseUrl = import.meta.env.BASE_URL ?? "/";
    const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
    const base = new URL(normalizedBase, window.location.origin);
    const nextPath = normalized === "/" ? "" : normalized.replace(/^\/+/, "");
    const nextUrl = new URL(nextPath, base);
    if (queryPart) {
      nextUrl.search = queryPart;
    }
    window.history.replaceState(null, "", `${nextUrl.pathname}${nextUrl.search}`);
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
    {
      path: "/admin/*",
      element: (
        <Suspense
          fallback={
            <div className="status" role="status" aria-live="polite">
              Loading admin console...
            </div>
          }
        >
          <AdminApp />
        </Suspense>
      )
    },
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
    <ErrorBoundary>
      <SessionProvider>
        <RouterProvider router={router} />
      </SessionProvider>
    </ErrorBoundary>
  </StrictMode>
);
