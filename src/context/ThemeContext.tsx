import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useColorScheme } from "react-native";
import { darkTheme, lightTheme, ThemeColors } from "../data/theme";
import {
  loadAppearance,
  saveAppearance,
  subscribeAppearance,
} from "../lib/storage";
import { AppearanceMode } from "../types/models";

type ResolvedMode = "light" | "dark";

type ThemeContextValue = {
  colors: ThemeColors;
  mode: AppearanceMode;
  resolvedMode: ResolvedMode;
  ready: boolean;
  setMode: (mode: AppearanceMode) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<AppearanceMode>("system");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    loadAppearance()
      .then(saved => {
        if (active) setModeState(saved);
      })
      .finally(() => {
        if (active) setReady(true);
      });

    const unsubscribe = subscribeAppearance(saved => {
      setModeState(saved);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const setMode = useCallback(async (nextMode: AppearanceMode) => {
    setModeState(nextMode);
    await saveAppearance(nextMode);
  }, []);

  const resolvedMode: ResolvedMode =
    mode === "system"
      ? systemScheme === "dark"
        ? "dark"
        : "light"
      : mode;

  const colors = resolvedMode === "dark" ? darkTheme : lightTheme;

  const value = useMemo(
    () => ({ colors, mode, resolvedMode, ready, setMode }),
    [colors, mode, ready, resolvedMode, setMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error("useAppTheme must be used inside AppThemeProvider");
  }
  return value;
}
