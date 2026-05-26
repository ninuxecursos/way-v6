/**
 * Guards reutilizáveis para server functions admin/staff.
 * Defense-in-depth: além das policies RLS, validamos o papel explicitamente
 * em handlers que retornam dados cross-customer.
 */

export type StaffRole = "super_admin" | "admin" | "editor" | "financeiro";

/**
 * Garante que o usuário autenticado tem ao menos um dos papéis solicitados.
 * Lança Error("Forbidden") quando não tem; o handler converte em 403 via
 * withErrorLogging/api-handler.
 */
export async function assertRoles(supabase: any, allowed: StaffRole[]): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);
  if (error) throw error;
  const roles = (data ?? []).map((r: any) => r.role as string);
  if (!roles.some((r: string) => allowed.includes(r as StaffRole))) {
    throw new Error("Forbidden");
  }
  return user.id;
}

export const assertAdmin = (supabase: any) => assertRoles(supabase, ["super_admin", "admin"]);
export const assertStaff = (supabase: any) => assertRoles(supabase, ["super_admin", "admin", "editor", "financeiro"]);
export const assertFinance = (supabase: any) => assertRoles(supabase, ["super_admin", "admin", "financeiro"]);