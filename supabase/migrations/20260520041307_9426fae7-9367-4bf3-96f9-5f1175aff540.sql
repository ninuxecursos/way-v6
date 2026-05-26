
-- 1) Coluna translations em event_reviews
ALTER TABLE public.event_reviews
  ADD COLUMN IF NOT EXISTS translations jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 2) Traduções dos produtos (modalidades de reserva)
UPDATE public.products SET translations = jsonb_build_object(
  'pt-BR', jsonb_build_object(
    'name','Individual',
    'description','Sua vaga garantida em quarto compartilhado, masculino ou feminino.',
    'capacity','Sua vaga garantida em quarto compartilhado, masculino ou feminino.',
    'highlights', jsonb_build_array(
      'Quarto compartilhado (masculino ou feminino)',
      'Cama individual com roupa de cama',
      'Café da manhã incluso',
      'Acesso a todas as áreas Way Home'
    ),
    'altPrice','Conforto e privacidade'
  ),
  'en', jsonb_build_object(
    'name','Individual',
    'description','Your guaranteed spot in a shared room — male or female.',
    'capacity','Your guaranteed spot in a shared room — male or female.',
    'highlights', jsonb_build_array(
      'Shared room (male or female)',
      'Single bed with bedding',
      'Breakfast included',
      'Access to all Way Home areas'
    ),
    'altPrice','Comfort and privacy'
  ),
  'es', jsonb_build_object(
    'name','Individual',
    'description','Tu lugar garantizado en habitación compartida, masculina o femenina.',
    'capacity','Tu lugar garantizado en habitación compartida, masculina o femenina.',
    'highlights', jsonb_build_array(
      'Habitación compartida (masculina o femenina)',
      'Cama individual con ropa de cama',
      'Desayuno incluido',
      'Acceso a todas las áreas Way Home'
    ),
    'altPrice','Confort y privacidad'
  )
) WHERE slug = 'individual';

UPDATE public.products SET
  translations = jsonb_build_object(
    'pt-BR', jsonb_build_object(
      'name','Quarto em Galera',
      'description','Você dividirá o quarto com outras pessoas e economiza no valor por pessoa.',
      'capacity','Você dividirá o quarto com outras pessoas e economiza no valor por pessoa.',
      'highlights', jsonb_build_array(
        'Você dividirá o quarto com outras pessoas',
        'Melhor custo-benefício do Way Home',
        'Café da manhã incluso',
        'Ideal para quem vai com amigos'
      ),
      'economyLabel','Economize R$ 200 por pessoa',
      'altPrice','Máximo de 8 pessoas por quarto'
    ),
    'en', jsonb_build_object(
      'name','Group Room',
      'description','You''ll share the room with others and save on the per-person price.',
      'capacity','You''ll share the room with others and save on the per-person price.',
      'highlights', jsonb_build_array(
        'You''ll share the room with other people',
        'Best value at Way Home',
        'Breakfast included',
        'Ideal for those traveling with friends'
      ),
      'economyLabel','Save R$ 200 per person',
      'altPrice','Up to 8 people per room'
    ),
    'es', jsonb_build_object(
      'name','Habitación Grupal',
      'description','Compartirás la habitación con otras personas y ahorras en el precio por persona.',
      'capacity','Compartirás la habitación con otras personas y ahorras en el precio por persona.',
      'highlights', jsonb_build_array(
        'Compartirás la habitación con otras personas',
        'La mejor relación calidad-precio de Way Home',
        'Desayuno incluido',
        'Ideal para quienes viajan con amigos'
      ),
      'economyLabel','Ahorra R$ 200 por persona',
      'altPrice','Máximo 8 personas por habitación'
    )
  )
WHERE slug = 'galera';

UPDATE public.products SET translations = jsonb_build_object(
  'pt-BR', jsonb_build_object(
    'name','Casal',
    'description','Acomodação exclusiva para casal. Atendimento personalizado via WhatsApp.',
    'capacity','Acomodação exclusiva para casal. Atendimento personalizado via WhatsApp.',
    'highlights', jsonb_build_array(
      'Quarto privativo para o casal',
      'Atendimento personalizado',
      'Valor sob consulta',
      'Reserva via WhatsApp'
    )
  ),
  'en', jsonb_build_object(
    'name','Couple',
    'description','Exclusive accommodation for couples. Personalized assistance via WhatsApp.',
    'capacity','Exclusive accommodation for couples. Personalized assistance via WhatsApp.',
    'highlights', jsonb_build_array(
      'Private room for the couple',
      'Personalized assistance',
      'Price upon request',
      'Booking via WhatsApp'
    )
  ),
  'es', jsonb_build_object(
    'name','Pareja',
    'description','Alojamiento exclusivo para pareja. Atención personalizada por WhatsApp.',
    'capacity','Alojamiento exclusivo para pareja. Atención personalizada por WhatsApp.',
    'highlights', jsonb_build_array(
      'Habitación privada para la pareja',
      'Atención personalizada',
      'Precio bajo consulta',
      'Reserva por WhatsApp'
    )
  )
) WHERE slug = 'casal';

