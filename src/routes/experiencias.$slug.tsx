/**
 * Rota pública dinâmica para as páginas individuais da Experiência Way Home.
 * Slugs válidos: hospedagem, transfer, experiencia, cafe-da-manha, kits.
 * Conteúdo 100% vindo do CMS (page_sections) via SSR.
 */
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Header } from "@/components/wh/Header";
import { Footer } from "@/components/wh/Footer";
import { CadasturBanner } from "@/components/wh/sections/CadasturBanner";
import { SectionsRenderer } from "@/components/wh/SectionsRenderer";
import { getPageSections } from "@/lib/home.functions";
import { getRequestLocale } from "@/lib/locale.functions";

export const Route = createFileRoute("/experiencias/$slug")({
  loader: async ({ params }) => {
    try {
      const locale = await getRequestLocale();
      const bundle = await getPageSections({ data: { slug: params.slug, locale } });
      if (!bundle.page) throw notFound();
      return { sections: bundle.sections, page: bundle.page, locale, slug: params.slug };
    } catch (e) {
      console.error("[experiencias/loader]", e);
      throw notFound();
    }
  },
  head: ({ loaderData, params }) => {
    const page = loaderData?.page ?? null;
    const slug = loaderData?.slug ?? params?.slug ?? "";
    const title = (page?.title?.trim() || slug) + " — Way Home";
    const description =
      page?.description?.trim() ||
      "Conheça mais sobre a experiência Way Home no Tomorrowland Brasil.";
    const ogImage = page?.ogImageUrl?.trim() || "/og-image.png";
    const canonical = `/experiencias/${slug}`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:image", content: ogImage },
        { property: "og:url", content: canonical },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: ogImage },
      ],
      links: [
        { rel: "canonical", href: canonical },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center space-y-3">
        <h1 className="text-2xl font-bold">Página não encontrada</h1>
        <p className="text-sm text-muted-foreground">Esta experiência não está disponível.</p>
        <Link to="/" className="btn-brand inline-block">Voltar para a home</Link>
      </div>
    </div>
  ),
  component: ExperiencePage,
});

function ExperiencePage() {
  const { sections, slug } = Route.useLoaderData();
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <Header />
      <main>
        <SectionsRenderer slug={slug} initialSections={sections} />
        <CadasturBanner />
      </main>
      <Footer />
    </div>
  );
}
