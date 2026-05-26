import * as React from "react";
import { Link } from "@tanstack/react-router";
import { Header } from "@/components/wh/Header";

type Section = { id: string; title: string; body: React.ReactNode };

export function LegalPage({
  title,
  intro,
  updatedAt,
  sections,
}: {
  title: string;
  intro?: React.ReactNode;
  updatedAt: string;
  sections: Section[];
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <div className="h-16 md:h-20" aria-hidden />

      <main className="container-wh grid lg:grid-cols-[220px_1fr] gap-10 py-10 md:py-16">
        <aside className="hidden lg:block">
          <div className="sticky top-8 space-y-1 text-sm">
            <p className="text-xs uppercase tracking-widest text-ink-soft mb-3">Nesta página</p>
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="block py-1.5 text-ink-soft hover:text-brand transition-colors"
              >
                {s.title}
              </a>
            ))}
          </div>
        </aside>

        <article className="max-w-3xl">
          <p className="text-xs uppercase tracking-widest text-brand font-bold">Way Home</p>
          <h1 className="mt-2 font-display text-4xl md:text-5xl font-black leading-tight">
            {title}
          </h1>
          <p className="mt-3 text-sm text-ink-soft">Última atualização: {updatedAt}</p>
          {intro && <div className="mt-6 text-base leading-relaxed text-foreground/90">{intro}</div>}

          <div className="mt-10 space-y-10">
            {sections.map((s) => (
              <section key={s.id} id={s.id} className="scroll-mt-24">
                <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
                  {s.title}
                </h2>
                <div className="mt-3 text-base leading-relaxed text-foreground/85 space-y-3">
                  {s.body}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-16 pt-8 border-t border-border flex flex-wrap gap-3 text-sm">
            <Link to="/" className="text-brand hover:underline underline-offset-4">← Voltar ao início</Link>
            <span className="text-ink-soft">·</span>
            <a href="mailto:wayhomeoficial@gmail.com" className="text-foreground hover:text-brand">
              wayhomeoficial@gmail.com
            </a>
          </div>
        </article>
      </main>
    </div>
  );
}