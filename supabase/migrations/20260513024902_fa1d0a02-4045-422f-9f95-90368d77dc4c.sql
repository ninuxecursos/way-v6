
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_type_check;
ALTER TABLE public.products ADD CONSTRAINT products_type_check
  CHECK (type = ANY (ARRAY['suite'::text,'camping'::text,'addon'::text,'transfer'::text,'reservation_modality'::text,'other'::text]));

INSERT INTO public.products (slug, type, price_cents, currency, active, position, translations, metadata)
VALUES
  ('individual', 'reservation_modality', 200000, 'BRL', true, 1,
    jsonb_build_object(
      'pt-BR', jsonb_build_object('name','Individual','description','Sua vaga garantida em quarto compartilhado, masculino ou feminino.'),
      'en',    jsonb_build_object('name','Individual','description','Your spot in a shared room, male or female.'),
      'es',    jsonb_build_object('name','Individual','description','Tu lugar en habitación compartida, masculina o femenina.')
    ),
    jsonb_build_object(
      'modality_kind','individual','checkout_mode','auto','recommended',false,
      'gender_options', jsonb_build_array('m','f'),
      'highlights', jsonb_build_array(
        'Quarto compartilhado (masculino ou feminino)',
        'Cama individual com roupa de cama',
        'Café da manhã incluso',
        'Acesso a todas as áreas Way Home'
      ),
      'short_description','Quarto compartilhado · masc ou fem'
    )),
  ('quarto-galera', 'reservation_modality', 180000, 'BRL', true, 2,
    jsonb_build_object(
      'pt-BR', jsonb_build_object('name','Quarto em Galera','description','Você dividirá o quarto com outras pessoas e economiza no valor por pessoa.'),
      'en',    jsonb_build_object('name','Group Room','description','You will share the room with other people and save per person.'),
      'es',    jsonb_build_object('name','Habitación en Grupo','description','Compartirás la habitación con otras personas y ahorras por persona.')
    ),
    jsonb_build_object(
      'modality_kind','shared','checkout_mode','auto','recommended',true,'min_quantity',2,
      'highlights', jsonb_build_array(
        'Você dividirá o quarto com outras pessoas',
        'Melhor custo-benefício do Way Home',
        'Café da manhã incluso',
        'Ideal para quem vai com amigos'
      ),
      'economy_label','Economize R$ 200 por pessoa',
      'short_description','Quarto compartilhado em galera'
    )),
  ('casal', 'reservation_modality', 0, 'BRL', true, 3,
    jsonb_build_object(
      'pt-BR', jsonb_build_object('name','Casal','description','Acomodação exclusiva para casal. Atendimento personalizado via WhatsApp.'),
      'en',    jsonb_build_object('name','Couple','description','Exclusive couple accommodation. Personalized service via WhatsApp.'),
      'es',    jsonb_build_object('name','Pareja','description','Acomodación exclusiva para pareja. Atención personalizada por WhatsApp.')
    ),
    jsonb_build_object(
      'modality_kind','couple','checkout_mode','whatsapp','recommended',false,
      'highlights', jsonb_build_array(
        'Quarto privativo para o casal',
        'Atendimento personalizado',
        'Valor sob consulta',
        'Reserva via WhatsApp'
      ),
      'whatsapp_message','Olá! Tenho interesse na reserva para casal no WAYHOME.',
      'short_description','Quarto privativo · valor personalizado'
    ))
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.site_settings (key, value)
VALUES (
  'reservation_contact',
  jsonb_build_object(
    'whatsapp_e164','+5500000000000',
    'whatsapp_couple_message','Olá! Tenho interesse na reserva para casal no WAYHOME.'
  )
)
ON CONFLICT (key) DO NOTHING;
