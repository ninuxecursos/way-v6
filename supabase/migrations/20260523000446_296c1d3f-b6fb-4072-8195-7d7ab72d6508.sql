-- Auditoria de Segurança - Way Home Production Ready

-- 1. Revogar execução pública de funções sensíveis
-- A função clear_auth_lockout não deve ser acessível publicamente (anon/authenticated)
-- Deve ser executada apenas via supabaseAdmin (service_role) no servidor.
REVOKE EXECUTE ON FUNCTION public.clear_auth_lockout(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.clear_auth_lockout(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.clear_auth_lockout(text) FROM authenticated;

-- Garantir que funções administrativas sensíveis sejam restritas
REVOKE EXECUTE ON FUNCTION public.admin_delete_auth_user(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_set_user_role(uuid, app_role, boolean) FROM PUBLIC;
