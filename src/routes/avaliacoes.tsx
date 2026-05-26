/**
 * Página pública com todas as avaliações aprovadas da Way Home.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/wh/Header";
import { Footer } from "@/components/wh/Footer";
import { listApprovedReviews, type PublicReview } from "@/lib/reviews.functions";
import { Star, PlayCircle, Award } from "lucide-react";

export const Route = createFileRoute("/avaliacoes")({
  loader: async () => {
    try {
      const reviews = await listApprovedReviews({ data: { limit: 100 } });
      return { reviews };
    } catch {
      return { reviews: [] as PublicReview[] };
    }
  },
  head: ({ loaderData }) => {
    const reviews = (loaderData as { reviews?: PublicReview[] } | undefined)?.reviews ?? [];
    const count = reviews.length;
    const avg = count
      ? Math.round((reviews.reduce((s, r) => s + (r.rating ?? 0), 0) / count) * 10) / 10
      : 0;
    const scripts = count
      ? [{
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: "Hospedagem Way Home — Tomorrowland Brasil",
            description: "Hospedagem imersiva oficial Way Home no Tomorrowland Brasil.",
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: avg,
              reviewCount: count,
              bestRating: 5,
              worstRating: 1,
            },
            review: reviews.slice(0, 10).map((r) => ({
              "@type": "Review",
              reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5, worstRating: 1 },
              author: { "@type": "Person", name: r.display_name ?? "Hóspede Way Home" },
              reviewBody: r.comment ?? "",
              datePublished: r.created_at,
            })),
          }),
        }]
      : [];
    return {
      meta: [
        { title: "Avaliações de hóspedes — Way Home" },
        {
          name: "description",
          content:
            "Veja o que nossos hóspedes dizem sobre a experiência Way Home no Tomorrowland Brasil. Avaliações verificadas de clientes reais.",
        },
        { property: "og:title", content: "Avaliações de hóspedes — Way Home" },
        { property: "og:description", content: "Avaliações verificadas de clientes reais." },
        { property: "og:type", content: "website" },
        { property: "og:url", content: "/avaliacoes" },
      ],
      links: [{ rel: "canonical", href: "/avaliacoes" }],
      scripts,
    };
  },
  component: ReviewsPage,
});

function Stars({ value = 5 }: { value?: number }) {
  const n = Math.max(0, Math.min(5, Math.round(value)));
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={14}
          className={i < n ? "fill-brand text-brand" : "text-muted-foreground/30"}
        />
      ))}
    </div>
  );
}

function initials(name?: string | null) {
  if (!name) return "WH";
  return (
    name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") ||
    "WH"
  );
}

function ReviewsPage() {
  const initial = Route.useLoaderData().reviews;
  const [reviews, setReviews] = useState<PublicReview[]>(initial);
  const [filter, setFilter] = useState<"all" | "featured" | "5" | "4">("all");

  // Revalida client-side para refletir aprovações em tempo quase real.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await listApprovedReviews({ data: { limit: 100 } });
        if (!cancelled) setReviews(list);
      } catch { /* keep SSR */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const stats = useMemo(() => {
    if (!reviews.length) return { avg: 0, total: 0, featured: 0 };
    const total = reviews.length;
    const avg = reviews.reduce((a, r) => a + r.rating, 0) / total;
    const featured = reviews.filter((r) => r.featured).length;
    return { avg, total, featured };
  }, [reviews]);

  const filtered = useMemo(() => {
    switch (filter) {
      case "featured": return reviews.filter((r) => r.featured);
      case "5": return reviews.filter((r) => r.rating === 5);
      case "4": return reviews.filter((r) => r.rating >= 4);
      default: return reviews;
    }
  }, [reviews, filter]);

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <Header />
      <main>
        {/* Hero */}
        <section className="bg-inverse text-inverse-foreground py-20 md:py-28">
          <div className="container-wh text-center">
            <span className="eyebrow text-white/70">Comunidade Way Home</span>
            <h1 className="heading-display mt-4 text-4xl md:text-6xl">
              Avaliações dos nossos <span className="text-italic-brand italic">hóspedes</span>
            </h1>
            <p className="mt-5 mx-auto max-w-2xl text-white/80 md:text-lg">
              Histórias reais de quem viveu o Tomorrowland Brasil com a Way Home. Todas as avaliações são verificadas após a hospedagem.
            </p>
            {stats.total > 0 && (
              <div className="mt-8 inline-flex items-center gap-4 rounded-full bg-white/10 px-6 py-3 backdrop-blur">
                <div className="flex items-center gap-2">
                  <Star size={18} className="fill-brand text-brand" />
                  <span className="font-display text-lg font-bold">{stats.avg.toFixed(1)}</span>
                </div>
                <span className="text-white/40">•</span>
                <span className="text-sm text-white/85">{stats.total} avaliações verificadas</span>
                {stats.featured > 0 && (
                  <>
                    <span className="text-white/40">•</span>
                    <span className="text-sm text-white/85 inline-flex items-center gap-1">
                      <Award size={14} className="text-brand" />
                      {stats.featured} em destaque
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Filtros */}
        <section className="container-wh py-10 md:py-14">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {[
              { id: "all", label: "Todas" },
              { id: "featured", label: "Em destaque" },
              { id: "5", label: "5 estrelas" },
              { id: "4", label: "4+ estrelas" },
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => setFilter(opt.id as typeof filter)}
                className={`px-4 py-2 rounded-full text-sm transition-colors ${
                  filter === opt.id
                    ? "bg-inverse text-inverse-foreground"
                    : "bg-muted/60 text-ink-soft hover:bg-muted"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <p className="mt-16 text-center text-ink-soft">Nenhuma avaliação nesta categoria ainda.</p>
          ) : (
            <div className="mt-10 columns-1 gap-6 md:columns-2 lg:columns-3 [&>*]:mb-6 [&>*]:break-inside-avoid">
              {filtered.map((r) => (
                <article key={r.id} className="card-wh p-6 md:p-7">
                  <div className="flex items-center justify-between">
                    <Stars value={r.rating} />
                    {r.featured && (
                      <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-brand">
                        Destaque
                      </span>
                    )}
                  </div>
                  {r.title && (
                    <h3 className="mt-4 font-display text-base font-bold text-ink">{r.title}</h3>
                  )}
                  {r.comment && (
                    <p className="mt-3 text-sm leading-relaxed text-ink md:text-base">
                      “{r.comment}”
                    </p>
                  )}
                  {r.photos?.length > 0 && (
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      {r.photos.map((p, idx) => (
                        <div key={idx} className="aspect-square overflow-hidden rounded-md">
                          <img src={p} alt="" loading="lazy" className="h-full w-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                  {r.video_url && (
                    <a
                      href={r.video_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex items-center gap-2 text-sm text-brand hover:underline"
                    >
                      <PlayCircle size={16} /> Ver vídeo
                    </a>
                  )}
                  <div className="mt-6 flex items-center gap-3">
                    {r.avatar_url ? (
                      <img
                        src={r.avatar_url}
                        alt={r.display_name ?? ""}
                        className="h-11 w-11 shrink-0 rounded-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="h-11 w-11 shrink-0 rounded-full bg-brand/15 text-brand flex items-center justify-center font-display text-sm font-bold">
                        {initials(r.display_name)}
                      </div>
                    )}
                    <div>
                      <p className="font-display text-sm font-bold text-ink">
                        {r.display_name ?? "Hóspede Way Home"}
                      </p>
                      <p className="text-xs text-ink-soft">{r.city ?? "Hóspede Way Home"}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* CTA */}
        <section className="bg-muted/40 py-16 md:py-20">
          <div className="container-wh text-center">
            <h2 className="heading-display text-3xl text-ink md:text-4xl">
              Já é hóspede? Conte sua experiência.
            </h2>
            <p className="mt-4 mx-auto max-w-xl text-ink-soft">
              Após a sua hospedagem, você recebe um link exclusivo para avaliar. Suas palavras inspiram a próxima edição.
            </p>
            <div className="mt-8">
              <Link to="/conta/pedidos" className="btn-brand">
                Avaliar minha experiência
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
