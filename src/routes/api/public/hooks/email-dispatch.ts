/**
 * Cron endpoint: dispatches pending emails from `email_outbox` using the
 * active default provider configured in `email_providers`.
 *
 * Currently supports provider_type = "resend" (via REST API) and "mock"
 * (marks emails as sent without external call — for testing).
 *
 * Idempotent: locks rows by setting status to "sending" before send, and
 * updates to "sent" / "failed" after. Safe to call repeatedly.
 *
 * Call via pg_cron with the project anon key in the `apikey` header.
 */
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const BATCH_SIZE = 25;
const MAX_ATTEMPTS = 5;

type Provider = {
  id: string;
  provider_type: string;
  secret_ref: string | null;
  config: Record<string, any> | null;
};

type OutboxRow = {
  id: string;
  to_email: string;
  to_name: string | null;
  subject: string;
  html: string;
  text_body: string | null;
  attempts: number;
};

async function sendViaResend(provider: Provider, row: OutboxRow): Promise<{ id?: string }> {
  const apiKey = provider.secret_ref ? process.env[provider.secret_ref] : undefined;
  if (!apiKey) {
    throw new Error(`Resend secret '${provider.secret_ref ?? "(none)"}' não está configurada em Secrets.`);
  }
  const fromEmail = provider.config?.from_email;
  const fromName = provider.config?.from_name;
  if (!fromEmail) throw new Error("Provider sem from_email configurado.");
  const from = fromName ? `${fromName} <${fromEmail}>` : fromEmail;
  const to = row.to_name ? `${row.to_name} <${row.to_email}>` : row.to_email;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: row.subject,
      html: row.html,
      ...(row.text_body ? { text: row.text_body } : {}),
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Resend ${res.status}: ${errText.slice(0, 500)}`);
  }
  const data = (await res.json().catch(() => ({}))) as { id?: string };
  return { id: data?.id };
}

async function sendViaBrevo(provider: Provider, row: OutboxRow): Promise<{ id?: string }> {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const brevoKey = process.env.BREVO_API_KEY;
  if (!lovableKey) throw new Error("LOVABLE_API_KEY não está configurada (gateway Lovable).");
  if (!brevoKey) throw new Error("BREVO_API_KEY não está configurada — conecte o Brevo em Lovable Connectors.");
  const fromEmail = provider.config?.from_email;
  const fromName = provider.config?.from_name;
  if (!fromEmail) throw new Error("Provider Brevo sem from_email configurado.");

  const body: Record<string, any> = {
    sender: fromName ? { name: fromName, email: fromEmail } : { email: fromEmail },
    to: [row.to_name ? { email: row.to_email, name: row.to_name } : { email: row.to_email }],
    subject: row.subject,
    htmlContent: row.html,
    ...(row.text_body ? { textContent: row.text_body } : {}),
  };

  const res = await fetch("https://connector-gateway.lovable.dev/brevo/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": brevoKey,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    // 402/429 do Brevo costumam indicar limite do plano free (300/dia) ou rate limit.
    throw new Error(`Brevo ${res.status}: ${errText.slice(0, 500)}`);
  }
  const data = (await res.json().catch(() => ({}))) as { messageId?: string };
  return { id: data?.messageId };
}

async function dispatch() {
  const { data: provider, error: provErr } = await supabaseAdmin
    .from("email_providers")
    .select("id, provider_type, secret_ref, config")
    .eq("active", true)
    .eq("is_default", true)
    .maybeSingle();
  if (provErr) throw provErr;
  if (!provider) {
    return { ok: false, reason: "no_active_default_provider", processed: 0 };
  }

  const nowIso = new Date().toISOString();
  const { data: rows, error: selErr } = await supabaseAdmin
    .from("email_outbox")
    .select("id, to_email, to_name, subject, html, text_body, attempts")
    .eq("status", "pending")
    .lt("attempts", MAX_ATTEMPTS)
    .or(`scheduled_for.is.null,scheduled_for.lte.${nowIso}`)
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE);
  if (selErr) throw selErr;
  if (!rows || rows.length === 0) return { ok: true, processed: 0 };

  let sent = 0;
  let failed = 0;
  for (const row of rows as OutboxRow[]) {
    // Lock the row by flipping to "sending" only if still pending.
    const { data: locked } = await supabaseAdmin
      .from("email_outbox")
      .update({ status: "sending", provider_id: provider.id, attempts: row.attempts + 1 })
      .eq("id", row.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    if (!locked) continue; // outra execução pegou

    try {
      let providerMessageId: string | undefined;
      if (provider.provider_type === "resend") {
        const r = await sendViaResend(provider as Provider, row);
        providerMessageId = r.id;
      } else if (provider.provider_type === "brevo") {
        const r = await sendViaBrevo(provider as Provider, row);
        providerMessageId = r.id;
      } else if (provider.provider_type === "mock") {
        providerMessageId = `mock-${Date.now()}`;
      } else {
        throw new Error(`provider_type '${provider.provider_type}' ainda não suportado pelo dispatcher.`);
      }
      await supabaseAdmin
        .from("email_outbox")
        .update({ status: "sent", sent_at: new Date().toISOString(), provider_message_id: providerMessageId ?? null, last_error: null })
        .eq("id", row.id);
      sent++;
    } catch (e: any) {
      const msg = String(e?.message ?? e).slice(0, 1000);
      const nextStatus = row.attempts + 1 >= MAX_ATTEMPTS ? "failed" : "pending";
      await supabaseAdmin
        .from("email_outbox")
        .update({ status: nextStatus, last_error: msg })
        .eq("id", row.id);
      failed++;
      console.error("[email-dispatch] falha no envio", row.id, msg);
    }
  }

  return { ok: true, processed: rows.length, sent, failed };
}

export const Route = createFileRoute("/api/public/hooks/email-dispatch")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const result = await dispatch();
          return new Response(JSON.stringify(result), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (e: any) {
          console.error("[email-dispatch] erro fatal", e);
          return new Response(JSON.stringify({ ok: false, error: String(e?.message ?? e) }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
      GET: async () => {
        // Permite teste manual rápido.
        const result = await dispatch();
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});