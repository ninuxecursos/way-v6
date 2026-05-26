
-- ============================================================
-- 1) RLS "Always True" — contact_messages.INSERT
-- Mantém form público aceitando, mas valida campos mínimos.
-- ============================================================
DROP POLICY IF EXISTS "Anyone can insert contact messages" ON public.contact_messages;
CREATE POLICY "Public can submit contact messages"
ON public.contact_messages FOR INSERT TO anon, authenticated
WITH CHECK (
  length(coalesce(name, '')) BETWEEN 1 AND 200
  AND length(coalesce(email, '')) BETWEEN 3 AND 320
  AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND length(coalesce(message, '')) BETWEEN 1 AND 5000
);

-- ============================================================
-- 2) Storage bucket público — remover SELECT anon na tabela objects.
-- Files continuam acessíveis via CDN (/storage/v1/object/public/...).
-- Listagem via API fica restrita a staff.
-- ============================================================
DROP POLICY IF EXISTS "Public reads media-public files" ON storage.objects;
CREATE POLICY "Staff list media-public" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'media-public'
  AND (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'editor'::public.app_role))
);

-- ============================================================
-- 3) SECURITY DEFINER — restringir EXECUTE
-- ============================================================

-- Triggers (não precisam de EXECUTE para nenhum role)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.orders_link_user_by_email() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_published_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refresh_post_comments_count() FROM PUBLIC, anon, authenticated;

-- Funções intencionalmente públicas (anon + authenticated)
-- check_auth_lockout, register_failed_login, clear_auth_lockout: tela de login
-- validate_promo_coupon: checkout pré-pagamento
-- get_group_coupon_public: página /grupo/$coupon
-- increment_post_views: blog público
-- get_public_avatars: avatares em comentários públicos
-- (já têm GRANT padrão; nada a fazer)

