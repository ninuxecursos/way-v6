/**
 * Server functions para gerenciar provedores de IA (Kling, Gemini, GPT, etc.).
 * Somente super_admin/admin podem ler/escrever — credenciais ficam em secrets,
 * o banco só guarda `secret_ref`.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { withErrorLogging } from "./server-fn-error";
import { assertAdmin } from "./admin-guards";
import { AppError } from "./errors";

const ProviderTypeEnum = z.enum([
  "openai",
  "gemini",
  "kling",
  "anthropic",
  "groq",
  "openrouter",
  "stability",
  "elevenlabs",
  "generic",
]);

const UpsertSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(120),
  provider_type: ProviderTypeEnum,
  active: z.boolean().default(false),
  is_default: z.boolean().default(false),
  is_test: z.boolean().default(true),
  model_default: z.string().trim().max(120).nullable().optional(),
  secret_ref: z
    .string()
    .trim()
    .regex(/^[A-Z0-9_]{3,80}$/, "Use APENAS letras maiúsculas, números e _ (3–80).")
    .nullable()
    .optional(),
  config: z.record(z.string(), z.unknown()).default({}),
});

const IdSchema = z.object({ id: z.string().uuid() });

export const listAiProviders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(
    withErrorLogging("aiProviders.list", async ({ context }) => {
      await assertAdmin(context.supabase);
      const { data, error } = await context.supabase
        .from("ai_providers")
        .select("id,name,provider_type,active,is_default,is_test,model_default,secret_ref,config,created_at,updated_at")
        .order("name");
      if (error) throw new AppError("DATABASE", "Falha ao listar provedores.", { cause: error });
      return data ?? [];
    }),
  );

export const upsertAiProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => UpsertSchema.parse(i))
  .handler(
    withErrorLogging("aiProviders.upsert", async ({ data, context }) => {
      await assertAdmin(context.supabase);
      const { supabase } = context;
      if (data.is_default) {
        await supabase
          .from("ai_providers")
          .update({ is_default: false })
          .neq("id", data.id ?? "00000000-0000-0000-0000-000000000000");
      }
      const { data: row, error } = await supabase
        .from("ai_providers")
        .upsert(data as never)
        .select()
        .single();
      if (error) throw new AppError("DATABASE", "Falha ao salvar provedor.", { cause: error });
      return row;
    }),
  );

export const deleteAiProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => IdSchema.parse(i))
  .handler(
    withErrorLogging("aiProviders.delete", async ({ data, context }) => {
      await assertAdmin(context.supabase);
      const { error } = await context.supabase.from("ai_providers").delete().eq("id", data.id);
      if (error) throw new AppError("DATABASE", "Falha ao excluir provedor.", { cause: error });
      return { ok: true };
    }),
  );

export const setDefaultAiProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => IdSchema.parse(i))
  .handler(
    withErrorLogging("aiProviders.setDefault", async ({ data, context }) => {
      await assertAdmin(context.supabase);
      const { supabase } = context;
      await supabase.from("ai_providers").update({ is_default: false }).neq("id", data.id);
      const { error } = await supabase
        .from("ai_providers")
        .update({ is_default: true, active: true })
        .eq("id", data.id);
      if (error) throw new AppError("DATABASE", "Falha ao marcar como padrão.", { cause: error });
      return { ok: true };
    }),
  );