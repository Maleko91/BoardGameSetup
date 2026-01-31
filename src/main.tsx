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
  { basename: "/" }
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