-- Funções que só fazem sentido para usuários autenticados — revogar de anon
REVOKE EXECUTE ON FUNCTION public.register_participant(text,text,text,text,text,text,text,integer,jsonb,uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.register_terms_acceptance(uuid,boolean,boolean,boolean,text,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.allocate_individual_room(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reservation_group_create(uuid,text,uuid,uuid,text,integer,text,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reservation_group_join_paid(text,uuid,uuid,text,text,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reservation_group_member_set_room(uuid,uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reservation_group_room_add(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.increment_promo_coupon_usage(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_customer_stats(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_auth_user_basic(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_buyer(uuid) FROM PUBLIC, anon;

-- Funções admin: revogar de anon e do role authenticated (validação interna já checa role)
REVOKE EXECUTE ON FUNCTION public.admin_delete_auth_user(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_set_user_role(uuid, public.app_role, boolean) FROM PUBLIC, anon, authenticated;

-- Re-grant explícito do necessário ao authenticated (após REVOKE PUBLIC)
GRANT EXECUTE ON FUNCTION public.register_participant(text,text,text,text,text,text,text,integer,jsonb,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_terms_acceptance(uuid,boolean,boolean,boolean,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.allocate_individual_room(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reservation_group_create(uuid,text,uuid,uuid,text,integer,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reservation_group_join_paid(text,uuid,uuid,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reservation_group_member_set_room(uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reservation_group_room_add(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_promo_coupon_usage(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_customer_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_auth_user_basic(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_buyer(uuid) TO authenticated;
-- admin_* permanecem sem GRANT — só callable via supabase service role / SECURITY DEFINER em outras fns

-- ============================================================
-- 4) Email Templates — populando os 9 essenciais (PT/EN/ES)
-- ============================================================
INSERT INTO public.email_templates (slug, name, description, active, variables_doc, translations) VALUES
('welcome', 'Bem-vindo(a) à Way Home', 'Enviado quando o usuário cria conta.', true,
 '{"display_name":"Nome do usuário","login_url":"URL de login"}'::jsonb,
 jsonb_build_object(
   'pt', jsonb_build_object(
     'subject', 'Bem-vindo(a) à Way Home, {{display_name}}!',
     'html', '<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;max-width:560px;margin:32px auto;padding:24px;color:#1a1a1a;"><h1 style="color:#0a0a1a;">Olá, {{display_name}} 👋</h1><p>Sua conta na <strong>Way Home</strong> foi criada com sucesso. Agora você pode reservar sua hospedagem no Tomorrowland Brasil, gerenciar seus pedidos e acompanhar seu grupo Galera.</p><p style="margin:32px 0;"><a href="{{login_url}}" style="background:#0a0a1a;color:#fff;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block;">Acessar minha conta</a></p><p style="color:#666;font-size:13px;">Equipe Way Home · Tomorrowland Brasil</p></body></html>',
     'text', 'Olá {{display_name}}! Sua conta na Way Home foi criada. Acesse: {{login_url}}'
   ),
   'en', jsonb_build_object(
     'subject', 'Welcome to Way Home, {{display_name}}!',
     'html', '<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;max-width:560px;margin:32px auto;padding:24px;"><h1>Hi, {{display_name}} 👋</h1><p>Your <strong>Way Home</strong> account is ready. Reserve your stay at Tomorrowland Brasil, manage orders and follow your Galera group.</p><p><a href="{{login_url}}" style="background:#0a0a1a;color:#fff;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block;">Open my account</a></p></body></html>',
     'text', 'Hi {{display_name}}! Your Way Home account is ready: {{login_url}}'
   ),
   'es', jsonb_build_object(
     'subject', '¡Bienvenido(a) a Way Home, {{display_name}}!',
     'html', '<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;max-width:560px;margin:32px auto;padding:24px;"><h1>Hola, {{display_name}} 👋</h1><p>Tu cuenta en <strong>Way Home</strong> está lista. Reserva tu hospedaje en Tomorrowland Brasil, gestiona pedidos y sigue tu grupo Galera.</p><p><a href="{{login_url}}" style="background:#0a0a1a;color:#fff;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block;">Acceder a mi cuenta</a></p></body></html>',
     'text', 'Hola {{display_name}}! Tu cuenta Way Home está lista: {{login_url}}'
   )
 )
),

('order_paid', 'Pedido confirmado', 'Enviado quando o pagamento é aprovado.', true,
 '{"order_id":"UUID do pedido","total":"Valor total","currency":"BRL","receipt_url":"URL do recibo","account_url":"URL da área do cliente"}'::jsonb,
 jsonb_build_object(
   'pt', jsonb_build_object(
     'subject', 'Pedido confirmado #{{order_id}} ✅',
     'html', '<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;max-width:560px;margin:32px auto;padding:24px;color:#1a1a1a;"><h1 style="color:#0a0a1a;">Pagamento aprovado!</h1><p>Seu pedido <strong>#{{order_id}}</strong> foi confirmado.</p><p style="background:#f5f5f0;padding:16px;border-radius:8px;font-size:18px;"><strong>Total pago:</strong> {{currency}} {{total}}</p><p>Agora é só aguardar o evento. Você receberá lembretes 30, 7 e 1 dia antes.</p><p style="margin:24px 0;"><a href="{{account_url}}" style="background:#0a0a1a;color:#fff;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block;">Ver meu pedido</a></p><p style="color:#666;font-size:13px;">Equipe Way Home · Tomorrowland Brasil</p></body></html>',
     'text', 'Pedido #{{order_id}} confirmado. Total: {{currency}} {{total}}. Detalhes: {{account_url}}'
   ),
   'en', jsonb_build_object(
     'subject', 'Order confirmed #{{order_id}} ✅',
     'html', '<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;max-width:560px;margin:32px auto;padding:24px;"><h1>Payment approved!</h1><p>Order <strong>#{{order_id}}</strong> confirmed.</p><p style="background:#f5f5f0;padding:16px;border-radius:8px;font-size:18px;"><strong>Paid:</strong> {{currency}} {{total}}</p><p>You will get reminders 30, 7 and 1 day before the event.</p><p><a href="{{account_url}}" style="background:#0a0a1a;color:#fff;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block;">View order</a></p></body></html>',
     'text', 'Order #{{order_id}} confirmed. Total: {{currency}} {{total}}. {{account_url}}'
   ),
   'es', jsonb_build_object(
     'subject', 'Pedido confirmado #{{order_id}} ✅',
     'html', '<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;max-width:560px;margin:32px auto;padding:24px;"><h1>¡Pago aprobado!</h1><p>Tu pedido <strong>#{{order_id}}</strong> está confirmado.</p><p style="background:#f5f5f0;padding:16px;border-radius:8px;font-size:18px;"><strong>Total pagado:</strong> {{currency}} {{total}}</p><p>Recibirás recordatorios 30, 7 y 1 día antes del evento.</p><p><a href="{{account_url}}" style="background:#0a0a1a;color:#fff;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block;">Ver pedido</a></p></body></html>',
     'text', 'Pedido #{{order_id}} confirmado. Total: {{currency}} {{total}}. {{account_url}}'
   )
 )
),

('order_pending', 'Pagamento pendente', 'Pedido em análise / aguardando boleto/PIX.', true,
 '{"order_id":"UUID","payment_method":"pix|boleto|card","payment_url":"URL p/ concluir"}'::jsonb,
 jsonb_build_object(
   'pt', jsonb_build_object(
     'subject', 'Aguardando pagamento — pedido #{{order_id}}',
     'html', '<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;max-width:560px;margin:32px auto;padding:24px;"><h1>Pedido recebido</h1><p>Estamos aguardando a confirmação do seu pagamento ({{payment_method}}).</p><p><a href="{{payment_url}}" style="background:#0a0a1a;color:#fff;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block;">Concluir pagamento</a></p><p style="color:#666;font-size:13px;">Assim que confirmado, você receberá um novo e-mail.</p></body></html>',
     'text', 'Pedido #{{order_id}} aguardando pagamento via {{payment_method}}: {{payment_url}}'
   ),
   'en', jsonb_build_object('subject','Pending payment — order #{{order_id}}','html','<p>Order #{{order_id}} is waiting for payment ({{payment_method}}). <a href="{{payment_url}}">Complete payment</a></p>','text','Order #{{order_id}} pending: {{payment_url}}'),
   'es', jsonb_build_object('subject','Pago pendiente — pedido #{{order_id}}','html','<p>Pedido #{{order_id}} esperando pago ({{payment_method}}). <a href="{{payment_url}}">Completar</a></p>','text','Pedido #{{order_id}} pendiente: {{payment_url}}')
 )
),

('order_refunded', 'Pedido reembolsado', 'Disparado quando o pedido é estornado.', true,
 '{"order_id":"UUID","total":"valor","currency":"BRL"}'::jsonb,
 jsonb_build_object(
   'pt', jsonb_build_object('subject','Reembolso processado — pedido #{{order_id}}','html','<p>O pedido #{{order_id}} foi reembolsado. Valor: {{currency}} {{total}}. O estorno pode levar até 5 dias úteis para aparecer no seu extrato.</p>','text','Pedido #{{order_id}} reembolsado: {{currency}} {{total}}'),
   'en', jsonb_build_object('subject','Refund processed — order #{{order_id}}','html','<p>Order #{{order_id}} refunded: {{currency}} {{total}}.</p>','text','Order #{{order_id}} refunded: {{currency}} {{total}}'),
   'es', jsonb_build_object('subject','Reembolso procesado — pedido #{{order_id}}','html','<p>Pedido #{{order_id}} reembolsado: {{currency}} {{total}}.</p>','text','Pedido #{{order_id}} reembolsado: {{currency}} {{total}}')
 )
),

('group_holder_created', 'Seu grupo Galera está aberto', 'Enviado ao titular após criar grupo.', true,
 '{"display_name":"Nome","coupon_code":"Cupom","capacity":"vagas","group_url":"URL do grupo","share_url":"link p/ compartilhar"}'::jsonb,
 jsonb_build_object(
   'pt', jsonb_build_object(
     'subject', 'Seu grupo Galera está aberto — cupom {{coupon_code}}',
     'html', '<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;max-width:560px;margin:32px auto;padding:24px;"><h1>Bora encher esse quarto, {{display_name}}!</h1><p>Seu grupo está aberto com <strong>{{capacity}} vagas</strong>.</p><p style="background:#fef3c7;padding:20px;border-radius:8px;text-align:center;"><span style="font-size:14px;color:#92400e;">CUPOM DO QUARTO</span><br><strong style="font-size:32px;letter-spacing:4px;color:#0a0a1a;">{{coupon_code}}</strong></p><p>Compartilhe esse cupom com sua galera. Eles compram a hospedagem Galera usando esse código e entram automaticamente no seu quarto.</p><p><a href="{{share_url}}" style="background:#0a0a1a;color:#fff;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block;">Compartilhar link</a> · <a href="{{group_url}}">Ver meu grupo</a></p></body></html>',
     'text', 'Cupom do seu quarto: {{coupon_code}}. Compartilhe: {{share_url}}'
   ),
   'en', jsonb_build_object('subject','Your Galera group is open — coupon {{coupon_code}}','html','<p>Group open with {{capacity}} spots. Share coupon <strong>{{coupon_code}}</strong>: <a href="{{share_url}}">{{share_url}}</a></p>','text','Coupon: {{coupon_code}} · {{share_url}}'),
   'es', jsonb_build_object('subject','Tu grupo Galera está abierto — cupón {{coupon_code}}','html','<p>Grupo abierto con {{capacity}} plazas. Comparte el cupón <strong>{{coupon_code}}</strong>: <a href="{{share_url}}">{{share_url}}</a></p>','text','Cupón: {{coupon_code}} · {{share_url}}')
 )
),

('group_complete', 'Grupo completo!', 'Disparado quando o grupo Galera atinge capacidade.', true,
 '{"coupon_code":"Cupom","members_count":"total","group_url":"URL"}'::jsonb,
 jsonb_build_object(
   'pt', jsonb_build_object('subject','Grupo {{coupon_code}} fechado — quarto completo 🎉','html','<p>Seu grupo Galera está completo com {{members_count}} pessoas! Já alocamos vocês no mesmo quarto. <a href="{{group_url}}">Ver detalhes</a></p>','text','Grupo {{coupon_code}} completo. {{group_url}}'),
   'en', jsonb_build_object('subject','Group {{coupon_code}} is complete 🎉','html','<p>Your Galera group is full ({{members_count}} people). Same room confirmed. <a href="{{group_url}}">Details</a></p>','text','Group {{coupon_code}} full. {{group_url}}'),
   'es', jsonb_build_object('subject','Grupo {{coupon_code}} completo 🎉','html','<p>Tu grupo Galera está completo ({{members_count}} personas). Mismo cuarto confirmado. <a href="{{group_url}}">Detalles</a></p>','text','Grupo {{coupon_code}} completo. {{group_url}}')
 )
),

('event_reminder_30', 'Falta 1 mês', 'Lembrete enviado 30 dias antes do evento.', true,
 '{"display_name":"Nome","event_date":"Data","account_url":"URL"}'::jsonb,
 jsonb_build_object(
   'pt', jsonb_build_object('subject','Falta 1 mês para o Tomorrowland Brasil 🌟','html','<p>Olá {{display_name}}, falta 1 mês para sua experiência Way Home no Tomorrowland Brasil ({{event_date}}). Comece a se preparar! <a href="{{account_url}}">Ver checklist</a></p>','text','Falta 1 mês! {{event_date}} · {{account_url}}'),
   'en', jsonb_build_object('subject','1 month to Tomorrowland Brasil','html','<p>Hi {{display_name}}, 1 month to your Way Home experience ({{event_date}}). <a href="{{account_url}}">Checklist</a></p>','text','1 month! {{event_date}} · {{account_url}}'),
   'es', jsonb_build_object('subject','Falta 1 mes para Tomorrowland Brasil','html','<p>Hola {{display_name}}, falta 1 mes ({{event_date}}). <a href="{{account_url}}">Checklist</a></p>','text','1 mes! {{event_date}} · {{account_url}}')
 )
),

('event_reminder_7', 'Falta 1 semana', 'Lembrete enviado 7 dias antes do evento.', true,
 '{"display_name":"Nome","event_date":"Data","account_url":"URL"}'::jsonb,
 jsonb_build_object(
   'pt', jsonb_build_object('subject','Falta 1 semana — finalize seus preparativos','html','<p>{{display_name}}, falta 1 semana ({{event_date}})! Confira o kit Way Home, transfer e check-in: <a href="{{account_url}}">acessar conta</a></p>','text','1 semana! {{account_url}}'),
   'en', jsonb_build_object('subject','1 week to go!','html','<p>{{display_name}}, 1 week ({{event_date}}). <a href="{{account_url}}">Open account</a></p>','text','1 week! {{account_url}}'),
   'es', jsonb_build_object('subject','¡Falta 1 semana!','html','<p>{{display_name}}, 1 semana ({{event_date}}). <a href="{{account_url}}">Cuenta</a></p>','text','1 semana! {{account_url}}')
 )
),

('event_reminder_1', 'É amanhã!', 'Lembrete enviado 1 dia antes do evento.', true,
 '{"display_name":"Nome","qr_url":"URL QR Code"}'::jsonb,
 jsonb_build_object(
   'pt', jsonb_build_object('subject','É amanhã, {{display_name}}! 🚀','html','<p>Amanhã começa sua experiência Way Home. Tenha seu QR Code em mãos para o embarque no transfer e o check-in da hospedagem: <a href="{{qr_url}}">abrir QR Code</a></p>','text','É amanhã! QR Code: {{qr_url}}'),
   'en', jsonb_build_object('subject','It is tomorrow, {{display_name}}! 🚀','html','<p>Tomorrow your Way Home stay begins. Keep your QR Code ready: <a href="{{qr_url}}">open</a></p>','text','Tomorrow! {{qr_url}}'),
   'es', jsonb_build_object('subject','¡Es mañana, {{display_name}}! 🚀','html','<p>Mañana empieza tu Way Home. Ten tu QR a mano: <a href="{{qr_url}}">abrir</a></p>','text','¡Mañana! {{qr_url}}')
 )
),

('contact_received', 'Recebemos sua mensagem', 'Confirma recebimento de contato.', true,
 '{"name":"Nome do contato"}'::jsonb,
 jsonb_build_object(
   'pt', jsonb_build_object('subject','Recebemos sua mensagem, {{name}}','html','<p>Olá {{name}}, recebemos seu contato. Respondemos em até 48h úteis. — Equipe Way Home</p>','text','Recebemos sua mensagem, {{name}}. Resposta em até 48h.'),
   'en', jsonb_build_object('subject','We got your message, {{name}}','html','<p>Hi {{name}}, we received your message and will reply within 48 business hours.</p>','text','Got your message, {{name}}. Reply within 48h.'),
   'es', jsonb_build_object('subject','Recibimos tu mensaje, {{name}}','html','<p>Hola {{name}}, recibimos tu mensaje. Responderemos en 48h hábiles.</p>','text','Recibimos tu mensaje, {{name}}.')
 )
)

ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  active = EXCLUDED.active,
  variables_doc = EXCLUDED.variables_doc,
  translations = EXCLUDED.translations,
  updated_at = now();
