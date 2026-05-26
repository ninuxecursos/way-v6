INSERT INTO email_outbox (to_email, to_name, subject, html, text_body, locale, status)
VALUES (
  'galerianinuxe@gmail.com',
  'Teste Way Home',
  'Teste Brevo Way Home',
  '<h1>Funcionou!</h1><p>Este é um e-mail de teste enviado via Brevo pelo dispatcher do Way Home.</p>',
  'Funcionou! Teste enviado via Brevo.',
  'pt',
  'pending'
);