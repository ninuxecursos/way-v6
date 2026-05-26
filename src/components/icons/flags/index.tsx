import type { ComponentType, SVGProps } from "react";
import { FlagBR } from "./FlagBR";
import { FlagUS } from "./FlagUS";
import { FlagES } from "./FlagES";
import type { Locale } from "@/components/i18n/LocaleProvider";

export { FlagBR, FlagUS, FlagES };

export const FLAG_BY_LOCALE: Record<Locale, ComponentType<SVGProps<SVGSVGElement>>> = {
  "pt-BR": FlagBR,
  en: FlagUS,
  es: FlagES,
};