-- Hardening: revoga EXECUTE público de funções SECURITY DEFINER sensíveis.
-- Essas funções ainda continuam acessíveis ao service_role (backend),
-- que é o único papel que deve poder invocá-las via server functions.

REVOKE EXECUTE ON FUNCTION public.admin_delete_auth_user(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.admin_set_user_role(uuid, app_role, boolean) FROM anon, authenticated, public;

REVOKE EXECUTE ON FUNCTION public.register_failed_login(text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.clear_auth_lockout(text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.check_auth_lockout(text) FROM anon, authenticated, public;

REVOKE EXECUTE ON FUNCTION public.register_participant(text, text, text, text, text, text, text, integer, jsonb, uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.register_terms_acceptance(uuid, boolean, boolean, boolean, text, text) FROM anon, authenticated, public;

REVOKE EXECUTE ON FUNCTION public.reservation_group_create(uuid, text, uuid, uuid, text, integer, text, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.reservation_group_join_paid(text, uuid, uuid, text, text, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.reservation_group_room_add(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.reservation_group_member_set_room(uuid, uuid) FROM anon, authenticated, public;

REVOKE EXECUTE ON FUNCTION public.allocate_individual_room(uuid) FROM anon, authenticated, public;

REVOKE EXECUTE ON FUNCTION public.get_auth_user_basic(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.get_customer_stats(uuid) FROM anon, authenticated, public;

REVOKE EXECUTE ON FUNCTION public.increment_promo_coupon_usage(text) FROM anon, authenticated, public;

-- Schema separado para futuras movimentações de extensões.
CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;