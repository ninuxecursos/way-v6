-- =====================================================================
-- Fase 4 — Audit logs automáticos para tabelas sensíveis
-- =====================================================================

CREATE OR REPLACE FUNCTION public.audit_log_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action text;
  v_entity_id text;
  v_before jsonb;
  v_after jsonb;
  v_actor uuid;
  v_actor_email text;
BEGIN
  v_actor := auth.uid();
  -- Recupera email do JWT (pode ser null em jobs server-side)
  BEGIN
    v_actor_email := nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'email', '');
  EXCEPTION WHEN OTHERS THEN
    v_actor_email := NULL;
  END;

  IF (TG_OP = 'INSERT') THEN
    v_action := lower(TG_TABLE_NAME) || '.create';
    v_before := NULL;
    v_after := to_jsonb(NEW);
    v_entity_id := COALESCE((to_jsonb(NEW)->>'id'), '');
  ELSIF (TG_OP = 'UPDATE') THEN
    v_action := lower(TG_TABLE_NAME) || '.update';
    v_before := to_jsonb(OLD);
    v_after := to_jsonb(NEW);
    v_entity_id := COALESCE((to_jsonb(NEW)->>'id'), '');
    -- evita ruído: pular updates onde nada relevante mudou
    IF v_before = v_after THEN
      RETURN NEW;
    END IF;
  ELSIF (TG_OP = 'DELETE') THEN
    v_action := lower(TG_TABLE_NAME) || '.delete';
    v_before := to_jsonb(OLD);
    v_after := NULL;
    v_entity_id := COALESCE((to_jsonb(OLD)->>'id'), '');
  END IF;

  INSERT INTO public.audit_logs (
    actor_id, actor_email, action, entity_type, entity_id,
    before_data, after_data, metadata
  ) VALUES (
    v_actor, v_actor_email, v_action, TG_TABLE_NAME, v_entity_id,
    v_before, v_after, jsonb_build_object('op', TG_OP)
  );

  IF (TG_OP = 'DELETE') THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.audit_log_changes() IS
  'Trigger function: registra inserts/updates/deletes em audit_logs. Anexada apenas a tabelas sensíveis.';

-- Helper para anexar triggers sem duplicar
DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'orders',
    'payment_gateways',
    'fiscal_invoices',
    'fiscal_providers',
    'fiscal_company',
    'user_roles'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS audit_%I ON public.%I',
      tbl, tbl
    );
    EXECUTE format(
      'CREATE TRIGGER audit_%I
         AFTER INSERT OR UPDATE OR DELETE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.audit_log_changes()',
      tbl, tbl
    );
  END LOOP;
END$$;