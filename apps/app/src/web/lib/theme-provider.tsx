import { createContext, useContext, useEffect, useRef, useState } from "react";

import { ThemeMode, getStoredTheme, resolveEffectiveTheme, setStoredTheme } from "@/web/lib/theme";

type ThemeContextValue = {
  mode: ThemeMode;
  effectiveTheme: "light" | "dark";
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

type ThemeProviderProps = {
  children: React.ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [effectiveTheme, setEffectiveTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored = getStoredTheme() ?? "system";
    const nextEffective = resolveEffectiveTheme(stored);
    setModeState(stored);
    setEffectiveTheme(nextEffective);
    updateDocumentClass(nextEffective);

    if (typeof window !== "undefined" && window.matchMedia) {
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      const listener = (event: MediaQueryListEvent) => {
        setEffectiveTheme((currentEffective) => {
          const currentMode = storedModeRef.current;
          if (currentMode !== "system") {
            return currentEffective;
          }
          const next = event.matches ? "dark" : "light";
          updateDocumentClass(next);
          return next;
        });
      };
      media.addEventListener("change", listener);
      return () => media.removeEventListener("change", listener);
    }
  }, []);

  const storedModeRef = useRef<ThemeMode>("system");

  function updateDocumentClass(theme: "light" | "dark") {
    if (typeof document === "undefined") {
      return;
    }
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }

  const setMode = (nextMode: ThemeMode) => {
    storedModeRef.current = nextMode;
    setStoredTheme(nextMode);
    const nextEffective = resolveEffectiveTheme(nextMode);
    setModeState(nextMode);
    setEffectiveTheme(nextEffective);
    updateDocumentClass(nextEffective);
  };

  return (
    <ThemeContext.Provider
      value={{
        mode,
        effectiveTheme,
        setMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

