import { Outlet, Link, HeadContent, Scripts, useLocation, useRouter, createRootRouteWithContext } from "@tanstack/react-router";
import { useEffect } from "react";

import appCss from "../styles.css?url";
import { AuthProvider } from "@/hooks/use-auth";
// Importa o patch que injeta o Bearer do Supabase nas chamadas a `/_serverFn/...`.
// O sufixo `.client.ts` garante que esse módulo não vá para o bundle SSR.
import "@/integrations/supabase/server-fn-fetch.client";
import { ThemeProvider, themeInitScript } from "@/components/theme/ThemeProvider";
import { CookieBanner } from "@/components/legal/CookieBanner";
import { LocaleProvider } from "@/components/i18n/LocaleProvider";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { RouteError } from "@/components/RouteError";
import { RouteLoadingOverlay } from "@/components/wh/RouteLoadingOverlay";
import { BackToTop } from "@/components/wh/BackToTop";
import { bootLoaderCSS, bootLoaderScript } from "@/components/wh/BootLoader";
import { Toaster } from "@/components/ui/sonner";
import { ConfirmDeleteProvider } from "@/components/common/ConfirmDeleteProvider";
import { getBranding } from "@/lib/branding.functions";
import { getPublicTracking } from "@/lib/tracking.functions";
import { BrandingHydrator } from "@/components/branding/BrandingHydrator";
import type { Branding } from "@/hooks/use-branding";
import { earlyInstallCaptureScript } from "@/lib/pwa-install";
import { consentDefaultsScript } from "@/lib/consent";

function NotFoundComponent() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground flex items-center justify-center px-5">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{ background: "radial-gradient(60% 50% at 80% 10%, rgba(255,25,94,0.18), transparent 60%), radial-gradient(60% 50% at 0% 100%, rgba(108,16,199,0.15), transparent 60%)" }}
      />
      <div className="relative max-w-xl text-center animate-fade-in">
        <p className="font-display text-[18vw] md:text-[180px] font-black leading-none text-brand drop-shadow-[0_10px_40px_rgba(255,25,94,0.45)]">
          404
        </p>
        <h1 className="mt-2 font-display text-3xl md:text-4xl font-black">
          Caminho não encontrado.
        </h1>
        <p className="mt-3 text-ink-soft">
          A página que você procura saiu da rota. Vamos te levar de volta para casa.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link to="/" className="btn-brand">Voltar ao início</Link>
          <Link to="/contato" className="btn-ghost">Falar com a Way Home</Link>
        </div>
      </div>
    </div>
  );
}

interface RouterContext { queryClient: QueryClient }

