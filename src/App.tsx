import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Link,
  Outlet,
  useLocation,
  useNavigate,
  useSearchParams
} from "react-router-dom";
import { SessionProvider, useSession } from "./context/SessionContext";

const getPublicAssetUrl = (path: string) =>
  `${import.meta.env.BASE_URL}${encodeURI(path)}`;

const AppShell = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { session } = useSession();
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const stored = window.localStorage.getItem("theme");
    return stored === "dark" ? "dark" : "light";
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("theme", theme);
  }, [theme]);

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

  const updateNavUnderline = useCallback((target: HTMLElement | null) => {
    const nav = navRef.current;
    if (!nav) {
      return;
    }
    if (!target) {
      nav.style.setProperty("--nav-underline-opacity", "0");
      return;
    }
    const navRect = nav.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const left = targetRect.left - navRect.left;
    nav.style.setProperty("--nav-underline-left", `${left}px`);
    nav.style.setProperty("--nav-underline-width", `${targetRect.width}px`);
    nav.style.setProperty("--nav-underline-opacity", "1");
  }, []);

  const resetNavUnderline = useCallback(() => {
    const nav = navRef.current;
    if (!nav) {
      return;
    }
    const active = nav.querySelector<HTMLElement>(".nav-link.active");
    updateNavUnderline(active);
  }, [updateNavUnderline]);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useLayoutEffect(() => {
    resetNavUnderline();
  }, [location.pathname, resetNavUnderline]);

  useEffect(() => {
    if (menuOpen) {
      resetNavUnderline();
    }
  }, [menuOpen, resetNavUnderline]);

  useEffect(() => {
    const handleResize = () => {
      resetNavUnderline();
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [resetNavUnderline]);

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
  }, [isGamePage, isProfilePage, isRequestPage, session]);

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
  }, [isGamePage, isProfilePage, isRequestPage, session]);

  const handleToggleTheme = () => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  };

  const handleToggleMenu = () => {
    setMenuOpen((open) => !open);
  };

  const themeIcon =
    theme === "dark"
      ? getPublicAssetUrl("svgs/sun.svg")
      : getPublicAssetUrl("svgs/moon.svg");
  const menuIcon = getPublicAssetUrl("svgs/bars-3.svg");

  const currentYear = new Date().getFullYear();

  return (
    <div className="app">
      <header className="masthead">
        <div className="title-row">
          <div className="nav-row">
            <button
              type="button"
              className="nav-toggle"
              onClick={handleToggleMenu}
              aria-label="Toggle navigation"
              aria-expanded={menuOpen}
              aria-controls="primary-navigation"
            >
              <span className="nav-toggle-icon" aria-hidden="true">
                <img src={menuIcon} alt="" />
              </span>
            </button>
            <nav
              ref={navRef}
              id="primary-navigation"
              className={menuOpen ? "site-nav is-open" : "site-nav"}
              aria-label="Primary"
              onMouseLeave={resetNavUnderline}
            >
              <span className="nav-underline" aria-hidden="true" />
              <Link
                to="/"
                className={isHomePage ? "nav-link active" : "nav-link"}
                aria-current={isHomePage ? "page" : undefined}
                onMouseEnter={(event) => updateNavUnderline(event.currentTarget)}
                onClick={() => setMenuOpen(false)}
              >
                Home
              </Link>
              <Link
                to="/request"
                className={isRequestPage ? "nav-link active" : "nav-link"}
                aria-current={isRequestPage ? "page" : undefined}
                onMouseEnter={(event) => updateNavUnderline(event.currentTarget)}
                onClick={() => setMenuOpen(false)}
              >
                Request a game
              </Link>
              <Link
                to="/profile"
                className={isProfilePage ? "nav-link active" : "nav-link"}
                aria-current={isProfilePage ? "page" : undefined}
                onMouseEnter={(event) => updateNavUnderline(event.currentTarget)}
                onClick={() => setMenuOpen(false)}
              >
                Profile
              </Link>
            </nav>
            <button
              type="button"
              className="theme-toggle"
              onClick={handleToggleTheme}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              data-next={theme === "dark" ? "light" : "dark"}
            >
              <img src={themeIcon} alt="" aria-hidden="true" className="theme-toggle-icon" />
            </button>
          </div>
          {stageTitle ? <h1>{stageTitle}</h1> : null}
        </div>
        {stageSubtitle ? <p className="subtitle">{stageSubtitle}</p> : null}
      </header>

      <Outlet />

      <footer className="site-footer">
        <p>Copyright {currentYear} Board Game Setups.</p>
        <p>
          Board game titles, artwork, and trademarks belong to their respective
          owners. This fan-made site provides setup guidance and is not affiliated
          with any publisher.
        </p>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <SessionProvider>
      <AppShell />
    </SessionProvider>
  );
}
