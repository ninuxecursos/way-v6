
-- Seed provedor Resend padrão (idempotente)
INSERT INTO public.email_providers (name, provider_type, active, is_default, secret_ref, config)
SELECT 'Resend', 'resend', true, true, 'RESEND_API_KEY',
       jsonb_build_object('from_email','no-reply@wayhome.tur.br','from_name','Way Home')
WHERE NOT EXISTS (SELECT 1 FROM public.email_providers WHERE provider_type='resend');

-- Garante que só haja um default ativo
UPDATE public.email_providers SET is_default = false
WHERE is_default = true
  AND id NOT IN (SELECT id FROM public.email_providers WHERE active=true AND is_default=true ORDER BY created_at LIMIT 1);

-- Cron: chama o endpoint de dispatch a cada 2 minutos
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
DECLARE _job_id bigint;
BEGIN
  SELECT jobid INTO _job_id FROM cron.job WHERE jobname = 'email-dispatch-every-2min';
  IF _job_id IS NOT NULL THEN
    PERFORM cron.unschedule(_job_id);
  END IF;
END $$;

SELECT cron.schedule(
  'email-dispatch-every-2min',
  '*/2 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--3a1103b8-3d36-43d8-b2ed-81086d2e5e46.lovable.app/api/public/hooks/email-dispatch',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'apikey','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1uamxiYW13aHdveXp0enJocGppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNjA3ODAsImV4cCI6MjA5NDczNjc4MH0.U-EN19QPWUfSPYDjSevMnWFt6CPv9tf70D0UGuGLcoM'
    ),
    body := '{}'::jsonb
  );
  $$
);
