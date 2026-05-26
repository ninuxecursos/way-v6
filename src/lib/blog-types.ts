export type Locale = "pt" | "en" | "es";
export const LOCALES: Locale[] = ["pt", "en", "es"];
export const LOCALE_LABELS: Record<Locale, string> = { pt: "Português", en: "English", es: "Español" };
export const DEFAULT_LOCALE: Locale = "pt";

export type PostStatus = "draft" | "scheduled" | "published" | "archived";

export interface BlogPostRow {
  id: string;
  slug: string;
  status: PostStatus;
  cover_image_url: string | null;
  cover_alt: string | null;
  featured: boolean;
  reading_time_min: number | null;
  views_count: number;
  comments_count: number;
  geo_score: number | null;
  geo_keywords: string[] | null;
  published_at: string | null;
  scheduled_for: string | null;
  created_at: string;
  updated_at: string;
}

export interface BlogTranslationRow {
  id: string;
  post_id: string;
  locale: Locale;
  title: string;
  slug: string;
  excerpt: string | null;
  content_markdown: string;
  meta_title: string | null;
  meta_description: string | null;
  og_image_url: string | null;
  canonical_url: string | null;
  schema_jsonld: Record<string, unknown> | null;
  geo_summary: string | null;
  geo_faq: Array<{ q: string; a: string }> | null;
  geo_entities: string[] | null;
}

export interface BlogCommentRow {
  id: string;
  post_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  status: "pending" | "approved" | "rejected" | "flagged";
  edited_at: string | null;
  created_at: string;
  updated_at: string;
}
