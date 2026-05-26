/**
 * Lê o locale preferido do request (cookie wh_locale) durante SSR.
 * Cliente cai em pt-BR se não houver cookie.
 */
import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";

export type Locale = "pt-BR" | "en" | "es";
const ALLOWED: Locale[] = ["pt-BR", "en", "es"];

export const getRequestLocale = createServerFn({ method: "GET" }).handler(async (): Promise<Locale> => {
  try {
    const v = getCookie("wh_locale") as Locale | undefined;
    if (v && ALLOWED.includes(v)) return v;
  } catch {
    /* não estamos em request context */
  }
  return "pt-BR";
});
