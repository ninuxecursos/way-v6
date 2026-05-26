/**
 * Renderiza dinamicamente as seções da home/page a partir do banco (CMS).
 * - Carrega seções da page com slug "home" (ou outro slug fornecido).
 * - Respeita ordem (`position`), visibilidade global e por dispositivo.
 * - Fallback estático: se o CMS estiver vazio ou indisponível, usa a ordem padrão.
 */
import { lazy, Suspense, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { HomeSection } from "@/lib/home.functions";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { Hero } from "@/components/wh/sections/Hero";
import { Experiencia } from "@/components/wh/sections/Experiencia";
import { ExperienceDetail } from "@/components/wh/sections/ExperienceDetail";
import { EditProvider, type EditContextValue } from "@/components/admin/visual-edit/EditContext";
import { SectionFrame } from "@/components/admin/visual-edit/SectionFrame";
import { SECTION_LABELS } from "@/lib/cms-types";
import { SectionStyleScope } from "@/lib/section-style";
import { RevealOnScroll } from "@/components/wh/Reveal";

// Lazy: seções abaixo da dobra carregam só quando necessário.
const Camping = lazy(() => import("@/components/wh/sections/Camping").then(m => ({ default: m.Camping })));
const Hospedagem = lazy(() => import("@/components/wh/sections/Hospedagem").then(m => ({ default: m.Hospedagem })));
const Feedback = lazy(() => import("@/components/wh/sections/Feedback").then(m => ({ default: m.Feedback })));
const CTA = lazy(() => import("@/components/wh/sections/CTA").then(m => ({ default: m.CTA })));
const Localizacao = lazy(() => import("@/components/wh/sections/Localizacao").then(m => ({ default: m.Localizacao })));
const Stories = lazy(() => import("@/components/wh/sections/Stories").then(m => ({ default: m.Stories })));

type SectionType = "hero" | "experience" | "experience_detail" | "hospedagem" | "camping" | "stories" | "location" | "feedback" | "cta";

interface Section {
  id: string;
  type: string;
  position: number;
  visible: boolean;
  visible_mobile: boolean;
  visible_desktop: boolean;
  data: Record<string, unknown>;
  dataI18n?: Record<string, Record<string, unknown>>;
}

const COMPONENTS: Record<SectionType, React.FC<{ data?: Record<string, unknown> }>> = {
  hero: ({ data }) => <Hero data={data} />,
  experience: ({ data }) => <Experiencia data={data} />,
  experience_detail: ({ data }) => <ExperienceDetail data={data} />,
  hospedagem: ({ data }) => <Suspense fallback={null}><Hospedagem data={data} /></Suspense>,
  camping: ({ data }) => <Suspense fallback={null}><Camping data={data} /></Suspense>,
  stories: ({ data }) => <Suspense fallback={null}><Stories data={data} /></Suspense>,
  location: ({ data }) => <Suspense fallback={null}><Localizacao data={data} /></Suspense>,
  feedback: ({ data }) => <Suspense fallback={null}><Feedback data={data} /></Suspense>,
  cta: ({ data }) => <Suspense fallback={null}><CTA data={data} /></Suspense>,
};

export function SectionsRenderer({
  slug = "home",
  initialSections,
}: {
  slug?: string;
  initialSections?: HomeSection[];
}) {
  const { locale } = useLocale();
  // Hidrata a partir do loader (SSR) — evita waterfall + flash do fallback.
  const [sections, setSections] = useState<Section[] | null>(() => {
    if (initialSections === undefined) return null;
    return initialSections.map((s) => ({
      ...s,
      data: (() => { try { return JSON.parse(s.data); } catch { return {}; } })(),
      dataI18n: (() => { try { return s.dataI18n ? JSON.parse(s.dataI18n) : {}; } catch { return {}; } })(),
    }));
  });

  // Atualiza apenas quando a referência de initialSections muda (router.invalidate).
  // Evita re-render extra no mount já hidratado pelo SSR.
  useEffect(() => {
    if (initialSections === undefined) return;
    setSections(
      initialSections.map((s) => ({
        ...s,
        data: (() => { try { return JSON.parse(s.data); } catch { return {}; } })(),
        dataI18n: (() => { try { return s.dataI18n ? JSON.parse(s.dataI18n) : {}; } catch { return {}; } })(),
      })),
    );
  }, [initialSections]);

  // Fallback client-only quando NÃO há SSR (uso fora da home).
  useEffect(() => {
    // Também executa quando SSR retornou vazio (timeout/erro) para garantir
    // que a home não fique em branco se a primeira busca falhou no servidor.
    if (initialSections !== undefined && initialSections.length > 0) return;
    let cancelled = false;
    (async () => {
      const { data: page } = await supabase.from("pages").select("id").eq("slug", slug).eq("status", "published").maybeSingle();
      if (!page) { if (!cancelled) setSections([]); return; }
      const { data } = await supabase
        .from("page_sections")
        .select("id, type, position, visible, visible_mobile, visible_desktop, data, data_i18n")
        .eq("page_id", page.id)
        .eq("visible", true)
        .order("position", { ascending: true })
        .order("id", { ascending: true });
      if (!cancelled) {
        setSections(
          (data ?? []).map((r: any) => {
            const base = (r.data ?? {}) as Record<string, unknown>;
            const i18n = (r.data_i18n ?? {}) as Record<string, Record<string, unknown>>;
            return { ...r, data: base, dataI18n: i18n } as Section;
          }),
        );
      }
    })();
    return () => { cancelled = true; };
  }, [slug, initialSections, locale]);

  // Sem fallback estático: se o CMS estiver vazio, a página fica em branco.
  // Enquanto SSR/loader não hidratou (sections === null), também não renderiza
  // nada — evita flash de conteúdo "padrão" que não existe no banco.
  if (sections === null || sections.length === 0) {
    return null;
  }

  return (
    <>
      {sections.map((s) => {
        const Comp = COMPONENTS[s.type as SectionType];
        if (!Comp) return null;
        // fix(B1): se ambos forem false, simplesmente não renderizar — antes
        // a concatenação "hidden md:block block md:hidden" deixava a seção
        // visível no mobile por causa da ordem das classes Tailwind.
        if (!s.visible_mobile && !s.visible_desktop) return null;
        let wrapperClass = "";
        if (!s.visible_mobile) wrapperClass = "hidden md:block";
        else if (!s.visible_desktop) wrapperClass = "block md:hidden";
        // Merge por locale no cliente: base + fallback PT-BR + locale atual.
        // Garante troca de idioma instantânea sem depender de cookie+SSR.
        const i18n = s.dataI18n ?? {};
        const localized = (i18n[locale] ?? {}) as Record<string, unknown>;
        const fallback = (i18n["pt-BR"] ?? {}) as Record<string, unknown>;
        const mergedData = { ...s.data, ...fallback, ...localized };
        const styled = (
          <SectionStyleScope id={s.id} data={mergedData}>
            <Comp data={mergedData} />
          </SectionStyleScope>
        );
        // Hero anima por dentro (entrada imediata). Demais seções recebem
        // reveal por scroll (uma vez), suave em desktop e mobile.
        const inner = s.type === "hero"
          ? styled
          : <RevealOnScroll>{styled}</RevealOnScroll>;
        if (wrapperClass) {
          return <div key={s.id} className={wrapperClass}>{inner}</div>;
        }
        return <div key={s.id}>{inner}</div>;
      })}
    </>
  );
}

/**
 * Preview in-process: renderiza seções já carregadas (sem buscar do Supabase).
 * Usado pelo editor admin para preview ao vivo, reagindo a edições no estado.
 */
export function SectionsPreview({
  sections,
  edit,
}: {
  sections: Section[];
  edit?: Omit<EditContextValue, "sectionId"> | null;
}) {
  // No preview do CMS exibimos TODAS as seções (mesmo ocultas) para manter
  // a ordem 1:1 com o painel lateral; ocultas recebem cue visual.
  if (sections.length === 0) {
    return <div className="p-10 text-sm text-muted-foreground text-center">Nenhuma seção.</div>;
  }
  const tree = (
    <>
      {sections.map((s) => {
        const Comp = COMPONENTS[s.type as SectionType];
        if (!Comp) return null;
        const label = SECTION_LABELS[s.type as keyof typeof SECTION_LABELS] ?? s.type;
        const styled = (
          <SectionStyleScope id={s.id} data={s.data}>
            <Comp data={s.data} />
          </SectionStyleScope>
        );
        const hidden = s.visible === false;
        const wrapperStyle = hidden
          ? { opacity: 0.45, filter: "grayscale(0.6)", position: "relative" as const }
          : undefined;
        const inner = edit ? (
          <SectionFrame sectionId={s.id} label={label}>{styled}</SectionFrame>
        ) : styled;
        return (
          <div key={s.id} style={wrapperStyle}>
            {hidden && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 px-2 py-0.5 rounded-full bg-background/90 border text-[10px] uppercase tracking-wider text-muted-foreground pointer-events-none">
                Oculta
              </div>
            )}
            {inner}
          </div>
        );
      })}
    </>
  );
  if (!edit) return tree;
  // sectionId é definido por cada SectionFrame; aqui forçamos um placeholder.
  return <EditProvider value={{ ...edit, sectionId: "" }}>{tree}</EditProvider>;
}