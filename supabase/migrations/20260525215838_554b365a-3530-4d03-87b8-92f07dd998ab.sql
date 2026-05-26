UPDATE email_providers
SET secret_ref = 'BREVO_API_KEY',
    config = jsonb_set(
      COALESCE(config, '{}'::jsonb),
      '{from_email}',
      '"no-reply@wayhomeoficial.com.br"'::jsonb
    )
WHERE id = 'c08f7c77-f5a1-497e-9f92-271070838db0';