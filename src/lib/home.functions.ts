/**
 * Server function que busca as seções publicadas de uma página do CMS.
 * Executada no servidor durante SSR — elimina o waterfall client-side.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { withErrorLogging } from "./server-fn-error";
import { AppError } from "./errors";

export interface HomeSection {
  id: string;
  type: string;
  position: number;
  visible: boolean;
  visible_mobile: boolean;
  visible_desktop: boolean;
  // JSON serializável (string com payload base + i18n). Cliente faz merge por locale.
  data: string;
  dataI18n: string;
}

export interface PageMeta {
  title: string;
  description: string | null;
  ogImageUrl: string | null;
}

export interface PageBundle {
  page: PageMeta | null;
  sections: HomeSection[];
}

export const getPageSections = createServerFn({ method: "GET" })
  .inputValidator((data) =>
    z
      .object({
        slug: z.string().min(1),
        locale: z.enum(["pt-BR", "en", "es"]).default("pt-BR"),
      })
      .parse(data),
  )
  .handler(withErrorLogging("home.getPageSections", async ({ data }): Promise<PageBundle> => {
    // Timeout defensivo: se Supabase travar, retorna [] em vez de bloquear SSR.
    const withTimeout = <T,>(p: PromiseLike<T>, ms = 2000): Promise<T> =>
      Promise.race([
        Promise.resolve(p),
        new Promise<T>((_, rej) => setTimeout(() => rej(new Error("supabase-timeout")), ms)),
      ]);
    // S1 revertido: SUPABASE_SERVICE_ROLE_KEY não está disponível em todos
    // os ambientes (dev local). O client anon funciona aqui porque
    // pages/page_sections têm RLS pública para leitura.
    const { data: page, error: pageErr } = await withTimeout(
      supabase
        .from("pages")
        .select("id, title, description, og_image_url")
        .eq("slug", data.slug)
        .eq("status", "published")
        .maybeSingle(),
    );
    if (pageErr) throw new AppError("DATABASE", "Não foi possível carregar a página.", { cause: pageErr });
    if (!page) return { page: null, sections: [] };
    const { data: rows, error: rowsErr } = await withTimeout(
      supabase
        .from("page_sections")
        .select("id, type, position, visible, visible_mobile, visible_desktop, data, data_i18n")
        .eq("page_id", page.id)
        .eq("visible", true)
        .order("position", { ascending: true })
        .order("id", { ascending: true })
    );
    if (rowsErr) throw new AppError("DATABASE", "Não foi possível carregar as seções.", { cause: rowsErr });
    const locale = data.locale;
    const sections: HomeSection[] = (rows ?? []).map((r: any) => {
      const base = (r.data ?? {}) as Record<string, unknown>;
      const i18n = (r.data_i18n ?? {}) as Record<string, Record<string, unknown>>;
      const localized = i18n[locale] ?? {};
      const fallback = i18n["pt-BR"] ?? {};
      // Merge: base (legado) → fallback PT-BR i18n → locale escolhido.
      const merged = { ...base, ...fallback, ...localized };
      return {
        id: r.id,
        type: r.type,
        position: r.position,
        visible: r.visible,
        visible_mobile: r.visible_mobile,
        visible_desktop: r.visible_desktop,
        data: JSON.stringify(merged),
        dataI18n: JSON.stringify(i18n ?? {}),
      };
    });
    // Enriquecimento: se a página renderiza uma seção `experience`, injeta
    // os `banner` das páginas `experience_detail` linkadas pelos slugs dos
    // cards. Assim, alterar o banner em /admin/settings/page-images de
    // /hospedagem reflete automaticamente no card "Hospedagem" da home.
    const hasExperience = sections.some((s) => s.type === "experience");
    if (hasExperience) {
      const slugs = ["hospedagem", "transfer", "experiencia", "cafe-da-manha", "kits"] as const;
      try {
        const { data: linkedPages } = await withTimeout(
          supabase
            .from("pages")
            .select("id, slug")
            .in("slug", slugs as unknown as string[])
            .eq("status", "published"),
        );
        const ids = (linkedPages ?? []).map((p: any) => p.id);
        const slugById: Record<string, string> = {};
        (linkedPages ?? []).forEach((p: any) => { slugById[p.id] = p.slug; });
        const linkedBanners: Record<string, string> = {};
        if (ids.length > 0) {
          const { data: edSecs } = await withTimeout(
            supabase
              .from("page_sections")
              .select("page_id, data")
              .in("page_id", ids)
              .eq("type", "experience_detail")
              .eq("visible", true)
              .order("position", { ascending: true }),
          );
          (edSecs ?? []).forEach((r: any) => {
            const slug = slugById[r.page_id];
            const banner = (r.data as any)?.banner;
            if (slug && typeof banner === "string" && banner.trim().length > 0 && !linkedBanners[slug]) {
              linkedBanners[slug] = banner;
            }
          });
        }
        if (Object.keys(linkedBanners).length > 0) {
          for (let i = 0; i < sections.length; i++) {
            if (sections[i].type !== "experience") continue;
            const parsed = JSON.parse(sections[i].data) as Record<string, unknown>;
            parsed.linkedBanners = linkedBanners;
            sections[i] = { ...sections[i], data: JSON.stringify(parsed) };
          }
        }
      } catch (e) {
        console.warn("[home.getPageSections] linkedBanners falhou:", e);
      }
    }
    return {
      page: {
        title: (page as any).title,
        description: (page as any).description,
        ogImageUrl: (page as any).og_image_url ?? null,
      },
      sections,
    };
  }));