/**
 * Seção de Depoimentos (Feedback).
 * Carrega avaliações REAIS aprovadas do banco (event_reviews) e mostra em
 * layout masonry. Se ainda não houver nenhuma avaliação aprovada, a seção
 * exibe estado vazio elegante em vez de dados fake.
 */
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Reveal } from "../Reveal";
import { useT, useLocale } from "@/components/i18n/LocaleProvider";
import { EditableText } from "@/components/admin/visual-edit/EditableText";
import { listApprovedReviews, type PublicReview } from "@/lib/reviews.functions";
import { Star, PlayCircle } from "lucide-react";

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
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "WH"
  );
}

export function Feedback({ data }: { data?: Record<string, unknown> }) {
  const t = useT();
  const { locale } = useLocale();
  const eyebrow = (data?.eyebrow as string | undefined) ?? t("sections.feedback.eyebrow");
  const titleA = (data?.titleA as string | undefined) ?? t("sections.feedback.titleA");
  const titleB = (data?.titleB as string | undefined) ?? t("sections.feedback.titleB");
  const desc = (data?.desc as string | undefined) ?? t("sections.feedback.desc");

  const [reviews, setReviews] = useState<PublicReview[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await listApprovedReviews({ data: { limit: 9, locale } });
        if (!cancelled) setReviews(list);
      } catch {
        if (!cancelled) setReviews([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [locale]);

  return (
    <section id="feedback" className="relative bg-background py-20 md:py-32">
      <div className="container-wh">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <EditableText path="eyebrow" value={eyebrow} as="span" className="eyebrow mx-auto" />
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="heading-display mt-5 text-4xl text-ink md:text-6xl">
              <EditableText path="titleA" value={titleA} as="span" />
              <EditableText path="titleB" value={titleB} as="span" className="text-italic-brand italic" />
            </h2>
          </Reveal>
          <Reveal delay={0.2}>
            <EditableText
              path="desc"
              value={desc}
              as="p"
              singleLine={false}
              className="mt-6 text-base text-ink-soft md:text-lg"
            />
          </Reveal>
        </div>

        {reviews === null ? (
          <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card-wh h-56 animate-pulse bg-muted/40" />
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div className="mt-16 mx-auto max-w-xl text-center">
            <p className="text-ink-soft">
              {t("sections.feedback.empty")}
            </p>
          </div>
        ) : (
          <div className="mt-16 columns-1 gap-6 md:columns-2 lg:columns-3 [&>*]:mb-6 [&>*]:break-inside-avoid">
            {reviews.map((r, i) => (
              <Reveal key={r.id} delay={(i % 3) * 0.08}>
                <article className="card-wh p-6 md:p-7">
                  <div className="flex items-center justify-between">
                    <Stars value={r.rating} />
                    {r.featured && (
                      <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-brand">
                        {t("sections.feedback.featured")}
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
                      {r.photos.slice(0, 3).map((p, idx) => (
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
                      <PlayCircle size={16} /> {t("sections.feedback.watchVideo")}
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
                        {r.display_name ?? t("sections.feedback.guest")}
                      </p>
                      <p className="text-xs text-ink-soft">{r.city ?? t("sections.feedback.guest")}</p>
                    </div>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        )}

        {reviews && reviews.length > 0 && (
          <Reveal delay={0.2}>
            <div className="mt-12 flex justify-center">
              <Link to="/avaliacoes" className="btn-brand">
                {t("sections.feedback.viewAll")}
              </Link>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  );
}
