import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent,
  type ReactNode
} from "react";
import { Link, useLocation } from "react-router-dom";
import { useNavUnderline } from "../hooks/useNavUnderline";
import { useTheme } from "../hooks/useTheme";
import { getPublicAssetUrl } from "../lib/assets";

type NavItem = {
  to: string;
  label: string;
  isActive?: boolean;
};

type ShellLayoutProps = {
  navId: string;
  navLabel?: string;
  navItems: NavItem[];
  title?: ReactNode;
  subtitle?: ReactNode;
  footer?: ReactNode;
  className?: string;
  children: ReactNode;
};

export default function ShellLayout({
  navId,
  navLabel = "Primary",
  navItems,
  title,
  subtitle,
  footer,
  className,
  children
}: ShellLayoutProps) {
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const navToggleRef = useRef<HTMLButtonElement | null>(null);
  const { navRef, updateNavUnderline, resetNavUnderline } = useNavUnderline();

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
    if (!menuOpen) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        navToggleRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  const handleNavBlur = (event: FocusEvent<HTMLElement>) => {
    const nextTarget = event.relatedTarget as Node | null;
    if (nextTarget && event.currentTarget.contains(nextTarget)) {
      return;
    }
    resetNavUnderline();
  };

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

  const rootClassName = className ? `app ${className}` : "app";

  return (
    <div className={rootClassName}>
      <header className="masthead">
        <div className="title-row">
          <div className="nav-row">
            <button
              type="button"
              className="nav-toggle"
              onClick={handleToggleMenu}
              aria-label="Toggle navigation"
              aria-expanded={menuOpen}
              aria-controls={navId}
              ref={navToggleRef}
            >
              <span className="nav-toggle-icon" aria-hidden="true">
                <img src={menuIcon} alt="" />
              </span>
            </button>
            <nav
              ref={navRef}
              id={navId}
              className={menuOpen ? "site-nav is-open" : "site-nav"}
              aria-label={navLabel}
              onMouseLeave={resetNavUnderline}
              onBlur={handleNavBlur}
            >
              <span className="nav-underline" aria-hidden="true" />
              {navItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={item.isActive ? "nav-link active" : "nav-link"}
                  aria-current={item.isActive ? "page" : undefined}
                  onMouseEnter={(event) => updateNavUnderline(event.currentTarget)}
                  onFocus={(event) => updateNavUnderline(event.currentTarget)}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
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
          {title ? <h1>{title}</h1> : null}
        </div>
        {subtitle ? <p className="subtitle">{subtitle}</p> : null}
      </header>

      {children}

      {footer ? <footer className="site-footer">{footer}</footer> : null}
    </div>
  );
}
