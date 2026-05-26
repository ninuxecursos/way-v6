import { LOCALES, useLocale, useT, type Locale } from "./LocaleProvider";
import { Globe } from "lucide-react";
import { FLAG_BY_LOCALE } from "@/components/icons/flags";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export function LocaleSelector({ compact = false, light = false }: { compact?: boolean; light?: boolean }) {
  const { locale, setLocale } = useLocale();
  const t = useT();
  const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];
  const CurrentFlag = FLAG_BY_LOCALE[current.code];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={
          light
            ? "inline-flex items-center gap-1.5 rounded-md border border-black/10 bg-white/90 px-2 py-1.5 text-xs font-medium text-black hover:bg-white transition-colors cursor-pointer"
            : "inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1.5 text-xs font-medium hover:bg-accent transition-colors cursor-pointer"
        }
        aria-label={t("common.selectLanguage")}
      >
        <Globe size={14} />
        {compact ? (
          <span>{current.code.toUpperCase().slice(0, 2)}</span>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <CurrentFlag className="h-3.5 w-5 rounded-[2px] shadow-sm" />
            {current.label}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className={
          light
            ? "min-w-[160px] z-[80] bg-white text-black border border-black/10"
            : "min-w-[160px] z-[80]"
        }
      >
        <DropdownMenuLabel className={light ? "text-black/70" : undefined}>{t("common.language")}</DropdownMenuLabel>
        <DropdownMenuSeparator className={light ? "bg-black/10" : undefined} />
        {LOCALES.map((l) => {
          const Flag = FLAG_BY_LOCALE[l.code];
          return (
            <DropdownMenuItem
              key={l.code}
              onClick={() => setLocale(l.code as Locale)}
              className={[
                locale === l.code ? "font-semibold" : "",
                light ? "text-black focus:bg-black/5 focus:text-black" : "",
              ].join(" ")}
            >
              <Flag className="mr-2 h-3.5 w-5 rounded-[2px] shadow-sm" />
              {l.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}