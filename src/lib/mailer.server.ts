import { supabaseAdmin } from "@/integrations/supabase/client.server";

function render(template: string, vars: Record<string, any>): string {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, k) => {
    const parts = String(k).split(".");
    let v: any = vars;
    for (const p of parts) v = v?.[p];
    return v == null ? "" : String(v);
  });
}

/** Enqueue an email by template slug. Returns the outbox row id, or null when template is missing. */
export async function enqueueTemplateEmail(opts: {
  slug: string;
  to: string;
  toName?: string;
  userId?: string;
  locale?: string;
  variables?: Record<string, any>;
}) {
  const locale = opts.locale ?? "pt";
  const { data: tpl } = await supabaseAdmin.from("email_templates").select("*").eq("slug", opts.slug).eq("active", true).maybeSingle();
  if (!tpl) return null;
  const tr = (tpl.translations as any)?.[locale] ?? (tpl.translations as any)?.pt ?? {};
  if (!tr.subject || !tr.html) return null;
  const vars = opts.variables ?? {};
  const subject = render(tr.subject, vars);
  const html = render(tr.html, vars);
  const text = tr.text ? render(tr.text, vars) : null;
  const { data, error } = await supabaseAdmin.from("email_outbox").insert({
    template_slug: opts.slug, to_email: opts.to, to_name: opts.toName ?? null,
    user_id: opts.userId ?? null, locale, subject, html, text_body: text, variables: vars, status: "pending",
  }).select("id").single();
  if (error) throw error;
  return data.id;
}