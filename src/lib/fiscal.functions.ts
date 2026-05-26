import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { withErrorLogging } from "./server-fn-error";
import { assertFinance } from "./admin-guards";

/* -------------------------- Schemas Zod -------------------------- */

const FiscalCompanySchema = z.object({
  id: z.string().uuid().optional(),
  legal_name: z.string().trim().min(1).max(200),
  trade_name: z.string().trim().max(200).nullable().optional(),
  cnpj: z.string().trim().regex(/^\d{14}$/, "CNPJ deve ter 14 dígitos"),
  ie: z.string().trim().max(40).nullable().optional(),
  im: z.string().trim().max(40).nullable().optional(),
  tax_regime: z.enum(["simples_nacional", "lucro_presumido", "lucro_real", "mei"]).default("simples_nacional"),
  default_service_code: z.string().trim().max(40).nullable().optional(),
  default_cnae: z.string().trim().max(40).nullable().optional(),
  default_iss_rate: z.number().min(0).max(100).nullable().optional(),
  email: z.string().trim().email().max(200).nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  logo_url: z.string().trim().url().max(500).nullable().optional(),
  address: z.record(z.string(), z.unknown()).default({}),
});

const FiscalProviderSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(120),
  provider_type: z.enum(["focus_nfe", "plugnotas", "nfeio", "manual", "generic"]),
  active: z.boolean().default(false),
  is_default: z.boolean().default(false),
  is_test: z.boolean().default(true),
  supports: z.array(z.enum(["nfse", "nfe", "nfce"])).min(1).default(["nfse"]),
  secret_ref: z.string().trim().regex(/^[A-Z0-9_]{3,80}$/).nullable().optional(),
  config: z.record(z.string(), z.unknown()).default({}),
});

const ListInvoicesSchema = z.object({
  status: z.string().trim().max(40).optional(),
  limit: z.number().int().min(1).max(500).optional(),
});

const CreateInvoiceSchema = z.object({
  orderId: z.string().uuid(),
  invoiceType: z.enum(["nfse", "nfe", "nfce"]).optional(),
});

const UpdateInvoiceStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.string().trim().min(1).max(40),
  number: z.string().trim().max(80).optional(),
  access_key: z.string().trim().max(120).optional(),
  xml_url: z.string().trim().url().max(500).optional(),
  pdf_url: z.string().trim().url().max(500).optional(),
  last_error: z.string().trim().max(2000).optional(),
});

export const getFiscalCompany = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(withErrorLogging("getFiscalCompany", async ({ context }) => {
    await assertFinance(context.supabase);
    const { data, error } = await context.supabase.from("fiscal_company").select("*").maybeSingle();
    if (error) throw error;
    return data;
  }));

export const upsertFiscalCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => FiscalCompanySchema.parse(i))
  .handler(withErrorLogging("upsertFiscalCompany", async ({ data, context }) => {
    const { supabase } = context;
    await assertFinance(supabase);
    const payload = { ...data, singleton: true };
    const { data: row, error } = await supabase.from("fiscal_company").upsert(payload as never, { onConflict: "singleton" }).select().single();
    if (error) throw error;
    return row;
  }));

export const listFiscalProviders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(withErrorLogging("listFiscalProviders", async ({ context }) => {
    await assertFinance(context.supabase);
    const { data, error } = await context.supabase.from("fiscal_providers").select("*").order("name");
    if (error) throw error;
    return data ?? [];
  }));

export const upsertFiscalProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => FiscalProviderSchema.parse(i))
  .handler(withErrorLogging("upsertFiscalProvider", async ({ data, context }) => {
    const { supabase } = context;
    await assertFinance(supabase);
    if (data.is_default) {
      await supabase.from("fiscal_providers").update({ is_default: false }).neq("id", data.id ?? "00000000-0000-0000-0000-000000000000");
    }
    const { data: row, error } = await supabase.from("fiscal_providers").upsert(data as never).select().single();
    if (error) throw error;
    return row;
  }));

export const listFiscalInvoices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ListInvoicesSchema.parse(i ?? {}))
  .handler(withErrorLogging("listFiscalInvoices", async ({ data, context }) => {
    await assertFinance(context.supabase);
    let q = context.supabase.from("fiscal_invoices").select("*").order("created_at", { ascending: false }).limit(data.limit ?? 100);
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  }));

export const createFiscalInvoiceForOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => CreateInvoiceSchema.parse(i))
  .handler(withErrorLogging("createFiscalInvoiceForOrder", async ({ data, context }) => {
    const { supabase } = context;
    await assertFinance(supabase);
    const { data: order, error: oErr } = await supabase.from("orders").select("*").eq("id", data.orderId).single();
    if (oErr) throw oErr;
    const { data: row, error } = await supabase.from("fiscal_invoices").insert({
      order_id: order.id,
      invoice_type: data.invoiceType ?? "nfse",
      status: "pending",
      amount_cents: order.total_cents,
      customer_email: order.customer_email,
    }).select().single();
    if (error) throw error;
    await supabase.from("fiscal_invoice_events").insert({ invoice_id: row.id, event_type: "created", message: "Nota criada manualmente" });
    return row;
  }));

export const updateFiscalInvoiceStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => UpdateInvoiceStatusSchema.parse(i))
  .handler(withErrorLogging("updateFiscalInvoiceStatus", async ({ data, context }) => {
    const { supabase } = context;
    await assertFinance(supabase);
    const patch: any = { status: data.status };
    if (data.number) patch.number = data.number;
    if (data.access_key) patch.access_key = data.access_key;
    if (data.xml_url) patch.xml_url = data.xml_url;
    if (data.pdf_url) patch.pdf_url = data.pdf_url;
    if (data.last_error) patch.last_error = data.last_error;
    if (data.status === "issued") patch.issued_at = new Date().toISOString();
    if (data.status === "cancelled") patch.cancelled_at = new Date().toISOString();
    const { data: row, error } = await supabase.from("fiscal_invoices").update(patch).eq("id", data.id).select().single();
    if (error) throw error;
    await supabase.from("fiscal_invoice_events").insert({ invoice_id: data.id, event_type: data.status, message: data.last_error ?? null });
    return row;
  }));