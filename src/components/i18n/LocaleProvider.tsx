import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "@tanstack/react-router";
import ptBR from "@/i18n/pt-BR.json";
import en from "@/i18n/en.json";
import es from "@/i18n/es.json";

export type Locale = "pt-BR" | "en" | "es";
export const LOCALES: { code: Locale; label: string; flag: string }[] = [
  { code: "pt-BR", label: "Português", flag: "🇧🇷" },
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "es", label: "Español", flag: "🇪🇸" },
];

const STORAGE_KEY = "wh.locale";
const COOKIE_KEY = "wh_locale";

function writeCookie(value: string) {
  if (typeof document === "undefined") return;
  const oneYear = 60 * 60 * 24 * 365;
  document.cookie = `${COOKIE_KEY}=${value}; Max-Age=${oneYear}; Path=/; SameSite=Lax`;
}

function readCookie(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp("(?:^|; )" + COOKIE_KEY + "=([^;]+)"));
  return m ? decodeURIComponent(m[1]) : null;
}

type Dict = Record<string, any>;
const DICTS: Record<Locale, Dict> = {
  "pt-BR": ptBR as Dict,
  en: en as Dict,
  es: es as Dict,
};

function lookup(dict: Dict, key: string): string | undefined {
  const parts = key.split(".");
  let cur: any = dict;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in cur) cur = cur[p];
    else return undefined;
  }
  return typeof cur === "string" ? cur : undefined;
}

function interpolate(str: string, vars?: Record<string, string | number>): string {
  if (!vars) return str;
  return str.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : `{{${k}}}`));
}

interface Ctx {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const LocaleCtx = createContext<Ctx | undefined>(undefined);

function readInitial(): Locale {
  if (typeof window === "undefined") return "pt-BR";
  const cookieV = readCookie() as Locale | null;
  if (cookieV && LOCALES.some((l) => l.code === cookieV)) return cookieV;
  return "pt-BR";
}

function detectClientLocale(): Locale {
  if (typeof window === "undefined") return "pt-BR";
  const cookieV = readCookie() as Locale | null;
  if (cookieV && LOCALES.some((l) => l.code === cookieV)) return cookieV;
  const v = window.localStorage.getItem(STORAGE_KEY) as Locale | null;
  if (v && LOCALES.some((l) => l.code === v)) return v;
  const nav = window.navigator.language?.toLowerCase() ?? "";
  if (nav.startsWith("es")) return "es";
  if (nav.startsWith("en")) return "en";
  return "pt-BR";
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>(readInitial);

  // Após hidratar, detecta locale do navegador/localStorage sem causar mismatch SSR.
  useEffect(() => {
    const detected = detectClientLocale();
    if (detected !== locale) {
      setLocaleState(detected);
      writeCookie(detected);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sincroniza locale do profile uma vez ao logar.
  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      const { data } = await supabase.from("profiles").select("locale").eq("id", user.id).maybeSingle();
      if (!alive) return;
      const remote = (data?.locale ?? null) as Locale | null;
      if (remote && LOCALES.some((l) => l.code === remote) && remote !== locale) {
        setLocaleState(remote);
        window.localStorage.setItem(STORAGE_KEY, remote);
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, l);
      writeCookie(l);
    }
    if (user) {
      supabase.from("profiles").update({ locale: l }).eq("id", user.id).then(() => {});
    }
    // Refaz loaders SSR-aware (Hero/CMS/Blog) com o novo idioma sem reload.
    try {
      router.invalidate();
    } catch {
      /* fora do contexto de router */
    }
  };

  const t = (key: string, vars?: Record<string, string | number>) => {
    const v = lookup(DICTS[locale], key)
      ?? lookup(DICTS["pt-BR"], key)
      ?? key;
    return interpolate(v, vars);
  };

  return <LocaleCtx.Provider value={{ locale, setLocale, t }}>{children}</LocaleCtx.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleCtx);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}

export function useT() {
  return useLocale().t;
}

const INTL_LOCALE: Record<Locale, string> = {
  "pt-BR": "pt-BR",
  en: "en-US",
  es: "es-ES",
};

export function useFormatters() {
  const { locale } = useLocale();
  const intl = INTL_LOCALE[locale];
  return {
    formatCurrency: (cents: number, currency = "BRL") =>
      new Intl.NumberFormat(intl, { style: "currency", currency }).format(cents / 100),
    formatDate: (d: string | number | Date, opts?: Intl.DateTimeFormatOptions) =>
      new Intl.DateTimeFormat(intl, opts).format(new Date(d)),
    formatDateTime: (d: string | number | Date) =>
      new Intl.DateTimeFormat(intl, { dateStyle: "short", timeStyle: "short" }).format(new Date(d)),
  };
}