export const Route = createRootRouteWithContext<RouterContext>()({
  loader: async () => {
    try {
      const { json } = await getBranding();
      let tracking: Record<string, any> = {};
      try { const t = await getPublicTracking(); tracking = JSON.parse(t.json || "{}"); } catch { /* noop */ }
      return { branding: JSON.parse(json) as Partial<Branding>, tracking };
    } catch {
      return { branding: null as Partial<Branding> | null, tracking: {} as Record<string, any> };
    }
  },
  head: ({ loaderData }) => {
    const ld = (loaderData as { branding?: Partial<Branding> | null; tracking?: Record<string, any> } | undefined);
    const b = ld?.branding ?? null;
    const tr = ld?.tracking ?? {};
    const siteName = b?.siteName?.trim() || "Way Home";
    const defaultTitle = `${siteName} — Sua casa no Tomorrowland Brasil`;
    const defaultDesc = `Hospedagem completa e imersiva para o Tomorrowland Brasil. Onde o festival continua.`;
    const faviconUrl = b?.faviconUrl?.trim() || "/favicon.png";
    const gscToken = tr?.searchConsole?.verificationToken as string | undefined;
    const metaPixel = tr?.meta?.enabled ? (tr?.meta?.pixelId as string | undefined) : undefined;
    const ga4Id = tr?.ga4?.enabled ? (tr?.ga4?.measurementId as string | undefined) : undefined;
    const gtmId = tr?.gtm?.enabled ? (tr?.gtm?.containerId as string | undefined) : undefined;
    const clarityId = tr?.clarity?.enabled ? (tr?.clarity?.projectId as string | undefined) : undefined;
    const hotjarId = tr?.hotjar?.enabled ? (tr?.hotjar?.siteId as string | undefined) : undefined;
    const customHead = (tr?.custom?.headHtml as string | undefined) || "";
    const trackingMeta: Array<{ name?: string; property?: string; content: string }> = [];
    if (gscToken) trackingMeta.push({ name: "google-site-verification", content: gscToken });
    const trackingScripts: Array<{ type?: string; src?: string; async?: boolean; children?: string }> = [];
    // Consent Mode v2 default DENIED (com leitura sincrona do localStorage). Sempre antes dos tags.
    const requireConsent = (tr?.consent?.requireConsent !== false);
    if (requireConsent && (gtmId || ga4Id || metaPixel || clarityId || hotjarId)) {
      trackingScripts.push({ children: consentDefaultsScript });
    }
    if (gtmId) trackingScripts.push({ children: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s);j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');` });
    if (ga4Id) {
      trackingScripts.push({ src: `https://www.googletagmanager.com/gtag/js?id=${ga4Id}`, async: true });
      trackingScripts.push({ children: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga4Id}');` });
    }
    if (metaPixel) {
      trackingScripts.push({ children: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${metaPixel}');fbq('track','PageView');` });
    }
    if (clarityId) trackingScripts.push({ children: `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y)})(window,document,"clarity","script","${clarityId}");` });
    if (hotjarId) trackingScripts.push({ children: `(function(h,o,t,j,a,r){h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};h._hjSettings={hjid:${Number(hotjarId)||0},hjsv:6};a=o.getElementsByTagName('head')[0];r=o.createElement('script');r.async=1;r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;a.appendChild(r);})(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');` });
    if (customHead.trim()) trackingScripts.push({ children: `/* custom head */ ${customHead.replace(/<\/?script[^>]*>/gi, "")}` });
    return ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: defaultTitle },
      { name: "description", content: defaultDesc },
      { name: "author", content: siteName },
      { property: "og:title", content: defaultTitle },
      { property: "og:description", content: defaultDesc },
      { property: "og:site_name", content: siteName },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "pt_BR" },
      { name: "twitter:card", content: "summary" },
      { name: "theme-color", content: "#0f0f0f" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: siteName },
      ...trackingMeta,
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      // Preload das fontes Way Home (Barlow) usadas acima da dobra.
      // Sem isso o navegador pinta com fallback e troca depois (FOUT).
      { rel: "preload", as: "font", type: "font/woff2", href: "/fonts/Barlow-Regular.woff2", crossOrigin: "anonymous" },
      { rel: "preload", as: "font", type: "font/woff2", href: "/fonts/Barlow-SemiBold.woff2", crossOrigin: "anonymous" },
      { rel: "preload", as: "font", type: "font/woff2", href: "/fonts/Barlow-Bold.woff2", crossOrigin: "anonymous" },
      { rel: "preload", as: "font", type: "font/woff2", href: "/fonts/Barlow-ExtraBold.woff2", crossOrigin: "anonymous" },
      { rel: "preload", as: "font", type: "font/woff2", href: "/fonts/Barlow-Black.woff2", crossOrigin: "anonymous" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: faviconUrl, sizes: "180x180" },
      { rel: "icon", href: faviconUrl, type: "image/png", sizes: "192x192" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "TravelAgency",
          name: siteName,
          description: "Operadora de turismo especializada em hospedagem imersiva para festivais de música eletrônica.",
          url: "https://wayhome.com.br",
          slogan: "Onde o festival continua.",
          email: "wayhomeoficial@gmail.com",
          sameAs: [
            "https://www.instagram.com/wayhomeoficial/",
            "https://wa.link/q7bfzu",
          ],
          address: { "@type": "PostalAddress", addressCountry: "BR" },
          areaServed: "BR",
          identifier: { "@type": "PropertyValue", name: "Cadastur", description: "Operadora de turismo registrada no Ministério do Turismo" },
        }),
      },
      ...trackingScripts,
    ],
    });
  },
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: RouteError,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <script dangerouslySetInnerHTML={{ __html: earlyInstallCaptureScript }} />
        <style dangerouslySetInnerHTML={{ __html: bootLoaderCSS }} />
        <HeadContent />
      </head>
      <body suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: bootLoaderScript }} />
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const { branding } = Route.useLoaderData();
  const loc = useLocation();
  const router = useRouter();
  // Inicializa analytics first-party (apenas client).
  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    const mod = "@/lib/analytics/tracker.client";
    import(/* @vite-ignore */ mod).then((m) => {
      if (!cancelled) m.initAnalytics(router as any);
      if (!cancelled) {
        // Sincroniza user_id no tracker para que a exclusão de admin funcione.
        import("@/integrations/supabase/client").then(({ supabase }) => {
          supabase.auth.getUser().then(({ data }) => {
            m.setAnalyticsUser(data.user?.id ?? null);
          });
          supabase.auth.onAuthStateChange((_evt, session) => {
            m.setAnalyticsUser(session?.user?.id ?? null);
          });
        });
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [router]);
  // Esconde o boot loader assim que o React monta — sensação de "instantâneo".
  useEffect(() => {
    const w = window as Window & { __whBootDone?: () => void };
    // Pequeno atraso para o primeiro frame com o conteúdo real estar pintado.
    const id = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => w.__whBootDone?.());
    });
    return () => window.cancelAnimationFrame(id);
  }, []);
  // Registra um service worker mínimo para habilitar a instalação do PWA
  // (necessário no Android Chrome para o evento `beforeinstallprompt` disparar).
  // Em iframes/preview do Lovable, faz unregister para evitar cache preso.
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    const inIframe = (() => {
      try { return window.self !== window.top; } catch { return true; }
    })();
    const host = window.location.hostname;
    const isPreview =
      host.includes("id-preview--") ||
      host.includes("lovableproject.com");
    if (inIframe || isPreview) {
      navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister()));
      return;
    }
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  const p = loc.pathname || "/";
  const isThemeable =
    p.startsWith("/conta") ||
    p.startsWith("/admin") ||
    p === "/login" ||
    p === "/signup" ||
    p === "/forgot-password" ||
    p === "/reset-password";
  // Public/marketing area stays dark to preserve the brand identity.
  const forceTheme = isThemeable ? undefined : ("dark" as const);
  return (
    <QueryClientProvider client={queryClient}>
      <BrandingHydrator initial={branding} />
      <ThemeProvider forceTheme={forceTheme}>
        <AuthProvider>
          <LocaleProvider>
            <ConfirmDeleteProvider>
              <ErrorBoundary>
                <Outlet />
              </ErrorBoundary>
              <RouteLoadingOverlay />
              <CookieBanner />
              <BackToTop />
              <Toaster richColors position="top-right" />
            </ConfirmDeleteProvider>
          </LocaleProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
