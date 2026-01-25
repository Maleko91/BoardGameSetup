import { act, render, screen, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { useTheme } from "../hooks/useTheme";

type ThemeSetter = (theme: "dark" | "light") => void;

const ThemeHarness = ({ onReady }: { onReady: (setTheme: ThemeSetter) => void }) => {
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    onReady(setTheme);
  }, [onReady, setTheme]);

  return <div data-testid="theme" data-theme={theme} />;
};

describe("useTheme", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.dataset.theme = "";
  });

  it("reads the stored theme and applies it to the document", async () => {
    window.localStorage.setItem("theme", "dark");

    render(<ThemeHarness onReady={() => {}} />);

    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe("dark");
    });
  });

  it("updates the theme and persists it", async () => {
    let setTheme: ThemeSetter | null = null;

    render(<ThemeHarness onReady={(next) => (setTheme = next)} />);

    await waitFor(() => {
      expect(screen.getByTestId("theme")).toHaveAttribute("data-theme", "light");
    });

    act(() => {
      setTheme?.("dark");
    });

    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe("dark");
      expect(window.localStorage.getItem("theme")).toBe("dark");
    });
  });
});
