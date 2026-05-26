import { createFileRoute, Link } from "@tanstack/react-router";
import { Compass, Heart, Sparkles, Users } from "lucide-react";
import { Footer } from "@/components/wh/Footer";
import { Header } from "@/components/wh/Header";
import { useT } from "@/components/i18n/LocaleProvider";

export const Route = createFileRoute("/sobre")({
  head: () => ({
    meta: [
      { title: "Sobre — Way Home" },
      { name: "description", content: "Conheça a Way Home: hospedagem imersiva e acolhedora para festivais. Onde o festival continua." },
      { property: "og:title", content: "Sobre a Way Home" },
      { property: "og:description", content: "Hospedagem imersiva e acolhedora para festivais. Onde o festival continua." },
      { property: "og:url", content: "/sobre" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/sobre" }],
  }),
  component: AboutPage,
});

function AboutPage() {
  const t = useT();

  const VALORES = [
    { Icon: Users, title: t("about.values.distribution.title"), body: t("about.values.distribution.body") },
    { Icon: Heart, title: t("about.values.belonging.title"), body: t("about.values.belonging.body") },
    { Icon: Sparkles, title: t("about.values.atHome.title"), body: t("about.values.atHome.body") },
  ];

  const BLOCKS = [
    { title: t("about.blocks.mission.title"), body: t("about.blocks.mission.body") },
    { title: t("about.blocks.vision.title"), body: t("about.blocks.vision.body") },
    { title: t("about.blocks.promise.title"), body: t("about.blocks.promise.body") },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <section className="container-wh py-16 md:py-24">
        <p className="text-xs font-bold uppercase tracking-widest text-brand">{t("about.tagline")}</p>
        <h1 className="mt-3 font-display text-5xl md:text-6xl font-black leading-[1.05]">
          {t("about.title1")}<br /><span className="text-brand">{t("about.title2")}</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft">
          {t("about.description")}
        </p>
      </section>

      <section className="border-y border-line bg-surface/50">
        <div className="container-wh grid gap-8 py-14 md:grid-cols-3">
          {BLOCKS.map((b) => (
            <div key={b.title} className="rounded-2xl border border-line bg-card p-6">
              <Compass className="text-brand" size={20} />
              <h2 className="mt-4 font-display text-2xl font-bold">{b.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{b.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-wh py-16 md:py-24">
        <h2 className="font-display text-3xl md:text-4xl font-black">{t("about.valuesTitle")}</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {VALORES.map(({ Icon, title, body }) => (
            <div key={title} className="rounded-2xl border border-line p-6">
              <Icon className="text-brand" size={22} />
              <h3 className="mt-4 font-display text-xl font-bold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-line bg-surface/40">
        <div className="container-wh py-14 md:py-20 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-black">{t("about.readyTitle")}</h2>
          <p className="mt-3 text-ink-soft">{t("about.readySubtitle")}</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link to="/" className="btn-brand">{t("about.viewPackages")}</Link>
            <Link to="/contato" className="btn-ghost">{t("about.talkToUs")}</Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}