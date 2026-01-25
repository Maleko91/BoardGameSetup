import { useEffect, useMemo } from "react";
import { Outlet, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { SessionProvider } from "./context/SessionContext";
import ShellLayout from "./components/ShellLayout";

const AppShell = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const page = searchParams.get("page");
    const game = searchParams.get("game");
    if (!page && !game) {
      return;
    }
    if (page === "request") {
      navigate("/request", { replace: true });
      return;
    }
    if (page === "profile") {
      navigate("/profile", { replace: true });
      return;
    }
    if (page === "home") {
      navigate("/", { replace: true });
      return;
    }
    const trimmedGame = game?.trim();
    if (trimmedGame) {
      navigate(`/game/${trimmedGame}`, { replace: true });
    }
  }, [navigate, searchParams]);

  const isGamePage = location.pathname.startsWith("/game/");
  const isHomePage = location.pathname === "/" || isGamePage;
  const isRequestPage = location.pathname.startsWith("/request");
  const isProfilePage = location.pathname.startsWith("/profile");

  const stageTitle = useMemo(() => {
    if (isRequestPage) {
      return "Request a game";
    }
    if (isProfilePage) {
      return "";
    }
    if (isGamePage) {
      return "Setup checklist";
    }
    return "Setup and Play";
  }, [isGamePage, isProfilePage, isRequestPage]);

  const stageSubtitle = useMemo(() => {
    if (isRequestPage) {
      return "";
    }
    if (isProfilePage) {
      return "";
    }
    if (isGamePage) {
      return "";
    }
    return "Search the library and select a game to begin.";
  }, [isGamePage, isProfilePage, isRequestPage]);

  const navItems = useMemo(
    () => [
      { to: "/", label: "Home", isActive: isHomePage },
      { to: "/request", label: "Request a game", isActive: isRequestPage },
      { to: "/profile", label: "Profile", isActive: isProfilePage }
    ],
    [isHomePage, isProfilePage, isRequestPage]
  );

  const currentYear = new Date().getFullYear();
  const footer = (
    <>
      <p>Copyright {currentYear} Board Game Setups.</p>
      <p>
        Board game titles, artwork, and trademarks belong to their respective
        owners. This fan-made site provides setup guidance and is not affiliated
        with any publisher.
      </p>
    </>
  );

  return (
    <ShellLayout
      navId="primary-navigation"
      navItems={navItems}
      title={stageTitle}
      subtitle={stageSubtitle}
      footer={footer}
    >
      <Outlet />
    </ShellLayout>
  );
};

export default function App() {
  return (
    <SessionProvider>
      <AppShell />
    </SessionProvider>
  );
}
