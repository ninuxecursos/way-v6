import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

import { useT } from "@/components/i18n/LocaleProvider";

export function BackToTop() {
  const [visible, setVisible] = useState(false);
  const t = useT();

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 300);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <button
      type="button"
      onClick={scrollTop}
      aria-label={t("common.backToTop")}
      className={`fixed bottom-5 right-5 z-[60] flex items-center gap-1.5 rounded-full bg-brand px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-lg shadow-black/30 transition-all duration-300 hover:scale-105 hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 ${
        visible ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-3 pointer-events-none"
      }`}
    >
      <ArrowUp className="h-3.5 w-3.5" />
      {t("common.backToTopShort")}
    </button>
  );
}