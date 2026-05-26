/**
 * Página principal (Home) do site Way Home.
 * Este arquivo define a rota raiz e os metadados SEO.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/wh/Header";
import { Footer } from "@/components/wh/Footer";
import { CadasturBanner } from "@/components/wh/sections/CadasturBanner";
import { SectionsRenderer } from "@/components/wh/SectionsRenderer";
import { SECTION_IMAGE_DEFAULTS } from "@/lib/section-defaults";
import { getPageSections } from "@/lib/home.functions";
import { getRequestLocale } from "@/lib/locale.functions";

/**
 * Definição da rota raiz com configurações de Head (SEO e Favicons).
 */
export const Route = createFileRoute("/")({
  // fix(B9): notFound com link real para a home; antes "Tentar novamente" não fazia nada.
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center space-y-3">
        <h1 className="text-2xl font-bold">Página não encontrada</h1>
        <p className="text-sm text-muted-foreground">O endereço acessado não existe.</p>
        <Link to="/" className="btn-brand inline-block">Ir para o início</Link>
      </div>
    </div>
  ),
  // SSR: busca seções no servidor para evitar waterfall + flash do fallback.
  loader: async () => {
    try {
      const locale = await getRequestLocale();
      const bundle = await getPageSections({ data: { slug: "home", locale } });
      return { sections: bundle.sections, page: bundle.page, locale };
    } catch (e) {
      // fix(B6): logar o erro real antes de cair no fallback estático.
      console.error("[home/loader] getPageSections falhou:", e);
      return { sections: [], page: null, locale: "pt-BR" as const };
    }
  },
  head: ({ loaderData }) => {
    const page = loaderData?.page ?? null;
    const title = page?.title?.trim() || "Way Home – Sua Casa no Tomorrowland Brasil";
    const description =
      page?.description?.trim() ||
      "A Way Home é a melhor opção de hospedagem para quem quer viver o Tomorrowland Brasil com conforto e segurança. Suítes, camping, transfer e café da manhã inclusos.";
    const ogImage = page?.ogImageUrl?.trim() || "/og-image.png";
    return ({
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:image", content: ogImage },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: ogImage },
      ],
    links: [
      { rel: "icon", href: "/favicon.png", media: "(prefers-color-scheme: light)" },
      { rel: "icon", href: "/favicon-dark.png", media: "(prefers-color-scheme: dark)" },
      { rel: "canonical", href: "/" },
      // Preload do hero LCP — cortar ~800ms de paint na home.
      { rel: "preload", as: "image", href: SECTION_IMAGE_DEFAULTS.hero.background, fetchPriority: "high" } as any,
      // Preconnect ao Supabase Storage real (assets do CMS).
      { rel: "preconnect", href: "https://mnjlbamwhwoyztzrhpji.supabase.co", crossOrigin: "anonymous" },
      { rel: "dns-prefetch", href: "https://mnjlbamwhwoyztzrhpji.supabase.co" },
    ],
    });
  },
  component: Index,
});

/**
 * Componente principal da página de destino.
 * Organiza todas as seções do site em ordem cronológica de visualização.
 */
function Index() {
  const { sections } = Route.useLoaderData();
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <Header />
      <main>
        <SectionsRenderer slug="home" initialSections={sections} />
        <CadasturBanner />
      </main>
      <Footer />
    </div>
  );
}
