/**
 * Repositório de produtos (modalidades) — wrapper sobre o client Supabase.
 * Pensado para uso em browser/loaders client-side; respeita RLS pública.
 */
import { supabase } from "@/integrations/supabase/client";
import type { ModalityChoice } from "@/types/reservation";

type LocaleMap = Record<string, Record<string, unknown> | undefined>;

function localeKeys(locale: string): string[] {
  // Tenta locale exato, depois fallback para pt-BR/pt, e finalmente outras línguas.
  const base = locale.split("-")[0];
  const candidates = [locale, base, "pt-BR", "pt", "en", "es"];
  return Array.from(new Set(candidates));
}

function pickString(
  translations: unknown,
  field: string,
  locale: string,
  fallback: string,
): string {
  const t = (translations ?? {}) as LocaleMap;
  for (const k of localeKeys(locale)) {
    const v = t[k]?.[field];
    if (typeof v === "string" && v.trim()) return v;
  }
  return fallback;
}

function pickArray(
  translations: unknown,
  field: string,
  locale: string,
  fallback: string[],
): string[] {
  const t = (translations ?? {}) as LocaleMap;
  for (const k of localeKeys(locale)) {
    const v = t[k]?.[field];
    if (Array.isArray(v) && v.length > 0) return v.map(String);
  }
  return fallback;
}

function mapMetadata(
  meta: unknown,
): Pick<
  ModalityChoice,
  "kind" | "checkoutMode" | "recommended" | "highlights" | "economyLabel" |
  "minQuantity" | "genderOptions" | "whatsappMessage" | "heroLogoUrl" | "heroLogoSize"
> {
  const m = (meta ?? {}) as Record<string, unknown>;
  const kindRaw = String(m.modality_kind ?? "other");
  const kind = (["individual", "shared", "couple"].includes(kindRaw) ? kindRaw : "other") as ModalityChoice["kind"];
  const checkoutMode = (m.checkout_mode === "whatsapp" ? "whatsapp" : "auto") as ModalityChoice["checkoutMode"];
  const highlights = Array.isArray(m.highlights) ? (m.highlights as unknown[]).map(String) : [];
  const genderOptions = Array.isArray(m.gender_options)
    ? (m.gender_options as unknown[]).map((g) => String(g)).filter((g): g is "m" | "f" => g === "m" || g === "f")
    : [];
  return {
    kind,
    checkoutMode,
    recommended: Boolean(m.recommended),
    highlights,
    economyLabel: typeof m.economy_label === "string" ? m.economy_label : null,
    minQuantity: typeof m.min_quantity === "number" ? m.min_quantity : 1,
    genderOptions,
    whatsappMessage: typeof m.whatsapp_message === "string" ? m.whatsapp_message : null,
    heroLogoUrl: typeof m.hero_logo_url === "string" && m.hero_logo_url.trim() ? m.hero_logo_url : null,
    heroLogoSize:
      typeof m.hero_logo_size === "number" && m.hero_logo_size > 0
        ? m.hero_logo_size
        : typeof m.hero_logo_size === "string" && m.hero_logo_size.trim()
          ? Number(m.hero_logo_size) || null
          : null,
  };
}

export async function listActiveModalities(locale = "pt-BR"): Promise<ModalityChoice[]> {
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, slug, price_cents, currency, cover_image_url, max_per_order, translations, metadata, position, active, type",
    )
    .eq("active", true)
    .eq("type", "reservation_modality")
    .order("position", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((p): ModalityChoice => {
    const meta = mapMetadata(p.metadata);
    return {
      productId: p.id,
      productSlug: p.slug,
      name: pickString(p.translations, "name", locale, p.slug),
      description: pickString(p.translations, "description", locale, ""),
      priceCents: Number(p.price_cents ?? 0),
      currency: p.currency ?? "BRL",
      coverImageUrl: p.cover_image_url ?? null,
      maxPerOrder: p.max_per_order ?? null,
      ...meta,
      highlights: pickArray(p.translations, "highlights", locale, meta.highlights),
      economyLabel: pickString(p.translations, "economyLabel", locale, meta.economyLabel ?? ""),
      altPrice: pickString(p.translations, "altPrice", locale, ""),
    };
  });
}

export async function getModalityBySlug(slug: string, locale = "pt-BR"): Promise<ModalityChoice | null> {
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, slug, price_cents, currency, cover_image_url, max_per_order, translations, metadata, active",
    )
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const meta = mapMetadata(data.metadata);
  return {
    productId: data.id,
    productSlug: data.slug,
    name: pickString(data.translations, "name", locale, data.slug),
    description: pickString(data.translations, "description", locale, ""),
    priceCents: Number(data.price_cents ?? 0),
    currency: data.currency ?? "BRL",
    coverImageUrl: data.cover_image_url ?? null,
    maxPerOrder: data.max_per_order ?? null,
    ...meta,
    highlights: pickArray(data.translations, "highlights", locale, meta.highlights),
    economyLabel: pickString(data.translations, "economyLabel", locale, meta.economyLabel ?? ""),
    altPrice: pickString(data.translations, "altPrice", locale, ""),
  };
}