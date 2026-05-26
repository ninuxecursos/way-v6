-- 1) Data do evento por produto
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS event_date date;

-- 2) Check-in + controle de lembretes em pedidos
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS checked_in_at timestamptz,
  ADD COLUMN IF NOT EXISTS checked_in_by uuid,
  ADD COLUMN IF NOT EXISTS reminder_30_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_7_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_1_sent_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_orders_checked_in_at ON public.orders (checked_in_at);
CREATE INDEX IF NOT EXISTS idx_orders_status_paid_at ON public.orders (status, paid_at);

-- 3) Seed de templates de e-mail (se ainda não existirem)
INSERT INTO public.email_templates (slug, name, description, active, translations, variables_doc)
VALUES
  ('event_reminder_30', 'Lembrete D-30', 'Faltam 30 dias para o evento', true,
   jsonb_build_object(
     'pt', jsonb_build_object(
       'subject', 'Faltam 30 dias para o {{product_name}} 🎉',
       'html', '<p>Olá {{customer_name}},</p><p>Faltam <strong>30 dias</strong> para o seu evento <strong>{{product_name}}</strong> em {{event_date_label}}!</p><p>Comece a se organizar: passagens, roupas para frio/calor, documentos. Em breve enviaremos mais detalhes.</p><p>— Equipe Way Home</p>'
     ),
     'en', jsonb_build_object(
       'subject', '30 days until {{product_name}} 🎉',
       'html', '<p>Hi {{customer_name}},</p><p>Only <strong>30 days</strong> to go until <strong>{{product_name}}</strong> on {{event_date_label}}.</p><p>— Way Home Team</p>'
     ),
     'es', jsonb_build_object(
       'subject', 'Faltan 30 días para {{product_name}} 🎉',
       'html', '<p>Hola {{customer_name}},</p><p>Faltan <strong>30 días</strong> para tu evento <strong>{{product_name}}</strong> el {{event_date_label}}.</p><p>— Equipo Way Home</p>'
     )
   ),
   jsonb_build_object('customer_name','string','product_name','string','event_date_label','string')),
  ('event_reminder_7', 'Lembrete D-7', 'Faltam 7 dias para o evento', true,
   jsonb_build_object(
     'pt', jsonb_build_object(
       'subject', 'Faltam 7 dias! Tudo pronto para o {{product_name}}?',
       'html', '<p>Olá {{customer_name}},</p><p>Falta <strong>1 semana</strong> para o <strong>{{product_name}}</strong> ({{event_date_label}}). Em breve enviaremos as instruções finais com horário de check-in, mapa e contato de emergência.</p><p>— Equipe Way Home</p>'
     ),
     'en', jsonb_build_object(
       'subject', '7 days to go! Are you ready for {{product_name}}?',
       'html', '<p>Hi {{customer_name}},</p><p>Only <strong>1 week</strong> until <strong>{{product_name}}</strong> ({{event_date_label}}).</p><p>— Way Home Team</p>'
     ),
     'es', jsonb_build_object(
       'subject', '¡Faltan 7 días para {{product_name}}!',
       'html', '<p>Hola {{customer_name}},</p><p>Falta <strong>1 semana</strong> para <strong>{{product_name}}</strong> ({{event_date_label}}).</p><p>— Equipo Way Home</p>'
     )
   ),
   jsonb_build_object('customer_name','string','product_name','string','event_date_label','string')),
  ('event_reminder_1', 'Lembrete D-1', 'Amanhã é o evento', true,
   jsonb_build_object(
     'pt', jsonb_build_object(
       'subject', 'Amanhã é o dia! 🚀 {{product_name}}',
       'html', '<p>Olá {{customer_name}},</p><p>É amanhã! O <strong>{{product_name}}</strong> começa em {{event_date_label}}. Confira o horário de check-in e nos vemos lá!</p><p>— Equipe Way Home</p>'
     ),
     'en', jsonb_build_object(
       'subject', 'Tomorrow is the day! 🚀 {{product_name}}',
       'html', '<p>Hi {{customer_name}},</p><p>It''s tomorrow! <strong>{{product_name}}</strong> starts on {{event_date_label}}. See you there!</p><p>— Way Home Team</p>'
     ),
     'es', jsonb_build_object(
       'subject', '¡Mañana es el día! 🚀 {{product_name}}',
       'html', '<p>Hola {{customer_name}},</p><p>¡Es mañana! <strong>{{product_name}}</strong> comienza el {{event_date_label}}. ¡Nos vemos allí!</p><p>— Equipo Way Home</p>'
     )
   ),
   jsonb_build_object('customer_name','string','product_name','string','event_date_label','string')),
  ('group_complete_room_assigned', 'Grupo completo — quarto atribuído', 'Enviado quando o grupo Galera fecha e os quartos são distribuídos', true,
   jsonb_build_object(
     'pt', jsonb_build_object(
       'subject', 'Seu grupo está completo! Quarto {{room_number}} 🎉',
       'html', '<p>Olá {{customer_name}},</p><p>O grupo <strong>{{coupon_code}}</strong> está fechado. Você ficará no <strong>quarto {{room_number}}</strong> com:</p><ul>{{roommates_html}}</ul><p>Em breve mandaremos os detalhes do check-in. Bom Tomorrowland!</p><p>— Equipe Way Home</p>'
     ),
     'en', jsonb_build_object(
       'subject', 'Your group is complete! Room {{room_number}} 🎉',
       'html', '<p>Hi {{customer_name}},</p><p>Group <strong>{{coupon_code}}</strong> is full. You''re in <strong>room {{room_number}}</strong> with:</p><ul>{{roommates_html}}</ul><p>— Way Home Team</p>'
     ),
     'es', jsonb_build_object(
       'subject', '¡Tu grupo está completo! Habitación {{room_number}} 🎉',
       'html', '<p>Hola {{customer_name}},</p><p>El grupo <strong>{{coupon_code}}</strong> está cerrado. Estarás en la <strong>habitación {{room_number}}</strong> con:</p><ul>{{roommates_html}}</ul><p>— Equipo Way Home</p>'
     )
   ),
   jsonb_build_object('customer_name','string','coupon_code','string','room_number','int','roommates_html','string'))
ON CONFLICT (slug) DO NOTHING;