import * as React from "react";

export type ThemeChoice = "light" | "dark" | "system";
type Resolved = "light" | "dark";

type Ctx = {
  theme: ThemeChoice;
  resolved: Resolved;
  setTheme: (t: ThemeChoice) => void;
};

const ThemeContext = React.createContext<Ctx | null>(null);
const STORAGE_KEY = "wh-theme";

function getSystem(): Resolved {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function readStored(): ThemeChoice {
  if (typeof window === "undefined") return "system";
  const v = window.localStorage.getItem(STORAGE_KEY);
  if (v === "light" || v === "dark" || v === "system") return v;
  return "system";
}

function applyTheme(resolved: Resolved) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(resolved);
  root.style.colorScheme = resolved;
}

/**
 * forceTheme: when set, the provider applies that theme and ignores user choice
 * (used to keep the public/marketing site always dark to preserve brand identity).
 */
export function ThemeProvider({
  children,
  forceTheme,
}: {
  children: React.ReactNode;
  forceTheme?: Resolved;
}) {
  // SSR-safe defaults: never read localStorage/matchMedia during initial render.
  // The inline `themeInitScript` already applies the correct class to <html>
  // before hydration, so the initial React tree must match the server output
  // (no theme-dependent UI before mount).
  const [theme, setThemeState] = React.useState<ThemeChoice>("system");
  const [systemTheme, setSystemTheme] = React.useState<Resolved>("dark");

  // Read persisted choice + system preference AFTER mount only.
  React.useEffect(() => {
    setThemeState(readStored());
    setSystemTheme(getSystem());
  }, []);

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => setSystemTheme(mq.matches ? "light" : "dark");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const resolved: Resolved = forceTheme ?? (theme === "system" ? systemTheme : theme);

  React.useEffect(() => {
    applyTheme(resolved);
  }, [resolved]);

  const setTheme = React.useCallback((t: ThemeChoice) => {
    setThemeState(t);
    try {
      window.localStorage.setItem(STORAGE_KEY, t);
    } catch {}
  }, []);

  const value = React.useMemo(() => ({ theme, resolved, setTheme }), [theme, resolved, setTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Ctx {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) {
    // Safe fallback so components don't crash outside provider.
    return {
      theme: "dark",
      resolved: "dark",
      setTheme: () => {},
    };
  }
  return ctx;
}

/** Inline script string to apply the saved theme before hydration (anti-flash). */
export const themeInitScript = `
(function(){try{
  var k='wh-theme';
  var v=localStorage.getItem(k);
  var sys=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';
  var t=(v==='light'||v==='dark')?v:sys;
  var p=window.location.pathname||'';
  var isPublic=!(p.indexOf('/conta')===0||p.indexOf('/admin')===0||p==='/login'||p==='/signup'||p==='/forgot-password'||p==='/reset-password');
  if(isPublic) t='dark';
  var r=document.documentElement;
  r.classList.remove('light','dark');
  r.classList.add(t);
  r.style.colorScheme=t;
}catch(e){}})();
`;