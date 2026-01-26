import { useEffect, useState } from "react";
import { applyTheme, getStoredTheme, type Theme } from "../lib/theme";

export const useTheme = () => {
  const [theme, setTheme] = useState<Theme>(() => getStoredTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return { theme, setTheme };
};
