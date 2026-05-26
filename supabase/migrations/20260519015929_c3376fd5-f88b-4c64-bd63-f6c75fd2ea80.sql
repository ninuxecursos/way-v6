-- AI Providers (Kling, Gemini, GPT, etc.) — gerenciados pelo admin
CREATE TABLE IF NOT EXISTS public.ai_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  provider_type text NOT NULL,
  active boolean NOT NULL DEFAULT false,
  is_default boolean NOT NULL DEFAULT false,
  is_test boolean NOT NULL DEFAULT true,
  model_default text,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  secret_ref text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_providers_secret_ref_format CHECK (secret_ref IS NULL OR secret_ref ~ '^[A-Z0-9_]{3,80}$')
);

ALTER TABLE public.ai_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage ai providers"
ON public.ai_providers FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER ai_providers_updated_at
BEFORE UPDATE ON public.ai_providers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS ai_providers_default_idx ON public.ai_providers(is_default) WHERE is_default = true;

-- 2FA: tabela auxiliar para registrar bypass temporário pós-deploy (super_admin only)
CREATE TABLE IF NOT EXISTS public.admin_mfa_overrides (
  user_id uuid PRIMARY KEY,
  bypass_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_mfa_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage mfa overrides"
ON public.admin_mfa_overrides FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));