-- 3) Traduções das avaliações legadas
UPDATE public.event_reviews SET translations = jsonb_build_object(
  'en', jsonb_build_object('comment','My experience was great because I felt so welcome and well received. The rooms are wonderful and we arrived to a harm-reduction kit and gifts. I felt like I was with my family at a country home. The hosts (Hudson and Letícia) are amazing. I will definitely go with Way Home to Tomorrowland and other festivals.'),
  'es', jsonb_build_object('comment','Mi experiencia fue muy buena porque me sentí muy acogida y bien recibida, las habitaciones son maravillosas y llegamos con kit de reducción de daños y regalos. Me sentí como si estuviera con mi familia en el campo. Los hosters (Hudson y Letícia) son maravillosos. Seguramente iré con Way Home a Tomorrowland y otros festivales.')
) WHERE id = 'f4ad42b7-ceb0-4915-926c-7aad47375d24';

UPDATE public.event_reviews SET translations = jsonb_build_object(
  'en', jsonb_build_object('comment','No words to describe my experience at Way Home. Breakfast every day, transfers to Tomorrowland, a lively crowd and everything well organized by the staff. There was even a recovery kit. It was awesome.'),
  'es', jsonb_build_object('comment','Sin palabras para describir mi experiencia en Way Home. Desayuno todos los días, traslados a Tomorrowland, una multitud animada y todo bien organizado por el equipo. Incluso había un kit de recuperación. ¡Estuvo genial!')
) WHERE id = '96b50d2d-9ff8-4873-ae8f-9b8f089ff577';

UPDATE public.event_reviews SET translations = jsonb_build_object(
  'en', jsonb_build_object('comment','Tomorrowland has always been a dream of mine since I was young, and being able to live it here, where I was born, with my best friends, made it even more special. From the moment I stepped into the Way Home accommodations, I felt at home. Everything was flawless from start to finish.'),
  'es', jsonb_build_object('comment','Tomorrowland siempre fue un sueño para mí desde pequeño, y poder vivirlo aquí donde nací, junto a mis mejores amigos, lo hizo aún más especial. Desde que puse un pie en las acomodaciones de Way Home, me sentí como en casa. Todo fue impecable de principio a fin.')
) WHERE id = 'a240eda8-4a29-45b9-bf69-9edba178ef1c';

UPDATE public.event_reviews SET translations = jsonb_build_object(
  'en', jsonb_build_object('comment','I highly recommend Way Home. My stay there during Tomorrowland was wonderful: nice people, spacious rooms with private bathrooms, a fun and well-organized team. The Way Home gifts were thoughtfully designed to avoid hassles during the event. 10/10!'),
  'es', jsonb_build_object('comment','Recomiendo mucho Way Home. Mi estadía durante Tomorrowland fue maravillosa: gente amable, habitaciones amplias con baños privados, un equipo animado y bien organizado. Los regalos de Way Home fueron pensados para evitar contratiempos durante el evento. ¡Nota 10!')
) WHERE id = '71079b11-40cb-40fc-8aa2-cf512672b98e';

UPDATE public.event_reviews SET translations = jsonb_build_object(
  'en', jsonb_build_object('comment','It was a very comfortable experience. The Way Home staff was warm, helpful and attentive so we could enjoy the best of the party.'),
  'es', jsonb_build_object('comment','Fue una experiencia muy cómoda. El equipo de Way Home fue muy receptivo, servicial y atento para que pudiéramos vivir lo mejor de la fiesta.')
) WHERE id = 'fd3b26d8-eee1-40e4-bf31-15117e5d65a8';

UPDATE public.event_reviews SET translations = jsonb_build_object(
  'en', jsonb_build_object('comment','I just want to thank Way Home for this incredible experience! You thought of every detail — the gifts, welcome kit, harm-reduction kit, breakfast and great snacks. Clean and organized room with a private bathroom. The patience, care and communication were excellent! Thank you.'),
  'es', jsonb_build_object('comment','¡Solo agradecer a Way Home por esta experiencia increíble! Pensaron en cada detalle: los regalos, el kit de bienvenida, el kit de reducción de daños, desayuno y excelentes snacks. Habitación limpia y organizada con baño privado. ¡La paciencia, el cuidado y la comunicación fueron excelentes! Gracias.')
) WHERE id = '5eaae25a-f64d-4d74-8c1a-714ccf310d01';
