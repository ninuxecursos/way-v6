import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { withErrorLogging } from "./server-fn-error";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const MAX_ATTEMPTS = 5;

const emailInput = z.object({ email: z.string().trim().toLowerCase().email().max(255) });

function getLockoutClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    console.warn("[auth-lockout] Supabase público ausente; lockout temporariamente desativado no preview.");
    return null;
  }

  return createClient<Database>(url, key, {
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function normalizeLockout(row: { locked: boolean | null; attempts_left: number | null; max_attempts: number | null } | null | undefined) {
  return {
    locked: !!row?.locked,
    attemptsLeft: row?.attempts_left ?? MAX_ATTEMPTS,
    max: row?.max_attempts ?? MAX_ATTEMPTS,
  };
}

export const checkLockout = createServerFn({ method: "POST" })
  .inputValidator((data) => emailInput.parse(data))
  .handler(withErrorLogging("auth-lockout.check", async ({ data }) => {
    const supabase = getLockoutClient();
    if (!supabase) return { locked: false, attemptsLeft: MAX_ATTEMPTS, max: MAX_ATTEMPTS };

    const { data: row } = await supabase.rpc("check_auth_lockout", { _email: data.email }).single();
    return normalizeLockout(row);
  }));

export const registerFailedLogin = createServerFn({ method: "POST" })
  .inputValidator((data) => emailInput.parse(data))
  .handler(withErrorLogging("auth-lockout.registerFailed", async ({ data }) => {
    const supabase = getLockoutClient();
    if (!supabase) return { locked: false, attemptsLeft: MAX_ATTEMPTS, max: MAX_ATTEMPTS };

    const { data: row } = await supabase.rpc("register_failed_login", { _email: data.email }).single();
    return normalizeLockout(row);
  }));

export const clearLockout = createServerFn({ method: "POST" })
  .inputValidator((data) => emailInput.parse(data))
  .handler(withErrorLogging("auth-lockout.clear", async ({ data }) => {
    // SECURITY: só permite limpar o lockout do PRÓPRIO usuário autenticado.
    // Antes era anônimo — permitia bypass total do brute-force lockout.
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;
    const authHeader = getRequestHeader("authorization");
    if (!url || !key || !authHeader?.startsWith("Bearer ")) {
      // Sem sessão válida: não-op silencioso (não vaza enumeração de e-mails).
      return { ok: true };
    }
    const token = authHeader.slice("Bearer ".length);
    const userClient = createClient<Database>(url, key, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });
    const { data: claims } = await userClient.auth.getClaims(token);
    const userEmail = (claims?.claims?.email as string | undefined)?.toLowerCase();
    if (!userEmail || userEmail !== data.email) {
      // Atacante tentando limpar lockout de outro e-mail: ignora silenciosamente.
      return { ok: true };
    }
    await supabaseAdmin.rpc("clear_auth_lockout", { _email: data.email });
    return { ok: true };
  }));
