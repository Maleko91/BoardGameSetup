import { useCallback, useEffect, useRef } from "react";

export const useNavUnderline = () => {
  const navRef = useRef<HTMLElement | null>(null);

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
    const handleResize = () => {
      resetNavUnderline();
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [resetNavUnderline]);

  return { navRef, updateNavUnderline, resetNavUnderline };
};
