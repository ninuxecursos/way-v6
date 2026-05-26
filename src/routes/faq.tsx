import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Footer } from "@/components/wh/Footer";
import { Header } from "@/components/wh/Header";
import { useLocale, useT } from "@/components/i18n/LocaleProvider";
import ptBR from "@/i18n/pt-BR.json";
import en from "@/i18n/en.json";
import es from "@/i18n/es.json";

const DICTS = { "pt-BR": ptBR, en, es } as const;

function faqItemsFor(locale: keyof typeof DICTS) {
  return ((DICTS[locale] as any).faq?.items ?? (DICTS["pt-BR"] as any).faq.items) as { q: string; a: string }[];
}

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — Way Home" },
      { name: "description", content: "Dúvidas frequentes sobre hospedagem, transfers, pagamentos e cancelamentos da Way Home." },
      { property: "og:title", content: "Perguntas Frequentes — Way Home" },
      { property: "og:description", content: "Tudo que você precisa saber sobre os pacotes Way Home para o Tomorrowland Brasil." },
      { property: "og:url", content: "/faq" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/faq" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqItemsFor("pt-BR").map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
    ],
  }),
  component: FAQPage,
});

function FAQPage() {
  const t = useT();
  const { locale } = useLocale();
  const items = faqItemsFor(locale as keyof typeof DICTS);
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <main className="container-wh py-16 md:py-24">
        <p className="text-xs font-bold uppercase tracking-widest text-brand">{t("faq.eyebrow")}</p>
        <h1 className="mt-3 font-display text-5xl md:text-6xl font-black leading-[1.05]">{t("faq.title")}</h1>
        <p className="mt-5 max-w-2xl text-lg text-ink-soft">
          {t("faq.intro")} <Link to="/contato" className="text-brand hover:underline">{t("faq.talkToUs")}</Link>.
        </p>

        <div className="mt-10 max-w-3xl divide-y divide-border rounded-2xl border border-line bg-card">
          {items.map((f, i) => (
            <button
              key={f.q}
              onClick={() => setOpen(open === i ? null : i)}
              className="group block w-full px-5 py-5 text-left cursor-pointer"
              aria-expanded={open === i}
            >
              <div className="flex items-start justify-between gap-4">
                <h3 className="font-display text-lg font-bold">{f.q}</h3>
                <ChevronDown
                  size={20}
                  className={`mt-1 shrink-0 text-ink-soft transition-transform ${open === i ? "rotate-180 text-brand" : ""}`}
                />
              </div>
              {open === i && (
                <p className="mt-3 text-sm leading-relaxed text-ink-soft animate-fade-in">{f.a}</p>
              )}
            </button>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}